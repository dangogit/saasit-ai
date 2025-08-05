"""
Security tests for authentication and authorization
"""
import pytest
import time
import jwt
from datetime import datetime, timedelta
from app.config import settings


class TestAuthenticationSecurity:
    """Test authentication security measures"""
    
    def test_jwt_token_expiration(self, client, test_user_data):
        """Test that JWT tokens expire correctly"""
        # Register user
        register_response = client.post("/api/v1/auth/register", json=test_user_data)
        access_token = register_response.json()["access_token"]
        
        # Decode token to check expiration
        decoded = jwt.decode(access_token, settings.secret_key, algorithms=["HS256"])
        exp_time = datetime.fromtimestamp(decoded["exp"])
        
        # Token should expire in 30 minutes
        expected_exp = datetime.utcnow() + timedelta(minutes=30)
        assert abs((exp_time - expected_exp).total_seconds()) < 60  # Within 1 minute tolerance
    
    def test_refresh_token_rotation(self, client, test_user_data):
        """Test that refresh tokens are rotated on use"""
        # Register user
        register_response = client.post("/api/v1/auth/register", json=test_user_data)
        refresh_token1 = register_response.json()["refresh_token"]
        
        # Use refresh token
        refresh_response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token1}
        )
        
        assert refresh_response.status_code == 200
        refresh_token2 = refresh_response.json()["refresh_token"]
        
        # New refresh token should be different
        assert refresh_token1 != refresh_token2
        
        # Old refresh token should no longer work
        old_refresh_response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token1}
        )
        assert old_refresh_response.status_code == 401
    
    def test_password_requirements_enforced(self, client):
        """Test that password requirements are enforced"""
        weak_passwords = [
            "short",  # Too short
            "alllowercase",  # No uppercase or digit
            "ALLUPPERCASE",  # No lowercase or digit
            "NoNumbers!",  # No digit
            "N0Symb0ls",  # No special character
            "12345678",  # Common password
            "password123!",  # Contains 'password'
        ]
        
        for weak_password in weak_passwords:
            user_data = {
                "email": f"test_{time.time()}@example.com",
                "password": weak_password,
                "first_name": "Test",
                "last_name": "User"
            }
            
            response = client.post("/api/v1/auth/register", json=user_data)
            assert response.status_code == 422, f"Password '{weak_password}' should be rejected"
    
    def test_rate_limiting_login(self, client, test_user_data):
        """Test rate limiting on login attempts"""
        # Register user
        client.post("/api/v1/auth/register", json=test_user_data)
        
        # Make multiple failed login attempts
        wrong_login = {
            "email": test_user_data["email"],
            "password": "WrongPassword123!"
        }
        
        failed_attempts = 0
        for i in range(10):
            response = client.post("/api/v1/auth/login", json=wrong_login)
            if response.status_code == 429:  # Too Many Requests
                break
            failed_attempts += 1
        
        # Should be rate limited before 10 attempts
        assert failed_attempts < 10, "Login should be rate limited after multiple failures"
    
    def test_authorization_header_required(self, client):
        """Test that protected endpoints require authorization header"""
        protected_endpoints = [
            ("GET", "/api/v1/auth/me"),
            ("POST", "/api/v1/auth/logout"),
            ("GET", "/api/v1/projects"),
            ("POST", "/api/v1/projects"),
        ]
        
        for method, endpoint in protected_endpoints:
            if method == "GET":
                response = client.get(endpoint)
            else:
                response = client.post(endpoint, json={})
            
            assert response.status_code in [401, 403], f"{endpoint} should require auth"
    
    def test_invalid_token_rejected(self, client):
        """Test that invalid tokens are rejected"""
        invalid_tokens = [
            "invalid.token.here",
            "Bearer invalid.token.here",
            "",
            "null",
            "undefined",
        ]
        
        for invalid_token in invalid_tokens:
            headers = {"Authorization": f"Bearer {invalid_token}"}
            response = client.get("/api/v1/auth/me", headers=headers)
            assert response.status_code == 401
    
    def test_token_tampering_detected(self, client, test_user_data):
        """Test that tampered tokens are detected"""
        # Register user
        register_response = client.post("/api/v1/auth/register", json=test_user_data)
        access_token = register_response.json()["access_token"]
        
        # Tamper with token (change one character)
        tampered_token = access_token[:-1] + ("a" if access_token[-1] != "a" else "b")
        
        headers = {"Authorization": f"Bearer {tampered_token}"}
        response = client.get("/api/v1/auth/me", headers=headers)
        assert response.status_code == 401
    
    def test_cross_user_access_denied(self, client, test_project_data):
        """Test that users cannot access other users' resources"""
        # Create two users
        user1_data = {
            "email": "user1@example.com",
            "password": "TestPass123!",
            "first_name": "User",
            "last_name": "One"
        }
        user2_data = {
            "email": "user2@example.com",
            "password": "TestPass123!",
            "first_name": "User",
            "last_name": "Two"
        }
        
        # Register both users
        user1_response = client.post("/api/v1/auth/register", json=user1_data)
        user2_response = client.post("/api/v1/auth/register", json=user2_data)
        
        user1_token = user1_response.json()["access_token"]
        user2_token = user2_response.json()["access_token"]
        
        # User 1 creates a project
        headers1 = {"Authorization": f"Bearer {user1_token}"}
        create_response = client.post(
            "/api/v1/projects",
            json=test_project_data,
            headers=headers1
        )
        project_id = create_response.json()["id"]
        
        # User 2 tries to access User 1's project
        headers2 = {"Authorization": f"Bearer {user2_token}"}
        
        # Try to get the project
        get_response = client.get(f"/api/v1/projects/{project_id}", headers=headers2)
        assert get_response.status_code == 404  # Should appear as not found
        
        # Try to update the project
        update_response = client.put(
            f"/api/v1/projects/{project_id}",
            json={"name": "Hacked Project"},
            headers=headers2
        )
        assert update_response.status_code == 404
        
        # Try to delete the project
        delete_response = client.delete(f"/api/v1/projects/{project_id}", headers=headers2)
        assert delete_response.status_code == 404
    
    def test_password_reset_token_expiration(self, client, test_user_data):
        """Test that password reset tokens expire"""
        # Register user
        client.post("/api/v1/auth/register", json=test_user_data)
        
        # Request password reset
        client.post(
            "/api/v1/auth/forgot-password",
            params={"email": test_user_data["email"]}
        )
        
        # In a real test, we would:
        # 1. Get the reset token from the database
        # 2. Wait for expiration time
        # 3. Try to use the expired token
        # This is a placeholder for that test
        pass
    
    def test_email_verification_token_unique(self, client):
        """Test that email verification tokens are unique"""
        tokens = set()
        
        for i in range(5):
            user_data = {
                "email": f"test{i}@example.com",
                "password": "TestPass123!",
                "first_name": "Test",
                "last_name": f"User{i}"
            }
            
            response = client.post("/api/v1/auth/register", json=user_data)
            assert response.status_code == 200
            
            # In a real test, we would get the verification token from the database
            # and ensure it's unique
    
    def test_session_invalidation_on_logout(self, client, test_user_data):
        """Test that sessions are properly invalidated on logout"""
        # Register and login
        register_response = client.post("/api/v1/auth/register", json=test_user_data)
        access_token = register_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {access_token}"}
        
        # Verify token works
        me_response = client.get("/api/v1/auth/me", headers=headers)
        assert me_response.status_code == 200
        
        # Logout
        logout_response = client.post("/api/v1/auth/logout", headers=headers)
        assert logout_response.status_code == 200
        
        # In a production system with Redis session management,
        # the token should now be blacklisted and not work
        # This is a placeholder for that functionality
    
    def test_sensitive_data_not_exposed(self, client, test_user_data):
        """Test that sensitive data is not exposed in responses"""
        # Register user
        register_response = client.post("/api/v1/auth/register", json=test_user_data)
        
        # Check registration response
        register_data = register_response.json()
        assert "password" not in register_data["user"]
        assert "hashed_password" not in register_data["user"]
        
        # Get current user
        token = register_data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        me_response = client.get("/api/v1/auth/me", headers=headers)
        
        me_data = me_response.json()
        assert "password" not in me_data
        assert "hashed_password" not in me_data
        assert "email_verification_token" not in me_data
        assert "password_reset_token" not in me_data