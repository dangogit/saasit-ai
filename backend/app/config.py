from pydantic_settings import BaseSettings
from typing import Optional
import os
from datetime import timedelta


class Settings(BaseSettings):
    # App Settings
    app_name: str = "SaasIt.ai"
    debug: bool = False
    
    # Database
    mongo_url: str
    db_name: str = "saasit_ai"
    
    # JWT Settings
    secret_key: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    
    # API Settings
    api_v1_str: str = "/api/v1"
    api_host: Optional[str] = "0.0.0.0"
    api_port: Optional[int] = 8000
    
    # Frontend URLs for different environments
    frontend_url: Optional[str] = "http://localhost:3000"
    production_frontend_url: Optional[str] = "https://saasit.ai"
    
    # Environment detection
    environment: str = "development"  # development, staging, production
    
    # CORS - Can be overridden via BACKEND_CORS_ORIGINS environment variable
    # Default includes development, production, and Google OAuth domains
    backend_cors_origins: list[str] = [
        # Development origins
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:4000",  # Frontend development port
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:4000",
        
        # Production frontend domains
        "https://saasit.ai",
        "https://www.saasit.ai",
        "https://app.saasit.ai",
        
        # Google OAuth domains (required for OAuth flows)
        "https://accounts.google.com",
        "https://oauth2.googleapis.com",
        "https://www.googleapis.com",
        
        # Cloudflare Pages domains (for staging and previews)
        "https://saasit-ai.pages.dev",
        # Note: Specific preview URLs need to be added manually if needed
        # Example: "https://1234abcd.saasit-ai.pages.dev"
        
        # Additional development domains
        "http://localhost:8000",  # For backend development
        "http://127.0.0.1:8000",
    ]
    
    # Email Settings
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    emails_from_email: Optional[str] = None
    emails_from_name: Optional[str] = None
    
    # Google OAuth Configuration
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    # Default redirect URI for development - automatically detects production
    google_redirect_uri: Optional[str] = None  # Will be set dynamically based on environment
    
    # Additional OAuth settings for CORS and security
    # Can be overridden via OAUTH_ALLOWED_REDIRECT_HOSTS environment variable
    oauth_allowed_redirect_hosts: list[str] = [
        "localhost",
        "127.0.0.1",
        "saasit.ai",
        "www.saasit.ai",
        "app.saasit.ai",
        "saasit-ai.pages.dev",
        # Backend domains for OAuth callbacks
        "saasit-ai-backend-dgoldman.fly.dev",
        "fly.dev"  # Allow all Fly.io subdomains
    ]
    
    # Clerk Authentication Configuration
    clerk_domain: Optional[str] = None  # e.g., "growing-firefly-99" 
    clerk_publishable_key: Optional[str] = None  # Full publishable key for fallback
    
    # Anthropic
    anthropic_api_key: Optional[str] = None
    
    # Redis (for future use)
    redis_url: Optional[str] = "redis://localhost:6379"
    
    # Subscription Tiers
    tier_limits: dict = {
        "free": {
            "workflows_per_month": 3,
            "chat_messages_per_workflow": 10,
            "agents_per_workflow": 10,
            "export_formats": ["json"],
            "version_history_days": 7
        },
        "architect": {
            "workflows_per_month": -1,  # Unlimited
            "chat_messages_per_workflow": -1,
            "agents_per_workflow": -1,
            "export_formats": ["json", "yaml", "claude-code"],
            "version_history_days": 30
        },
        "builder": {
            "workflows_per_month": -1,
            "chat_messages_per_workflow": -1,
            "agents_per_workflow": -1,
            "export_formats": ["json", "yaml", "claude-code", "docker"],
            "version_history_days": 90,
            "concurrent_executions": 1,
            "max_execution_hours": 4
        },
        "shipper": {
            "workflows_per_month": -1,
            "chat_messages_per_workflow": -1,
            "agents_per_workflow": -1,
            "export_formats": ["json", "yaml", "claude-code", "docker", "kubernetes"],
            "version_history_days": 180,
            "concurrent_executions": 3,
            "max_execution_hours": 12,
            "api_calls_per_day": 100,
            "team_members": 3
        },
        "studio": {
            "workflows_per_month": -1,
            "chat_messages_per_workflow": -1,
            "agents_per_workflow": -1,
            "export_formats": ["json", "yaml", "claude-code", "docker", "kubernetes", "terraform"],
            "version_history_days": 365,
            "concurrent_executions": 10,
            "max_execution_hours": 48,
            "api_calls_per_day": 1000,
            "team_members": 10
        }
    }
    
    # Rate Limiting
    rate_limit_per_minute: dict = {
        "free": 20,
        "architect": 60,
        "builder": 100,
        "shipper": 200,
        "studio": 500
    }
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        
        # Parse comma-separated environment variables
        cors_origins_env = os.getenv("BACKEND_CORS_ORIGINS")
        if cors_origins_env:
            self.backend_cors_origins = [origin.strip() for origin in cors_origins_env.split(",")]
        
        oauth_hosts_env = os.getenv("OAUTH_ALLOWED_REDIRECT_HOSTS")
        if oauth_hosts_env:
            self.oauth_allowed_redirect_hosts = [host.strip() for host in oauth_hosts_env.split(",")]
        
        # Auto-extract Clerk domain from publishable key if not explicitly set
        if not self.clerk_domain and self.clerk_publishable_key:
            # Clerk publishable keys are base64 encoded and contain domain info
            import base64
            try:
                # Decode the publishable key to extract domain
                decoded = base64.b64decode(self.clerk_publishable_key + '==')
                # The domain is typically in the decoded payload
                domain_part = decoded.decode('utf-8', errors='ignore')
                # Extract domain pattern like "growing-firefly-99"
                if '.clerk.accounts.dev' in domain_part:
                    self.clerk_domain = domain_part.split('.clerk.accounts.dev')[0].split('/')[-1]
            except:
                # Fallback: extract from environment or use default
                pass
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()