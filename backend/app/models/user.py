from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum


class UserTier(str, Enum):
    FREE = "free"
    ARCHITECT = "architect"
    BUILDER = "builder"
    SHIPPER = "shipper"
    STUDIO = "studio"


class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    DELETED = "deleted"


class UserBase(BaseModel):
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    company: Optional[str] = Field(None, max_length=100)
    
    @validator('first_name', 'last_name')
    def name_must_not_have_special_chars(cls, v):
        if not v.replace(" ", "").replace("-", "").replace("'", "").isalpha():
            raise ValueError('Name must contain only letters, spaces, hyphens, and apostrophes')
        return v


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=100)
    
    @validator('password')
    def password_strength(cls, v):
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one digit')
        if not any(char.isupper() for char in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(char.islower() for char in v):
            raise ValueError('Password must contain at least one lowercase letter')
        return v


class UserUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=50)
    last_name: Optional[str] = Field(None, min_length=1, max_length=50)
    company: Optional[str] = Field(None, max_length=100)


class UserSubscription(BaseModel):
    tier: UserTier = UserTier.FREE
    status: str = "active"  # active, cancelled, expired
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    cancelled_at: Optional[datetime] = None


class UserUsage(BaseModel):
    workflows_created: int = 0
    workflows_limit: int = 3
    chat_messages_used: int = 0
    api_calls_today: int = 0
    storage_used_mb: float = 0.0
    last_reset_date: datetime = Field(default_factory=datetime.utcnow)


class UserInDB(UserBase):
    id: str = Field(alias="_id")
    hashed_password: str
    is_active: bool = True
    is_verified: bool = False
    is_superuser: bool = False
    status: UserStatus = UserStatus.ACTIVE
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    email_verification_token: Optional[str] = None
    password_reset_token: Optional[str] = None
    password_reset_expires: Optional[datetime] = None
    subscription: UserSubscription = Field(default_factory=UserSubscription)
    usage: UserUsage = Field(default_factory=UserUsage)
    preferences: Dict[str, Any] = Field(default_factory=dict)
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class User(UserBase):
    id: str
    is_active: bool = True
    is_verified: bool = False
    is_superuser: bool = False
    created_at: datetime
    subscription: UserSubscription
    usage: UserUsage
    
    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None
    tier: Optional[str] = None


class PasswordReset(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=100)


class EmailVerification(BaseModel):
    token: str