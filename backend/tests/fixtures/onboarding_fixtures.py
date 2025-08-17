"""
Test fixtures for onboarding E2E tests
Provides reusable test data and mock configurations
"""
import pytest
import asyncio
from typing import Dict, List, Any
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient
from datetime import datetime, timedelta

from app.models.user import TokenData
from app.utils.security import create_tokens


@pytest.fixture
def sample_claude_md_content() -> str:
    """Sample CLAUDE.md content for testing analysis"""
    return """# SaasIt.ai Test Project

## Project Overview
This is a modern SaaS application built with cutting-edge technologies.
The project aims to provide AI-powered development tools for rapid prototyping.

## Tech Stack

### Frontend
- React 18 with TypeScript
- Tailwind CSS for styling
- Zustand for state management
- React Flow for workflow visualization

### Backend
- FastAPI with Python 3.11
- MongoDB with Motor async driver
- JWT authentication
- Anthropic Claude API integration

### Infrastructure
- Docker for containerization
- Fly.io for deployment
- Cloudflare for CDN
- MongoDB Atlas for database

## Architecture

The application follows a modern full-stack architecture:

1. **Frontend**: Single-page React application with real-time updates
2. **Backend**: RESTful API with WebSocket support for real-time features
3. **Database**: Document-based storage with MongoDB
4. **Authentication**: JWT-based auth with Clerk integration

## Development Commands

```bash
# Frontend
cd frontend
npm start              # Start development server
npm run build          # Build for production
npm test               # Run tests

# Backend
cd backend
uvicorn server:app --reload  # Start development server
pytest                       # Run tests
```

## AI Agents Integration

This project is designed to work with various AI agents:
- rapid-prototyper: For quick MVP development
- frontend-developer: For React component creation
- backend-architect: For API design and implementation
- devops-automator: For deployment and CI/CD

## Important Notes

- Uses Clerk for authentication
- Requires ANTHROPIC_API_KEY for AI features
- MongoDB connection required for data persistence
- WebSocket endpoints for real-time updates
"""


@pytest.fixture
def large_claude_md_content() -> str:
    """Large CLAUDE.md content for performance testing"""
    base_content = """# Large Project Documentation

## Overview
This is a comprehensive project with extensive documentation.

## Technologies Used
"""
    
    # Add many technologies to test parsing performance
    technologies = [
        "React", "Vue", "Angular", "Svelte", "Node.js", "Python", "Java", "Go",
        "MongoDB", "PostgreSQL", "Redis", "ElasticSearch", "Docker", "Kubernetes",
        "AWS", "GCP", "Azure", "Terraform", "Ansible", "Jenkins", "GitHub Actions",
        "TypeScript", "JavaScript", "Python", "Rust", "WebAssembly", "GraphQL",
        "REST", "gRPC", "WebSockets", "Socket.io", "Express", "FastAPI", "Django",
        "Flask", "Spring Boot", "Gin", "Fiber", "Next.js", "Nuxt.js", "Gatsby",
        "Material-UI", "Ant Design", "Chakra UI", "Tailwind CSS", "Bootstrap"
    ]
    
    for tech in technologies:
        base_content += f"\n- {tech}: Used for various functionalities"
    
    base_content += """

## Detailed Architecture

This section contains extensive details about the system architecture,
including microservices design, database schemas, API specifications,
and deployment strategies. The content is intentionally verbose to test
the performance of the analysis system with large files.

""" + "This is additional content to make the file larger. " * 500
    
    return base_content


@pytest.fixture
async def test_user_token(test_db) -> str:
    """Create a test user token for authentication"""
    user_id = f"test_user_{datetime.now().timestamp()}"
    email = "test@example.com"
    tier = "free"
    
    tokens = create_tokens(user_id, email, tier)
    return tokens["access_token"]


@pytest.fixture
async def free_tier_user_token(test_db) -> str:
    """Create a free tier user token for rate limiting tests"""
    user_id = f"free_user_{datetime.now().timestamp()}"
    email = "free@example.com"
    tier = "free"
    
    tokens = create_tokens(user_id, email, tier)
    return tokens["access_token"]


@pytest.fixture
async def premium_user_token(test_db) -> str:
    """Create a premium user token for testing tier-specific features"""
    user_id = f"premium_user_{datetime.now().timestamp()}"
    email = "premium@example.com"
    tier = "architect"
    
    tokens = create_tokens(user_id, email, tier)
    return tokens["access_token"]


@pytest.fixture
async def multiple_user_tokens(test_db) -> List[str]:
    """Create multiple user tokens for concurrent testing"""
    tokens = []
    for i in range(15):
        user_id = f"user_{i}_{datetime.now().timestamp()}"
        email = f"user{i}@example.com"
        tier = "free" if i < 10 else "architect"
        
        token_data = create_tokens(user_id, email, tier)
        tokens.append(token_data["access_token"])
    return tokens


@pytest.fixture
async def authenticated_client(client: AsyncClient, test_user_token: str) -> AsyncClient:
    """Create an authenticated HTTP client for testing"""
    client.headers.update({"Authorization": f"Bearer {test_user_token}"})
    return client


@pytest.fixture
def mock_clerk_metadata():
    """Mock Clerk user metadata operations"""
    with patch('app.services.auth_service.AuthService') as mock_clerk:
        mock_instance = mock_clerk.return_value
        mock_instance.update_user_metadata = AsyncMock(return_value={"success": True})
        mock_instance.get_user_metadata = AsyncMock(return_value={
            "onboarding": {
                "completed": False,
                "current_step": "welcome",
                "progress": 0
            }
        })
        yield mock_instance


@pytest.fixture
def mock_github_api():
    """Mock GitHub API responses"""
    with patch('httpx.AsyncClient') as mock_client:
        mock_instance = mock_client.return_value.__aenter__.return_value
        
        # Mock repository list
        mock_instance.get.return_value.json.return_value = [
            {
                "id": 123456,
                "name": "test-repo",
                "full_name": "testuser/test-repo",
                "description": "A test repository",
                "private": False,
                "html_url": "https://github.com/testuser/test-repo",
                "language": "JavaScript",
                "stargazers_count": 42,
                "forks_count": 5,
                "created_at": "2023-01-01T00:00:00Z",
                "updated_at": "2023-12-01T00:00:00Z"
            }
        ]
        mock_instance.get.return_value.status_code = 200
        
        yield mock_instance


@pytest.fixture
def mock_claude_api():
    """Mock Anthropic Claude API responses"""
    with patch('anthropic.AsyncAnthropic') as mock_claude:
        mock_instance = mock_claude.return_value
        
        # Mock workflow generation response
        mock_response = AsyncMock()
        mock_response.content = [
            AsyncMock(text="""
Based on your project analysis, I recommend the following workflow:

## Recommended AI Agents

1. **Rapid Prototyper** - Build initial MVP quickly
2. **Frontend Developer** - Create React components and UI
3. **Backend Architect** - Design FastAPI endpoints
4. **DevOps Automator** - Set up deployment pipeline

## Workflow Steps

1. Rapid prototyping phase (1-2 days)
2. Frontend development (3-4 days)  
3. Backend implementation (2-3 days)
4. Testing and deployment (1 day)

This workflow is optimized for a 1-week development cycle.
            """)
        ]
        mock_instance.messages.create = AsyncMock(return_value=mock_response)
        
        yield mock_instance


@pytest.fixture
def saved_onboarding_progress() -> Dict[str, Any]:
    """Sample saved onboarding progress data"""
    return {
        "version": "1.0",
        "user_id": "test_user_123",
        "project_type": "new",
        "current_step": "questions",
        "completed_steps": ["welcome", "detection", "project-type"],
        "skipped_steps": [],
        "claude_code_detected": False,
        "github_connected": False,
        "question_history": [
            {
                "question": "What type of project are you working on?",
                "answer": "new",
                "timestamp": "2024-01-01T00:00:00Z"
            }
        ],
        "ai_recommendations": None,
        "selected_template": None,
        "last_saved_at": datetime.utcnow().isoformat()
    }


@pytest.fixture
def onboarding_question_flow() -> List[Dict[str, Any]]:
    """Sample question flow data for testing"""
    return [
        {
            "question_id": "project_type",
            "question": "What type of project are you working on?",
            "question_type": "single_choice",
            "options": ["New Project", "Existing Project"],
            "required": True
        },
        {
            "question_id": "project_goal",
            "question": "What's the main goal of your project?",
            "question_type": "single_choice",
            "options": [
                "Build a SaaS application",
                "Create an AI-powered tool",
                "Develop an e-commerce platform",
                "Build a mobile app",
                "Other"
            ],
            "required": True
        },
        {
            "question_id": "target_users",
            "question": "Who are your target users?",
            "question_type": "text",
            "required": False
        },
        {
            "question_id": "timeline",
            "question": "What's your timeline for the first version?",
            "question_type": "single_choice",
            "options": [
                "As soon as possible (days)",
                "Within a few weeks",
                "Within a few months",
                "I'm flexible with timing"
            ],
            "required": False
        },
        {
            "question_id": "experience",
            "question": "How would you describe your development experience?",
            "question_type": "single_choice",
            "options": [
                "Beginner - I'm new to development",
                "Intermediate - I have some experience",
                "Advanced - I'm an experienced developer"
            ],
            "required": False
        }
    ]


@pytest.fixture
def claude_code_detection_scenarios() -> Dict[str, Dict[str, Any]]:
    """Various Claude Code detection scenarios for testing"""
    return {
        "found_api": {
            "has_claude_code": True,
            "version": "1.0.0",
            "status": "found",
            "detection_method": "api",
            "additional_info": {
                "port": 3001,
                "endpoint": "http://localhost:3001/health"
            }
        },
        "found_command": {
            "has_claude_code": True,
            "version": "1.0.0",
            "status": "found",
            "detection_method": "command",
            "additional_info": {
                "command": "claude-code --version",
                "output": "claude-code@1.0.0"
            }
        },
        "not_found": {
            "has_claude_code": False,
            "version": None,
            "status": "not-found",
            "detection_method": None,
            "additional_info": {
                "checked_methods": "both",
                "suggestions": [
                    "Install Claude Code from https://claude.ai/code",
                    "Ensure Claude Code is in your PATH"
                ]
            }
        },
        "error": {
            "has_claude_code": False,
            "version": None,
            "status": "error",
            "detection_method": None,
            "error_message": "Detection service temporarily unavailable",
            "additional_info": {
                "error_type": "ServiceUnavailable"
            }
        }
    }


@pytest.fixture
def project_analysis_results() -> Dict[str, Any]:
    """Sample project analysis results for testing"""
    return {
        "simple_project": {
            "technologies": ["React", "Node.js"],
            "framework": "React",
            "project_type": "Web App",
            "complexity": "simple",
            "agents_mentioned": [],
            "structure_info": {
                "tech stack": "React frontend with Node.js backend"
            },
            "recommendations": [
                "Use Frontend Developer agent for React components",
                "Consider Backend Architect for API design"
            ]
        },
        "complex_project": {
            "technologies": [
                "React", "TypeScript", "Node.js", "FastAPI", "Python",
                "MongoDB", "Redis", "Docker", "Kubernetes", "AWS"
            ],
            "framework": "React",
            "project_type": "Microservices",
            "complexity": "complex",
            "agents_mentioned": [
                "rapid-prototyper", "frontend-developer", 
                "backend-architect", "devops-automator"
            ],
            "structure_info": {
                "architecture": "Microservices with React frontend",
                "deployment": "Kubernetes with Docker containers",
                "database": "MongoDB with Redis caching"
            },
            "recommendations": [
                "Use DevOps Automator for Kubernetes deployment",
                "Backend Architect for microservices design",
                "Frontend Developer for React optimization",
                "Infrastructure Maintainer for monitoring"
            ]
        },
        "ai_project": {
            "technologies": ["Python", "FastAPI", "OpenAI", "LangChain", "PostgreSQL"],
            "framework": "FastAPI",
            "project_type": "AI Application",
            "complexity": "moderate",
            "agents_mentioned": ["ai-engineer", "backend-architect"],
            "structure_info": {
                "ai_stack": "OpenAI GPT with LangChain",
                "backend": "FastAPI with PostgreSQL"
            },
            "recommendations": [
                "Use AI Engineer agent for ML pipeline",
                "Backend Architect for API design",
                "Consider Data Analyst for insights"
            ]
        }
    }


@pytest.fixture
async def setup_test_database(test_db):
    """Set up test database with initial onboarding data"""
    # Create test collections and indexes
    await test_db.onboarding_progress.create_index("user_id", unique=True)
    await test_db.onboarding_progress.create_index("saved_at")
    
    # Insert sample data if needed
    sample_progress = {
        "user_id": "sample_user",
        "progress_data": {
            "current_step": "templates",
            "completed_steps": ["welcome", "detection", "project-type"],
            "project_type": "new"
        },
        "saved_at": datetime.utcnow(),
        "version": "1.0"
    }
    
    await test_db.onboarding_progress.insert_one(sample_progress)
    
    yield test_db
    
    # Cleanup
    await test_db.onboarding_progress.delete_many({})


@pytest.fixture
def mock_rate_limiter():
    """Mock rate limiter for testing"""
    with patch('app.middleware.auth.rate_limiter') as mock_limiter:
        mock_limiter.check_rate_limit = AsyncMock(return_value=True)
        yield mock_limiter


@pytest.fixture
def mock_background_tasks():
    """Mock background tasks for testing"""
    with patch('fastapi.BackgroundTasks') as mock_tasks:
        mock_instance = mock_tasks.return_value
        mock_instance.add_task = AsyncMock()
        yield mock_instance