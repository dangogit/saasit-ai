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


class AuthProvider(str, Enum):
    EMAIL = "email"
    GOOGLE = "google"


class UserBase(BaseModel):
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    company: Optional[str] = Field(None, max_length=100)
    provider: AuthProvider = AuthProvider.EMAIL
    google_id: Optional[str] = Field(None, max_length=100)
    profile_picture: Optional[str] = Field(None, max_length=500)
    verified_email: Optional[bool] = None
    
    @validator('first_name', 'last_name')
    def name_must_not_have_special_chars(cls, v):
        if not v.replace(" ", "").replace("-", "").replace("'", "").isalpha():
            raise ValueError('Name must contain only letters, spaces, hyphens, and apostrophes')
        return v


class UserCreate(UserBase):
    password: Optional[str] = Field(None, min_length=8, max_length=100)
    
    @validator('password')
    def password_strength(cls, v, values):
        # Password is required for email auth, optional for Google OAuth
        provider = values.get('provider', AuthProvider.EMAIL)
        
        if provider == AuthProvider.EMAIL and not v:
            raise ValueError('Password is required for email authentication')
        
        if v:  # Only validate if password is provided
            if not any(char.isdigit() for char in v):
                raise ValueError('Password must contain at least one digit')
            if not any(char.isupper() for char in v):
                raise ValueError('Password must contain at least one uppercase letter')
            if not any(char.islower() for char in v):
                raise ValueError('Password must contain at least one lowercase letter')
        
        return v
    
    @validator('google_id')
    def validate_google_id(cls, v, values):
        provider = values.get('provider', AuthProvider.EMAIL)
        
        if provider == AuthProvider.GOOGLE and not v:
            raise ValueError('Google ID is required for Google authentication')
        
        if provider == AuthProvider.EMAIL and v:
            raise ValueError('Google ID should not be provided for email authentication')
        
        return v


class UserUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=50)
    last_name: Optional[str] = Field(None, min_length=1, max_length=50)
    company: Optional[str] = Field(None, max_length=100)
    profile_picture: Optional[str] = Field(None, max_length=500)


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
    hashed_password: Optional[str] = None  # Optional for Google OAuth users
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


class GoogleOAuthUser(BaseModel):
    """Model for Google OAuth user data"""
    google_id: str
    email: EmailStr
    first_name: str
    last_name: str
    profile_picture: Optional[str] = None
    verified_email: bool = True


class GoogleCredentialRequest(BaseModel):
    """Model for Google credential authentication request"""
    credential: str = Field(..., description="Google ID token from frontend OAuth flow")