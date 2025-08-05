"""
Security middleware for additional protection beyond authentication.
Includes CORS, rate limiting, request validation, and security headers.
"""

from fastapi import HTTPException, Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import time
import logging
from typing import Dict, Set
import re
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses"""
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        
        # Only add HSTS in production (when using HTTPS)
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        # Add custom API version header
        response.headers["X-API-Version"] = "1.0.0"
        
        return response


class RequestValidationMiddleware(BaseHTTPMiddleware):
    """Validate incoming requests for security threats"""
    
    def __init__(self, app):
        super().__init__(app)
        # Common SQL injection patterns
        self.sql_patterns = [
            r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b)",
            r"(\b(UNION|JOIN)\b.*\b(SELECT)\b)",
            r"(\b(OR|AND)\b.*=.*\b(OR|AND)\b)",
            r"('.*'.*=.*'.*')",
        ]
        
        # Common XSS patterns
        self.xss_patterns = [
            r"<script[^>]*>.*</script>",
            r"javascript:",
            r"on\w+\s*=",
            r"<iframe[^>]*>",
        ]
        
        # Compile patterns for performance
        self.compiled_sql = [re.compile(pattern, re.IGNORECASE) for pattern in self.sql_patterns]
        self.compiled_xss = [re.compile(pattern, re.IGNORECASE) for pattern in self.xss_patterns]
    
    async def dispatch(self, request: Request, call_next):
        # Skip validation for certain endpoints
        if request.url.path in ["/", "/health", "/docs", "/openapi.json"]:
            return await call_next(request)
        
        # Validate request body for POST/PUT requests
        if request.method in ["POST", "PUT", "PATCH"]:
            try:
                if request.headers.get("content-type", "").startswith("application/json"):
                    body = await request.body()
                    if body:
                        body_str = body.decode("utf-8")
                        
                        # Check for SQL injection attempts
                        for pattern in self.compiled_sql:
                            if pattern.search(body_str):
                                logger.warning(f"Potential SQL injection attempt from {request.client.host}: {request.url.path}")
                                return JSONResponse(
                                    status_code=400,
                                    content={"detail": "Invalid request format"}
                                )
                        
                        # Check for XSS attempts
                        for pattern in self.compiled_xss:
                            if pattern.search(body_str):
                                logger.warning(f"Potential XSS attempt from {request.client.host}: {request.url.path}")
                                return JSONResponse(
                                    status_code=400,
                                    content={"detail": "Invalid request content"}
                                )
                
                # Recreate request with body for downstream handlers
                request._body = body
                
            except Exception as e:
                logger.error(f"Error validating request: {str(e)}")
                # Don't block request if validation fails
                pass
        
        return await call_next(request)


class IPRateLimitMiddleware(BaseHTTPMiddleware):
    """Basic IP-based rate limiting (in-memory, for development)"""
    
    def __init__(self, app, requests_per_minute: int = 100):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests: Dict[str, list] = {}
        self.blocked_ips: Set[str] = set()
        self.block_duration = timedelta(minutes=15)
        self.last_cleanup = datetime.now()
    
    def cleanup_old_requests(self):
        """Remove old request records"""
        current_time = datetime.now()
        cutoff_time = current_time - timedelta(minutes=1)
        
        for ip in list(self.requests.keys()):
            self.requests[ip] = [req_time for req_time in self.requests[ip] if req_time > cutoff_time]
            if not self.requests[ip]:
                del self.requests[ip]
        
        self.last_cleanup = current_time
    
    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host
        current_time = datetime.now()
        
        # Skip rate limiting for health checks
        if request.url.path in ["/", "/health"]:
            return await call_next(request)
        
        # Cleanup old requests every minute
        if (current_time - self.last_cleanup).total_seconds() > 60:
            self.cleanup_old_requests()
        
        # Check if IP is currently blocked
        if client_ip in self.blocked_ips:
            logger.warning(f"Blocked IP {client_ip} attempted request to {request.url.path}")
            return JSONResponse(
                status_code=429,
                content={"detail": "IP temporarily blocked due to excessive requests"},
                headers={"Retry-After": "900"}  # 15 minutes
            )
        
        # Initialize request tracking for new IPs
        if client_ip not in self.requests:
            self.requests[client_ip] = []
        
        # Add current request time
        self.requests[client_ip].append(current_time)
        
        # Check if IP has exceeded rate limit
        recent_requests = [
            req_time for req_time in self.requests[client_ip] 
            if (current_time - req_time).total_seconds() <= 60
        ]
        
        if len(recent_requests) > self.requests_per_minute:
            # Block IP for 15 minutes
            self.blocked_ips.add(client_ip)
            logger.warning(f"IP {client_ip} blocked for excessive requests: {len(recent_requests)}/min")
            
            # Schedule unblocking (in production, use a proper task queue)
            # For now, we'll rely on periodic cleanup
            
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. IP blocked temporarily."},
                headers={
                    "Retry-After": "900",
                    "X-RateLimit-Limit": str(self.requests_per_minute),
                    "X-RateLimit-Remaining": "0"
                }
            )
        
        # Add rate limit headers
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(max(0, self.requests_per_minute - len(recent_requests)))
        response.headers["X-RateLimit-Reset"] = str(int((current_time + timedelta(minutes=1)).timestamp()))
        
        return response


def setup_security_middleware(app):
    """Setup all security middleware for the application"""
    
    # Add security headers
    app.add_middleware(SecurityHeadersMiddleware)
    
    # Add request validation (only in production or when explicitly enabled)
    # app.add_middleware(RequestValidationMiddleware)
    
    # Add IP-based rate limiting (basic protection)
    app.add_middleware(IPRateLimitMiddleware, requests_per_minute=200)
    
    logger.info("Security middleware configured")


# Utility functions for additional security checks
def is_safe_redirect_url(url: str, allowed_hosts: list = None) -> bool:
    """Check if a redirect URL is safe to prevent open redirect vulnerabilities"""
    if not url:
        return False
    
    # Allow relative URLs
    if url.startswith('/') and not url.startswith('//'):
        return True
    
    # Check against allowed hosts
    if allowed_hosts:
        from urllib.parse import urlparse
        try:
            parsed = urlparse(url)
            return parsed.netloc in allowed_hosts
        except:
            return False
    
    # By default, only allow relative URLs
    return False


def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent directory traversal"""
    import os
    # Remove directory traversal attempts
    filename = os.path.basename(filename)
    # Remove or replace unsafe characters
    unsafe_chars = '<>:"/\\|?*'
    for char in unsafe_chars:
        filename = filename.replace(char, '_')
    # Limit length
    return filename[:255]


def validate_file_upload(file_content: bytes, allowed_types: list = None, max_size: int = 10485760) -> bool:
    """Validate uploaded file content"""
    if len(file_content) > max_size:  # Default 10MB
        return False
    
    if allowed_types:
        # Simple file type detection by magic bytes
        file_signatures = {
            b'\x89PNG\r\n\x1a\n': 'png',
            b'\xff\xd8\xff': 'jpg',
            b'GIF8': 'gif',
            b'%PDF': 'pdf',
        }
        
        detected_type = None
        for signature, file_type in file_signatures.items():
            if file_content.startswith(signature):
                detected_type = file_type
                break
        
        if detected_type not in allowed_types:
            return False
    
    return True