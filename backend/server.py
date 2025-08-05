from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Request, Depends
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
from pymongo import IndexModel

# Import app modules
from app.config import settings
from app.routers import auth, projects
from app.middleware.auth import get_current_active_user, check_rate_limit
from app.middleware.security import setup_security_middleware
from app.middleware.oauth_cors import setup_oauth_cors_middleware
from app.models.user import TokenData
from services import ClaudeService, WorkflowGenerator


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def create_database_indexes(db):
    """
    Create all necessary database indexes for optimal query performance.
    This includes indexes for authentication, Google OAuth, and project management.
    """
    try:
        # Users collection indexes
        users_indexes = [
            # Existing email index (unique)
            IndexModel("email", unique=True, name="email_unique"),
            
            # Google OAuth indexes
            IndexModel("google_id", unique=True, sparse=True, name="google_id_unique_sparse"),
            
            # Provider index for efficient filtering by auth method
            IndexModel("provider", name="provider_index"),
            
            # Compound index for Google OAuth user lookup optimization
            # Used in queries that search by email OR google_id
            IndexModel([("email", 1), ("google_id", 1)], name="email_google_id_compound"),
            
            # User status and activity indexes
            IndexModel("is_active", name="is_active_index"),
            IndexModel("created_at", name="created_at_index"),
            IndexModel("last_login", name="last_login_index"),
            
            # User verification indexes
            IndexModel("is_verified", name="is_verified_index"),
            IndexModel("email_verification_token", sparse=True, name="email_verification_token_sparse"),
            
            # Password reset indexes
            IndexModel("password_reset_token", sparse=True, name="password_reset_token_sparse"),
            IndexModel("password_reset_expires", sparse=True, name="password_reset_expires_sparse"),
            
            # Subscription tier index for user management
            IndexModel("subscription.tier", name="subscription_tier_index")
        ]
        
        # Create users indexes
        await db.users.create_indexes(users_indexes)
        logger.info("Created users collection indexes")
        
        # Projects collection indexes
        projects_indexes = [
            # Existing compound index for user projects
            IndexModel([("user_id", 1), ("created_at", -1)], name="user_id_created_at_compound"),
            
            # Additional project indexes
            IndexModel("user_id", name="user_id_index"),
            IndexModel("created_at", name="project_created_at_index"),
            IndexModel("updated_at", name="project_updated_at_index"),
            IndexModel("status", name="project_status_index")
        ]
        
        # Create projects indexes
        await db.projects.create_indexes(projects_indexes)
        logger.info("Created projects collection indexes")
        
        # Status checks collection indexes (for legacy API)
        status_checks_indexes = [
            IndexModel("timestamp", name="timestamp_index"),
            IndexModel("client_name", name="client_name_index")
        ]
        
        # Create status checks indexes
        await db.status_checks.create_indexes(status_checks_indexes)
        logger.info("Created status_checks collection indexes")
        
        logger.info("All database indexes created successfully")
        
    except Exception as e:
        logger.error(f"Error creating database indexes: {e}")
        # Don't raise the error - allow app to start even if index creation fails
        logger.warning("Continuing without some indexes - performance may be affected")

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
            
            # Create indexes for optimized database queries
            await create_database_indexes(db)
            
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


# CORS Middleware (must be added first)
# Enhanced configuration for Google OAuth and production security
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=settings.backend_cors_origins,
    allow_methods=[
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "OPTIONS",
        "HEAD",
        "PATCH"
    ],
    allow_headers=[
        "Accept",
        "Accept-Language",
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "X-CSRF-Token",
        "X-API-Key",
        "Origin",
        "Referer",
        "User-Agent",
        "Cache-Control",
        "Pragma"
    ],
    expose_headers=[
        "X-Total-Count",
        "X-Page-Count",
        "Content-Range",
        "Location"
    ],
    max_age=86400  # 24 hours preflight cache
)

# Trusted Host Middleware for production
# Enhanced with Google OAuth and development hosts
if not settings.debug:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=[
            # Production domains
            "*.saasit.ai",
            "saasit.ai",
            "www.saasit.ai",
            "app.saasit.ai",
            
            # Development hosts
            "localhost",
            "127.0.0.1",
            
            # Deployment platforms
            "*.fly.dev",
            "saasit-ai-backend-dgoldman.fly.dev",
            
            # Cloudflare Pages
            "*.pages.dev",
            "saasit-ai.pages.dev"
        ]
    )

# Setup additional security middleware
setup_security_middleware(app)

# Setup OAuth-specific CORS middleware for enhanced authentication security
setup_oauth_cors_middleware(app)

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
async def chat_with_claude(
    chat_request: ChatRequest,
    current_user: TokenData = Depends(check_rate_limit)
):
    if not claude_service:
        raise HTTPException(status_code=503, detail="Claude service not available. Please set ANTHROPIC_API_KEY.")
    
    try:
        # Convert messages to Claude format
        messages = [{"role": msg.role, "content": msg.content} for msg in chat_request.messages]
        
        # Log usage for rate limiting and analytics
        logger.info(f"Chat request from user: {current_user.user_id} (tier: {current_user.tier})")
        
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
async def generate_workflow(
    workflow_request: WorkflowGenerateRequest,
    current_user: TokenData = Depends(check_rate_limit)
):
    if not workflow_generator:
        raise HTTPException(status_code=503, detail="Workflow generator not available. Please set ANTHROPIC_API_KEY.")
    
    try:
        # Log usage for rate limiting and analytics
        logger.info(f"Workflow generation request from user: {current_user.user_id} (tier: {current_user.tier})")
        
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
# Note: WebSocket authentication should be handled via query params or headers
# For now, we'll add basic authentication check in the websocket handler
@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    # WebSocket authentication via query parameter
    # In production, consider using a more secure method
    token = websocket.query_params.get("token")
    
    if not token:
        await websocket.close(code=4001, reason="Authentication required")
        return
    
    # Validate token
    try:
        from app.utils.security import decode_token
        payload = decode_token(token)
        if payload.get("type") != "access":
            await websocket.close(code=4001, reason="Invalid token type")
            return
        
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=4001, reason="Invalid token")
            return
            
        logger.info(f"WebSocket authenticated for user: {user_id}")
        
    except Exception as e:
        logger.warning(f"WebSocket authentication failed: {str(e)}")
        await websocket.close(code=4001, reason="Authentication failed")
        return
    
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
