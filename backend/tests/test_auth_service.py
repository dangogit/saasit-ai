"""
Unit tests for AuthService class.
Tests all authentication service methods including registration, login, 
password reset, email verification, and user management.
"""

import pytest
from datetime import datetime, timedelta
from fastapi import HTTPException
from unittest.mock import patch, AsyncMock

from app.services.auth_service import AuthService
from app.models.user import UserCreate, UserLogin, UserInDB, UserTier, UserStatus
from app.utils.security import verify_password, get_password_hash, decode_token


class TestAuthService:
    """Test suite for AuthService class methods."""

    @pytest.mark.asyncio
    async def test_register_user_success(self, auth_service: AuthService, test_user_data: dict):
        """Test successful user registration."""
        user_create = UserCreate(**test_user_data)
        result = await auth_service.register_user(user_create)
        
        # Verify response structure
        assert "user" in result
        assert "access_token" in result
        assert "refresh_token" in result
        assert "token_type" in result
        
        # Verify user data
        user_data = result["user"]
        assert user_data["email"] == test_user_data["email"]
        assert user_data["first_name"] == test_user_data["first_name"]
        assert user_data["last_name"] == test_user_data["last_name"]
        assert user_data["is_verified"] is False
        assert user_data["subscription"]["tier"] == UserTier.FREE
        
        # Verify token
        assert result["token_type"] == "bearer"
        
        # Verify user is in database
        user_in_db = await auth_service.get_user_by_id(user_data["id"])
        assert user_in_db is not None
        assert user_in_db.email == test_user_data["email"]
        assert verify_password(test_user_data["password"], user_in_db.hashed_password)

    @pytest.mark.asyncio
    async def test_register_user_duplicate_email(self, auth_service: AuthService, test_user_data: dict):
        """Test registration with duplicate email fails."""
        user_create = UserCreate(**test_user_data)
        
        # Register first user
        await auth_service.register_user(user_create)
        
        # Try to register same email again
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.register_user(user_create)
        
        assert exc_info.value.status_code == 409
        assert "already exists" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_login_user_success(self, auth_service: AuthService, test_user_in_db: UserInDB):
        """Test successful user login."""
        login_data = UserLogin(
            email=test_user_in_db.email,
            password="TestPass123!"  # Original password from fixture
        )
        
        result = await auth_service.login_user(login_data)
        
        # Verify response structure
        assert "user" in result
        assert "access_token" in result
        assert "refresh_token" in result
        assert "token_type" in result
        
        # Verify user data
        user_data = result["user"]
        assert user_data["email"] == test_user_in_db.email
        assert user_data["id"] == test_user_in_db.id
        
        # Verify tokens are valid
        access_payload = decode_token(result["access_token"])
        assert access_payload["sub"] == test_user_in_db.id
        assert access_payload["email"] == test_user_in_db.email
        assert access_payload["type"] == "access"
        
        refresh_payload = decode_token(result["refresh_token"])
        assert refresh_payload["sub"] == test_user_in_db.id
        assert refresh_payload["type"] == "refresh"

    @pytest.mark.asyncio
    async def test_login_invalid_email(self, auth_service: AuthService):
        """Test login with non-existent email."""
        login_data = UserLogin(
            email="nonexistent@example.com",
            password="TestPass123!"
        )
        
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.login_user(login_data)
        
        assert exc_info.value.status_code == 401
        assert "Incorrect email or password" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_login_invalid_password(self, auth_service: AuthService, test_user_in_db: UserInDB):
        """Test login with incorrect password."""
        login_data = UserLogin(
            email=test_user_in_db.email,
            password="WrongPassword123!"
        )
        
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.login_user(login_data)
        
        assert exc_info.value.status_code == 401
        assert "Incorrect email or password" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_login_inactive_user(self, auth_service: AuthService, test_user_in_db: UserInDB):
        """Test login with inactive user account."""
        # Deactivate user
        await auth_service.users_collection.update_one(
            {"_id": test_user_in_db.id},
            {"$set": {"is_active": False}}
        )
        
        login_data = UserLogin(
            email=test_user_in_db.email,
            password="TestPass123!"
        )
        
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.login_user(login_data)
        
        assert exc_info.value.status_code == 403
        assert "inactive" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_verify_email_success(self, auth_service: AuthService, test_user_in_db: UserInDB):
        """Test successful email verification."""
        # Ensure user has verification token
        token = "test_verification_token_12345"
        await auth_service.users_collection.update_one(
            {"_id": test_user_in_db.id},
            {"$set": {"email_verification_token": token, "is_verified": False}}
        )
        
        result = await auth_service.verify_email(token)
        assert result is True
        
        # Verify user is now verified
        updated_user = await auth_service.get_user_by_id(test_user_in_db.id)
        assert updated_user.is_verified is True
        assert updated_user.email_verification_token is None

    @pytest.mark.asyncio
    async def test_verify_email_invalid_token(self, auth_service: AuthService):
        """Test email verification with invalid token."""
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.verify_email("invalid_token_12345")
        
        assert exc_info.value.status_code == 404
        assert "Invalid verification token" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_request_password_reset_existing_user(self, auth_service: AuthService, test_user_in_db: UserInDB):
        """Test password reset request for existing user."""
        result = await auth_service.request_password_reset(test_user_in_db.email)
        
        assert "reset link has been sent" in result
        
        # Verify reset token was set
        updated_user = await auth_service.get_user_by_id(test_user_in_db.id)
        assert updated_user.password_reset_token is not None
        assert updated_user.password_reset_expires is not None
        assert updated_user.password_reset_expires > datetime.utcnow()

    @pytest.mark.asyncio
    async def test_request_password_reset_nonexistent_user(self, auth_service: AuthService):
        """Test password reset request for non-existent user."""
        result = await auth_service.request_password_reset("nonexistent@example.com")
        
        # Should not reveal if user exists
        assert "reset link has been sent" in result

    @pytest.mark.asyncio
    async def test_reset_password_success(self, auth_service: AuthService, test_user_in_db: UserInDB):
        """Test successful password reset."""
        # Set up reset token
        reset_token = "valid_reset_token_12345"
        reset_expires = datetime.utcnow() + timedelta(hours=1)
        await auth_service.users_collection.update_one(
            {"_id": test_user_in_db.id},
            {
                "$set": {
                    "password_reset_token": reset_token,
                    "password_reset_expires": reset_expires
                }
            }
        )
        
        new_password = "NewPassword123!"
        result = await auth_service.reset_password(reset_token, new_password)
        
        assert result is True
        
        # Verify password was changed
        updated_user = await auth_service.get_user_by_id(test_user_in_db.id)
        assert verify_password(new_password, updated_user.hashed_password)
        assert updated_user.password_reset_token is None
        assert updated_user.password_reset_expires is None

    @pytest.mark.asyncio
    async def test_reset_password_invalid_token(self, auth_service: AuthService):
        """Test password reset with invalid token."""
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.reset_password("invalid_token", "NewPassword123!")
        
        assert exc_info.value.status_code == 404
        assert "Invalid or expired reset token" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_reset_password_expired_token(self, auth_service: AuthService, test_user_in_db: UserInDB):
        """Test password reset with expired token."""
        # Set up expired reset token
        reset_token = "expired_reset_token_12345"
        reset_expires = datetime.utcnow() - timedelta(hours=1)  # Expired
        await auth_service.users_collection.update_one(
            {"_id": test_user_in_db.id},
            {
                "$set": {
                    "password_reset_token": reset_token,
                    "password_reset_expires": reset_expires
                }
            }
        )
        
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.reset_password(reset_token, "NewPassword123!")
        
        assert exc_info.value.status_code == 404
        assert "Invalid or expired reset token" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_get_user_by_id_success(self, auth_service: AuthService, test_user_in_db: UserInDB):
        """Test successful user retrieval by ID."""
        user = await auth_service.get_user_by_id(test_user_in_db.id)
        
        assert user is not None
        assert user.id == test_user_in_db.id
        assert user.email == test_user_in_db.email
        assert isinstance(user, UserInDB)

    @pytest.mark.asyncio
    async def test_get_user_by_id_not_found(self, auth_service: AuthService):
        """Test user retrieval with non-existent ID."""
        user = await auth_service.get_user_by_id("nonexistent_id_12345")
        assert user is None

    @pytest.mark.asyncio
    async def test_update_user_usage_success(self, auth_service: AuthService, test_user_in_db: UserInDB):
        """Test successful user usage update."""
        usage_update = {
            "usage.workflows_created": 1,
            "usage.chat_messages_used": 5
        }
        
        result = await auth_service.update_user_usage(test_user_in_db.id, usage_update)
        assert result is True
        
        # Verify usage was updated
        updated_user = await auth_service.get_user_by_id(test_user_in_db.id)
        assert updated_user.usage.workflows_created == 1
        assert updated_user.usage.chat_messages_used == 5

    @pytest.mark.asyncio
    async def test_update_user_usage_user_not_found(self, auth_service: AuthService):
        """Test usage update for non-existent user."""
        usage_update = {"usage.workflows_created": 1}
        
        result = await auth_service.update_user_usage("nonexistent_id", usage_update)
        assert result is False

    @pytest.mark.asyncio
    async def test_check_user_limit_workflows_within_limit(self, auth_service: AuthService, test_user_in_db: UserInDB):
        """Test workflow limit check when user is within limits."""
        # Free tier allows 3 workflows per month
        result = await auth_service.check_user_limit(test_user_in_db.id, "workflows")
        assert result is True

    @pytest.mark.asyncio
    async def test_check_user_limit_workflows_unlimited(self, auth_service: AuthService, test_user_in_db: UserInDB):
        """Test workflow limit check for unlimited tier."""
        # Update user to architect tier (unlimited)
        await auth_service.users_collection.update_one(
            {"_id": test_user_in_db.id},
            {"$set": {"subscription.tier": UserTier.ARCHITECT}}
        )
        
        result = await auth_service.check_user_limit(test_user_in_db.id, "workflows")
        assert result is True

    @pytest.mark.asyncio
    async def test_check_user_limit_user_not_found(self, auth_service: AuthService):
        """Test limit check for non-existent user."""
        result = await auth_service.check_user_limit("nonexistent_id", "workflows")
        assert result is False

    @pytest.mark.asyncio
    async def test_login_updates_last_login(self, auth_service: AuthService, test_user_in_db: UserInDB):
        """Test that login updates the last_login timestamp."""
        # Ensure last_login is initially None
        await auth_service.users_collection.update_one(
            {"_id": test_user_in_db.id},
            {"$set": {"last_login": None}}
        )
        
        login_data = UserLogin(
            email=test_user_in_db.email,
            password="TestPass123!"
        )
        
        before_login = datetime.utcnow()
        await auth_service.login_user(login_data)
        
        # Verify last_login was updated
        updated_user = await auth_service.get_user_by_id(test_user_in_db.id)
        assert updated_user.last_login is not None
        assert updated_user.last_login >= before_login

    @pytest.mark.asyncio
    async def test_user_creation_default_values(self, auth_service: AuthService):
        """Test that user creation sets correct default values."""
        user_data = {
            "email": "defaults@example.com",
            "password": "TestPass123!",
            "first_name": "Default",
            "last_name": "User"
        }
        
        user_create = UserCreate(**user_data)
        result = await auth_service.register_user(user_create)
        
        user = await auth_service.get_user_by_id(result["user"]["id"])
        
        # Check default values
        assert user.is_active is True
        assert user.is_verified is False
        assert user.is_superuser is False
        assert user.status == UserStatus.ACTIVE
        assert user.subscription.tier == UserTier.FREE
        assert user.subscription.status == "active"
        assert user.usage.workflows_created == 0
        assert user.usage.workflows_limit == 3
        assert user.usage.chat_messages_used == 0
        assert user.email_verification_token is not None
        assert len(user.email_verification_token) == 64

    @pytest.mark.asyncio
    async def test_concurrent_user_registrations(self, auth_service: AuthService):
        """Test concurrent user registrations don't cause conflicts."""
        import asyncio
        
        async def register_user(suffix: str):
            user_data = {
                "email": f"concurrent_{suffix}@example.com",
                "password": "TestPass123!",
                "first_name": f"Test{suffix}",
                "last_name": "User"
            }
            user_create = UserCreate(**user_data)
            return await auth_service.register_user(user_create)
        
        # Register multiple users concurrently
        tasks = [register_user(str(i)) for i in range(5)]
        results = await asyncio.gather(*tasks)
        
        # Verify all registrations succeeded
        assert len(results) == 5
        user_ids = [result["user"]["id"] for result in results]
        assert len(set(user_ids)) == 5  # All unique IDs
        
        # Verify all users exist in database
        for result in results:
            user = await auth_service.get_user_by_id(result["user"]["id"])
            assert user is not None