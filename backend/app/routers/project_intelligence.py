"""
Project Intelligence API Router

Provides endpoints for repository analysis, technology detection,
and AI agent recommendations based on codebase analysis.
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
import logging

from app.services.project_intelligence import ProjectIntelligence
from app.services.github_service import GitHubService
from app.middleware.auth import get_current_active_user
from app.models.user import TokenData

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/project-intelligence", tags=["project-intelligence"])

class RepositoryAnalysisRequest(BaseModel):
    github_token: str = Field(..., description="GitHub OAuth token")
    owner: str = Field(..., description="Repository owner")
    repo: str = Field(..., description="Repository name")

class RepositoryAnalysisResponse(BaseModel):
    repository: Dict[str, Any]
    structure: Dict[str, Any]
    technologies: Dict[str, Any]
    code_patterns: Dict[str, Any]
    complexity: Dict[str, Any]
    agent_recommendations: List[Dict[str, Any]]
    enhancement_suggestions: List[Dict[str, Any]]
    confidence_score: float

class AgentRecommendationRequest(BaseModel):
    repository_analysis: Dict[str, Any] = Field(..., description="Pre-analyzed repository data")
    user_preferences: Optional[Dict[str, Any]] = Field(None, description="User preferences")
    project_goals: Optional[List[str]] = Field(None, description="Specific project goals")

class AgentRecommendationResponse(BaseModel):
    recommendations: List[Dict[str, Any]]
    workflow_suggestions: List[Dict[str, Any]]
    estimated_timeline: str
    confidence_score: float

class TechnologyDetectionRequest(BaseModel):
    github_token: str = Field(..., description="GitHub OAuth token")
    owner: str = Field(..., description="Repository owner")
    repo: str = Field(..., description="Repository name")

class TechnologyDetectionResponse(BaseModel):
    detected: Dict[str, Any]
    primary_stack: Dict[str, str]
    total_technologies: int
    analysis_coverage: float

def get_project_intelligence() -> ProjectIntelligence:
    """Dependency to get project intelligence service"""
    github_service = GitHubService()
    return ProjectIntelligence(github_service)

@router.post("/analyze-repository", response_model=RepositoryAnalysisResponse)
async def analyze_repository(
    request: RepositoryAnalysisRequest,
    project_intelligence: ProjectIntelligence = Depends(get_project_intelligence),
    current_user: TokenData = Depends(get_current_active_user)
):
    """
    Perform comprehensive repository analysis including:
    - Technology and framework detection
    - Code pattern analysis
    - Complexity assessment
    - AI agent recommendations
    - Enhancement suggestions
    """
    try:
        logger.info(f"Starting repository analysis for {request.owner}/{request.repo} by user {current_user.user_id}")
        
        analysis_result = await project_intelligence.analyze_repository(
            github_token=request.github_token,
            owner=request.owner,
            repo=request.repo
        )
        
        logger.info(f"Repository analysis completed for {request.owner}/{request.repo}")
        return RepositoryAnalysisResponse(**analysis_result)
        
    except Exception as e:
        logger.error(f"Repository analysis failed for {request.owner}/{request.repo}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Repository analysis failed: {str(e)}"
        )

@router.post("/detect-technologies", response_model=TechnologyDetectionResponse)
async def detect_technologies(
    request: TechnologyDetectionRequest,
    project_intelligence: ProjectIntelligence = Depends(get_project_intelligence),
    current_user: TokenData = Depends(get_current_active_user)
):
    """
    Detect technologies and frameworks used in a repository.
    Lighter version of full analysis focusing only on technology detection.
    """
    try:
        logger.info(f"Detecting technologies for {request.owner}/{request.repo}")
        
        # Get repository structure
        github_service = GitHubService()
        structure = await github_service.analyze_repository_structure(
            request.github_token, request.owner, request.repo
        )
        
        # Detect technologies
        technologies = await project_intelligence._detect_technologies(
            request.github_token, request.owner, request.repo, structure
        )
        
        logger.info(f"Technology detection completed for {request.owner}/{request.repo}")
        return TechnologyDetectionResponse(**technologies)
        
    except Exception as e:
        logger.error(f"Technology detection failed for {request.owner}/{request.repo}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Technology detection failed: {str(e)}"
        )

@router.post("/recommend-agents", response_model=AgentRecommendationResponse)
async def recommend_agents(
    request: AgentRecommendationRequest,
    project_intelligence: ProjectIntelligence = Depends(get_project_intelligence),
    current_user: TokenData = Depends(get_current_active_user)
):
    """
    Generate AI agent recommendations based on repository analysis.
    Can accept pre-analyzed repository data to avoid re-analysis.
    """
    try:
        logger.info(f"Generating agent recommendations for user {current_user.user_id}")
        
        analysis_data = request.repository_analysis
        technologies = analysis_data.get("technologies", {})
        code_patterns = analysis_data.get("code_patterns", {})
        complexity = analysis_data.get("complexity", {})
        
        # Generate agent recommendations
        agent_recommendations = project_intelligence._generate_agent_recommendations(
            technologies, code_patterns
        )
        
        # Generate workflow suggestions based on recommendations and user goals
        workflow_suggestions = _generate_workflow_suggestions(
            agent_recommendations,
            request.project_goals or [],
            complexity
        )
        
        # Estimate timeline
        estimated_timeline = _estimate_project_timeline(
            agent_recommendations, 
            complexity,
            request.user_preferences or {}
        )
        
        # Calculate confidence
        confidence_score = project_intelligence._calculate_confidence_score(
            technologies, code_patterns
        )
        
        response = AgentRecommendationResponse(
            recommendations=agent_recommendations,
            workflow_suggestions=workflow_suggestions,
            estimated_timeline=estimated_timeline,
            confidence_score=confidence_score
        )
        
        logger.info(f"Agent recommendations generated for user {current_user.user_id}")
        return response
        
    except Exception as e:
        logger.error(f"Agent recommendation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Agent recommendation failed: {str(e)}"
        )

@router.get("/agent-catalog")
async def get_agent_catalog(
    category: Optional[str] = None,
    technology: Optional[str] = None,
    current_user: TokenData = Depends(get_current_active_user)
):
    """
    Get available AI agents with their capabilities and specializations.
    Can be filtered by category or technology.
    """
    try:
        # This would typically come from a database or configuration
        # For now, we'll return a structured catalog based on our recommendations
        project_intelligence = ProjectIntelligence()
        
        agent_catalog = {
            "Engineering": [
                {
                    "id": "frontend-developer",
                    "name": "Frontend Developer",
                    "description": "Specializes in UI/UX implementation, responsive design, and modern frontend frameworks",
                    "technologies": ["react", "vue", "angular", "nextjs", "svelte"],
                    "capabilities": ["component development", "styling", "performance optimization", "accessibility"],
                    "estimated_hourly_rate": "2-4 hours per feature"
                },
                {
                    "id": "backend-developer", 
                    "name": "Backend Developer",
                    "description": "Focuses on server-side logic, APIs, and data management",
                    "technologies": ["fastapi", "django", "flask", "expressjs", "nestjs"],
                    "capabilities": ["API design", "database integration", "security", "performance"],
                    "estimated_hourly_rate": "3-6 hours per endpoint"
                },
                {
                    "id": "fullstack-developer",
                    "name": "Fullstack Developer", 
                    "description": "End-to-end development across frontend and backend",
                    "technologies": ["react", "nextjs", "fastapi", "django", "postgresql"],
                    "capabilities": ["complete feature development", "integration", "deployment"],
                    "estimated_hourly_rate": "4-8 hours per feature"
                }
            ],
            "Testing": [
                {
                    "id": "test-automation-engineer",
                    "name": "Test Automation Engineer",
                    "description": "Implements comprehensive testing strategies and automation",
                    "technologies": ["jest", "pytest", "cypress", "selenium"],
                    "capabilities": ["unit testing", "integration testing", "test automation", "CI/CD integration"],
                    "estimated_hourly_rate": "2-4 hours per test suite"
                },
                {
                    "id": "qa-specialist",
                    "name": "QA Specialist",
                    "description": "Quality assurance and manual testing expertise",
                    "technologies": ["manual testing", "automated testing", "performance testing"],
                    "capabilities": ["test planning", "bug reporting", "quality metrics"],
                    "estimated_hourly_rate": "1-3 hours per feature"
                }
            ],
            "Operations": [
                {
                    "id": "devops-engineer",
                    "name": "DevOps Engineer", 
                    "description": "Infrastructure, deployment, and operations automation",
                    "technologies": ["docker", "kubernetes", "terraform", "aws", "gcp"],
                    "capabilities": ["CI/CD pipelines", "infrastructure as code", "monitoring", "scaling"],
                    "estimated_hourly_rate": "3-8 hours per environment"
                },
                {
                    "id": "deployment-specialist",
                    "name": "Deployment Specialist",
                    "description": "Focuses on deployment strategies and production readiness",
                    "technologies": ["docker", "kubernetes", "cloud platforms"],
                    "capabilities": ["deployment automation", "rollback strategies", "monitoring"],
                    "estimated_hourly_rate": "2-5 hours per deployment"
                }
            ],
            "Design": [
                {
                    "id": "ui-designer",
                    "name": "UI Designer",
                    "description": "User interface design and visual consistency",
                    "technologies": ["css", "tailwind", "styled-components", "sass"],
                    "capabilities": ["visual design", "component libraries", "responsive design"],
                    "estimated_hourly_rate": "2-6 hours per screen"
                }
            ]
        }
        
        # Filter by category if specified
        if category:
            agent_catalog = {category: agent_catalog.get(category, [])}
        
        # Filter by technology if specified
        if technology:
            filtered_catalog = {}
            for cat, agents in agent_catalog.items():
                filtered_agents = [
                    agent for agent in agents 
                    if technology.lower() in [tech.lower() for tech in agent.get("technologies", [])]
                ]
                if filtered_agents:
                    filtered_catalog[cat] = filtered_agents
            agent_catalog = filtered_catalog
        
        return {
            "categories": list(agent_catalog.keys()),
            "agents": agent_catalog,
            "total_agents": sum(len(agents) for agents in agent_catalog.values())
        }
        
    except Exception as e:
        logger.error(f"Agent catalog retrieval failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Agent catalog retrieval failed: {str(e)}"
        )

def _generate_workflow_suggestions(
    agent_recommendations: List[Dict[str, Any]],
    project_goals: List[str],
    complexity: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """Generate workflow suggestions based on agent recommendations and goals."""
    suggestions = []
    
    # Basic development workflow
    if any("frontend-developer" in rec["agent_id"] for rec in agent_recommendations):
        suggestions.append({
            "name": "Frontend Development Workflow",
            "description": "UI/UX development with modern frameworks",
            "agents": ["ui-designer", "frontend-developer", "test-automation-engineer"],
            "phases": ["design", "implementation", "testing", "optimization"],
            "estimated_duration": "1-2 weeks"
        })
    
    # Full-stack development workflow
    if any("backend" in rec["agent_id"] for rec in agent_recommendations):
        suggestions.append({
            "name": "Full-Stack Development Workflow", 
            "description": "Complete application development",
            "agents": ["backend-developer", "frontend-developer", "database-designer", "devops-engineer"],
            "phases": ["architecture", "backend", "frontend", "integration", "deployment"],
            "estimated_duration": "2-4 weeks"
        })
    
    # Testing and quality workflow
    if complexity.get("maintenance_score", 0) < 0.5:
        suggestions.append({
            "name": "Quality Improvement Workflow",
            "description": "Improve code quality and testing coverage", 
            "agents": ["test-automation-engineer", "code-reviewer", "documentation-writer"],
            "phases": ["analysis", "test_implementation", "documentation", "quality_gates"],
            "estimated_duration": "3-7 days"
        })
    
    # DevOps workflow
    if not complexity.get("has_ci_cd", False):
        suggestions.append({
            "name": "DevOps Setup Workflow",
            "description": "CI/CD pipeline and infrastructure setup",
            "agents": ["devops-engineer", "security-auditor", "infrastructure-architect"],
            "phases": ["planning", "pipeline_setup", "security_hardening", "monitoring"],
            "estimated_duration": "1-2 weeks"
        })
    
    return suggestions

def _estimate_project_timeline(
    agent_recommendations: List[Dict[str, Any]],
    complexity: Dict[str, Any],
    user_preferences: Dict[str, Any]
) -> str:
    """Estimate overall project timeline."""
    complexity_score = complexity.get("complexity_score", 0.5)
    agent_count = len(agent_recommendations[:5])  # Consider top 5 agents
    
    # Base estimates in days
    base_estimates = {
        "small": 3,
        "medium": 7, 
        "large": 14,
        "enterprise": 30
    }
    
    size_category = complexity.get("size_category", "medium")
    base_days = base_estimates.get(size_category, 7)
    
    # Adjust for agent count (parallel work)
    if agent_count > 1:
        parallel_factor = 0.7  # 30% reduction for parallel work
        adjusted_days = base_days * parallel_factor
    else:
        adjusted_days = base_days
    
    # Adjust for complexity
    complexity_multiplier = 1 + (complexity_score * 0.5)
    final_days = int(adjusted_days * complexity_multiplier)
    
    if final_days <= 7:
        return f"{final_days} days"
    elif final_days <= 21:
        weeks = final_days / 7
        return f"{weeks:.1f} weeks"
    else:
        months = final_days / 30
        return f"{months:.1f} months"