"""
Unit tests for ProjectService
"""
import pytest
from datetime import datetime
from app.services.project_service import ProjectService
from app.models.project import ProjectCreate, ProjectUpdate, ProjectStatus
from fastapi import HTTPException


class TestProjectService:
    """Test cases for project service"""
    
    @pytest.mark.asyncio
    async def test_create_project_success(self, test_db, registered_user, test_project_data):
        """Test successful project creation"""
        project_service = ProjectService(test_db)
        user_id = registered_user["user"]["id"]
        
        project_create = ProjectCreate(**test_project_data)
        project = await project_service.create_project(user_id, project_create)
        
        assert project.name == test_project_data["name"]
        assert project.description == test_project_data["description"]
        assert project.user_id == user_id
        assert project.status == ProjectStatus.DRAFT
        assert len(project.workflow.nodes) == 2
        assert len(project.workflow.edges) == 1
        
        # Verify user usage was updated
        user = await test_db.users.find_one({"_id": user_id})
        assert user["usage"]["workflows_created"] == 1
    
    @pytest.mark.asyncio
    async def test_create_project_exceeds_limit(self, test_db, registered_user):
        """Test project creation when limit is exceeded"""
        project_service = ProjectService(test_db)
        user_id = registered_user["user"]["id"]
        
        # Set user to free tier with 3 projects already created
        await test_db.users.update_one(
            {"_id": user_id},
            {"$set": {"usage.workflows_created": 3}}
        )
        
        # Create 3 projects this month to reach limit
        for i in range(3):
            project_data = {
                "_id": f"proj_{i}",
                "user_id": user_id,
                "name": f"Project {i}",
                "created_at": datetime.utcnow()
            }
            await test_db.projects.insert_one(project_data)
        
        # Try to create another project
        project_create = ProjectCreate(name="Over Limit Project")
        
        with pytest.raises(HTTPException) as exc_info:
            await project_service.create_project(user_id, project_create)
        
        assert exc_info.value.status_code == 403
        assert "limit reached" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_get_user_projects(self, test_db, registered_user):
        """Test getting user projects with pagination"""
        project_service = ProjectService(test_db)
        user_id = registered_user["user"]["id"]
        
        # Create multiple projects
        for i in range(5):
            project_data = {
                "_id": f"proj_{i}",
                "user_id": user_id,
                "name": f"Project {i}",
                "status": ProjectStatus.ACTIVE if i % 2 == 0 else ProjectStatus.DRAFT,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "version": 1,
                "workflow": {"nodes": [], "edges": [], "layout": "hybrid"}
            }
            await test_db.projects.insert_one(project_data)
        
        # Get all projects
        result = await project_service.get_user_projects(user_id)
        assert result["total"] == 5
        assert len(result["projects"]) == 5
        
        # Test pagination
        result = await project_service.get_user_projects(user_id, skip=2, limit=2)
        assert len(result["projects"]) == 2
        assert result["page"] == 2
        
        # Test status filter
        result = await project_service.get_user_projects(
            user_id, 
            status_filter=ProjectStatus.ACTIVE
        )
        assert result["total"] == 3
        assert all(p.status == ProjectStatus.ACTIVE for p in result["projects"])
    
    @pytest.mark.asyncio
    async def test_get_project_success(self, test_db, registered_user, test_project_data):
        """Test getting a specific project"""
        project_service = ProjectService(test_db)
        user_id = registered_user["user"]["id"]
        
        # Create project
        project_create = ProjectCreate(**test_project_data)
        created_project = await project_service.create_project(user_id, project_create)
        
        # Get project
        project = await project_service.get_project(created_project.id, user_id)
        
        assert project.id == created_project.id
        assert project.name == test_project_data["name"]
        assert len(project.workflow.nodes) == 2
    
    @pytest.mark.asyncio
    async def test_get_project_not_found(self, test_db, registered_user):
        """Test getting non-existent project"""
        project_service = ProjectService(test_db)
        user_id = registered_user["user"]["id"]
        
        with pytest.raises(HTTPException) as exc_info:
            await project_service.get_project("nonexistent_id", user_id)
        
        assert exc_info.value.status_code == 404
        assert "not found" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_update_project_success(self, test_db, registered_user, test_project_data):
        """Test updating a project"""
        project_service = ProjectService(test_db)
        user_id = registered_user["user"]["id"]
        
        # Create project
        project_create = ProjectCreate(**test_project_data)
        project = await project_service.create_project(user_id, project_create)
        
        # Update project
        update_data = ProjectUpdate(
            name="Updated Project Name",
            description="Updated description",
            status=ProjectStatus.ACTIVE
        )
        
        updated_project = await project_service.update_project(
            project.id, 
            user_id, 
            update_data
        )
        
        assert updated_project.name == "Updated Project Name"
        assert updated_project.description == "Updated description"
        assert updated_project.status == ProjectStatus.ACTIVE
        assert updated_project.version == 1  # Version unchanged without workflow update
    
    @pytest.mark.asyncio
    async def test_update_project_workflow_increments_version(self, test_db, registered_user, test_project_data):
        """Test that updating workflow increments version"""
        project_service = ProjectService(test_db)
        user_id = registered_user["user"]["id"]
        
        # Create project
        project_create = ProjectCreate(**test_project_data)
        project = await project_service.create_project(user_id, project_create)
        
        # Update workflow
        new_workflow = test_project_data["workflow"].copy()
        new_workflow["nodes"].append({
            "id": "node-3",
            "type": "agent",
            "position": {"x": 500, "y": 100},
            "data": {"id": "test-agent", "name": "Test Agent"}
        })
        
        update_data = ProjectUpdate(workflow=new_workflow)
        updated_project = await project_service.update_project(
            project.id,
            user_id,
            update_data
        )
        
        assert updated_project.version == 2
        assert len(updated_project.workflow.nodes) == 3
    
    @pytest.mark.asyncio
    async def test_delete_project_success(self, test_db, registered_user, test_project_data):
        """Test soft deleting a project"""
        project_service = ProjectService(test_db)
        user_id = registered_user["user"]["id"]
        
        # Create project
        project_create = ProjectCreate(**test_project_data)
        project = await project_service.create_project(user_id, project_create)
        
        # Delete project
        success = await project_service.delete_project(project.id, user_id)
        assert success is True
        
        # Verify project is soft deleted
        project_in_db = await test_db.projects.find_one({"_id": project.id})
        assert project_in_db["status"] == ProjectStatus.DELETED
    
    @pytest.mark.asyncio
    async def test_duplicate_project_success(self, test_db, registered_user, test_project_data):
        """Test duplicating a project"""
        project_service = ProjectService(test_db)
        user_id = registered_user["user"]["id"]
        
        # Create original project
        project_create = ProjectCreate(**test_project_data)
        original = await project_service.create_project(user_id, project_create)
        
        # Duplicate project
        duplicate = await project_service.duplicate_project(original.id, user_id)
        
        assert duplicate.id != original.id
        assert duplicate.name == f"{original.name} (Copy)"
        assert duplicate.description == original.description
        assert len(duplicate.workflow.nodes) == len(original.workflow.nodes)
        assert duplicate.version == 1
    
    @pytest.mark.asyncio
    async def test_create_project_from_template(self, test_db, registered_user):
        """Test creating project from template"""
        project_service = ProjectService(test_db)
        user_id = registered_user["user"]["id"]
        
        # Create a template
        template_data = {
            "_id": "template_1",
            "name": "SaaS Template",
            "description": "Template for SaaS apps",
            "is_template": True,
            "template_category": "Web App",
            "workflow": {
                "nodes": [{"id": "n1", "type": "agent", "position": {"x": 0, "y": 0}, "data": {}}],
                "edges": [],
                "layout": "sequential"
            },
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "version": 1
        }
        await test_db.projects.insert_one(template_data)
        
        # Create project from template
        project = await project_service.create_project_from_template(
            "template_1",
            user_id,
            "My SaaS App"
        )
        
        assert project.name == "My SaaS App"
        assert "Created from template" in project.description
        assert len(project.workflow.nodes) == 1
        assert project.is_template is False
    
    @pytest.mark.asyncio
    async def test_record_export(self, test_db, registered_user, test_project_data):
        """Test recording export history"""
        project_service = ProjectService(test_db)
        user_id = registered_user["user"]["id"]
        
        # Create project
        project_create = ProjectCreate(**test_project_data)
        project = await project_service.create_project(user_id, project_create)
        
        # Record export
        success = await project_service.record_export(project.id, user_id, "json")
        assert success is True
        
        # Verify export was recorded
        project_in_db = await test_db.projects.find_one({"_id": project.id})
        assert len(project_in_db["export_history"]) == 1
        assert project_in_db["export_history"][0]["format"] == "json"
        assert project_in_db["export_history"][0]["user_id"] == user_id