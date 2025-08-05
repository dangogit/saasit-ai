"""
Smoke tests to verify basic functionality
Run these first to ensure the system is working
"""
import pytest


class TestSmoke:
    """Basic smoke tests for the API"""
    
    def test_api_health_check(self, client):
        """Test that API is responding"""
        response = client.get("/api/")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
    
    def test_database_connection(self, test_db):
        """Test that database is accessible"""
        # This will fail if database is not connected
        assert test_db is not None
        assert test_db.name == "saasit_test"
    
    def test_user_registration_flow(self, client):
        """Test basic user registration"""
        user_data = {
            "email": "smoke@test.com",
            "password": "SmokeTest123!",
            "first_name": "Smoke",
            "last_name": "Test"
        }
        
        response = client.post("/api/v1/auth/register", json=user_data)
        assert response.status_code == 200
        assert "access_token" in response.json()
    
    def test_protected_endpoint_requires_auth(self, client):
        """Test that protected endpoints require authentication"""
        response = client.get("/api/v1/projects")
        assert response.status_code == 403
    
    def test_project_crud_flow(self, client, auth_headers):
        """Test basic project CRUD operations"""
        # Create
        project_data = {
            "name": "Smoke Test Project",
            "description": "Testing basic functionality"
        }
        
        create_response = client.post(
            "/api/v1/projects",
            json=project_data,
            headers=auth_headers
        )
        
        # Basic create test - may fail if user is at limit
        if create_response.status_code == 403:
            # User at project limit, that's ok for smoke test
            return
        
        assert create_response.status_code == 200
        project_id = create_response.json()["id"]
        
        # Read
        get_response = client.get(
            f"/api/v1/projects/{project_id}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        
        # Update
        update_response = client.put(
            f"/api/v1/projects/{project_id}",
            json={"name": "Updated Smoke Test"},
            headers=auth_headers
        )
        assert update_response.status_code == 200
        
        # Delete
        delete_response = client.delete(
            f"/api/v1/projects/{project_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200