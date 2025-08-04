from typing import List, Optional, Dict, Any
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import HTTPException, status
import logging

from app.models.project import (
    ProjectCreate, 
    ProjectInDB, 
    ProjectUpdate, 
    ProjectStatus,
    Project,
    Workflow
)
from app.models.user import UserTier
from app.config import settings

logger = logging.getLogger(__name__)


class ProjectService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.projects_collection = db.projects
        self.users_collection = db.users
        
    async def create_project(self, user_id: str, project_data: ProjectCreate) -> Project:
        """Create a new project for a user"""
        # Check user's project limit
        user = await self.users_collection.find_one({"_id": user_id})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Check tier limits
        tier_limits = settings.tier_limits.get(user["subscription"]["tier"], {})
        workflow_limit = tier_limits.get("workflows_per_month", 0)
        
        if workflow_limit != -1:  # -1 means unlimited
            # Count existing projects this month
            start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            project_count = await self.projects_collection.count_documents({
                "user_id": user_id,
                "created_at": {"$gte": start_of_month}
            })
            
            if project_count >= workflow_limit:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Project limit reached. Your {user['subscription']['tier']} plan allows {workflow_limit} projects per month."
                )
        
        # Create project document
        project_dict = project_data.model_dump()
        project_in_db = ProjectInDB(
            **project_dict,
            _id=str(datetime.utcnow().timestamp()).replace(".", ""),
            user_id=user_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        # Insert project
        project_doc = project_in_db.model_dump(by_alias=True)
        await self.projects_collection.insert_one(project_doc)
        
        # Update user usage
        await self.users_collection.update_one(
            {"_id": user_id},
            {"$inc": {"usage.workflows_created": 1}}
        )
        
        logger.info(f"Project created: {project_in_db.id} for user: {user_id}")
        
        return Project(**project_in_db.model_dump())
    
    async def get_user_projects(
        self, 
        user_id: str, 
        skip: int = 0, 
        limit: int = 50,
        status_filter: Optional[ProjectStatus] = None
    ) -> Dict[str, Any]:
        """Get all projects for a user with pagination"""
        query = {"user_id": user_id}
        if status_filter:
            query["status"] = status_filter
        
        # Get total count
        total = await self.projects_collection.count_documents(query)
        
        # Get projects with pagination
        cursor = self.projects_collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
        projects = await cursor.to_list(length=limit)
        
        return {
            "projects": [Project(**ProjectInDB(**proj).model_dump()) for proj in projects],
            "total": total,
            "page": skip // limit + 1,
            "page_size": limit
        }
    
    async def get_project(self, project_id: str, user_id: str) -> Project:
        """Get a specific project"""
        project_doc = await self.projects_collection.find_one({
            "_id": project_id,
            "user_id": user_id
        })
        
        if not project_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        return Project(**ProjectInDB(**project_doc).model_dump())
    
    async def update_project(
        self, 
        project_id: str, 
        user_id: str, 
        project_update: ProjectUpdate
    ) -> Project:
        """Update a project"""
        # Check project exists and belongs to user
        existing_project = await self.projects_collection.find_one({
            "_id": project_id,
            "user_id": user_id
        })
        
        if not existing_project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        # Prepare update data
        update_data = project_update.model_dump(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()
        
        # Increment version if workflow is being updated
        if "workflow" in update_data:
            update_data["version"] = existing_project["version"] + 1
        
        # Update project
        result = await self.projects_collection.update_one(
            {"_id": project_id, "user_id": user_id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update project"
            )
        
        # Get updated project
        updated_project = await self.get_project(project_id, user_id)
        return updated_project
    
    async def delete_project(self, project_id: str, user_id: str) -> bool:
        """Delete a project (soft delete)"""
        result = await self.projects_collection.update_one(
            {"_id": project_id, "user_id": user_id},
            {
                "$set": {
                    "status": ProjectStatus.DELETED,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        return True
    
    async def duplicate_project(self, project_id: str, user_id: str) -> Project:
        """Duplicate an existing project"""
        # Get original project
        original = await self.get_project(project_id, user_id)
        
        # Create new project data
        project_data = ProjectCreate(
            name=f"{original.name} (Copy)",
            description=original.description,
            workflow=original.workflow,
            tags=original.tags
        )
        
        # Create the duplicate
        return await self.create_project(user_id, project_data)
    
    async def get_project_templates(self, category: Optional[str] = None) -> List[Project]:
        """Get available project templates"""
        query = {"is_template": True}
        if category:
            query["template_category"] = category
        
        cursor = self.projects_collection.find(query).sort("created_at", -1)
        templates = await cursor.to_list(length=100)
        
        return [Project(**ProjectInDB(**template).model_dump()) for template in templates]
    
    async def create_project_from_template(
        self, 
        template_id: str, 
        user_id: str, 
        name: str
    ) -> Project:
        """Create a new project from a template"""
        # Get template
        template_doc = await self.projects_collection.find_one({
            "_id": template_id,
            "is_template": True
        })
        
        if not template_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )
        
        # Create project data from template
        template = ProjectInDB(**template_doc)
        project_data = ProjectCreate(
            name=name,
            description=f"Created from template: {template.name}",
            workflow=template.workflow,
            tags=template.tags
        )
        
        # Create the project
        return await self.create_project(user_id, project_data)
    
    async def record_export(
        self, 
        project_id: str, 
        user_id: str, 
        export_format: str
    ) -> bool:
        """Record an export event"""
        export_record = {
            "format": export_format,
            "exported_at": datetime.utcnow(),
            "user_id": user_id
        }
        
        result = await self.projects_collection.update_one(
            {"_id": project_id, "user_id": user_id},
            {
                "$push": {"export_history": export_record},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        return result.modified_count > 0