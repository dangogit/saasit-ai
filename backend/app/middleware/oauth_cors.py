"""
OAuth-specific CORS middleware for enhanced security during authentication flows

This middleware provides additional security layers for OAuth operations
beyond the standard CORS middleware.
"""

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import logging
from typing import Callable, Optional, Union

from app.utils.cors_utils import (
    validate_origin_for_oauth,
    get_oauth_cors_headers,
    validate_oauth_state_parameter
)
from app.config import settings

logger = logging.getLogger(__name__)


class OAuthCORSMiddleware(BaseHTTPMiddleware):
    """
    Enhanced CORS middleware specifically for OAuth endpoints
    
    This middleware adds additional security checks for OAuth-related endpoints
    including origin validation, state parameter validation, and enhanced
    CORS header management.
    """
    
    def __init__(
        self,
        app,
        oauth_paths: list[str] = None,
        strict_mode: bool = None
    ):
        super().__init__(app)
        
        # Default OAuth paths that require enhanced security
        if oauth_paths is None:
            oauth_paths = [
                "/api/v1/auth/google/login",
                "/api/v1/auth/google/callback",
                "/api/v1/auth/google/link",
                "/api/auth/google/login",  # Legacy path
                "/api/auth/google/callback",  # Legacy path
                "/api/auth/google/link"  # Legacy path
            ]
        
        self.oauth_paths = oauth_paths
        
        # Enable strict mode in production
        if strict_mode is None:
            strict_mode = settings.environment == "production"
        
        self.strict_mode = strict_mode
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process OAuth-specific CORS validation
        
        Args:
            request: FastAPI request object
            call_next: Next middleware/handler in chain
            
        Returns:
            Response with appropriate CORS headers
        """
        # Check if this is an OAuth-related endpoint
        if not self._is_oauth_path(request.url.path):
            return await call_next(request)
        
        # Handle preflight requests
        if request.method == "OPTIONS":
            return await self._handle_preflight(request)
        
        # Validate origin for OAuth operations
        origin = request.headers.get("origin")
        if origin and not validate_origin_for_oauth(origin):
            logger.warning(f"Invalid origin for OAuth operation: {origin} on {request.url.path}")
            
            if self.strict_mode:
                return JSONResponse(
                    status_code=403,
                    content={"error": "Invalid origin for OAuth operation"},
                    headers={"Access-Control-Allow-Origin": "null"}
                )
        
        # Additional validation for callback endpoints
        if self._is_callback_path(request.url.path):
            validation_error = await self._validate_callback_request(request)
            if validation_error:
                logger.error(f"OAuth callback validation failed: {validation_error}")
                
                if self.strict_mode:
                    return JSONResponse(
                        status_code=400,
                        content={"error": validation_error},
                        headers=get_oauth_cors_headers(origin or "")
                    )
        
        # Process the request
        response = await call_next(request)
        
        # Add enhanced CORS headers for OAuth responses
        if origin:
            oauth_headers = get_oauth_cors_headers(origin)
            for header, value in oauth_headers.items():
                if value:  # Only set non-null values
                    response.headers[header] = value
        
        return response
    
    def _is_oauth_path(self, path: str) -> bool:
        """Check if path is an OAuth-related endpoint"""
        return any(oauth_path in path for oauth_path in self.oauth_paths)
    
    def _is_callback_path(self, path: str) -> bool:
        """Check if path is an OAuth callback endpoint"""
        return "callback" in path and self._is_oauth_path(path)
    
    async def _handle_preflight(self, request: Request) -> Response:
        """
        Handle CORS preflight requests for OAuth endpoints
        
        Args:
            request: Preflight request
            
        Returns:
            Preflight response with appropriate headers
        """
        origin = request.headers.get("origin")
        
        # Enhanced headers for OAuth preflight
        headers = {
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": (
                "Content-Type, Authorization, X-Requested-With, "
                "Origin, Accept, X-CSRF-Token, X-API-Key"
            ),
            "Access-Control-Max-Age": "86400",  # 24 hours
            "Access-Control-Allow-Credentials": "true"
        }
        
        # Set origin if valid
        if origin and validate_origin_for_oauth(origin):
            headers["Access-Control-Allow-Origin"] = origin
        else:
            headers["Access-Control-Allow-Origin"] = "null"
            if self.strict_mode and origin:
                logger.warning(f"Rejected preflight for invalid origin: {origin}")
        
        return Response(status_code=204, headers=headers)
    
    async def _validate_callback_request(self, request: Request) -> Optional[str]:
        """
        Validate OAuth callback request parameters
        
        Args:
            request: Callback request
            
        Returns:
            Error message if validation fails, None if valid
        """
        try:
            # Check for required parameters based on request method
            if request.method == "POST":
                # For POST requests, parameters might be in body
                content_type = request.headers.get("content-type", "")
                
                if "application/json" in content_type:
                    # JSON body - parameters will be validated by endpoint
                    return None
                elif "application/x-www-form-urlencoded" in content_type:
                    # Form data - validate here if needed
                    return None
            
            elif request.method == "GET":
                # For GET requests, check query parameters
                query_params = request.query_params
                
                # Check for authorization code
                if not query_params.get("code"):
                    return "Missing authorization code"
                
                # Validate state parameter if present
                state = query_params.get("state")
                if state and not validate_oauth_state_parameter(state):
                    return "Invalid state parameter"
            
            return None
            
        except Exception as e:
            logger.error(f"Error validating callback request: {str(e)}")
            return "Invalid callback request format"


def setup_oauth_cors_middleware(app):
    """
    Set up OAuth CORS middleware with default configuration
    
    Args:
        app: FastAPI application instance
    """
    app.add_middleware(OAuthCORSMiddleware)
    logger.info("OAuth CORS middleware configured")


# Additional utility functions for manual CORS handling

def add_oauth_cors_headers(response: Response, origin: str) -> Response:
    """
    Add OAuth-specific CORS headers to a response
    
    Args:
        response: FastAPI response object
        origin: Request origin
        
    Returns:
        Response with added headers
    """
    headers = get_oauth_cors_headers(origin)
    for header, value in headers.items():
        if value:
            response.headers[header] = value
    
    return response


def create_oauth_error_response(
    error_message: str,
    status_code: int = 400,
    origin: str = ""
) -> JSONResponse:
    """
    Create an error response with proper OAuth CORS headers
    
    Args:
        error_message: Error message to return
        status_code: HTTP status code
        origin: Request origin for CORS headers
        
    Returns:
        JSONResponse with error and CORS headers
    """
    headers = get_oauth_cors_headers(origin)
    
    return JSONResponse(
        status_code=status_code,
        content={
            "error": error_message,
            "type": "oauth_error"
        },
        headers=headers
    )