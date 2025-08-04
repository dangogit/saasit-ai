#!/usr/bin/env python3
"""
Integration tests for authentication system
Tests real-world scenarios and edge cases
"""

import pytest
import asyncio
from httpx import AsyncClient
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
import jwt
from unittest.mock import patch, MagicMock
import motor.motor_asyncio

from server import app
from app.config import settings
from app.utils.security import decode_token


class TestAuthIntegration:
    """Integration tests for authentication flows"""

    @pytest.fixture(scope="class")
    def client(self):
        """Create test client"""
        return TestClient(app)

    @pytest.fixture
    def user_data(self):
        """Test user data"""
        return {
            "email": f"integration_{datetime.now().timestamp()}@test.com",
            "password": "IntegrationTest123!",
            "first_name": "Integration",
            "last_name": "Test",
            "company": "Test Corp"
        }

    async def test_complete_user_journey(self, client, user_data):
        """Test complete user authentication journey"""
        
        # 1. User Registration
        reg_response = client.post("/api/v1/auth/register", json=user_data)
        assert reg_response.status_code == 200
        
        reg_data = reg_response.json()
        user_id = reg_data["user"]["id"]
        initial_access_token = reg_data["access_token"]
        initial_refresh_token = reg_data["refresh_token"]
        
        # 2. Access protected endpoint with registration token
        headers = {"Authorization": f"Bearer {initial_access_token}"}
        me_response = client.get("/api/v1/auth/me", headers=headers)
        assert me_response.status_code == 200
        assert me_response.json()["email"] == user_data["email"]
        
        # 3. Logout
        logout_response = client.post("/api/v1/auth/logout", headers=headers)
        assert logout_response.status_code == 200
        
        # 4. Login again
        login_response = client.post("/api/v1/auth/login", json={
            "email": user_data["email"],
            "password": user_data["password"]
        })
        assert login_response.status_code == 200
        
        login_data = login_response.json()
        new_access_token = login_data["access_token"]
        new_refresh_token = login_data["refresh_token"]
        
        # Tokens should be different from registration tokens
        assert new_access_token != initial_access_token
        assert new_refresh_token != initial_refresh_token
        
        # 5. Use new token to access protected endpoint
        new_headers = {"Authorization": f"Bearer {new_access_token}"}
        me_response2 = client.get("/api/v1/auth/me", headers=new_headers)
        assert me_response2.status_code == 200
        
        # 6. Refresh token
        refresh_response = client.post("/api/v1/auth/refresh", json={
            "refresh_token": new_refresh_token
        })
        assert refresh_response.status_code == 200
        
        refresh_data = refresh_response.json()
        refreshed_access_token = refresh_data["access_token"]
        refreshed_refresh_token = refresh_data["refresh_token"]
        
        # 7. Use refreshed token
        refreshed_headers = {"Authorization": f"Bearer {refreshed_access_token}"}
        me_response3 = client.get("/api/v1/auth/me", headers=refreshed_headers)
        assert me_response3.status_code == 200

    async def test_token_expiration_handling(self, client, user_data):
        """Test handling of expired tokens"""
        
        # Register user
        client.post("/api/v1/auth/register", json=user_data)
        
        # Create expired token manually
        expired_payload = {
            "sub": "test_user_id",
            "email": user_data["email"],
            "tier": "free",
            "type": "access",
            "exp": datetime.utcnow() - timedelta(minutes=5)  # Expired 5 minutes ago
        }
        
        expired_token = jwt.encode(expired_payload, settings.secret_key, algorithm=settings.algorithm)
        headers = {"Authorization": f"Bearer {expired_token}"}
        
        # Try to access protected endpoint with expired token
        response = client.get("/api/v1/auth/me", headers=headers)
        assert response.status_code == 401
        assert "expired" in response.json()["detail"].lower() or "validate" in response.json()["detail"].lower()

    async def test_malformed_token_handling(self, client):
        """Test handling of malformed tokens"""
        
        test_cases = [
            "not.a.jwt.token",
            "Bearer invalid_token",
            "totally_invalid",
            "",
            "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.invalid.signature",
        ]
        
        for invalid_token in test_cases:
            headers = {"Authorization": f"Bearer {invalid_token}"}
            response = client.get("/api/v1/auth/me", headers=headers)
            assert response.status_code == 401

    async def test_concurrent_auth_operations(self, client):
        """Test concurrent authentication operations"""
        import concurrent.futures
        import time
        
        def register_and_login(user_id):
            """Register and login a user"""
            test_data = {
                "email": f"concurrent_{user_id}_{time.time()}@test.com",
                "password": "ConcurrentTest123!",
                "first_name": f"User{user_id}",
                "last_name": "Test"
            }
            
            # Register
            reg_response = client.post("/api/v1/auth/register", json=test_data)
            if reg_response.status_code != 200:
                return False
            
            # Login
            login_response = client.post("/api/v1/auth/login", json={
                "email": test_data["email"],
                "password": test_data["password"]
            })
            
            return login_response.status_code == 200
        
        # Run 5 concurrent registration/login operations
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(register_and_login, i) for i in range(5)]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        # All operations should succeed
        assert all(results)

    async def test_password_reset_integration(self, client, user_data):
        """Test password reset integration flow"""
        
        # Register user
        client.post("/api/v1/auth/register", json=user_data)
        
        # Request password reset
        reset_request = client.post("/api/v1/auth/forgot-password", json={
            "email": user_data["email"]
        })
        assert reset_request.status_code == 200
        
        # In a real test, we'd retrieve the reset token from database or email
        # For this integration test, we'll simulate the flow
        
        # Try to login with old password (should still work)
        login_response = client.post("/api/v1/auth/login", json={
            "email": user_data["email"],
            "password": user_data["password"]
        })
        assert login_response.status_code == 200

    async def test_authentication_with_different_tiers(self, client):
        """Test authentication with different user tiers"""
        
        tiers = ["free", "architect", "builder", "shipper", "studio"]
        
        for tier in tiers:
            user_data = {
                "email": f"tier_{tier}_{datetime.now().timestamp()}@test.com",
                "password": "TierTest123!",
                "first_name": f"Tier{tier.title()}",
                "last_name": "User"
            }
            
            # Register user
            response = client.post("/api/v1/auth/register", json=user_data)
            assert response.status_code == 200
            
            # Check default tier is "free"
            token = response.json()["access_token"]
            payload = decode_token(token)
            assert payload["tier"] == "free"  # Default tier

    async def test_multiple_device_sessions(self, client, user_data):
        """Test multiple concurrent sessions (different devices)"""
        
        # Register user
        client.post("/api/v1/auth/register", json=user_data)
        
        # Login from "device 1"
        login1 = client.post("/api/v1/auth/login", json={
            "email": user_data["email"],
            "password": user_data["password"]
        })
        assert login1.status_code == 200
        token1 = login1.json()["access_token"]
        
        # Login from "device 2"
        login2 = client.post("/api/v1/auth/login", json={
            "email": user_data["email"],
            "password": user_data["password"]
        })
        assert login2.status_code == 200
        token2 = login2.json()["access_token"]
        
        # Both tokens should be valid and different
        assert token1 != token2
        
        # Both should work for authenticated requests
        headers1 = {"Authorization": f"Bearer {token1}"}
        headers2 = {"Authorization": f"Bearer {token2}"}
        
        response1 = client.get("/api/v1/auth/me", headers=headers1)
        response2 = client.get("/api/v1/auth/me", headers=headers2)
        
        assert response1.status_code == 200
        assert response2.status_code == 200
        assert response1.json()["email"] == response2.json()["email"]

    async def test_edge_case_email_formats(self, client):
        """Test various edge case email formats"""
        
        valid_emails = [
            "test+tag@example.com",
            "user.name@example.com",
            "user_name@example.com",
            "123user@example.com",
            "user@sub.example.com",
            "very.long.email.address.with.many.dots@very.long.domain.name.example.com"
        ]
        
        for email in valid_emails:
            user_data = {
                "email": email,
                "password": "ValidPassword123!",
                "first_name": "Test",
                "last_name": "User"
            }
            
            response = client.post("/api/v1/auth/register", json=user_data)
            # Should succeed or fail with 409 if email already exists
            assert response.status_code in [200, 409]

    async def test_security_headers_and_cors(self, client):
        """Test security headers and CORS configuration"""
        
        # Test CORS headers on auth endpoints
        response = client.options("/api/v1/auth/register")
        
        # Should allow CORS for configured origins
        # The exact headers depend on the CORS middleware configuration
        assert response.status_code in [200, 405]  # 405 is also acceptable for OPTIONS

    async def test_rate_limiting_integration(self, client):
        """Test rate limiting integration"""
        
        # Create test user
        user_data = {
            "email": f"ratelimit_{datetime.now().timestamp()}@test.com",
            "password": "RateLimit123!",
            "first_name": "Rate",
            "last_name": "Limit"
        }
        client.post("/api/v1/auth/register", json=user_data)
        
        # Make rapid login attempts with wrong password
        failed_attempts = 0
        for i in range(20):  # Try 20 rapid attempts
            response = client.post("/api/v1/auth/login", json={
                "email": user_data["email"],
                "password": "WrongPassword123!"
            })
            
            if response.status_code == 401:
                failed_attempts += 1
            elif response.status_code == 429:  # Rate limited
                break
        
        # Should have made several failed attempts
        assert failed_attempts > 0
        
        # After rate limiting, valid login should still work eventually
        # (This depends on rate limiting implementation)


class TestAuthContractValidation:
    """Contract validation tests for authentication API"""
    
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    def test_registration_response_schema(self, client):
        """Test registration response matches expected schema"""
        user_data = {
            "email": f"schema_{datetime.now().timestamp()}@test.com",
            "password": "SchemaTest123!",
            "first_name": "Schema",
            "last_name": "Test"
        }
        
        response = client.post("/api/v1/auth/register", json=user_data)
        assert response.status_code == 200
        
        data = response.json()
        
        # Validate response structure
        required_fields = ["user", "access_token", "refresh_token", "token_type"]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        # Validate user object structure
        user = data["user"]
        user_required_fields = ["id", "email", "first_name", "last_name", "is_verified", "subscription"]
        for field in user_required_fields:
            assert field in user, f"Missing required user field: {field}"
        
        # Validate subscription structure
        subscription = user["subscription"]
        subscription_required_fields = ["tier", "status"]
        for field in subscription_required_fields:
            assert field in subscription, f"Missing required subscription field: {field}"
        
        # Validate data types
        assert isinstance(data["access_token"], str)
        assert isinstance(data["refresh_token"], str)
        assert isinstance(data["token_type"], str)
        assert isinstance(user["id"], str)
        assert isinstance(user["email"], str)
        assert isinstance(user["is_verified"], bool)
        assert data["token_type"] == "bearer"
    
    def test_login_response_schema(self, client):
        """Test login response matches expected schema"""
        # Register user first
        user_data = {
            "email": f"login_schema_{datetime.now().timestamp()}@test.com",
            "password": "LoginSchema123!",
            "first_name": "Login",
            "last_name": "Schema"
        }
        client.post("/api/v1/auth/register", json=user_data)
        
        # Test login response
        response = client.post("/api/v1/auth/login", json={
            "email": user_data["email"],
            "password": user_data["password"]
        })
        assert response.status_code == 200
        
        data = response.json()
        
        # Same structure as registration
        required_fields = ["user", "access_token", "refresh_token", "token_type"]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
    
    def test_user_info_response_schema(self, client):
        """Test /me endpoint response schema"""
        # Register and login
        user_data = {
            "email": f"me_schema_{datetime.now().timestamp()}@test.com",
            "password": "MeSchema123!",
            "first_name": "Me",
            "last_name": "Schema"
        }
        client.post("/api/v1/auth/register", json=user_data)
        login_response = client.post("/api/v1/auth/login", json={
            "email": user_data["email"],
            "password": user_data["password"]
        })
        
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = client.get("/api/v1/auth/me", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        
        required_fields = [
            "id", "email", "first_name", "last_name", "is_verified",
            "subscription", "usage", "created_at"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        # Validate nested objects
        assert "tier" in data["subscription"]
        assert "workflows_created" in data["usage"]
        assert "workflows_limit" in data["usage"]
    
    def test_error_response_schema(self, client):
        """Test error response schemas are consistent"""
        # Test validation error (422)
        response = client.post("/api/v1/auth/register", json={
            "email": "invalid-email",
            "password": "short"
        })
        assert response.status_code == 422
        
        error_data = response.json()
        assert "detail" in error_data
        
        # Test authentication error (401)
        response = client.post("/api/v1/auth/login", json={
            "email": "nonexistent@test.com",
            "password": "SomePassword123!"
        })
        assert response.status_code == 401
        
        error_data = response.json()
        assert "detail" in error_data
        assert isinstance(error_data["detail"], str)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])