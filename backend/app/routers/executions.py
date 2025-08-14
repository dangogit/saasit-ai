from fastapi import APIRouter, HTTPException, Depends, Request
from typing import List, Optional
from datetime import datetime

from app.models.execution import (
    WorkflowExecution, ExecutionCreate, ExecutionUpdate, 
    TerminalOutput, ExecutionStatus
)
from app.models.user import TokenData
from app.middleware.auth import get_current_active_user, check_rate_limit
from app.services.execution_service import ExecutionService

router = APIRouter(prefix="/executions", tags=["executions"])

def get_execution_service(request: Request) -> ExecutionService:
    """Get execution service from app state"""
    db = request.app.state.db
    if not db:
        raise HTTPException(status_code=503, detail="Database connection not available")
    
    # Create execution service instance
    # In production, this should be a singleton or injected dependency
    return ExecutionService(db)

@router.post("/", response_model=WorkflowExecution)
async def create_execution(
    execution_data: ExecutionCreate,
    request: Request,
    current_user: TokenData = Depends(check_rate_limit)
):
    """Create a new workflow execution"""
    execution_service = get_execution_service(request)
    
    try:
        execution = await execution_service.create_execution(
            user_id=current_user.user_id,
            execution_data=execution_data
        )
        return execution
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{execution_id}", response_model=WorkflowExecution)
async def get_execution(
    execution_id: str,
    request: Request,
    current_user: TokenData = Depends(get_current_active_user)
):
    """Get execution details"""
    execution_service = get_execution_service(request)
    
    execution = await execution_service.get_execution(execution_id, current_user.user_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    return execution

@router.get("/", response_model=List[WorkflowExecution])
async def list_executions(
    request: Request,
    current_user: TokenData = Depends(get_current_active_user),
    status: Optional[ExecutionStatus] = None,
    limit: int = 50,
    offset: int = 0
):
    """List user's executions"""
    execution_service = get_execution_service(request)
    
    try:
        query = {"user_id": current_user.user_id}
        if status:
            query["status"] = status.value
        
        # Get executions from database
        db = request.app.state.db
        cursor = db.executions.find(query).sort("created_at", -1).skip(offset).limit(limit)
        executions = await cursor.to_list(length=limit)
        
        return [WorkflowExecution(**execution) for execution in executions]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{execution_id}", response_model=WorkflowExecution)
async def update_execution(
    execution_id: str,
    update_data: ExecutionUpdate,
    request: Request,
    current_user: TokenData = Depends(get_current_active_user)
):
    """Update execution details"""
    execution_service = get_execution_service(request)
    
    # Verify ownership
    execution = await execution_service.get_execution(execution_id, current_user.user_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    updated_execution = await execution_service.update_execution(execution_id, update_data)
    if not updated_execution:
        raise HTTPException(status_code=500, detail="Failed to update execution")
    
    return updated_execution

@router.post("/{execution_id}/start")
async def start_execution(
    execution_id: str,
    workflow_data: dict,
    request: Request,
    current_user: TokenData = Depends(check_rate_limit)
):
    """Start workflow execution"""
    execution_service = get_execution_service(request)
    
    # Verify ownership
    execution = await execution_service.get_execution(execution_id, current_user.user_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    if execution.status != ExecutionStatus.PENDING:
        raise HTTPException(
            status_code=400, 
            detail=f"Execution is in {execution.status} state, cannot start"
        )
    
    success = await execution_service.start_execution(execution_id, workflow_data)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to start execution")
    
    return {"message": "Execution started successfully", "execution_id": execution_id}

@router.post("/{execution_id}/pause")
async def pause_execution(
    execution_id: str,
    request: Request,
    current_user: TokenData = Depends(get_current_active_user)
):
    """Pause workflow execution"""
    execution_service = get_execution_service(request)
    
    # Verify ownership
    execution = await execution_service.get_execution(execution_id, current_user.user_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    success = await execution_service.pause_execution(execution_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to pause execution")
    
    return {"message": "Execution paused successfully", "execution_id": execution_id}

@router.post("/{execution_id}/resume")
async def resume_execution(
    execution_id: str,
    request: Request,
    current_user: TokenData = Depends(get_current_active_user)
):
    """Resume paused workflow execution"""
    execution_service = get_execution_service(request)
    
    # Verify ownership
    execution = await execution_service.get_execution(execution_id, current_user.user_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    success = await execution_service.resume_execution(execution_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to resume execution")
    
    return {"message": "Execution resumed successfully", "execution_id": execution_id}

@router.post("/{execution_id}/cancel")
async def cancel_execution(
    execution_id: str,
    request: Request,
    current_user: TokenData = Depends(get_current_active_user)
):
    """Cancel workflow execution"""
    execution_service = get_execution_service(request)
    
    # Verify ownership
    execution = await execution_service.get_execution(execution_id, current_user.user_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    success = await execution_service.cancel_execution(execution_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to cancel execution")
    
    return {"message": "Execution cancelled successfully", "execution_id": execution_id}

@router.get("/{execution_id}/terminal", response_model=List[TerminalOutput])
async def get_terminal_outputs(
    execution_id: str,
    request: Request,
    current_user: TokenData = Depends(get_current_active_user),
    step_id: Optional[str] = None,
    limit: int = 1000
):
    """Get terminal outputs for an execution"""
    execution_service = get_execution_service(request)
    
    # Verify ownership
    execution = await execution_service.get_execution(execution_id, current_user.user_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    try:
        outputs = await execution_service.get_terminal_outputs(
            execution_id=execution_id,
            limit=limit,
            step_id=step_id
        )
        return outputs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{execution_id}")
async def delete_execution(
    execution_id: str,
    request: Request,
    current_user: TokenData = Depends(get_current_active_user)
):
    """Delete an execution and its associated data"""
    execution_service = get_execution_service(request)
    
    # Verify ownership
    execution = await execution_service.get_execution(execution_id, current_user.user_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    # Only allow deletion of completed, failed, or cancelled executions
    if execution.status in [ExecutionStatus.RUNNING, ExecutionStatus.STARTING]:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete running execution. Cancel it first."
        )
    
    try:
        db = request.app.state.db
        
        # Delete terminal outputs
        await db.terminal_outputs.delete_many({"execution_id": execution_id})
        
        # Delete execution
        result = await db.executions.delete_one({"_id": execution_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Execution not found")
        
        return {"message": "Execution deleted successfully", "execution_id": execution_id}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))