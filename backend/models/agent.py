from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class Agent(BaseModel):
    id: str = Field(..., alias="_id")
    name: str
    display_name: str
    category: str
    description: str
    icon: str
    color: str
    capabilities: List[str] = []
    estimated_time: str
    system_prompt: str
    is_custom: bool = False
    created_by_id: Optional[str] = None
    is_public: bool = True
    usage_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        allow_population_by_field_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class AgentResponse(BaseModel):
    id: str
    name: str
    category: str
    description: str
    icon: str
    color: str
    capabilities: List[str]
    estimated_time: str
    is_custom: bool
    usage_count: int

class AgentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    display_name: str = Field(..., min_length=1, max_length=100)
    category: str
    description: str = Field(..., max_length=500)
    icon: str
    color: str = "accent-blue"
    capabilities: List[str] = []
    estimated_time: str = "2-4 hours"
    system_prompt: str = Field(..., min_length=10)

class AgentUpdate(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=100)
    category: Optional[str] = None
    description: Optional[str] = Field(None, max_length=500)
    icon: Optional[str] = None
    color: Optional[str] = None
    capabilities: Optional[List[str]] = None
    estimated_time: Optional[str] = None
    system_prompt: Optional[str] = Field(None, min_length=10)

class AgentCategory(BaseModel):
    id: str
    name: str
    count: int