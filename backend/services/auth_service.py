from datetime import datetime, timedelta
from typing import Optional
import bcrypt
import jwt
from fastapi import HTTPException, status
from models.user import User, UserCreate, UserLogin, UserResponse, UserTier
from database.connection import find_one, insert_one, update_one
import os
import logging

logger = logging.getLogger(__name__)

class AuthService:
    def __init__(self):
        self.jwt_secret = os.environ.get('JWT_SECRET', 'your-secret-key')
        self.jwt_algorithm = 'HS256'
        self.access_token_expire_minutes = 15
        self.refresh_token_expire_days = 7

    async def register_user(self, user_data: UserCreate) -> dict:
        """Register a new user"""
        try:
            # Check if user already exists
            existing_user = await find_one("users", {"email": user_data.email})
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User with this email already exists"
                )

            # Hash password
            password_hash = bcrypt.hashpw(
                user_data.password.encode('utf-8'), 
                bcrypt.gensalt()
            ).decode('utf-8')

            # Create user document
            user_doc = {
                "email": user_data.email,
                "password_hash": password_hash,
                "name": user_data.name,
                "tier": UserTier.FREE,
                "email_verified": False,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }

            # Insert user
            user_id = await insert_one("users", user_doc)
            user_doc["_id"] = str(user_id)

            # Generate tokens
            user_response = UserResponse(
                id=str(user_id),
                email=user_doc["email"],
                name=user_doc.get("name"),
                tier=user_doc["tier"],
                created_at=user_doc["created_at"],
                updated_at=user_doc["updated_at"]
            )

            tokens = self._generate_tokens(str(user_id))
            
            return {
                "user": user_response,
                **tokens
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Registration error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Registration failed"
            )

    async def login_user(self, login_data: UserLogin) -> dict:
        """Login user and return tokens"""
        try:
            # Find user
            user_doc = await find_one("users", {"email": login_data.email})
            if not user_doc:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password"
                )

            # Verify password
            if not bcrypt.checkpw(
                login_data.password.encode('utf-8'), 
                user_doc["password_hash"].encode('utf-8')
            ):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password"
                )

            # Create user response
            user_response = UserResponse(
                id=str(user_doc["_id"]),
                email=user_doc["email"],
                name=user_doc.get("name"),
                tier=user_doc["tier"],
                created_at=user_doc["created_at"],
                updated_at=user_doc["updated_at"]
            )

            # Generate tokens
            tokens = self._generate_tokens(str(user_doc["_id"]))
            
            return {
                "user": user_response,
                **tokens
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Login error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Login failed"
            )

    async def get_user_by_id(self, user_id: str) -> Optional[UserResponse]:
        """Get user by ID"""
        try:
            from bson import ObjectId
            user_doc = await find_one("users", {"_id": ObjectId(user_id)})
            if not user_doc:
                return None

            return UserResponse(
                id=str(user_doc["_id"]),
                email=user_doc["email"],
                name=user_doc.get("name"),
                tier=user_doc["tier"],
                created_at=user_doc["created_at"],
                updated_at=user_doc["updated_at"]
            )
        except Exception as e:
            logger.error(f"Get user error: {e}")
            return None

    async def verify_token(self, token: str) -> Optional[str]:
        """Verify JWT token and return user ID"""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=[self.jwt_algorithm])
            user_id = payload.get("user_id")
            if not user_id:
                return None
            
            # Check if token is expired
            exp = payload.get("exp")
            if exp and datetime.utcfromtimestamp(exp) < datetime.utcnow():
                return None
                
            return user_id
        except jwt.InvalidTokenError:
            return None

    async def refresh_token(self, refresh_token: str) -> dict:
        """Refresh access token"""
        try:
            payload = jwt.decode(refresh_token, self.jwt_secret, algorithms=[self.jwt_algorithm])
            user_id = payload.get("user_id")
            token_type = payload.get("type")
            
            if not user_id or token_type != "refresh":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid refresh token"
                )

            # Generate new tokens
            return self._generate_tokens(user_id)

        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )

    def _generate_tokens(self, user_id: str) -> dict:
        """Generate access and refresh tokens"""
        # Access token
        access_token_data = {
            "user_id": user_id,
            "type": "access",
            "exp": datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        }
        access_token = jwt.encode(access_token_data, self.jwt_secret, algorithm=self.jwt_algorithm)

        # Refresh token
        refresh_token_data = {
            "user_id": user_id,
            "type": "refresh",
            "exp": datetime.utcnow() + timedelta(days=self.refresh_token_expire_days)
        }
        refresh_token = jwt.encode(refresh_token_data, self.jwt_secret, algorithm=self.jwt_algorithm)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }

    async def get_tier_limits(self, tier: UserTier) -> dict:
        """Get tier limitations"""
        limits = {
            UserTier.FREE: {
                "max_workflows_per_month": 3,
                "max_messages_per_workflow": 10,
                "max_agents_per_workflow": 10,
                "cloud_execution": False,
                "custom_agents": False
            },
            UserTier.DESIGNER: {
                "max_workflows_per_month": float('inf'),
                "max_messages_per_workflow": float('inf'),
                "max_agents_per_workflow": float('inf'),
                "cloud_execution": False,
                "custom_agents": True
            },
            UserTier.STARTER: {
                "max_workflows_per_month": float('inf'),
                "max_messages_per_workflow": float('inf'),
                "max_agents_per_workflow": float('inf'),
                "cloud_execution": True,
                "custom_agents": True,
                "concurrent_executions": 1,
                "max_runtime_hours": 4
            },
            UserTier.PROFESSIONAL: {
                "max_workflows_per_month": float('inf'),
                "max_messages_per_workflow": float('inf'),
                "max_agents_per_workflow": float('inf'),
                "cloud_execution": True,
                "custom_agents": True,
                "concurrent_executions": 3,
                "max_runtime_hours": 12
            },
            UserTier.SCALE: {
                "max_workflows_per_month": float('inf'),
                "max_messages_per_workflow": float('inf'),
                "max_agents_per_workflow": float('inf'),
                "cloud_execution": True,
                "custom_agents": True,
                "concurrent_executions": 10,
                "max_runtime_hours": 48
            }
        }
        return limits.get(tier, limits[UserTier.FREE])

auth_service = AuthService()