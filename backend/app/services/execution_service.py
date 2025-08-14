import asyncio
import logging
from typing import Optional, Dict, Any, List, Callable
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument

from app.models.execution import (
    WorkflowExecution, ExecutionStep, TerminalOutput, Artifact,
    ExecutionStatus, StepStatus, TerminalOutputType, ExecutionCreate, ExecutionUpdate
)

logger = logging.getLogger(__name__)

class ExecutionService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.active_executions: Dict[str, asyncio.Task] = {}
        self.websocket_handlers: Dict[str, List[Callable]] = {}  # execution_id -> handlers
        
    async def create_execution(self, user_id: str, execution_data: ExecutionCreate) -> WorkflowExecution:
        """Create a new workflow execution"""
        execution = WorkflowExecution(
            user_id=user_id,
            workflow_name=execution_data.workflow_name,
            total_steps=execution_data.estimated_steps or 0,
            metadata=execution_data.metadata
        )
        
        # Save to database
        result = await self.db.executions.insert_one(execution.dict())
        execution.id = str(result.inserted_id)
        
        logger.info(f"Created execution {execution.id} for user {user_id}")
        return execution
    
    async def get_execution(self, execution_id: str, user_id: str) -> Optional[WorkflowExecution]:
        """Get execution by ID, ensuring user ownership"""
        execution_doc = await self.db.executions.find_one({
            "_id": execution_id,
            "user_id": user_id
        })
        
        if execution_doc:
            return WorkflowExecution(**execution_doc)
        return None
    
    async def update_execution(self, execution_id: str, update_data: ExecutionUpdate) -> Optional[WorkflowExecution]:
        """Update execution status and details"""
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        update_dict["updated_at"] = datetime.utcnow()
        
        result = await self.db.executions.find_one_and_update(
            {"_id": execution_id},
            {"$set": update_dict},
            return_document=ReturnDocument.AFTER
        )
        
        if result:
            execution = WorkflowExecution(**result)
            # Notify WebSocket handlers
            await self.notify_websocket_handlers(execution_id, {
                "type": "execution_updated",
                "execution": execution.dict()
            })
            return execution
        return None
    
    async def start_execution(self, execution_id: str, workflow_data: Dict[str, Any]) -> bool:
        """Start workflow execution"""
        execution = await self.get_execution_by_id(execution_id)
        if not execution:
            return False
            
        if execution.status != ExecutionStatus.PENDING:
            logger.warning(f"Execution {execution_id} is not in pending state")
            return False
        
        # Update execution status
        await self.update_execution(execution_id, ExecutionUpdate(
            status=ExecutionStatus.STARTING
        ))
        
        # Start execution task
        task = asyncio.create_task(
            self._execute_workflow(execution_id, workflow_data)
        )
        self.active_executions[execution_id] = task
        
        logger.info(f"Started execution {execution_id}")
        return True
    
    async def pause_execution(self, execution_id: str) -> bool:
        """Pause workflow execution"""
        if execution_id in self.active_executions:
            # For now, we'll just update the status
            # In a full implementation, we'd need to coordinate with the Claude Code bridge
            await self.update_execution(execution_id, ExecutionUpdate(
                status=ExecutionStatus.PAUSED
            ))
            
            await self.notify_websocket_handlers(execution_id, {
                "type": "execution_paused",
                "execution_id": execution_id
            })
            return True
        return False
    
    async def resume_execution(self, execution_id: str) -> bool:
        """Resume paused workflow execution"""
        execution = await self.get_execution_by_id(execution_id)
        if execution and execution.status == ExecutionStatus.PAUSED:
            await self.update_execution(execution_id, ExecutionUpdate(
                status=ExecutionStatus.RUNNING
            ))
            
            await self.notify_websocket_handlers(execution_id, {
                "type": "execution_resumed",
                "execution_id": execution_id
            })
            return True
        return False
    
    async def cancel_execution(self, execution_id: str) -> bool:
        """Cancel workflow execution"""
        if execution_id in self.active_executions:
            task = self.active_executions[execution_id]
            task.cancel()
            del self.active_executions[execution_id]
            
            await self.update_execution(execution_id, ExecutionUpdate(
                status=ExecutionStatus.CANCELLED,
                end_time=datetime.utcnow()
            ))
            
            await self.notify_websocket_handlers(execution_id, {
                "type": "execution_cancelled",
                "execution_id": execution_id
            })
            return True
        return False
    
    async def add_execution_step(self, execution_id: str, step: ExecutionStep) -> bool:
        """Add a step to the execution"""
        result = await self.db.executions.update_one(
            {"_id": execution_id},
            {
                "$push": {"steps": step.dict()},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        if result.modified_count > 0:
            await self.notify_websocket_handlers(execution_id, {
                "type": "step_added",
                "step": step.dict()
            })
            return True
        return False
    
    async def update_execution_step(self, execution_id: str, step_id: str, step_update: Dict[str, Any]) -> bool:
        """Update a specific step in the execution"""
        step_update["updated_at"] = datetime.utcnow()
        
        result = await self.db.executions.update_one(
            {"_id": execution_id, "steps.id": step_id},
            {
                "$set": {f"steps.$.{k}": v for k, v in step_update.items()},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        if result.modified_count > 0:
            await self.notify_websocket_handlers(execution_id, {
                "type": "step_updated",
                "step_id": step_id,
                "update": step_update
            })
            return True
        return False
    
    async def add_terminal_output(self, execution_id: str, output: TerminalOutput) -> bool:
        """Add terminal output to the execution"""
        result = await self.db.terminal_outputs.insert_one(output.dict())
        
        if result.inserted_id:
            # Notify WebSocket handlers
            await self.notify_websocket_handlers(execution_id, {
                "type": "terminal_output",
                "output": output.dict()
            })
            return True
        return False
    
    async def get_terminal_outputs(
        self, 
        execution_id: str, 
        limit: int = 1000, 
        step_id: Optional[str] = None
    ) -> List[TerminalOutput]:
        """Get terminal outputs for an execution"""
        query = {"execution_id": execution_id}
        if step_id:
            query["step_id"] = step_id
            
        cursor = self.db.terminal_outputs.find(query).sort("timestamp", 1).limit(limit)
        outputs = await cursor.to_list(length=limit)
        
        return [TerminalOutput(**output) for output in outputs]
    
    async def register_websocket_handler(self, execution_id: str, handler: Callable):
        """Register a WebSocket handler for execution updates"""
        if execution_id not in self.websocket_handlers:
            self.websocket_handlers[execution_id] = []
        self.websocket_handlers[execution_id].append(handler)
        logger.info(f"Registered WebSocket handler for execution {execution_id}")
    
    async def unregister_websocket_handler(self, execution_id: str, handler: Callable):
        """Unregister a WebSocket handler"""
        if execution_id in self.websocket_handlers:
            try:
                self.websocket_handlers[execution_id].remove(handler)
                if not self.websocket_handlers[execution_id]:
                    del self.websocket_handlers[execution_id]
                logger.info(f"Unregistered WebSocket handler for execution {execution_id}")
            except ValueError:
                pass
    
    async def notify_websocket_handlers(self, execution_id: str, message: Dict[str, Any]):
        """Notify all WebSocket handlers for an execution"""
        if execution_id in self.websocket_handlers:
            handlers = self.websocket_handlers[execution_id].copy()  # Avoid modification during iteration
            for handler in handlers:
                try:
                    if asyncio.iscoroutinefunction(handler):
                        await handler(message)
                    else:
                        handler(message)
                except Exception as e:
                    logger.error(f"Error notifying WebSocket handler: {e}")
    
    async def get_execution_by_id(self, execution_id: str) -> Optional[WorkflowExecution]:
        """Get execution by ID without user restriction (internal use)"""
        execution_doc = await self.db.executions.find_one({"_id": execution_id})
        if execution_doc:
            return WorkflowExecution(**execution_doc)
        return None
    
    async def _execute_workflow(self, execution_id: str, workflow_data: Dict[str, Any]):
        """Internal method to execute workflow (placeholder for Claude Code integration)"""
        try:
            # Update status to running
            await self.update_execution(execution_id, ExecutionUpdate(
                status=ExecutionStatus.RUNNING,
                start_time=datetime.utcnow()
            ))
            
            await self.notify_websocket_handlers(execution_id, {
                "type": "execution_started",
                "execution_id": execution_id,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            # Simulate workflow execution with mock steps
            # In the real implementation, this would interface with the Claude Code bridge
            await self._simulate_workflow_execution(execution_id, workflow_data)
            
        except asyncio.CancelledError:
            logger.info(f"Execution {execution_id} was cancelled")
            await self.update_execution(execution_id, ExecutionUpdate(
                status=ExecutionStatus.CANCELLED,
                end_time=datetime.utcnow()
            ))
        except Exception as e:
            logger.error(f"Execution {execution_id} failed: {e}")
            await self.update_execution(execution_id, ExecutionUpdate(
                status=ExecutionStatus.FAILED,
                error_message=str(e),
                end_time=datetime.utcnow()
            ))
            
            await self.notify_websocket_handlers(execution_id, {
                "type": "execution_failed",
                "execution_id": execution_id,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            })
        finally:
            # Clean up
            if execution_id in self.active_executions:
                del self.active_executions[execution_id]
    
    async def _simulate_workflow_execution(self, execution_id: str, workflow_data: Dict[str, Any]):
        """Simulate workflow execution for testing (replace with real Claude Code integration)"""
        nodes = workflow_data.get("nodes", [])
        
        for i, node in enumerate(nodes):
            step = ExecutionStep(
                name=f"Execute {node.get('data', {}).get('name', 'Agent')}",
                agent_type=node.get('data', {}).get('type', 'unknown'),
                status=StepStatus.RUNNING,
                start_time=datetime.utcnow()
            )
            
            # Add step to execution
            await self.add_execution_step(execution_id, step)
            
            # Notify step started
            await self.notify_websocket_handlers(execution_id, {
                "type": "step_started",
                "step": step.dict(),
                "timestamp": datetime.utcnow().isoformat()
            })
            
            # Simulate terminal output
            await self.add_terminal_output(execution_id, TerminalOutput(
                execution_id=execution_id,
                step_id=step.id,
                type=TerminalOutputType.SYSTEM,
                content=f"Starting {step.name}...",
                agent=step.agent_type
            ))
            
            # Simulate work
            for progress in [25, 50, 75]:
                await asyncio.sleep(1)  # Simulate work
                await self.update_execution_step(execution_id, step.id, {
                    "progress": progress
                })
                
                await self.add_terminal_output(execution_id, TerminalOutput(
                    execution_id=execution_id,
                    step_id=step.id,
                    type=TerminalOutputType.STDOUT,
                    content=f"Progress: {progress}%",
                    agent=step.agent_type
                ))
            
            # Complete step
            await asyncio.sleep(1)
            end_time = datetime.utcnow()
            duration = str(end_time - step.start_time)
            
            await self.update_execution_step(execution_id, step.id, {
                "status": StepStatus.COMPLETED.value,
                "end_time": end_time,
                "duration": duration,
                "progress": 100
            })
            
            await self.add_terminal_output(execution_id, TerminalOutput(
                execution_id=execution_id,
                step_id=step.id,
                type=TerminalOutputType.SYSTEM,
                content=f"✅ Completed {step.name}",
                agent=step.agent_type
            ))
            
            # Notify step completed
            await self.notify_websocket_handlers(execution_id, {
                "type": "step_completed",
                "step_id": step.id,
                "duration": duration,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            # Update overall progress
            completed_steps = i + 1
            progress = (completed_steps / len(nodes)) * 100
            await self.update_execution(execution_id, ExecutionUpdate(
                progress=progress,
                completed_steps=completed_steps,
                current_step_id=step.id if i < len(nodes) - 1 else None
            ))
        
        # Complete execution
        await self.update_execution(execution_id, ExecutionUpdate(
            status=ExecutionStatus.COMPLETED,
            end_time=datetime.utcnow(),
            progress=100.0
        ))
        
        await self.notify_websocket_handlers(execution_id, {
            "type": "execution_completed",
            "execution_id": execution_id,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        logger.info(f"Execution {execution_id} completed successfully")
    
    async def cleanup_old_executions(self, days: int = 30):
        """Clean up old executions and terminal outputs"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # Delete old terminal outputs
        result = await self.db.terminal_outputs.delete_many({
            "timestamp": {"$lt": cutoff_date}
        })
        logger.info(f"Cleaned up {result.deleted_count} old terminal outputs")
        
        # Mark old executions as archived or delete them
        result = await self.db.executions.update_many(
            {
                "created_at": {"$lt": cutoff_date},
                "status": {"$in": [ExecutionStatus.COMPLETED.value, ExecutionStatus.FAILED.value, ExecutionStatus.CANCELLED.value]}
            },
            {"$set": {"archived": True}}
        )
        logger.info(f"Archived {result.modified_count} old executions")