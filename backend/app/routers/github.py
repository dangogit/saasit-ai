from fastapi import APIRouter, HTTPException, Depends, Request
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
import logging

from app.services.github_service import GitHubService
from app.middleware.auth import get_current_active_user
from app.models.user import TokenData

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/github", tags=["github"])

class GitHubTokenRequest(BaseModel):
    github_token: str = Field(..., description="GitHub OAuth token from Clerk")

class CreateRepositoryRequest(BaseModel):
    name: str = Field(..., description="Repository name")
    description: Optional[str] = Field(None, description="Repository description")
    private: bool = Field(False, description="Whether repository should be private")
    github_token: str = Field(..., description="GitHub OAuth token from Clerk")

class AnalyzeRepositoryRequest(BaseModel):
    owner: str = Field(..., description="Repository owner")
    repo: str = Field(..., description="Repository name")
    github_token: str = Field(..., description="GitHub OAuth token from Clerk")

class CreatePullRequestRequest(BaseModel):
    owner: str = Field(..., description="Repository owner")
    repo: str = Field(..., description="Repository name")
    title: str = Field(..., description="Pull request title")
    body: str = Field(..., description="Pull request description")
    head: str = Field(..., description="Source branch")
    base: str = Field("main", description="Target branch")
    github_token: str = Field(..., description="GitHub OAuth token from Clerk")

class SetupWorkflowRequest(BaseModel):
    owner: str = Field(..., description="Repository owner")
    repo: str = Field(..., description="Repository name")
    workflow_config: Dict[str, Any] = Field(..., description="Workflow configuration")
    github_token: str = Field(..., description="GitHub OAuth token from Clerk")

def get_github_service() -> GitHubService:
    """Dependency to get GitHub service instance"""
    return GitHubService()

@router.post("/user")
async def get_github_user(
    token_request: GitHubTokenRequest,
    github_service: GitHubService = Depends(get_github_service),
    current_user: TokenData = Depends(get_current_active_user)
):
    """Get GitHub user information"""
    try:
        user_info = await github_service.get_user_info(token_request.github_token)
        return {
            "user": user_info,
            "connected": True
        }
    except Exception as e:
        logger.error(f"Failed to get GitHub user info: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/repositories")
async def get_user_repositories(
    token_request: GitHubTokenRequest,
    github_service: GitHubService = Depends(get_github_service),
    current_user: TokenData = Depends(get_current_active_user)
):
    """Get user's GitHub repositories"""
    try:
        repositories = await github_service.get_user_repositories(
            token_request.github_token
        )
        return {
            "repositories": repositories,
            "count": len(repositories)
        }
    except Exception as e:
        logger.error(f"Failed to get repositories: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/repositories/create")
async def create_repository(
    request: CreateRepositoryRequest,
    github_service: GitHubService = Depends(get_github_service),
    current_user: TokenData = Depends(get_current_active_user)
):
    """Create a new GitHub repository"""
    try:
        repository = await github_service.create_repository(
            github_token=request.github_token,
            name=request.name,
            description=request.description,
            private=request.private
        )
        return {
            "repository": repository,
            "message": f"Repository '{request.name}' created successfully"
        }
    except Exception as e:
        logger.error(f"Failed to create repository: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/repositories/analyze")
async def analyze_repository(
    request: AnalyzeRepositoryRequest,
    github_service: GitHubService = Depends(get_github_service),
    current_user: TokenData = Depends(get_current_active_user)
):
    """Analyze repository structure and detect frameworks/conventions"""
    try:
        # Get basic repository info
        repo_info = await github_service.get_repository(
            request.github_token, request.owner, request.repo
        )
        
        # Analyze structure
        analysis = await github_service.analyze_repository_structure(
            request.github_token, request.owner, request.repo
        )
        
        return {
            "repository": {
                "name": repo_info["name"],
                "full_name": repo_info["full_name"],
                "description": repo_info["description"],
                "language": repo_info["language"],
                "size": repo_info["size"],
                "default_branch": repo_info["default_branch"],
                "created_at": repo_info["created_at"],
                "updated_at": repo_info["updated_at"]
            },
            "analysis": analysis,
            "suggestions": await _generate_agent_suggestions(analysis)
        }
    except Exception as e:
        logger.error(f"Failed to analyze repository: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/repositories/setup-workflow")
async def setup_workflow(
    request: SetupWorkflowRequest,
    github_service: GitHubService = Depends(get_github_service),
    current_user: TokenData = Depends(get_current_active_user)
):
    """Setup GitHub Actions workflow for SaasIt.ai execution"""
    try:
        result = await github_service.setup_saasit_workflow(
            github_token=request.github_token,
            owner=request.owner,
            repo=request.repo,
            workflow_config=request.workflow_config
        )
        return {
            "setup": result,
            "message": "GitHub Actions workflow configured successfully"
        }
    except Exception as e:
        logger.error(f"Failed to setup workflow: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/pull-requests/create")
async def create_pull_request(
    request: CreatePullRequestRequest,
    github_service: GitHubService = Depends(get_github_service),
    current_user: TokenData = Depends(get_current_active_user)
):
    """Create a pull request"""
    try:
        pull_request = await github_service.create_pull_request(
            github_token=request.github_token,
            owner=request.owner,
            repo=request.repo,
            title=request.title,
            body=request.body,
            head=request.head,
            base=request.base
        )
        return {
            "pull_request": pull_request,
            "message": "Pull request created successfully"
        }
    except Exception as e:
        logger.error(f"Failed to create pull request: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/repositories/{owner}/{repo}/contents/{path:path}")
async def get_file_content(
    owner: str,
    repo: str,
    path: str,
    token_request: GitHubTokenRequest,
    github_service: GitHubService = Depends(get_github_service),
    current_user: TokenData = Depends(get_current_active_user)
):
    """Get content of a specific file"""
    try:
        content = await github_service.get_file_content(
            token_request.github_token, owner, repo, path
        )
        return {
            "path": path,
            "content": content
        }
    except Exception as e:
        logger.error(f"Failed to get file content: {e}")
        raise HTTPException(status_code=400, detail=str(e))

async def _generate_agent_suggestions(analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generate intelligent agent suggestions based on repository analysis"""
    suggestions = []
    
    # Detect project type and suggest appropriate agents
    if "javascript" in analysis["languages"]:
        if "npm" in analysis["package_managers"]:
            suggestions.append({
                "agent": "frontend-developer",
                "reason": "JavaScript/npm project detected - can enhance UI/UX",
                "priority": "high"
            })
        
        suggestions.append({
            "agent": "test-writer-fixer", 
            "reason": "JavaScript project - can add/improve tests",
            "priority": "medium" if analysis["has_tests"] else "high"
        })
    
    if "python" in analysis["languages"]:
        suggestions.append({
            "agent": "backend-architect",
            "reason": "Python project detected - can enhance backend architecture", 
            "priority": "high"
        })
        
        if not analysis["has_tests"]:
            suggestions.append({
                "agent": "test-writer-fixer",
                "reason": "No tests detected - can add comprehensive test suite",
                "priority": "high"
            })
    
    if not analysis["has_docs"]:
        suggestions.append({
            "agent": "technical-writer",
            "reason": "No documentation detected - can create README and docs",
            "priority": "medium"
        })
    
    if not analysis["has_ci"]:
        suggestions.append({
            "agent": "devops-automator", 
            "reason": "No CI/CD detected - can setup GitHub Actions",
            "priority": "medium"
        })
    
    # Security and performance suggestions
    suggestions.append({
        "agent": "security-auditor",
        "reason": "Can review code for security vulnerabilities",
        "priority": "medium"
    })
    
    if "docker" not in analysis["build_tools"]:
        suggestions.append({
            "agent": "devops-automator",
            "reason": "Can containerize the application",
            "priority": "low"
        })
    
    return suggestions[:6]  # Limit to top 6 suggestions

@router.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    # GitHub service will be cleaned up automatically