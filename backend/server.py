from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.middleware.trustedhost import TrustedHostMiddleware
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
from contextlib import asynccontextmanager

# Import app modules
from app.config import settings
from app.routers import auth, projects
from services import ClaudeService, WorkflowGenerator


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB client (will be initialized in lifespan)
client: Optional[AsyncIOMotorClient] = None
db = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global client, db
    try:
        # Skip MongoDB connection if environment variable is set
        if os.getenv("SKIP_DB_CONNECTION", "false").lower() == "true":
            logger.warning("Skipping MongoDB connection (SKIP_DB_CONNECTION=true)")
            app.state.db = None
        else:
            client = AsyncIOMotorClient(settings.mongo_url)
            db = client[settings.db_name]
            app.state.db = db
            
            # Create indexes
            await db.users.create_index("email", unique=True)
            await db.projects.create_index([("user_id", 1), ("created_at", -1)])
            
            logger.info("Connected to MongoDB and created indexes")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        # Don't raise the error - allow app to start without DB
        app.state.db = None
        logger.warning("Starting without database connection")
    
    yield
    
    # Shutdown
    if client:
        client.close()
        logger.info("Disconnected from MongoDB")


# Create the main app
app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    lifespan=lifespan
)

# Create API routers
api_v1_router = APIRouter(prefix=settings.api_v1_str)
legacy_api_router = APIRouter(prefix="/api")  # For backward compatibility


# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=settings.backend_cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

if not settings.debug:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["*.saasit.ai", "saasit.ai", "localhost", "*.fly.dev", "saasit-ai-backend-dgoldman.fly.dev"]
    )

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

# Root health check endpoint
@app.get("/")
async def root():
    return {
        "status": "healthy",
        "message": "SaasIt AI API is running",
        "version": "1.0.0",
        "database": "connected" if db else "disconnected"
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "database": "connected" if db else "disconnected"
    }

# Legacy API endpoints (backward compatibility)
@legacy_api_router.get("/")
async def root():
    return {"message": "SaasIt.ai API v1 - Please use /api/v1 endpoints"}

@legacy_api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate, request: Request):
    db = request.app.state.db
    if not db:
        raise HTTPException(status_code=503, detail="Database connection not available")
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@legacy_api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks(request: Request):
    db = request.app.state.db
    if not db:
        raise HTTPException(status_code=503, detail="Database connection not available")
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

@legacy_api_router.post("/chat")
async def chat_with_claude(chat_request: ChatRequest):
    if not claude_service:
        raise HTTPException(status_code=503, detail="Claude service not available. Please set ANTHROPIC_API_KEY.")
    
    try:
        # Convert messages to Claude format
        messages = [{"role": msg.role, "content": msg.content} for msg in chat_request.messages]
        
        # Use workflow generator for chat
        response = await workflow_generator.generate_workflow(
            conversation_history=messages,
            stream=chat_request.stream
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

@legacy_api_router.post("/workflow/generate")
async def generate_workflow(workflow_request: WorkflowGenerateRequest):
    if not workflow_generator:
        raise HTTPException(status_code=503, detail="Workflow generator not available. Please set ANTHROPIC_API_KEY.")
    
    try:
        messages = [{"role": msg.role, "content": msg.content} for msg in workflow_request.messages]
        
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

# Include routers
api_v1_router.include_router(auth.router)
api_v1_router.include_router(projects.router)

# Mount API versions
app.include_router(api_v1_router)
app.include_router(legacy_api_router)  # Legacy support


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug
    )
