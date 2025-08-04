from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class ProjectStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"
    DELETED = "deleted"


class ExportFormat(str, Enum):
    JSON = "json"
    YAML = "yaml"
    CLAUDE_CODE = "claude-code"
    DOCKER = "docker"
    KUBERNETES = "kubernetes"
    TERRAFORM = "terraform"


class AgentNode(BaseModel):
    id: str
    type: str = "agent"
    position: Dict[str, float]  # {x: float, y: float}
    data: Dict[str, Any]
    selected: bool = False
    dragHandle: str = ".drag-handle"


class WorkflowEdge(BaseModel):
    id: str
    source: str
    target: str
    type: str = "smoothstep"
    animated: bool = True
    style: Optional[Dict[str, Any]] = None
    data: Optional[Dict[str, Any]] = None


class Workflow(BaseModel):
    nodes: List[AgentNode] = []
    edges: List[WorkflowEdge] = []
    layout: str = "hybrid"  # sequential, parallel, hybrid, hierarchical
    config: Dict[str, Any] = Field(default_factory=dict)


class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    tags: List[str] = Field(default_factory=list)
    
    @validator('name')
    def name_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError('Project name cannot be empty')
        return v.strip()
    
    @validator('tags')
    def limit_tags(cls, v):
        if len(v) > 10:
            raise ValueError('Maximum 10 tags allowed')
        return v


class ProjectCreate(ProjectBase):
    workflow: Optional[Workflow] = None
    is_template: bool = False
    template_category: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    workflow: Optional[Workflow] = None
    tags: Optional[List[str]] = None
    status: Optional[ProjectStatus] = None


class ProjectInDB(ProjectBase):
    id: str = Field(alias="_id")
    user_id: str
    workflow: Workflow = Field(default_factory=Workflow)
    status: ProjectStatus = ProjectStatus.DRAFT
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    version: int = 1
    is_template: bool = False
    template_category: Optional[str] = None
    export_history: List[Dict[str, Any]] = []
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class Project(ProjectBase):
    id: str
    user_id: str
    workflow: Workflow
    status: ProjectStatus
    created_at: datetime
    updated_at: datetime
    version: int
    is_template: bool
    
    class Config:
        from_attributes = True


class ProjectExport(BaseModel):
    format: ExportFormat
    include_readme: bool = True
    include_env_template: bool = True
    include_docker: bool = False


class ProjectList(BaseModel):
    projects: List[Project]
    total: int
    page: int
    page_size: int
    
    
class ProjectVersion(BaseModel):
    version: int
    workflow: Workflow
    created_at: datetime
    created_by: str
    change_summary: Optional[str] = None