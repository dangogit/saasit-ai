"""
CORS utilities for Google OAuth and frontend integration

This module provides utilities for validating origins and handling
CORS-related security for OAuth flows and API access.
"""

from typing import List, Optional, Union, Dict
from urllib.parse import urlparse
import logging

from app.config import settings

logger = logging.getLogger(__name__)


def validate_origin_for_oauth(origin: str) -> bool:
    """
    Validate if an origin is allowed for OAuth operations
    
    This provides an additional layer of security for OAuth flows
    beyond the standard CORS middleware.
    
    Args:
        origin: The origin URL to validate
        
    Returns:
        True if origin is allowed for OAuth operations
    """
    if not origin:
        return False
    
    try:
        parsed = urlparse(origin)
        hostname = parsed.hostname
        
        if not hostname:
            return False
        
        # Check against allowed redirect hosts
        for allowed_host in settings.oauth_allowed_redirect_hosts:
            if hostname == allowed_host or hostname.endswith(f'.{allowed_host}'):
                return True
        
        return False
        
    except Exception as e:
        logger.warning(f"Error validating origin {origin}: {str(e)}")
        return False


def get_cors_origins_for_environment() -> List[str]:
    """
    Get appropriate CORS origins based on current environment
    
    Returns:
        List of allowed origins for current environment
    """
    origins = []
    
    # Always include configured origins
    origins.extend(settings.backend_cors_origins)
    
    # Add environment-specific origins
    if settings.environment == "development":
        dev_origins = [
            "http://localhost:3000",
            "http://localhost:3001", 
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001"
        ]
        origins.extend(dev_origins)
    
    elif settings.environment == "production":
        prod_origins = [
            "https://saasit.ai",
            "https://www.saasit.ai",
            "https://app.saasit.ai"
        ]
        origins.extend(prod_origins)
    
    # Remove duplicates while preserving order
    seen = set()
    unique_origins = []
    for origin in origins:
        if origin not in seen:
            seen.add(origin)
            unique_origins.append(origin)
    
    return unique_origins


def is_valid_redirect_uri(redirect_uri: str, allowed_hosts: Optional[List[str]] = None) -> bool:
    """
    Validate OAuth redirect URI against allowed hosts
    
    Args:
        redirect_uri: The redirect URI to validate
        allowed_hosts: Optional list of allowed hosts (defaults to config)
        
    Returns:
        True if redirect URI is valid
    """
    if not redirect_uri:
        return False
    
    if allowed_hosts is None:
        allowed_hosts = settings.oauth_allowed_redirect_hosts
    
    try:
        parsed = urlparse(redirect_uri)
        hostname = parsed.hostname
        
        if not hostname:
            return False
        
        # Check if hostname matches any allowed host
        for allowed_host in allowed_hosts:
            if hostname == allowed_host or hostname.endswith(f'.{allowed_host}'):
                return True
        
        return False
        
    except Exception as e:
        logger.warning(f"Error validating redirect URI {redirect_uri}: {str(e)}")
        return False


def get_google_oauth_redirect_uri() -> str:
    """
    Get the appropriate Google OAuth redirect URI for current environment
    
    Returns:
        Properly formatted redirect URI
    """
    if settings.google_redirect_uri:
        return settings.google_redirect_uri
    
    # Build redirect URI based on environment
    if settings.environment == "production":
        base_url = "https://saasit-ai-backend-dgoldman.fly.dev"
    else:
        base_url = f"http://localhost:{settings.api_port or 8000}"
    
    return f"{base_url}{settings.api_v1_str}/auth/google/callback"


def validate_oauth_state_parameter(state: Optional[str]) -> bool:
    """
    Validate OAuth state parameter for CSRF protection
    
    Args:
        state: State parameter from OAuth request
        
    Returns:
        True if state is valid (or if validation is not strict in dev)
    """
    # In development, we might be more lenient with state validation
    if settings.environment == "development" and not state:
        logger.warning("OAuth state parameter missing in development environment")
        return True
    
    # In production, state should always be present
    if settings.environment == "production" and not state:
        logger.error("OAuth state parameter missing in production")
        return False
    
    # Basic state validation (you might want to implement more sophisticated validation)
    if state and len(state) >= 8:  # Minimum length check
        return True
    
    logger.warning(f"Invalid OAuth state parameter: {state}")
    return False


# CORS headers for OAuth responses
OAUTH_CORS_HEADERS = {
    "Access-Control-Allow-Origin": None,  # Will be set dynamically
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400"
}


def get_oauth_cors_headers(origin: str) -> Dict[str, str]:
    """
    Get appropriate CORS headers for OAuth responses
    
    Args:
        origin: Request origin
        
    Returns:
        Dictionary of CORS headers
    """
    headers = OAUTH_CORS_HEADERS.copy()
    
    # Only set origin if it's validated
    if validate_origin_for_oauth(origin):
        headers["Access-Control-Allow-Origin"] = origin
    else:
        # For invalid origins, use a restrictive policy
        headers["Access-Control-Allow-Origin"] = "null"
        logger.warning(f"Invalid origin for OAuth: {origin}")
    
    return headers