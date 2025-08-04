from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
import uuid
from datetime import datetime
import json
import asyncio
from services import ClaudeService, WorkflowGenerator


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    stream: bool = False

class WorkflowGenerateRequest(BaseModel):
    messages: List[ChatMessage]
    project_context: Optional[Dict[str, Any]] = None

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Initialize Claude service
try:
    claude_service = ClaudeService()
    workflow_generator = WorkflowGenerator(claude_service)
except ValueError as e:
    logger.error(f"Failed to initialize Claude service: {e}")
    claude_service = None
    workflow_generator = None

@api_router.post("/chat")
async def chat_with_claude(request: ChatRequest):
    if not claude_service:
        raise HTTPException(status_code=503, detail="Claude service not available. Please set ANTHROPIC_API_KEY.")
    
    try:
        # Convert messages to Claude format
        messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        
        # Use workflow generator for chat
        response = await workflow_generator.generate_workflow(
            conversation_history=messages,
            stream=False
        )
        
        # Parse the response
        if isinstance(response, dict) and 'content' in response:
            parsed = workflow_generator.parse_workflow_response(response['content'])
            return {
                "response": parsed,
                "usage": response.get('usage', {})
            }
        else:
            return {"response": response}
            
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/workflow/generate")
async def generate_workflow(request: WorkflowGenerateRequest):
    if not workflow_generator:
        raise HTTPException(status_code=503, detail="Workflow generator not available. Please set ANTHROPIC_API_KEY.")
    
    try:
        messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        
        response = await workflow_generator.generate_workflow(
            conversation_history=messages,
            stream=False
        )
        
        if isinstance(response, dict) and 'content' in response:
            parsed = workflow_generator.parse_workflow_response(response['content'])
            return {
                "workflow": parsed.get('workflow', {}),
                "message": parsed.get('message', ''),
                "phase": parsed.get('phase', 'clarifying'),
                "questions": parsed.get('questions', []),
                "usage": response.get('usage', {})
            }
        else:
            return {"error": "Invalid response format"}
            
    except Exception as e:
        logger.error(f"Workflow generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# WebSocket endpoint for streaming chat
@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    await websocket.accept()
    
    if not workflow_generator:
        await websocket.send_json({"error": "Claude service not available"})
        await websocket.close()
        return
    
    try:
        while True:
            # Receive messages from client
            data = await websocket.receive_json()
            messages = data.get('messages', [])
            
            # Convert to Claude format
            claude_messages = [{"role": msg['role'], "content": msg['content']} for msg in messages]
            
            # Stream response
            full_response = ""
            async for chunk in await workflow_generator.generate_workflow(
                conversation_history=claude_messages,
                stream=True
            ):
                if chunk['type'] == 'content':
                    full_response += chunk['delta']
                    await websocket.send_json({
                        "type": "delta",
                        "content": chunk['delta']
                    })
                elif chunk['type'] == 'done':
                    # Parse and send final response
                    parsed = workflow_generator.parse_workflow_response(full_response)
                    await websocket.send_json({
                        "type": "complete",
                        "response": parsed,
                        "usage": chunk.get('usage', {})
                    })
                elif chunk['type'] == 'error':
                    await websocket.send_json({
                        "type": "error",
                        "error": chunk['error']
                    })
                    
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.send_json({"type": "error", "error": str(e)})

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
