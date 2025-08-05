from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from typing import Optional
import logging
from datetime import datetime, timezone

from app.utils.security import decode_token
from app.models.user import TokenData
from app.config import settings

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)  # Don't auto error, we'll handle it manually


async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> TokenData:
    """Dependency to get current user from JWT token"""
    if not credentials:
        logger.warning("No authorization credentials provided")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization credentials required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    
    try:
        payload = decode_token(token)
        
        # Check token type
        token_type = payload.get("type")
        if token_type != "access":
            logger.warning(f"Invalid token type received: {token_type}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type. Expected access token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Check token expiration (additional safety check)
        exp = payload.get("exp")
        if exp and datetime.fromtimestamp(exp, tz=timezone.utc) < datetime.now(tz=timezone.utc):
            logger.warning(f"Expired token used by user: {payload.get('email')}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Extract user data
        user_id: str = payload.get("sub")
        email: str = payload.get("email")
        tier: str = payload.get("tier", "free")
        
        if not user_id or not email:
            logger.error(f"Invalid token payload - missing user_id or email: {payload}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Log successful authentication for monitoring
        logger.debug(f"Successfully authenticated user: {email} (tier: {tier})")
        
        return TokenData(user_id=user_id, email=email, tier=tier)
        
    except JWTError as e:
        logger.warning(f"JWT validation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Unexpected error during authentication: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_active_user(
    current_user: TokenData = Depends(get_current_user)
) -> TokenData:
    """Dependency to ensure user is active"""
    # Note: In production, you might want to check user status in database
    # For performance, we rely on token validation for now
    # Additional user status checks can be added here if needed
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

# Convenience tier checkers
require_paid_tier = TierChecker(["architect", "builder", "shipper", "studio"])  # Any paid tier
require_premium_features = require_builder  # Alias for premium features


class RateLimiter:
    """Simple in-memory rate limiter (should use Redis in production)"""
    
    def __init__(self):
        self.requests = {}  # In production, replace with Redis
        self.request_windows = {}  # Track time windows
    
    async def check_rate_limit(self, user_id: str, tier: str) -> bool:
        """Check if user has exceeded rate limit"""
        # TODO: Implement proper rate limiting with Redis
        # For now, we'll use the tier-based limits from settings
        limit = settings.rate_limit_per_minute.get(tier, 20)
        
        # Simple implementation - in production, use Redis with sliding window
        # For development, we'll be permissive but log the attempt
        current_time = datetime.now()
        
        if user_id not in self.requests:
            self.requests[user_id] = 0
            self.request_windows[user_id] = current_time
        
        # Reset counter if more than a minute has passed
        if (current_time - self.request_windows[user_id]).total_seconds() > 60:
            self.requests[user_id] = 0
            self.request_windows[user_id] = current_time
        
        self.requests[user_id] += 1
        
        if self.requests[user_id] > limit:
            logger.warning(f"Rate limit exceeded for user {user_id} (tier: {tier}): {self.requests[user_id]}/{limit}")
            return False
        
        return True


rate_limiter = RateLimiter()


async def check_rate_limit(
    current_user: TokenData = Depends(get_current_active_user)
) -> TokenData:
    """Dependency to check rate limits"""
    allowed = await rate_limiter.check_rate_limit(current_user.user_id, current_user.tier)
    if not allowed:
        logger.warning(f"Rate limit exceeded for user: {current_user.email}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded for {current_user.tier} tier. Please upgrade your plan or try again later.",
            headers={
                "X-RateLimit-Limit": str(settings.rate_limit_per_minute.get(current_user.tier, 20)),
                "X-RateLimit-Remaining": "0",
                "Retry-After": "60"
            }
        )
    return current_user


# Optional authentication dependency (for endpoints that work with or without auth)
async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[TokenData]:
    """Dependency to get current user from JWT token (optional authentication)"""
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials)
    except HTTPException:
        # If token is invalid, return None instead of raising error
        return None


# Convenience dependencies for common authentication patterns
async def require_authenticated_user(
    current_user: TokenData = Depends(get_current_active_user)
) -> TokenData:
    """Alias for get_current_active_user for clarity"""
    return current_user


async def require_verified_user(
    current_user: TokenData = Depends(get_current_active_user),
    request: Request = None
) -> TokenData:
    """Dependency that requires user to be verified"""
    # In production, you might want to check user verification status from database
    # For now, we assume all authenticated users with valid tokens are verified
    # This is a placeholder for future enhancement
    return current_user