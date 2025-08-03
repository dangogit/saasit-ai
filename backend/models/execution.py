from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class ExecutionStatus(str, Enum):
    QUEUED = "QUEUED"
    INITIALIZING = "INITIALIZING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

class ExecutionStep(BaseModel):
    id: int
    name: str
    status: ExecutionStatus
    agent: str
    duration: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class Execution(BaseModel):
    id: str = Field(..., alias="_id")
    workflow_id: str
    user_id: str
    status: ExecutionStatus = ExecutionStatus.QUEUED
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    runtime_seconds: Optional[int] = None
    artifacts_url: Optional[str] = None
    git_repo_url: Optional[str] = None
    error_message: Optional[str] = None
    steps: List[ExecutionStep] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        allow_population_by_field_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class ExecutionResponse(BaseModel):
    id: str
    workflow_id: str
    status: ExecutionStatus
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    runtime_seconds: Optional[int] = None
    artifacts_url: Optional[str] = None
    git_repo_url: Optional[str] = None
    error_message: Optional[str] = None
    steps: List[ExecutionStep]
    created_at: datetime

class ExecutionCreate(BaseModel):
    workflow_id: str

class ComingSoonResponse(BaseModel):
    message: str = "Cloud execution is coming soon! For now, you can export your workflow configuration."
    features: List[str] = [
        "Real-time agent execution",
        "GitHub repository generation",
        "Live progress monitoring",
        "Artifact downloads"
    ]
    alternatives: List[str] = [
        "Export workflow to Claude Code SDK",
        "Save workflow for future execution",
        "Preview execution plan"
    ]