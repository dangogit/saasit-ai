"""
Unit tests for AuthService
"""
import pytest
from datetime import datetime, timedelta
from app.services.auth_service import AuthService
from app.models.user import UserCreate, UserLogin
from app.utils.security import generate_password_reset_token, get_password_hash
from fastapi import HTTPException


class TestAuthService:
    """Test cases for authentication service"""
    
    @pytest.mark.asyncio
    async def test_register_user_success(self, test_db, test_user_data):
        """Test successful user registration"""
        auth_service = AuthService(test_db)
        user_create = UserCreate(**test_user_data)
        
        result = await auth_service.register_user(user_create)
        
        assert result["user"]["email"] == test_user_data["email"]
        assert result["user"]["first_name"] == test_user_data["first_name"]
        assert result["user"]["is_verified"] is False
        assert result["user"]["subscription"]["tier"] == "free"
        assert "access_token" in result
        assert "refresh_token" in result
        assert result["token_type"] == "bearer"
        
        # Verify user was saved to database
        user_in_db = await test_db.users.find_one({"email": test_user_data["email"]})
        assert user_in_db is not None
        assert user_in_db["hashed_password"] != test_user_data["password"]
    
    @pytest.mark.asyncio
    async def test_register_duplicate_user(self, test_db, test_user_data):
        """Test registration with duplicate email"""
        auth_service = AuthService(test_db)
        user_create = UserCreate(**test_user_data)
        
        # Register first user
        await auth_service.register_user(user_create)
        
        # Try to register again with same email
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.register_user(user_create)
        
        assert exc_info.value.status_code == 409
        assert "already exists" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_login_success(self, test_db, test_user_data):
        """Test successful login"""
        auth_service = AuthService(test_db)
        
        # Register user first
        user_create = UserCreate(**test_user_data)
        await auth_service.register_user(user_create)
        
        # Login
        login_data = UserLogin(
            email=test_user_data["email"],
            password=test_user_data["password"]
        )
        result = await auth_service.login_user(login_data)
        
        assert result["user"]["email"] == test_user_data["email"]
        assert "access_token" in result
        assert "refresh_token" in result
        
        # Verify last_login was updated
        user_in_db = await test_db.users.find_one({"email": test_user_data["email"]})
        assert user_in_db["last_login"] is not None
    
    @pytest.mark.asyncio
    async def test_login_wrong_password(self, test_db, test_user_data):
        """Test login with wrong password"""
        auth_service = AuthService(test_db)
        
        # Register user
        user_create = UserCreate(**test_user_data)
        await auth_service.register_user(user_create)
        
        # Try login with wrong password
        login_data = UserLogin(
            email=test_user_data["email"],
            password="WrongPassword123!"
        )
        
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.login_user(login_data)
        
        assert exc_info.value.status_code == 401
        assert "Incorrect email or password" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, test_db):
        """Test login with non-existent email"""
        auth_service = AuthService(test_db)
        
        login_data = UserLogin(
            email="nonexistent@example.com",
            password="TestPass123!"
        )
        
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.login_user(login_data)
        
        assert exc_info.value.status_code == 401
        assert "Incorrect email or password" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_verify_email_success(self, test_db, test_user_data):
        """Test successful email verification"""
        auth_service = AuthService(test_db)
        
        # Register user
        user_create = UserCreate(**test_user_data)
        result = await auth_service.register_user(user_create)
        
        # Get verification token from database
        user_in_db = await test_db.users.find_one({"email": test_user_data["email"]})
        verification_token = user_in_db["email_verification_token"]
        
        # Verify email
        success = await auth_service.verify_email(verification_token)
        assert success is True
        
        # Check user is now verified
        user_in_db = await test_db.users.find_one({"email": test_user_data["email"]})
        assert user_in_db["is_verified"] is True
        assert user_in_db["email_verification_token"] is None
    
    @pytest.mark.asyncio
    async def test_verify_email_invalid_token(self, test_db):
        """Test email verification with invalid token"""
        auth_service = AuthService(test_db)
        
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.verify_email("invalid-token-123")
        
        assert exc_info.value.status_code == 404
        assert "Invalid verification token" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_password_reset_request(self, test_db, test_user_data):
        """Test password reset request"""
        auth_service = AuthService(test_db)
        
        # Register user
        user_create = UserCreate(**test_user_data)
        await auth_service.register_user(user_create)
        
        # Request password reset
        result = await auth_service.request_password_reset(test_user_data["email"])
        assert "reset link has been sent" in result
        
        # Check token was saved
        user_in_db = await test_db.users.find_one({"email": test_user_data["email"]})
        assert user_in_db["password_reset_token"] is not None
        assert user_in_db["password_reset_expires"] is not None
    
    @pytest.mark.asyncio
    async def test_password_reset_nonexistent_user(self, test_db):
        """Test password reset for non-existent user"""
        auth_service = AuthService(test_db)
        
        # Should not reveal if user exists
        result = await auth_service.request_password_reset("nonexistent@example.com")
        assert "reset link has been sent" in result
    
    @pytest.mark.asyncio
    async def test_reset_password_success(self, test_db, test_user_data):
        """Test successful password reset"""
        auth_service = AuthService(test_db)
        
        # Register user
        user_create = UserCreate(**test_user_data)
        await auth_service.register_user(user_create)
        
        # Request password reset
        await auth_service.request_password_reset(test_user_data["email"])
        
        # Get reset token
        user_in_db = await test_db.users.find_one({"email": test_user_data["email"]})
        reset_token = user_in_db["password_reset_token"]
        
        # Reset password
        new_password = "NewSecurePass123!"
        success = await auth_service.reset_password(reset_token, new_password)
        assert success is True
        
        # Try login with new password
        login_data = UserLogin(
            email=test_user_data["email"],
            password=new_password
        )
        result = await auth_service.login_user(login_data)
        assert "access_token" in result
    
    @pytest.mark.asyncio
    async def test_reset_password_expired_token(self, test_db, test_user_data):
        """Test password reset with expired token"""
        auth_service = AuthService(test_db)
        
        # Register user
        user_create = UserCreate(**test_user_data)
        await auth_service.register_user(user_create)
        
        # Set expired token
        expired_time = datetime.utcnow() - timedelta(hours=2)
        reset_token = generate_password_reset_token()
        
        await test_db.users.update_one(
            {"email": test_user_data["email"]},
            {
                "$set": {
                    "password_reset_token": reset_token,
                    "password_reset_expires": expired_time
                }
            }
        )
        
        # Try to reset password
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.reset_password(reset_token, "NewPass123!")
        
        assert exc_info.value.status_code == 404
        assert "Invalid or expired" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_check_user_limit_workflows(self, test_db, test_user_data):
        """Test checking workflow limits for users"""
        auth_service = AuthService(test_db)
        
        # Register user (free tier)
        user_create = UserCreate(**test_user_data)
        result = await auth_service.register_user(user_create)
        user_id = result["user"]["id"]
        
        # Should be within limit initially
        within_limit = await auth_service.check_user_limit(user_id, "workflows")
        assert within_limit is True
        
        # Update usage to reach limit
        await test_db.users.update_one(
            {"_id": user_id},
            {"$set": {"usage.workflows_created": 3}}
        )
        
        # Should now be at limit
        within_limit = await auth_service.check_user_limit(user_id, "workflows")
        assert within_limit is False
        
        # Upgrade to architect tier (unlimited)
        await test_db.users.update_one(
            {"_id": user_id},
            {"$set": {"subscription.tier": "architect"}}
        )
        
        # Should be within limit again
        within_limit = await auth_service.check_user_limit(user_id, "workflows")
        assert within_limit is True