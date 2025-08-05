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
    
    # CORS
    backend_cors_origins: list[str] = ["http://localhost:3000", "http://localhost:3001"]
    
    # Email Settings
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    emails_from_email: Optional[str] = None
    emails_from_name: Optional[str] = None
    
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
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()