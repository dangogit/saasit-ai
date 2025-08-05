"""
Integration tests for project endpoints
"""
import pytest


class TestProjectEndpoints:
    """Test project API endpoints"""
    
    def test_create_project(self, client, auth_headers, test_project_data):
        """Test creating a project"""
        response = client.post(
            "/api/v1/projects",
            json=test_project_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == test_project_data["name"]
        assert data["description"] == test_project_data["description"]
        assert len(data["workflow"]["nodes"]) == 2
        assert data["status"] == "draft"
    
    def test_create_project_unauthorized(self, client, test_project_data):
        """Test creating project without auth"""
        response = client.post("/api/v1/projects", json=test_project_data)
        assert response.status_code == 403
    
    def test_list_projects(self, client, auth_headers, test_project_data):
        """Test listing user projects"""
        # Create a few projects
        for i in range(3):
            project_data = test_project_data.copy()
            project_data["name"] = f"Project {i}"
            client.post("/api/v1/projects", json=project_data, headers=auth_headers)
        
        # List projects
        response = client.get("/api/v1/projects", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 3
        assert len(data["projects"]) == 3
        assert data["page"] == 1
    
    def test_list_projects_pagination(self, client, auth_headers, test_project_data):
        """Test project listing with pagination"""
        # Create 5 projects
        for i in range(5):
            project_data = test_project_data.copy()
            project_data["name"] = f"Project {i}"
            client.post("/api/v1/projects", json=project_data, headers=auth_headers)
        
        # Get page 2 with limit 2
        response = client.get(
            "/api/v1/projects?skip=2&limit=2",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["projects"]) == 2
        assert data["page"] == 2
        assert data["page_size"] == 2
    
    def test_get_project(self, client, auth_headers, test_project_data):
        """Test getting a specific project"""
        # Create project
        create_response = client.post(
            "/api/v1/projects",
            json=test_project_data,
            headers=auth_headers
        )
        project_id = create_response.json()["id"]
        
        # Get project
        response = client.get(f"/api/v1/projects/{project_id}", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == project_id
        assert data["name"] == test_project_data["name"]
    
    def test_get_project_not_found(self, client, auth_headers):
        """Test getting non-existent project"""
        response = client.get(
            "/api/v1/projects/nonexistent-id",
            headers=auth_headers
        )
        assert response.status_code == 404
    
    def test_update_project(self, client, auth_headers, test_project_data):
        """Test updating a project"""
        # Create project
        create_response = client.post(
            "/api/v1/projects",
            json=test_project_data,
            headers=auth_headers
        )
        project_id = create_response.json()["id"]
        
        # Update project
        update_data = {
            "name": "Updated Project Name",
            "description": "Updated description",
            "status": "active"
        }
        response = client.put(
            f"/api/v1/projects/{project_id}",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Project Name"
        assert data["description"] == "Updated description"
        assert data["status"] == "active"
    
    def test_delete_project(self, client, auth_headers, test_project_data):
        """Test deleting a project"""
        # Create project
        create_response = client.post(
            "/api/v1/projects",
            json=test_project_data,
            headers=auth_headers
        )
        project_id = create_response.json()["id"]
        
        # Delete project
        response = client.delete(
            f"/api/v1/projects/{project_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        assert "deleted successfully" in response.json()["message"]
        
        # Verify it's soft deleted (still exists but status is deleted)
        get_response = client.get(
            f"/api/v1/projects/{project_id}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        assert get_response.json()["status"] == "deleted"
    
    def test_duplicate_project(self, client, auth_headers, test_project_data):
        """Test duplicating a project"""
        # Create original project
        create_response = client.post(
            "/api/v1/projects",
            json=test_project_data,
            headers=auth_headers
        )
        project_id = create_response.json()["id"]
        
        # Duplicate project
        response = client.post(
            f"/api/v1/projects/{project_id}/duplicate",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] != project_id
        assert data["name"] == f"{test_project_data['name']} (Copy)"
        assert len(data["workflow"]["nodes"]) == 2
    
    def test_project_tier_limits(self, client, test_user_data, test_project_data):
        """Test project creation limits for free tier"""
        # Register user (free tier)
        register_response = client.post("/api/v1/auth/register", json=test_user_data)
        token = register_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create 3 projects (free tier limit)
        for i in range(3):
            project_data = test_project_data.copy()
            project_data["name"] = f"Project {i}"
            response = client.post("/api/v1/projects", json=project_data, headers=headers)
            assert response.status_code == 200
        
        # Try to create 4th project
        project_data = test_project_data.copy()
        project_data["name"] = "Project 4"
        response = client.post("/api/v1/projects", json=project_data, headers=headers)
        
        assert response.status_code == 403
        assert "limit reached" in response.json()["detail"]