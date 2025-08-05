from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Dict, Optional

from app.models.user import UserCreate, UserLogin, Token, PasswordReset
from app.services.auth_service import AuthService
from app.services.google_oauth_service import GoogleOAuthService
from app.utils.security import verify_token_type
from app.middleware.auth import get_current_user
from app.models.user import TokenData

router = APIRouter(prefix="/auth", tags=["authentication"])


async def get_db(request: Request) -> AsyncIOMotorDatabase:
    """Dependency to get database instance"""
    return request.app.state.db


@router.post("/register", response_model=Dict)
async def register(
    user_data: UserCreate,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Register a new user
    
    - **email**: Valid email address
    - **password**: At least 8 characters with uppercase, lowercase, and digit
    - **first_name**: User's first name
    - **last_name**: User's last name
    """
    auth_service = AuthService(db)
    result = await auth_service.register_user(user_data)
    return result


@router.post("/login", response_model=Dict)
async def login(
    login_data: UserLogin,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Login user and receive access tokens
    
    - **email**: User's email address
    - **password**: User's password
    """
    auth_service = AuthService(db)
    result = await auth_service.login_user(login_data)
    return result


@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_token: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Refresh access token using refresh token
    
    - **refresh_token**: Valid refresh token
    """
    try:
        # Verify refresh token
        payload = verify_token_type(refresh_token, "refresh")
        
        # Create new tokens
        from app.utils.security import create_tokens
        tokens = create_tokens(
            user_id=payload.get("sub"),
            email=payload.get("email"),
            tier=payload.get("tier", "free")
        )
        
        return Token(**tokens)
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )


@router.get("/verify-email/{token}")
async def verify_email(
    token: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Verify user email with verification token
    
    - **token**: Email verification token from email
    """
    auth_service = AuthService(db)
    success = await auth_service.verify_email(token)
    
    if success:
        return {"message": "Email verified successfully"}
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification token"
        )


@router.post("/forgot-password")
async def forgot_password(
    email: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Request password reset email
    
    - **email**: User's email address
    """
    auth_service = AuthService(db)
    message = await auth_service.request_password_reset(email)
    return {"message": message}


@router.post("/reset-password")
async def reset_password(
    reset_data: PasswordReset,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Reset password with reset token
    
    - **token**: Password reset token from email
    - **new_password**: New password meeting requirements
    """
    auth_service = AuthService(db)
    success = await auth_service.reset_password(reset_data.token, reset_data.new_password)
    
    if success:
        return {"message": "Password reset successfully"}
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to reset password"
        )


@router.get("/me", response_model=Dict)
async def get_current_user_info(
    current_user: TokenData = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get current user information
    
    Requires authentication
    """
    auth_service = AuthService(db)
    user = await auth_service.get_user_by_id(current_user.user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {
        "id": user.id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "company": user.company,
        "is_verified": user.is_verified,
        "subscription": user.subscription.model_dump(),
        "usage": user.usage.model_dump(),
        "created_at": user.created_at.isoformat()
    }


@router.post("/logout")
async def logout(
    current_user: TokenData = Depends(get_current_user)
):
    """
    Logout user (client should remove tokens)
    
    Requires authentication
    """
    # In a real app, you might want to blacklist the token
    # For now, we'll just return success
    return {"message": "Logged out successfully"}


@router.get("/google/login")
async def google_login(
    request: Request,
    state: str = None,
    origin: Optional[str] = Header(None),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Initialize Google OAuth login flow with enhanced security
    
    Returns authorization URL to redirect user to Google
    
    - **state**: Optional state parameter for CSRF protection
    - **origin**: Request origin header for validation
    """
    # Get origin from header or referer
    request_origin = origin or request.headers.get("referer")
    
    google_oauth = GoogleOAuthService(db)
    authorization_url = google_oauth.get_authorization_url(state, request_origin)
    
    return {
        "authorization_url": authorization_url,
        "message": "Redirect user to this URL to complete Google OAuth",
        "state": state  # Return state if generated automatically
    }


@router.post("/google/callback", response_model=Dict)
async def google_callback(
    request: Request,
    code: str,
    state: str = None,
    origin: Optional[str] = Header(None),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Handle Google OAuth callback with enhanced security
    
    This endpoint processes the authorization code from Google
    and returns user info with JWT tokens
    
    - **code**: Authorization code from Google redirect
    - **state**: State parameter for CSRF validation
    - **origin**: Request origin header for validation
    """
    # Get origin from header or referer
    request_origin = origin or request.headers.get("referer")
    
    google_oauth = GoogleOAuthService(db)
    result = await google_oauth.authenticate_user(code, state, request_origin)
    
    # Add CORS headers to response if needed
    from app.utils.cors_utils import get_oauth_cors_headers
    if request_origin:
        cors_headers = get_oauth_cors_headers(request_origin)
        # Note: In FastAPI, you'd typically handle this via middleware
        # but we can add custom headers to the response if needed
    
    return result


@router.post("/google/link")
async def link_google_account(
    code: str,
    current_user: TokenData = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Link Google account to existing user
    
    Requires authentication. Links Google OAuth to current user account.
    
    - **code**: Authorization code from Google
    """
    google_oauth = GoogleOAuthService(db)
    
    # Exchange code for tokens and get user info
    tokens = await google_oauth.exchange_code_for_tokens(code)
    id_token_str = tokens.get('id_token')
    
    if not id_token_str:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No ID token received from Google"
        )
    
    # Verify ID token and extract user info
    verified_info = await google_oauth.verify_id_token(id_token_str)
    google_user = google_oauth._extract_user_data(verified_info)
    
    # Link to current user
    success = await google_oauth.link_google_account(current_user.user_id, google_user)
    
    if success:
        return {"message": "Google account linked successfully"}
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to link Google account"
        )


@router.delete("/google/unlink")
async def unlink_google_account(
    current_user: TokenData = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Unlink Google account from current user
    
    Requires authentication. Removes Google OAuth connection from user account.
    """
    google_oauth = GoogleOAuthService(db)
    success = await google_oauth.unlink_google_account(current_user.user_id)
    
    if success:
        return {"message": "Google account unlinked successfully"}
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to unlink Google account"
        )