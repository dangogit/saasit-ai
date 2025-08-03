from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class WorkflowTemplate(BaseModel):
    id: str = Field(..., alias="_id")
    name: str
    description: str
    category: str
    agents: List[str]  # List of agent IDs
    estimated_time: str
    color: str = "accent-blue"
    canvas_state: dict = {}
    usage_count: int = 0
    is_public: bool = True
    created_by_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        allow_population_by_field_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class TemplateResponse(BaseModel):
    id: str
    name: str
    description: str
    category: str
    agents: List[str]
    estimated_time: str
    color: str
    usage_count: int

class TemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., max_length=500)
    category: str
    agents: List[str] = Field(..., min_items=1, max_items=20)
    estimated_time: str = "4-8 hours"
    color: str = "accent-blue"