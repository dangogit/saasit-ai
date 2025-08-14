from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import logging
import httpx
import json
from datetime import datetime, timezone, timedelta
from jose import jwt, JWTError

from app.models.user import TokenData

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)

class ClerkAuth:
    def __init__(self):
        self.jwks_cache = {}
        self.jwks_cache_expiry = None
        
    async def get_clerk_jwks(self):
        """Get Clerk's JSON Web Key Set for token validation"""
        if (self.jwks_cache_expiry and 
            datetime.now() < self.jwks_cache_expiry and 
            self.jwks_cache):
            return self.jwks_cache
            
        try:
            # Clerk JWKS endpoint (this is usually public)
            async with httpx.AsyncClient() as client:
                response = await client.get("https://growing-firefly-99.clerk.accounts.dev/.well-known/jwks.json")
                response.raise_for_status()
                jwks = response.json()
                
                # Cache for 1 hour
                self.jwks_cache = jwks
                self.jwks_cache_expiry = datetime.now() + timedelta(hours=1)
                
                return jwks
        except Exception as e:
            logger.error(f"Failed to fetch Clerk JWKS: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication service unavailable"
            )
    
    async def verify_clerk_token(self, token: str) -> dict:
        """Verify a Clerk JWT token"""
        try:
            # First, decode the token header to get the key ID
            unverified_header = jwt.get_unverified_header(token)
            kid = unverified_header.get('kid')
            
            if not kid:
                raise JWTError("Token missing key ID")
            
            # Get the JWKS from Clerk
            jwks = await self.get_clerk_jwks()
            
            # Find the matching public key
            public_key = None
            for key in jwks.get('keys', []):
                if key.get('kid') == kid:
                    public_key = key
                    break
            
            if not public_key:
                raise JWTError("Unable to find matching public key")
            
            # Convert JWK to PEM format for verification
            from cryptography.hazmat.primitives import serialization
            from cryptography.hazmat.primitives.asymmetric import rsa
            import base64
            
            # Extract RSA components
            n = base64.urlsafe_b64decode(public_key['n'] + '==')
            e = base64.urlsafe_b64decode(public_key['e'] + '==')
            
            # Convert to int
            n_int = int.from_bytes(n, 'big')
            e_int = int.from_bytes(e, 'big')
            
            # Create RSA public key
            rsa_public_key = rsa.RSAPublicNumbers(e_int, n_int).public_key()
            
            # Convert to PEM
            pem_key = rsa_public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            )
            
            # Verify the token
            payload = jwt.decode(
                token, 
                pem_key, 
                algorithms=['RS256'],
                audience=None,  # Clerk tokens don't always have audience
                options={"verify_aud": False}
            )
            
            return payload
            
        except JWTError as e:
            logger.warning(f"Clerk JWT validation failed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except Exception as e:
            logger.error(f"Unexpected error verifying Clerk token: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication failed",
                headers={"WWW-Authenticate": "Bearer"},
            )

# Global instance
clerk_auth = ClerkAuth()

async def get_current_user_from_clerk(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> TokenData:
    """Get current user from Clerk JWT token"""
    if not credentials:
        logger.warning("No authorization credentials provided")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization credentials required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    
    try:
        # Verify the Clerk token
        payload = await clerk_auth.verify_clerk_token(token)
        
        # Extract user data from Clerk token
        user_id = payload.get("sub")  # Clerk uses 'sub' for user ID
        email = payload.get("email")
        
        # Default tier for Clerk users (you can customize this logic)
        tier = "free"  # You might want to store this in your database
        
        if not user_id:
            logger.error(f"Invalid Clerk token payload - missing user_id: {payload}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Log successful authentication
        logger.debug(f"Successfully authenticated Clerk user: {email} (tier: {tier})")
        
        return TokenData(user_id=user_id, email=email or f"user-{user_id}", tier=tier)
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Unexpected error during Clerk authentication: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate token",
            headers={"WWW-Authenticate": "Bearer"},
        )

# Convenience alias
require_clerk_user = get_current_user_from_clerk