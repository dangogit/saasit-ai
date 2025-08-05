#!/usr/bin/env python3
"""
Comprehensive authentication system test suite for SaasIt.ai backend
Tests all authentication flows including success and failure scenarios
"""

import pytest
import asyncio
from httpx import AsyncClient
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from typing import Dict, Any
import secrets
import string
from unittest.mock import patch

from server import app
from app.config import settings
from app.utils.security import create_tokens, decode_token, verify_password, get_password_hash
from app.models.user import UserCreate, UserLogin


class TestAuthenticationSystem:
    """Comprehensive authentication system tests"""

    @pytest.fixture(scope="class")
    async def async_client(self):
        """Create async HTTP client for testing"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            yield client

    @pytest.fixture(scope="class")
    def sync_client(self):
        """Create sync HTTP client for testing"""
        return TestClient(app)

    @pytest.fixture
    def test_user_data(self):
        """Generate test user data"""
        timestamp = datetime.now().timestamp()
        return {
            "email": f"test_{timestamp}@saasit.ai",
            "password": "TestPass123!",
            "first_name": "Test",
            "last_name": "User",
            "company": "Test Company"
        }

    @pytest.fixture
    def invalid_user_data(self):
        """Generate invalid user data for testing validation"""
        return [
            # Missing required fields
            {"email": "test@example.com"},
            # Invalid email
            {"email": "invalid-email", "password": "TestPass123!", "first_name": "Test", "last_name": "User"},
            # Weak password
            {"email": "test@example.com", "password": "weak", "first_name": "Test", "last_name": "User"},
            # Password without uppercase
            {"email": "test@example.com", "password": "testpass123!", "first_name": "Test", "last_name": "User"},
            # Password without lowercase
            {"email": "test@example.com", "password": "TESTPASS123!", "first_name": "Test", "last_name": "User"},
            # Password without digit
            {"email": "test@example.com", "password": "TestPass!", "first_name": "Test", "last_name": "User"},
            # Empty names
            {"email": "test@example.com", "password": "TestPass123!", "first_name": "", "last_name": "User"},
            # Invalid name characters
            {"email": "test@example.com", "password": "TestPass123!", "first_name": "Test123", "last_name": "User"},
        ]

    async def test_user_registration_success(self, sync_client, test_user_data):
        """Test successful user registration"""
        response = sync_client.post("/api/v1/auth/register", json=test_user_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert "user" in data
        assert "access_token" in data
        assert "refresh_token" in data
        assert "token_type" in data
        
        # Check user data
        user = data["user"]
        assert user["email"] == test_user_data["email"]
        assert user["first_name"] == test_user_data["first_name"]
        assert user["last_name"] == test_user_data["last_name"]
        assert user["is_verified"] == False
        assert "subscription" in user
        assert user["subscription"]["tier"] == "free"
        
        # Check tokens
        assert data["token_type"] == "bearer"
        assert len(data["access_token"]) > 20
        assert len(data["refresh_token"]) > 20
        
        # Verify tokens are valid JWT
        access_payload = decode_token(data["access_token"])
        refresh_payload = decode_token(data["refresh_token"])
        
        assert access_payload["type"] == "access"
        assert refresh_payload["type"] == "refresh"
        assert access_payload["email"] == test_user_data["email"]
        assert refresh_payload["email"] == test_user_data["email"]

    async def test_user_registration_validation_failures(self, sync_client, invalid_user_data):
        """Test registration with invalid data"""
        for invalid_data in invalid_user_data:
            response = sync_client.post("/api/v1/auth/register", json=invalid_data)
            assert response.status_code in [422, 400], f"Failed for data: {invalid_data}"

    async def test_user_registration_duplicate_email(self, sync_client, test_user_data):
        """Test registration with duplicate email"""
        # First registration
        response1 = sync_client.post("/api/v1/auth/register", json=test_user_data)
        assert response1.status_code == 200
        
        # Second registration with same email
        response2 = sync_client.post("/api/v1/auth/register", json=test_user_data)
        assert response2.status_code == 409
        assert "already exists" in response2.json()["detail"].lower()

    async def test_user_login_success(self, sync_client, test_user_data):
        """Test successful user login"""
        # Register user first
        sync_client.post("/api/v1/auth/register", json=test_user_data)
        
        # Login
        login_data = {
            "email": test_user_data["email"],
            "password": test_user_data["password"]
        }
        response = sync_client.post("/api/v1/auth/login", json=login_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert "user" in data
        assert "access_token" in data
        assert "refresh_token" in data
        assert "token_type" in data
        
        # Verify tokens
        access_payload = decode_token(data["access_token"])
        assert access_payload["type"] == "access"
        assert access_payload["email"] == test_user_data["email"]

    async def test_user_login_failures(self, sync_client, test_user_data):
        """Test login with invalid credentials"""
        # Register user first
        sync_client.post("/api/v1/auth/register", json=test_user_data)
        
        # Test wrong password
        response = sync_client.post("/api/v1/auth/login", json={
            "email": test_user_data["email"],
            "password": "WrongPassword123!"
        })
        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()
        
        # Test non-existent user
        response = sync_client.post("/api/v1/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "TestPass123!"
        })
        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()
        
        # Test invalid email format
        response = sync_client.post("/api/v1/auth/login", json={
            "email": "invalid-email",
            "password": "TestPass123!"
        })
        assert response.status_code == 422

    async def test_token_refresh_success(self, sync_client, test_user_data):
        """Test successful token refresh"""
        # Register and login
        sync_client.post("/api/v1/auth/register", json=test_user_data)
        login_response = sync_client.post("/api/v1/auth/login", json={
            "email": test_user_data["email"],
            "password": test_user_data["password"]
        })
        
        refresh_token = login_response.json()["refresh_token"]
        
        # Refresh token
        response = sync_client.post("/api/v1/auth/refresh", json={
            "refresh_token": refresh_token
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert "access_token" in data
        assert "refresh_token" in data
        assert "token_type" in data
        
        # Verify new tokens are different
        assert data["access_token"] != login_response.json()["access_token"]
        assert data["refresh_token"] != refresh_token

    async def test_token_refresh_failures(self, sync_client):
        """Test token refresh with invalid tokens"""
        # Test with invalid token
        response = sync_client.post("/api/v1/auth/refresh", json={
            "refresh_token": "invalid_token"
        })
        assert response.status_code == 401
        
        # Test with access token instead of refresh token
        test_data = {"email": "test@example.com", "password": "TestPass123!", "first_name": "Test", "last_name": "User"}
        sync_client.post("/api/v1/auth/register", json=test_data)
        login_response = sync_client.post("/api/v1/auth/login", json={
            "email": test_data["email"],
            "password": test_data["password"]
        })
        
        access_token = login_response.json()["access_token"]
        response = sync_client.post("/api/v1/auth/refresh", json={
            "refresh_token": access_token
        })
        assert response.status_code == 401

    async def test_protected_route_access(self, sync_client, test_user_data):
        """Test accessing protected routes with and without authentication"""
        # Test without token
        response = sync_client.get("/api/v1/auth/me")
        assert response.status_code == 403  # No Authorization header
        
        # Test with invalid token
        headers = {"Authorization": "Bearer invalid_token"}
        response = sync_client.get("/api/v1/auth/me", headers=headers)
        assert response.status_code == 401
        
        # Register and login
        sync_client.post("/api/v1/auth/register", json=test_user_data)
        login_response = sync_client.post("/api/v1/auth/login", json={
            "email": test_user_data["email"],
            "password": test_user_data["password"]
        })
        
        access_token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {access_token}"}
        
        # Test with valid token
        response = sync_client.get("/api/v1/auth/me", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["email"] == test_user_data["email"]
        assert data["first_name"] == test_user_data["first_name"]

    async def test_email_verification_flow(self, sync_client, test_user_data):
        """Test email verification flow"""
        # Register user
        response = sync_client.post("/api/v1/auth/register", json=test_user_data)
        assert response.status_code == 200
        
        # In a real implementation, we'd get the token from the database
        # For testing, we'll simulate a verification token
        verification_token = "test_verification_token_123"
        
        # Test with invalid token
        response = sync_client.get(f"/api/v1/auth/verify-email/invalid_token")
        assert response.status_code == 400
        
        # TODO: Add actual email verification test once database mocking is set up

    async def test_password_reset_flow(self, sync_client, test_user_data):
        """Test password reset flow"""
        # Register user
        sync_client.post("/api/v1/auth/register", json=test_user_data)
        
        # Request password reset
        response = sync_client.post("/api/v1/auth/forgot-password", json={
            "email": test_user_data["email"]
        })
        assert response.status_code == 200
        assert "reset link" in response.json()["message"].lower()
        
        # Test with non-existent email (should still return success for security)
        response = sync_client.post("/api/v1/auth/forgot-password", json={
            "email": "nonexistent@example.com"
        })
        assert response.status_code == 200
        assert "reset link" in response.json()["message"].lower()
        
        # Test password reset with invalid token
        response = sync_client.post("/api/v1/auth/reset-password", json={
            "token": "invalid_token",
            "new_password": "NewPassword123!"
        })
        assert response.status_code == 400

    async def test_logout_flow(self, sync_client, test_user_data):
        """Test user logout"""
        # Register and login
        sync_client.post("/api/v1/auth/register", json=test_user_data)
        login_response = sync_client.post("/api/v1/auth/login", json={
            "email": test_user_data["email"],
            "password": test_user_data["password"]
        })
        
        access_token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {access_token}"}
        
        # Logout
        response = sync_client.post("/api/v1/auth/logout", headers=headers)
        assert response.status_code == 200
        assert "logged out" in response.json()["message"].lower()
        
        # Test logout without token
        response = sync_client.post("/api/v1/auth/logout")
        assert response.status_code == 403

    async def test_security_utilities(self):
        """Test security utility functions"""
        # Test password hashing
        password = "TestPassword123!"
        hashed = get_password_hash(password)
        
        assert hashed != password
        assert verify_password(password, hashed) == True
        assert verify_password("wrong_password", hashed) == False
        
        # Test token creation and verification
        user_data = {
            "user_id": "test_user_123",
            "email": "test@example.com",
            "tier": "free"
        }
        
        tokens = create_tokens(**user_data)
        assert "access_token" in tokens
        assert "refresh_token" in tokens
        assert "token_type" in tokens
        
        # Verify access token
        access_payload = decode_token(tokens["access_token"])
        assert access_payload["type"] == "access"
        assert access_payload["sub"] == user_data["user_id"]
        assert access_payload["email"] == user_data["email"]
        
        # Verify refresh token
        refresh_payload = decode_token(tokens["refresh_token"])
        assert refresh_payload["type"] == "refresh"
        assert refresh_payload["sub"] == user_data["user_id"]

    async def test_rate_limiting(self, sync_client, test_user_data):
        """Test rate limiting on authentication endpoints"""
        # This is a basic test - in production, you'd need Redis for proper rate limiting
        # Register user
        sync_client.post("/api/v1/auth/register", json=test_user_data)
        
        # Make multiple rapid login attempts
        login_data = {
            "email": test_user_data["email"],
            "password": "wrong_password"
        }
        
        responses = []
        for _ in range(10):
            response = sync_client.post("/api/v1/auth/login", json=login_data)
            responses.append(response.status_code)
        
        # All should return 401 for wrong password
        # In production, after several attempts, we'd expect 429 (Too Many Requests)
        assert all(code == 401 for code in responses)

    async def test_tier_based_access(self, sync_client, test_user_data):
        """Test tier-based access control"""
        # Register user (defaults to free tier)
        sync_client.post("/api/v1/auth/register", json=test_user_data)
        login_response = sync_client.post("/api/v1/auth/login", json={
            "email": test_user_data["email"],
            "password": test_user_data["password"]
        })
        
        access_token = login_response.json()["access_token"]
        
        # Verify user has free tier
        payload = decode_token(access_token)
        assert payload["tier"] == "free"

    def test_configuration_security(self):
        """Test security configuration"""
        # Check that security settings are properly configured
        assert settings.secret_key != "your-secret-key-change-in-production"
        assert settings.access_token_expire_minutes > 0
        assert settings.refresh_token_expire_days > 0
        assert settings.algorithm == "HS256"

    async def test_error_handling(self, sync_client):
        """Test error handling in authentication flows"""
        # Test malformed JSON
        response = sync_client.post(
            "/api/v1/auth/register",
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 422
        
        # Test missing fields
        response = sync_client.post("/api/v1/auth/register", json={})
        assert response.status_code == 422
        
        # Test invalid JSON types
        response = sync_client.post("/api/v1/auth/register", json={
            "email": 123,  # Should be string
            "password": ["array"],  # Should be string
            "first_name": True,  # Should be string
            "last_name": None  # Should be string
        })
        assert response.status_code == 422


# Performance and Load Testing
class TestAuthPerformance:
    """Performance tests for authentication system"""
    
    async def test_registration_performance(self, sync_client):
        """Test registration endpoint performance"""
        import time
        
        test_data = {
            "email": f"perf_test_{time.time()}@example.com",
            "password": "TestPass123!",
            "first_name": "Performance",
            "last_name": "Test"
        }
        
        start_time = time.time()
        response = sync_client.post("/api/v1/auth/register", json=test_data)
        end_time = time.time()
        
        assert response.status_code == 200
        assert (end_time - start_time) < 2.0  # Should complete within 2 seconds
    
    async def test_login_performance(self, sync_client):
        """Test login endpoint performance"""
        import time
        
        # Register user first
        test_data = {
            "email": f"perf_login_{time.time()}@example.com",
            "password": "TestPass123!",
            "first_name": "Performance",
            "last_name": "Test"
        }
        sync_client.post("/api/v1/auth/register", json=test_data)
        
        # Test login performance
        login_data = {
            "email": test_data["email"],
            "password": test_data["password"]
        }
        
        start_time = time.time()
        response = sync_client.post("/api/v1/auth/login", json=login_data)
        end_time = time.time()
        
        assert response.status_code == 200
        assert (end_time - start_time) < 1.0  # Login should be faster than registration
    
    async def test_concurrent_registrations(self):
        """Test handling concurrent user registrations"""
        import asyncio
        import httpx
        
        async def register_user(client, user_id):
            test_data = {
                "email": f"concurrent_{user_id}@example.com",
                "password": "TestPass123!",
                "first_name": f"User{user_id}",
                "last_name": "Test"
            }
            response = await client.post("/api/v1/auth/register", json=test_data)
            return response.status_code
        
        async with httpx.AsyncClient(app=app, base_url="http://test") as client:
            # Create 10 concurrent registration requests
            tasks = [register_user(client, i) for i in range(10)]
            results = await asyncio.gather(*tasks)
            
            # All should succeed
            assert all(code == 200 for code in results)


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v", "--tb=short"])