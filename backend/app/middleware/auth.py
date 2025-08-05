from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from typing import Optional

from app.utils.security import decode_token
from app.models.user import TokenData
from app.config import settings

security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> TokenData:
    """Dependency to get current user from JWT token"""
    token = credentials.credentials
    
    try:
        payload = decode_token(token)
        
        # Check token type
        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Extract user data
        user_id: str = payload.get("sub")
        email: str = payload.get("email")
        tier: str = payload.get("tier", "free")
        
        if user_id is None or email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return TokenData(user_id=user_id, email=email, tier=tier)
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_active_user(
    current_user: TokenData = Depends(get_current_user)
) -> TokenData:
    """Dependency to ensure user is active"""
    # In a real app, you'd check the database here
    # For now, we'll assume all authenticated users are active
    return current_user


class TierChecker:
    """Dependency to check if user has required tier"""
    
    def __init__(self, allowed_tiers: list[str]):
        self.allowed_tiers = allowed_tiers
    
    def __call__(self, current_user: TokenData = Depends(get_current_active_user)) -> TokenData:
        if current_user.tier not in self.allowed_tiers:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This feature requires one of the following tiers: {', '.join(self.allowed_tiers)}"
            )
        return current_user


# Tier checkers for different access levels
require_architect = TierChecker(["architect", "builder", "shipper", "studio"])
require_builder = TierChecker(["builder", "shipper", "studio"])
require_shipper = TierChecker(["shipper", "studio"])
require_studio = TierChecker(["studio"])


class RateLimiter:
    """Simple in-memory rate limiter (should use Redis in production)"""
    
    def __init__(self):
        self.requests = {}
    
    async def check_rate_limit(self, user_id: str, tier: str) -> bool:
        """Check if user has exceeded rate limit"""
        # TODO: Implement proper rate limiting with Redis
        # For now, we'll use the tier-based limits from settings
        limit = settings.rate_limit_per_minute.get(tier, 20)
        
        # Simple implementation - in production, use Redis with sliding window
        return True


rate_limiter = RateLimiter()


async def check_rate_limit(
    current_user: TokenData = Depends(get_current_active_user)
) -> TokenData:
    """Dependency to check rate limits"""
    allowed = await rate_limiter.check_rate_limit(current_user.user_id, current_user.tier)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later."
        )
    return current_user