from typing import Optional, Dict, Any
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import HTTPException, status
import logging
from urllib.parse import urlencode, parse_qs
import httpx
import json

from google.auth.transport import requests
from google.oauth2 import id_token
from google_auth_oauthlib.flow import Flow
import google.auth.exceptions

from app.models.user import UserCreate, UserInDB, GoogleOAuthUser, AuthProvider, UserTier
from app.utils.security import create_tokens, generate_verification_token
from app.utils.cors_utils import (
    validate_origin_for_oauth, 
    is_valid_redirect_uri, 
    get_google_oauth_redirect_uri,
    validate_oauth_state_parameter
)
from app.config import settings

logger = logging.getLogger(__name__)


class GoogleOAuthService:
    """Service for handling Google OAuth 2.0 authentication flow"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.users_collection = db.users
        
        # Google OAuth configuration with enhanced security
        self.client_id = settings.google_client_id
        self.client_secret = settings.google_client_secret
        self.redirect_uri = get_google_oauth_redirect_uri()
        
        # Validate redirect URI for security
        if not is_valid_redirect_uri(self.redirect_uri):
            logger.error(f"Invalid Google OAuth redirect URI: {self.redirect_uri}")
            raise ValueError("Invalid Google OAuth redirect URI configuration")
        
        # OAuth 2.0 scopes for user info
        self.scopes = [
            'openid',
            'email',
            'profile'
        ]
        
        # Google OAuth endpoints
        self.auth_url = "https://accounts.google.com/o/oauth2/auth"
        self.token_url = "https://oauth2.googleapis.com/token"
        self.userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
    
    def get_authorization_url(self, state: Optional[str] = None, origin: Optional[str] = None) -> str:
        """
        Generate Google OAuth authorization URL with enhanced security
        
        Args:
            state: Optional state parameter for CSRF protection
            origin: Request origin for additional validation
            
        Returns:
            Authorization URL for redirecting user to Google
            
        Raises:
            HTTPException: If origin validation fails in production
        """
        # Validate origin for OAuth in production
        if origin and settings.environment == "production":
            if not validate_origin_for_oauth(origin):
                logger.error(f"Invalid origin for OAuth request: {origin}")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Invalid origin for OAuth request"
                )
        
        # Generate or validate state parameter
        if not state and settings.environment == "production":
            import secrets
            state = secrets.token_urlsafe(32)
            logger.info("Generated state parameter for OAuth request")
        
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "scope": " ".join(self.scopes),
            "response_type": "code",
            "access_type": "offline",
            "prompt": "consent",
            # Add additional security parameters
            "include_granted_scopes": "false",  # Only request specified scopes
            "hd": None  # Allow any domain (remove for organization-specific auth)
        }
        
        if state:
            params["state"] = state
            
        authorization_url = f"{self.auth_url}?{urlencode(params)}"
        
        logger.info("Generated Google OAuth authorization URL with enhanced security")
        return authorization_url
    
    async def exchange_code_for_tokens(self, code: str, state: Optional[str] = None) -> Dict[str, Any]:
        """
        Exchange authorization code for access and ID tokens
        
        Args:
            code: Authorization code from Google
            state: State parameter for validation
            
        Returns:
            Dictionary containing access_token, id_token, and other token info
            
        Raises:
            HTTPException: If token exchange fails
        """
        try:
            token_data = {
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": self.redirect_uri
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.token_url,
                    data=token_data,
                    headers={"Content-Type": "application/x-www-form-urlencoded"}
                )
                
                if response.status_code != 200:
                    logger.error(f"Token exchange failed: {response.status_code} - {response.text}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Failed to exchange authorization code for tokens"
                    )
                
                tokens = response.json()
                logger.info("Successfully exchanged authorization code for tokens")
                return tokens
                
        except httpx.RequestError as e:
            logger.error(f"HTTP error during token exchange: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Network error during authentication"
            )
        except Exception as e:
            logger.error(f"Unexpected error during token exchange: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authentication failed"
            )
    
    async def verify_id_token(self, id_token_str: str) -> Dict[str, Any]:
        """
        Verify Google ID token and extract user information
        
        Args:
            id_token_str: JWT ID token from Google
            
        Returns:
            Dictionary containing verified user information
            
        Raises:
            HTTPException: If token verification fails
        """
        try:
            # Verify the ID token
            idinfo = id_token.verify_oauth2_token(
                id_token_str, 
                requests.Request(), 
                self.client_id
            )
            
            # Verify the issuer
            if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
                logger.error(f"Invalid token issuer: {idinfo['iss']}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid ID token issuer"
                )
            
            logger.info(f"Successfully verified ID token for user: {idinfo.get('email')}")
            return idinfo
            
        except google.auth.exceptions.GoogleAuthError as e:
            logger.error(f"Google Auth error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired ID token"
            )
        except Exception as e:
            logger.error(f"Unexpected error during ID token verification: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Token verification failed"
            )
    
    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """
        Get user information from Google using access token
        
        Args:
            access_token: OAuth 2.0 access token
            
        Returns:
            Dictionary containing user information
            
        Raises:
            HTTPException: If user info retrieval fails
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.userinfo_url,
                    headers={"Authorization": f"Bearer {access_token}"}
                )
                
                if response.status_code != 200:
                    logger.error(f"Failed to get user info: {response.status_code} - {response.text}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Failed to retrieve user information"
                    )
                
                user_info = response.json()
                logger.info(f"Successfully retrieved user info for: {user_info.get('email')}")
                return user_info
                
        except httpx.RequestError as e:
            logger.error(f"HTTP error during user info retrieval: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Network error during user info retrieval"
            )
        except Exception as e:
            logger.error(f"Unexpected error during user info retrieval: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve user information"
            )
    
    def _extract_user_data(self, user_info: Dict[str, Any]) -> GoogleOAuthUser:
        """
        Extract and validate user data from Google user info
        
        Args:
            user_info: User information from Google
            
        Returns:
            GoogleOAuthUser model instance
        """
        try:
            # Extract name parts
            given_name = user_info.get('given_name', '')
            family_name = user_info.get('family_name', '')
            
            # Fallback to name field if given_name/family_name not available
            if not given_name and not family_name:
                full_name = user_info.get('name', '').strip()
                name_parts = full_name.split(' ', 1)
                given_name = name_parts[0] if name_parts else 'User'
                family_name = name_parts[1] if len(name_parts) > 1 else ''
            
            return GoogleOAuthUser(
                google_id=user_info['id'],
                email=user_info['email'],
                first_name=given_name or 'User',
                last_name=family_name or '',
                profile_picture=user_info.get('picture'),
                verified_email=user_info.get('verified_email', True)
            )
        except Exception as e:
            logger.error(f"Error extracting user data: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid user information from Google"
            )
    
    async def authenticate_user(self, authorization_code: str, state: Optional[str] = None, origin: Optional[str] = None) -> dict:
        """
        Complete OAuth flow with enhanced security validation
        
        Args:
            authorization_code: Authorization code from Google redirect
            state: State parameter for CSRF validation
            origin: Request origin for additional validation
            
        Returns:
            Dictionary containing user info and JWT tokens
            
        Raises:
            HTTPException: If security validation fails
        """
        # Enhanced security validations
        if origin and not validate_origin_for_oauth(origin):
            logger.error(f"Invalid origin for OAuth callback: {origin}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid origin for OAuth callback"
            )
        
        # Validate state parameter for CSRF protection
        if not validate_oauth_state_parameter(state):
            logger.error("Invalid or missing OAuth state parameter")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or missing state parameter"
            )
        
        # Exchange authorization code for tokens
        tokens = await self.exchange_code_for_tokens(authorization_code, state)
        
        # Verify ID token and extract user info
        id_token_str = tokens.get('id_token')
        if not id_token_str:
            logger.error("No ID token received from Google")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No ID token received from Google"
            )
        
        # Verify the ID token with additional security checks
        verified_info = await self.verify_id_token(id_token_str)
        
        # Additional verification: Check if token audience matches our client ID
        if verified_info.get('aud') != self.client_id:
            logger.error(f"Token audience mismatch: {verified_info.get('aud')} != {self.client_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token audience"
            )
        
        # Extract user data
        google_user = self._extract_user_data(verified_info)
        
        # Create or update user in database
        user_data = await self.create_or_update_user(google_user)
        
        logger.info(f"Successfully completed OAuth flow for user: {google_user.email}")
        return user_data
    
    async def create_or_update_user(self, google_user: GoogleOAuthUser) -> dict:
        """
        Create new user or update existing user from Google OAuth data
        
        Args:
            google_user: Validated Google user data
            
        Returns:
            Dictionary containing user info and JWT tokens
        """
        # Check if user exists by email or Google ID
        existing_user = await self.users_collection.find_one({
            "$or": [
                {"email": google_user.email},
                {"google_id": google_user.google_id}
            ]
        })
        
        if existing_user:
            # Update existing user
            user = await self._update_existing_user(existing_user, google_user)
        else:
            # Create new user
            user = await self._create_new_user(google_user)
        
        # Create JWT tokens
        tokens = create_tokens(
            user_id=user.id,
            email=user.email,
            tier=user.subscription.tier
        )
        
        # Update last login
        await self.users_collection.update_one(
            {"_id": user.id},
            {"$set": {"last_login": datetime.utcnow()}}
        )
        
        logger.info(f"Successfully authenticated Google user: {user.email}")
        
        return {
            "user": {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "is_verified": user.is_verified,
                "provider": user.provider,
                "profile_picture": user.profile_picture,
                "subscription": user.subscription.model_dump()
            },
            **tokens
        }
    
    async def _create_new_user(self, google_user: GoogleOAuthUser) -> UserInDB:
        """
        Create a new user from Google OAuth data
        
        Args:
            google_user: Validated Google user data
            
        Returns:
            UserInDB instance
        """
        # Create user data
        user_create = UserCreate(
            email=google_user.email,
            first_name=google_user.first_name,
            last_name=google_user.last_name,
            provider=AuthProvider.GOOGLE,
            google_id=google_user.google_id,
            profile_picture=google_user.profile_picture,
            verified_email=google_user.verified_email
        )
        
        # Create user document
        user_in_db = UserInDB(
            **user_create.model_dump(exclude={'password'}),
            _id=str(datetime.utcnow().timestamp()).replace(".", ""),
            hashed_password=None,  # No password for Google OAuth users
            is_verified=google_user.verified_email,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        # Insert user into database
        user_doc = user_in_db.model_dump(by_alias=True)
        await self.users_collection.insert_one(user_doc)
        
        logger.info(f"Created new Google OAuth user: {user_in_db.email}")
        return user_in_db
    
    async def _update_existing_user(self, existing_user: dict, google_user: GoogleOAuthUser) -> UserInDB:
        """
        Update existing user with Google OAuth data
        
        Args:
            existing_user: Existing user document from database
            google_user: New Google user data
            
        Returns:
            Updated UserInDB instance
        """
        update_data = {
            "updated_at": datetime.utcnow(),
            "provider": AuthProvider.GOOGLE,
            "google_id": google_user.google_id,
            "is_verified": True,  # Google users are always verified
        }
        
        # Update profile picture if provided
        if google_user.profile_picture:
            update_data["profile_picture"] = google_user.profile_picture
        
        # Update name if different
        if (google_user.first_name != existing_user.get("first_name") or 
            google_user.last_name != existing_user.get("last_name")):
            update_data["first_name"] = google_user.first_name
            update_data["last_name"] = google_user.last_name
        
        # Update user in database
        await self.users_collection.update_one(
            {"_id": existing_user["_id"]},
            {"$set": update_data}
        )
        
        # Fetch updated user
        updated_user_doc = await self.users_collection.find_one({"_id": existing_user["_id"]})
        user = UserInDB(**updated_user_doc)
        
        logger.info(f"Updated existing user with Google OAuth: {user.email}")
        return user
    
    async def link_google_account(self, user_id: str, google_user: GoogleOAuthUser) -> bool:
        """
        Link Google account to existing user
        
        Args:
            user_id: Existing user ID
            google_user: Google OAuth user data
            
        Returns:
            True if linking was successful
            
        Raises:
            HTTPException: If linking fails
        """
        # Check if Google account is already linked to another user
        existing_google_user = await self.users_collection.find_one({
            "google_id": google_user.google_id,
            "_id": {"$ne": user_id}
        })
        
        if existing_google_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This Google account is already linked to another user"
            )
        
        # Update user with Google account info
        result = await self.users_collection.update_one(
            {"_id": user_id},
            {
                "$set": {
                    "google_id": google_user.google_id,
                    "profile_picture": google_user.profile_picture,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count > 0:
            logger.info(f"Successfully linked Google account to user: {user_id}")
            return True
        
        return False
    
    async def unlink_google_account(self, user_id: str) -> bool:
        """
        Unlink Google account from user
        
        Args:
            user_id: User ID to unlink Google account from
            
        Returns:
            True if unlinking was successful
        """
        result = await self.users_collection.update_one(
            {"_id": user_id},
            {
                "$unset": {
                    "google_id": "",
                    "profile_picture": ""
                },
                "$set": {
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count > 0:
            logger.info(f"Successfully unlinked Google account from user: {user_id}")
            return True
        
        return False