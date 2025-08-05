"""
Integration tests for authentication endpoints
"""
import pytest
from datetime import datetime


class TestAuthEndpoints:
    """Test authentication API endpoints"""
    
    def test_register_success(self, client, test_user_data):
        """Test successful user registration"""
        response = client.post("/api/v1/auth/register", json=test_user_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["email"] == test_user_data["email"]
        assert data["user"]["first_name"] == test_user_data["first_name"]
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
    
    def test_register_invalid_email(self, client):
        """Test registration with invalid email"""
        invalid_data = {
            "email": "invalid-email",
            "password": "TestPass123!",
            "first_name": "Test",
            "last_name": "User"
        }
        
        response = client.post("/api/v1/auth/register", json=invalid_data)
        assert response.status_code == 422
        assert "email" in response.json()["detail"][0]["loc"]
    
    def test_register_weak_password(self, client):
        """Test registration with weak password"""
        weak_password_data = {
            "email": "test@example.com",
            "password": "weak",  # Too short, no uppercase, no digit
            "first_name": "Test",
            "last_name": "User"
        }
        
        response = client.post("/api/v1/auth/register", json=weak_password_data)
        assert response.status_code == 422
        assert "password" in str(response.json()["detail"])
    
    def test_register_duplicate_email(self, client, test_user_data):
        """Test registration with duplicate email"""
        # Register first user
        response = client.post("/api/v1/auth/register", json=test_user_data)
        assert response.status_code == 200
        
        # Try to register again
        response = client.post("/api/v1/auth/register", json=test_user_data)
        assert response.status_code == 409
        assert "already exists" in response.json()["detail"]
    
    def test_login_success(self, client, test_user_data):
        """Test successful login"""
        # Register user first
        client.post("/api/v1/auth/register", json=test_user_data)
        
        # Login
        login_data = {
            "email": test_user_data["email"],
            "password": test_user_data["password"]
        }
        response = client.post("/api/v1/auth/login", json=login_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["email"] == test_user_data["email"]
        assert "access_token" in data
        assert "refresh_token" in data
    
    def test_login_wrong_credentials(self, client, test_user_data):
        """Test login with wrong credentials"""
        # Register user
        client.post("/api/v1/auth/register", json=test_user_data)
        
        # Try wrong password
        wrong_login = {
            "email": test_user_data["email"],
            "password": "WrongPassword123!"
        }
        response = client.post("/api/v1/auth/login", json=wrong_login)
        
        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]
    
    def test_get_current_user(self, client, test_user_data):
        """Test getting current user info"""
        # Register and login
        register_response = client.post("/api/v1/auth/register", json=test_user_data)
        token = register_response.json()["access_token"]
        
        # Get current user
        headers = {"Authorization": f"Bearer {token}"}
        response = client.get("/api/v1/auth/me", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user_data["email"]
        assert data["first_name"] == test_user_data["first_name"]
        assert "subscription" in data
        assert "usage" in data
    
    def test_get_current_user_unauthorized(self, client):
        """Test getting current user without auth"""
        response = client.get("/api/v1/auth/me")
        assert response.status_code == 403  # No auth header
    
    def test_get_current_user_invalid_token(self, client):
        """Test getting current user with invalid token"""
        headers = {"Authorization": "Bearer invalid-token"}
        response = client.get("/api/v1/auth/me", headers=headers)
        assert response.status_code == 401
    
    def test_refresh_token(self, client, test_user_data):
        """Test refreshing access token"""
        # Register user
        register_response = client.post("/api/v1/auth/register", json=test_user_data)
        refresh_token = register_response.json()["refresh_token"]
        
        # Refresh token
        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
    
    def test_refresh_token_invalid(self, client):
        """Test refreshing with invalid token"""
        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "invalid-refresh-token"}
        )
        
        assert response.status_code == 401
    
    def test_email_verification(self, client, test_user_data):
        """Test email verification flow"""
        # Register user
        client.post("/api/v1/auth/register", json=test_user_data)
        
        # In real scenario, we'd get token from email
        # For testing, we'll get it from database
        # This is handled by the fixture
        
        # Test with invalid token
        response = client.get("/api/v1/auth/verify-email/invalid-token")
        assert response.status_code == 404
    
    def test_forgot_password(self, client, test_user_data):
        """Test forgot password request"""
        # Register user
        client.post("/api/v1/auth/register", json=test_user_data)
        
        # Request password reset
        response = client.post(
            "/api/v1/auth/forgot-password",
            params={"email": test_user_data["email"]}
        )
        
        assert response.status_code == 200
        assert "reset link has been sent" in response.json()["message"]
    
    def test_forgot_password_nonexistent(self, client):
        """Test forgot password for non-existent user"""
        # Should not reveal if user exists
        response = client.post(
            "/api/v1/auth/forgot-password",
            params={"email": "nonexistent@example.com"}
        )
        
        assert response.status_code == 200
        assert "reset link has been sent" in response.json()["message"]
    
    def test_logout(self, client, test_user_data):
        """Test logout endpoint"""
        # Register and get token
        register_response = client.post("/api/v1/auth/register", json=test_user_data)
        token = register_response.json()["access_token"]
        
        # Logout
        headers = {"Authorization": f"Bearer {token}"}
        response = client.post("/api/v1/auth/logout", headers=headers)
        
        assert response.status_code == 200
        assert "Logged out successfully" in response.json()["message"]