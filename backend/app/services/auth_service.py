from typing import Optional
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import HTTPException, status
import logging

from app.models.user import UserCreate, UserInDB, UserLogin, UserTier
from app.utils.security import (
    verify_password, 
    get_password_hash, 
    create_tokens,
    generate_verification_token,
    generate_password_reset_token
)
from app.config import settings

logger = logging.getLogger(__name__)


class AuthService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.users_collection = db.users
        
    async def register_user(self, user_data: UserCreate) -> dict:
        """Register a new user"""
        # Check if user already exists
        existing_user = await self.users_collection.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User with this email already exists"
            )
        
        # Create user document
        user_dict = user_data.model_dump()
        user_dict.pop("password")
        
        user_in_db = UserInDB(
            **user_dict,
            _id=str(datetime.utcnow().timestamp()).replace(".", ""),
            hashed_password=get_password_hash(user_data.password),
            email_verification_token=generate_verification_token(),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        # Insert user into database
        user_doc = user_in_db.model_dump(by_alias=True)
        await self.users_collection.insert_one(user_doc)
        
        # Create tokens
        tokens = create_tokens(
            user_id=user_in_db.id,
            email=user_in_db.email,
            tier=user_in_db.subscription.tier
        )
        
        # TODO: Send verification email
        logger.info(f"User registered: {user_in_db.email}")
        
        return {
            "user": {
                "id": user_in_db.id,
                "email": user_in_db.email,
                "first_name": user_in_db.first_name,
                "last_name": user_in_db.last_name,
                "is_verified": user_in_db.is_verified,
                "subscription": user_in_db.subscription.model_dump()
            },
            **tokens
        }
    
    async def login_user(self, login_data: UserLogin) -> dict:
        """Authenticate user and return tokens"""
        # Find user
        user_doc = await self.users_collection.find_one({"email": login_data.email})
        if not user_doc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        user = UserInDB(**user_doc)
        
        # Verify password
        if not verify_password(login_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        # Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive"
            )
        
        # Update last login
        await self.users_collection.update_one(
            {"_id": user.id},
            {"$set": {"last_login": datetime.utcnow()}}
        )
        
        # Create tokens
        tokens = create_tokens(
            user_id=user.id,
            email=user.email,
            tier=user.subscription.tier
        )
        
        return {
            "user": {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "is_verified": user.is_verified,
                "subscription": user.subscription.model_dump()
            },
            **tokens
        }
    
    async def verify_email(self, token: str) -> bool:
        """Verify user email with token"""
        user_doc = await self.users_collection.find_one({"email_verification_token": token})
        if not user_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid verification token"
            )
        
        # Update user as verified
        await self.users_collection.update_one(
            {"_id": user_doc["_id"]},
            {
                "$set": {
                    "is_verified": True,
                    "email_verification_token": None,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return True
    
    async def request_password_reset(self, email: str) -> str:
        """Generate password reset token"""
        user_doc = await self.users_collection.find_one({"email": email})
        if not user_doc:
            # Don't reveal if user exists
            return "If the email exists, a reset link has been sent"
        
        # Generate reset token
        reset_token = generate_password_reset_token()
        reset_expires = datetime.utcnow() + timedelta(hours=1)
        
        # Update user with reset token
        await self.users_collection.update_one(
            {"_id": user_doc["_id"]},
            {
                "$set": {
                    "password_reset_token": reset_token,
                    "password_reset_expires": reset_expires,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # TODO: Send password reset email
        logger.info(f"Password reset requested for: {email}")
        
        return "If the email exists, a reset link has been sent"
    
    async def reset_password(self, token: str, new_password: str) -> bool:
        """Reset user password with token"""
        user_doc = await self.users_collection.find_one({
            "password_reset_token": token,
            "password_reset_expires": {"$gt": datetime.utcnow()}
        })
        
        if not user_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid or expired reset token"
            )
        
        # Update password
        await self.users_collection.update_one(
            {"_id": user_doc["_id"]},
            {
                "$set": {
                    "hashed_password": get_password_hash(new_password),
                    "password_reset_token": None,
                    "password_reset_expires": None,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return True
    
    async def get_user_by_id(self, user_id: str) -> Optional[UserInDB]:
        """Get user by ID"""
        user_doc = await self.users_collection.find_one({"_id": user_id})
        if user_doc:
            return UserInDB(**user_doc)
        return None
    
    async def update_user_usage(self, user_id: str, usage_update: dict) -> bool:
        """Update user usage statistics"""
        result = await self.users_collection.update_one(
            {"_id": user_id},
            {
                "$inc": usage_update,
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        return result.modified_count > 0
    
    async def check_user_limit(self, user_id: str, limit_type: str) -> bool:
        """Check if user has exceeded their tier limits"""
        user = await self.get_user_by_id(user_id)
        if not user:
            return False
        
        tier_limits = settings.tier_limits.get(user.subscription.tier, {})
        
        if limit_type == "workflows":
            limit = tier_limits.get("workflows_per_month", 0)
            if limit == -1:  # Unlimited
                return True
            return user.usage.workflows_created < limit
        
        # Add more limit checks as needed
        
        return True