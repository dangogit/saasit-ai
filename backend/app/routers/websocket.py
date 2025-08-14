import json
import logging
from typing import Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends
from datetime import datetime

from app.models.execution import (
    ControlMessage, ControlMessageType, StartExecutionControl,
    ExecutionCreate, WebSocketMessage, MessageType, ErrorMessage
)
from app.services.execution_service import ExecutionService
from app.utils.security import decode_token
from app.models.user import TokenData

logger = logging.getLogger(__name__)
router = APIRouter()

class WebSocketManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.execution_connections: Dict[str, str] = {}  # execution_id -> connection_id
    
    async def connect(self, websocket: WebSocket, connection_id: str, execution_id: str = None):
        await websocket.accept()
        self.active_connections[connection_id] = websocket
        if execution_id:
            self.execution_connections[execution_id] = connection_id
        logger.info(f"WebSocket connected: {connection_id}")
    
    def disconnect(self, connection_id: str):
        if connection_id in self.active_connections:
            # Find and remove execution connection
            execution_id = None
            for exec_id, conn_id in self.execution_connections.items():
                if conn_id == connection_id:
                    execution_id = exec_id
                    break
            
            if execution_id:
                del self.execution_connections[execution_id]
            
            del self.active_connections[connection_id]
            logger.info(f"WebSocket disconnected: {connection_id}")
    
    async def send_message(self, connection_id: str, message: Dict[str, Any]):
        if connection_id in self.active_connections:
            websocket = self.active_connections[connection_id]
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Error sending message to {connection_id}: {e}")
                self.disconnect(connection_id)
    
    async def send_to_execution(self, execution_id: str, message: Dict[str, Any]):
        if execution_id in self.execution_connections:
            connection_id = self.execution_connections[execution_id]
            await self.send_message(connection_id, message)

# Global WebSocket manager
websocket_manager = WebSocketManager()

# Global execution service instance - will be initialized by the main app
execution_service_instance = None

def set_execution_service(execution_service: ExecutionService):
    """Set the global execution service instance"""
    global execution_service_instance
    execution_service_instance = execution_service

def get_execution_service() -> ExecutionService:
    """Get the global execution service instance"""
    return execution_service_instance

@router.websocket("/ws/execution/{execution_id}")
async def websocket_execution_endpoint(
    websocket: WebSocket, 
    execution_id: str
):
    """WebSocket endpoint for real-time execution monitoring"""
    
    # Authenticate via query parameter
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Authentication required")
        return
    
    try:
        # Validate token
        payload = decode_token(token)
        if payload.get("type") != "access":
            await websocket.close(code=4001, reason="Invalid token type")
            return
        
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=4001, reason="Invalid token")
            return
            
        logger.info(f"Execution WebSocket authenticated for user: {user_id}, execution: {execution_id}")
        
    except Exception as e:
        logger.warning(f"Execution WebSocket authentication failed: {str(e)}")
        await websocket.close(code=4001, reason="Authentication failed")
        return
    
    # Generate connection ID
    connection_id = f"{user_id}_{execution_id}_{datetime.utcnow().timestamp()}"
    
    # Connect WebSocket
    await websocket_manager.connect(websocket, connection_id, execution_id)
    
    # Get execution service
    execution_service = get_execution_service()
    
    try:
        # Register WebSocket handler for execution updates
        async def websocket_handler(message: Dict[str, Any]):
            await websocket_manager.send_message(connection_id, {
                "type": message.get("type", "unknown"),
                "data": message,
                "timestamp": datetime.utcnow().isoformat()
            })
        
        if execution_service:
            await execution_service.register_websocket_handler(execution_id, websocket_handler)
        
        # Send initial connection confirmation
        await websocket.send_json({
            "type": "connected",
            "execution_id": execution_id,
            "connection_id": connection_id,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Main message loop
        while True:
            try:
                # Receive message from client
                data = await websocket.receive_text()
                message_data = json.loads(data)
                
                # Parse control message
                try:
                    control_message = ControlMessage(**message_data)
                    await handle_control_message(
                        control_message, 
                        execution_id, 
                        user_id, 
                        execution_service,
                        websocket
                    )
                except Exception as e:
                    logger.error(f"Error parsing control message: {e}")
                    await websocket.send_json({
                        "type": "error",
                        "error": f"Invalid message format: {str(e)}",
                        "timestamp": datetime.utcnow().isoformat()
                    })
                    
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "error": "Invalid JSON format",
                    "timestamp": datetime.utcnow().isoformat()
                })
                
    except WebSocketDisconnect:
        logger.info(f"Execution WebSocket disconnected: {connection_id}")
    except Exception as e:
        logger.error(f"Execution WebSocket error: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            })
        except:
            pass
    finally:
        # Cleanup
        websocket_manager.disconnect(connection_id)
        if execution_service:
            await execution_service.unregister_websocket_handler(execution_id, websocket_handler)

async def handle_control_message(
    control_message: ControlMessage,
    execution_id: str,
    user_id: str,
    execution_service: ExecutionService,
    websocket: WebSocket
):
    """Handle control messages from the client"""
    
    if not execution_service:
        await websocket.send_json({
            "type": "error",
            "error": "Execution service not available",
            "timestamp": datetime.utcnow().isoformat()
        })
        return
    
    try:
        if control_message.type == ControlMessageType.START_EXECUTION:
            # Start execution
            workflow_data = control_message.data or {}
            success = await execution_service.start_execution(execution_id, workflow_data)
            
            if success:
                await websocket.send_json({
                    "type": "execution_start_acknowledged",
                    "execution_id": execution_id,
                    "timestamp": datetime.utcnow().isoformat()
                })
            else:
                await websocket.send_json({
                    "type": "error",
                    "error": "Failed to start execution",
                    "timestamp": datetime.utcnow().isoformat()
                })
        
        elif control_message.type == ControlMessageType.PAUSE_EXECUTION:
            success = await execution_service.pause_execution(execution_id)
            await websocket.send_json({
                "type": "pause_acknowledged" if success else "error",
                "error": None if success else "Failed to pause execution",
                "timestamp": datetime.utcnow().isoformat()
            })
        
        elif control_message.type == ControlMessageType.RESUME_EXECUTION:
            success = await execution_service.resume_execution(execution_id)
            await websocket.send_json({
                "type": "resume_acknowledged" if success else "error",
                "error": None if success else "Failed to resume execution",
                "timestamp": datetime.utcnow().isoformat()
            })
        
        elif control_message.type == ControlMessageType.CANCEL_EXECUTION:
            success = await execution_service.cancel_execution(execution_id)
            await websocket.send_json({
                "type": "cancel_acknowledged" if success else "error",
                "error": None if success else "Failed to cancel execution",
                "timestamp": datetime.utcnow().isoformat()
            })
        
        elif control_message.type == ControlMessageType.GET_STATUS:
            execution = await execution_service.get_execution(execution_id, user_id)
            if execution:
                await websocket.send_json({
                    "type": "status_response",
                    "execution": execution.dict(),
                    "timestamp": datetime.utcnow().isoformat()
                })
            else:
                await websocket.send_json({
                    "type": "error",
                    "error": "Execution not found",
                    "timestamp": datetime.utcnow().isoformat()
                })
        
        elif control_message.type == ControlMessageType.PING:
            await websocket.send_json({
                "type": "pong",
                "timestamp": datetime.utcnow().isoformat()
            })
        
        else:
            await websocket.send_json({
                "type": "error",
                "error": f"Unknown control message type: {control_message.type}",
                "timestamp": datetime.utcnow().isoformat()
            })
            
    except Exception as e:
        logger.error(f"Error handling control message: {e}")
        await websocket.send_json({
            "type": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        })

# Export the websocket manager for use in other modules
__all__ = ['router', 'websocket_manager']