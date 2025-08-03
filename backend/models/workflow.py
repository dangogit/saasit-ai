from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class ChatMessage(BaseModel):
    id: int
    type: str  # 'user' or 'ai'
    content: str
    timestamp: datetime

class CanvasState(BaseModel):
    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []

class Workflow(BaseModel):
    id: str = Field(..., alias="_id")
    user_id: str
    name: str
    description: Optional[str] = None
    canvas_state: CanvasState = Field(default_factory=lambda: CanvasState())
    chat_history: List[ChatMessage] = []
    agent_count: int = 0
    message_count: int = 0
    version: int = 1
    parent_workflow_id: Optional[str] = None
    is_template: bool = False
    template_category: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        allow_population_by_field_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class WorkflowResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    canvas_state: CanvasState
    chat_history: List[ChatMessage]
    agent_count: int
    message_count: int
    version: int
    is_template: bool
    template_category: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class WorkflowSummary(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    agent_count: int
    message_count: int
    updated_at: datetime

class WorkflowCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    canvas_state: Optional[CanvasState] = None

class WorkflowUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    canvas_state: Optional[CanvasState] = None
    chat_history: Optional[List[ChatMessage]] = None

class WorkflowListResponse(BaseModel):
    workflows: List[WorkflowSummary]
    pagination: Dict[str, Any]