from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from enum import Enum
from datetime import datetime

class UserTier(str, Enum):
    FREE = "FREE"
    DESIGNER = "DESIGNER"
    STARTER = "STARTER"
    PROFESSIONAL = "PROFESSIONAL"
    SCALE = "SCALE"
    ENTERPRISE = "ENTERPRISE"

class User(BaseModel):
    id: str = Field(..., alias="_id")
    email: EmailStr
    password_hash: str
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    tier: UserTier = UserTier.FREE
    stripe_customer_id: Optional[str] = None
    email_verified: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        allow_population_by_field_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class UserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    tier: UserTier
    created_at: datetime
    updated_at: datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    avatar_url: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse