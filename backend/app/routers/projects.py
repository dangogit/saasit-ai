from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Dict, Optional, List

from app.models.project import (
    ProjectCreate, 
    ProjectUpdate, 
    Project, 
    ProjectList,
    ProjectStatus,
    ProjectExport
)
from app.models.user import TokenData
from app.services.project_service import ProjectService
from app.middleware.auth import get_current_active_user, check_rate_limit
from app.services.export_service import ExportService

router = APIRouter(prefix="/projects", tags=["projects"])


async def get_db(request: Request) -> AsyncIOMotorDatabase:
    """Dependency to get database instance"""
    return request.app.state.db


@router.post("", response_model=Project)
async def create_project(
    project_data: ProjectCreate,
    current_user: TokenData = Depends(check_rate_limit),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Create a new project
    
    - **name**: Project name (required)
    - **description**: Project description (optional)
    - **workflow**: Initial workflow configuration (optional)
    - **tags**: List of tags (optional)
    """
    project_service = ProjectService(db)
    project = await project_service.create_project(current_user.user_id, project_data)
    return project


@router.get("", response_model=ProjectList)
async def list_projects(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[ProjectStatus] = None,
    current_user: TokenData = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    List user's projects with pagination
    
    - **skip**: Number of projects to skip
    - **limit**: Maximum number of projects to return
    - **status**: Filter by project status (draft, active, archived)
    """
    project_service = ProjectService(db)
    result = await project_service.get_user_projects(
        current_user.user_id, 
        skip=skip, 
        limit=limit,
        status_filter=status
    )
    return ProjectList(**result)


@router.get("/templates", response_model=List[Project])
async def list_templates(
    category: Optional[str] = None,
    current_user: TokenData = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    List available project templates
    
    - **category**: Filter by template category (optional)
    """
    project_service = ProjectService(db)
    templates = await project_service.get_project_templates(category)
    return templates


@router.get("/{project_id}", response_model=Project)
async def get_project(
    project_id: str,
    current_user: TokenData = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get a specific project by ID
    
    - **project_id**: The project ID
    """
    project_service = ProjectService(db)
    project = await project_service.get_project(project_id, current_user.user_id)
    return project


@router.put("/{project_id}", response_model=Project)
async def update_project(
    project_id: str,
    project_update: ProjectUpdate,
    current_user: TokenData = Depends(check_rate_limit),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Update a project
    
    - **project_id**: The project ID
    - **name**: New project name (optional)
    - **description**: New description (optional)
    - **workflow**: Updated workflow (optional)
    - **status**: New status (optional)
    """
    project_service = ProjectService(db)
    project = await project_service.update_project(
        project_id, 
        current_user.user_id, 
        project_update
    )
    return project


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    current_user: TokenData = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Delete a project (soft delete)
    
    - **project_id**: The project ID
    """
    project_service = ProjectService(db)
    success = await project_service.delete_project(project_id, current_user.user_id)
    
    if success:
        return {"message": "Project deleted successfully"}
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to delete project"
        )


@router.post("/{project_id}/duplicate", response_model=Project)
async def duplicate_project(
    project_id: str,
    current_user: TokenData = Depends(check_rate_limit),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Duplicate an existing project
    
    - **project_id**: The project ID to duplicate
    """
    project_service = ProjectService(db)
    new_project = await project_service.duplicate_project(project_id, current_user.user_id)
    return new_project


@router.post("/from-template/{template_id}", response_model=Project)
async def create_from_template(
    template_id: str,
    name: str,
    current_user: TokenData = Depends(check_rate_limit),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Create a new project from a template
    
    - **template_id**: The template ID
    - **name**: Name for the new project
    """
    project_service = ProjectService(db)
    project = await project_service.create_project_from_template(
        template_id, 
        current_user.user_id, 
        name
    )
    return project


@router.post("/{project_id}/export/{format}")
async def export_project(
    project_id: str,
    format: str,
    export_options: ProjectExport,
    current_user: TokenData = Depends(check_rate_limit),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Export a project in the specified format
    
    - **project_id**: The project ID
    - **format**: Export format (json, yaml, claude-code, docker, etc.)
    - **include_readme**: Include README file
    - **include_env_template**: Include .env.example file
    """
    # Check if user's tier allows this export format
    from app.config import settings
    user = await db.users.find_one({"_id": current_user.user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    tier_limits = settings.tier_limits.get(user["subscription"]["tier"], {})
    allowed_formats = tier_limits.get("export_formats", ["json"])
    
    if format not in allowed_formats:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Export format '{format}' not available in your tier. Allowed formats: {', '.join(allowed_formats)}"
        )
    
    # Get project
    project_service = ProjectService(db)
    project = await project_service.get_project(project_id, current_user.user_id)
    
    # Export project
    export_service = ExportService()
    export_data = await export_service.export_project(project, export_options)
    
    # Record export
    await project_service.record_export(project_id, current_user.user_id, format)
    
    return export_data