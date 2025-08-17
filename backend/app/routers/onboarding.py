from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
import httpx
import asyncio
import subprocess
import json
import re
from datetime import datetime

from ..models.user import TokenData
from ..middleware.auth import get_current_user, check_rate_limit

router = APIRouter(prefix="/onboarding", tags=["onboarding"])

class ClaudeCodeDetectionRequest(BaseModel):
    check_method: str = Field(default="api", pattern="^(api|command|both)$", description="Detection method: api, command, or both")

class ClaudeCodeDetectionResponse(BaseModel):
    has_claude_code: bool
    version: Optional[str] = None
    status: str  # "found" | "not-found" | "error"
    detection_method: Optional[str] = None
    error_message: Optional[str] = None
    additional_info: Optional[Dict[str, Any]] = None

class OnboardingAnswerRequest(BaseModel):
    question_id: str = Field(..., min_length=1, max_length=100, description="Question identifier")
    answer: str = Field(..., min_length=1, max_length=1000, description="User's answer")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context")

class OnboardingQuestionResponse(BaseModel):
    question_id: str
    question: str
    question_type: str  # "single_choice" | "multiple_choice" | "text" | "scale"
    options: Optional[List[str]] = None
    context: Optional[str] = None
    reasoning: Optional[str] = None
    is_final: bool = False

class CLAUDEMdAnalysisRequest(BaseModel):
    content: str = Field(..., min_length=10, max_length=50000, description="CLAUDE.md file content")
    repo_url: Optional[str] = Field(None, max_length=500, description="Repository URL")

class CLAUDEMdAnalysisResponse(BaseModel):
    technologies: List[str]
    framework: Optional[str]
    project_type: Optional[str]
    complexity: str  # "simple" | "moderate" | "complex"
    agents_mentioned: List[str]
    structure_info: Dict[str, Any]
    recommendations: List[str]

@router.post("/detect-claude-code", response_model=ClaudeCodeDetectionResponse)
async def detect_claude_code(
    request: ClaudeCodeDetectionRequest,
    current_user: TokenData = Depends(check_rate_limit)
):
    """
    Detect Claude Code installation and version.
    This endpoint supports multiple detection methods for maximum compatibility.
    """
    
    detection_results = {
        "has_claude_code": False,
        "version": None,
        "status": "not-found",
        "detection_method": None,
        "additional_info": {}
    }
    
    try:
        # Method 1: Try to detect via API calls (check for local Claude Code server)
        if request.check_method in ["api", "both"]:
            api_result = await _detect_via_api()
            if api_result["found"]:
                detection_results.update({
                    "has_claude_code": True,
                    "version": api_result.get("version"),
                    "status": "found",
                    "detection_method": "api",
                    "additional_info": api_result
                })
                return ClaudeCodeDetectionResponse(**detection_results)
        
        # Method 2: Try command line detection
        if request.check_method in ["command", "both"]:
            command_result = await _detect_via_command()
            if command_result["found"]:
                detection_results.update({
                    "has_claude_code": True,
                    "version": command_result.get("version"),
                    "status": "found",
                    "detection_method": "command",
                    "additional_info": command_result
                })
                return ClaudeCodeDetectionResponse(**detection_results)
        
        # If no detection method found Claude Code
        detection_results["status"] = "not-found"
        detection_results["additional_info"] = {
            "checked_methods": request.check_method,
            "suggestions": [
                "Install Claude Code from https://claude.ai/code",
                "Ensure Claude Code is in your PATH",
                "Try restarting your terminal after installation"
            ]
        }
        
        return ClaudeCodeDetectionResponse(**detection_results)
        
    except Exception as e:
        detection_results.update({
            "status": "error",
            "error_message": str(e),
            "additional_info": {"error_type": type(e).__name__}
        })
        return ClaudeCodeDetectionResponse(**detection_results)

async def _detect_via_api() -> Dict[str, Any]:
    """
    Try to detect Claude Code by checking for a local API server.
    Claude Code may run a local server that we can ping.
    """
    possible_ports = [3001, 3000, 8080, 8000]
    
    for port in possible_ports:
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                # Try common Claude Code API endpoints
                endpoints_to_try = [
                    f"http://localhost:{port}/api/health",
                    f"http://localhost:{port}/health",
                    f"http://localhost:{port}/version",
                    f"http://localhost:{port}/api/version"
                ]
                
                for endpoint in endpoints_to_try:
                    try:
                        response = await client.get(endpoint)
                        if response.status_code == 200:
                            data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
                            
                            # Check if response indicates Claude Code
                            response_text = response.text.lower()
                            if any(keyword in response_text for keyword in ["claude", "anthropic", "claude-code"]):
                                return {
                                    "found": True,
                                    "method": "api",
                                    "port": port,
                                    "endpoint": endpoint,
                                    "version": data.get("version"),
                                    "response_data": data
                                }
                    except (httpx.HTTPError, ValueError):
                        continue
        except Exception:
            continue
    
    return {"found": False, "method": "api"}

async def _detect_via_command() -> Dict[str, Any]:
    """
    Try to detect Claude Code via command line.
    """
    commands_to_try = [
        ["claude-code", "--version"],
        ["claude", "--version"],
        ["npx", "claude-code", "--version"],
        ["claude-code", "-v"],
        ["claude", "-v"]
    ]
    
    for command in commands_to_try:
        try:
            # Run command with timeout
            process = await asyncio.create_subprocess_exec(
                *command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            try:
                stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=5.0)
                
                if process.returncode == 0:
                    output = stdout.decode().strip()
                    
                    # Extract version using regex
                    version_patterns = [
                        r"claude-code@([\d\.]+)",
                        r"version\s+([\d\.]+)",
                        r"v([\d\.]+)",
                        r"([\d\.]+)"
                    ]
                    
                    version = None
                    for pattern in version_patterns:
                        match = re.search(pattern, output, re.IGNORECASE)
                        if match:
                            version = match.group(1)
                            break
                    
                    return {
                        "found": True,
                        "method": "command",
                        "command": " ".join(command),
                        "version": version,
                        "output": output
                    }
                    
            except asyncio.TimeoutError:
                # Kill the process if it times out
                process.kill()
                await process.wait()
                
        except (FileNotFoundError, PermissionError):
            # Command not found or permission denied
            continue
        except Exception as e:
            # Log unexpected errors but continue trying other commands
            print(f"Unexpected error running {command}: {e}")
            continue
    
    return {"found": False, "method": "command"}

@router.post("/next-question", response_model=OnboardingQuestionResponse)
async def get_next_question(
    answer_request: OnboardingAnswerRequest,
    current_user: TokenData = Depends(check_rate_limit)
):
    """
    Get the next onboarding question based on the user's previous answer.
    This implements the sequential questioning logic.
    """
    
    # This would integrate with your Claude service to generate the next question
    # For now, I'll provide a basic implementation that can be enhanced
    
    try:
        # TODO: Integrate with Claude service for intelligent question generation
        # For now, using a simple rule-based approach
        
        question_flow = await _get_question_flow(answer_request)
        
        return OnboardingQuestionResponse(**question_flow)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating next question: {str(e)}")

async def _get_question_flow(answer_request: OnboardingAnswerRequest) -> Dict[str, Any]:
    """
    Simple question flow logic. This should be enhanced with Claude integration.
    """
    
    # Basic question flow based on question_id
    question_flows = {
        "project_type": {
            "question_id": "project_goal",
            "question": "What's the main goal of your project?",
            "question_type": "single_choice",
            "options": [
                "Build a SaaS application",
                "Create an AI-powered tool",
                "Develop an e-commerce platform",
                "Build a mobile app",
                "Create a data analysis tool",
                "Other"
            ],
            "context": "This helps us recommend the right AI agents and templates for your needs.",
            "reasoning": "Understanding the project goal allows us to suggest specialized agents.",
            "is_final": False
        },
        "project_goal": {
            "question_id": "target_users",
            "question": "Who are your target users?",
            "question_type": "text",
            "context": "Understanding your audience helps us design the right user experience.",
            "reasoning": "Target users influence technology choices and agent recommendations.",
            "is_final": False
        },
        "target_users": {
            "question_id": "timeline",
            "question": "What's your timeline for the first version?",
            "question_type": "single_choice",
            "options": [
                "As soon as possible (days)",
                "Within a few weeks",
                "Within a few months",
                "I'm flexible with timing"
            ],
            "context": "This helps us recommend the right development approach and agent priorities.",
            "reasoning": "Timeline affects complexity and agent workflow design.",
            "is_final": False
        },
        "timeline": {
            "question_id": "experience",
            "question": "How would you describe your development experience?",
            "question_type": "single_choice",
            "options": [
                "Beginner - I'm new to development",
                "Intermediate - I have some experience",
                "Advanced - I'm an experienced developer"
            ],
            "context": "This helps us tailor the AI agent recommendations to your skill level.",
            "reasoning": "Experience level determines the complexity of agents and guidance needed.",
            "is_final": True
        }
    }
    
    return question_flows.get(answer_request.question_id, {
        "question_id": "complete",
        "question": "Thank you for your answers!",
        "question_type": "text",
        "is_final": True
    })

@router.post("/analyze-claude-md", response_model=CLAUDEMdAnalysisResponse)
async def analyze_claude_md(
    request: CLAUDEMdAnalysisRequest,
    current_user: TokenData = Depends(check_rate_limit)
):
    """
    Analyze a CLAUDE.md file to understand project structure and requirements.
    """
    
    try:
        analysis = await _analyze_claude_md_content(request.content, request.repo_url)
        return CLAUDEMdAnalysisResponse(**analysis)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing CLAUDE.md: {str(e)}")

async def _analyze_claude_md_content(content: str, repo_url: Optional[str] = None) -> Dict[str, Any]:
    """
    Parse and analyze CLAUDE.md content to extract project information.
    """
    
    # Initialize analysis results
    analysis = {
        "technologies": [],
        "framework": None,
        "project_type": None,
        "complexity": "simple",
        "agents_mentioned": [],
        "structure_info": {},
        "recommendations": []
    }
    
    # Convert content to lowercase for easier matching
    content_lower = content.lower()
    
    # Technology detection
    tech_patterns = {
        "React": ["react", "jsx", "tsx"],
        "Vue": ["vue", "vue.js"],
        "Angular": ["angular", "@angular"],
        "Next.js": ["next.js", "nextjs"],
        "Node.js": ["node.js", "nodejs", "npm", "yarn"],
        "FastAPI": ["fastapi", "uvicorn"],
        "Django": ["django", "python"],
        "Flask": ["flask"],
        "PostgreSQL": ["postgresql", "postgres"],
        "MongoDB": ["mongodb", "mongo"],
        "MySQL": ["mysql"],
        "Redis": ["redis"],
        "Docker": ["docker", "dockerfile"],
        "TypeScript": ["typescript", "ts"],
        "JavaScript": ["javascript", "js"],
        "Python": ["python", "pip"],
        "Tailwind": ["tailwind", "tailwindcss"],
        "Material-UI": ["material-ui", "mui"],
        "Chakra UI": ["chakra", "chakra-ui"]
    }
    
    for tech, patterns in tech_patterns.items():
        if any(pattern in content_lower for pattern in patterns):
            analysis["technologies"].append(tech)
    
    # Framework detection (primary framework)
    framework_priority = ["Next.js", "React", "Vue", "Angular", "FastAPI", "Django", "Flask"]
    for framework in framework_priority:
        if framework in analysis["technologies"]:
            analysis["framework"] = framework
            break
    
    # Project type detection
    project_type_patterns = {
        "SaaS": ["saas", "subscription", "auth", "payment", "stripe"],
        "E-commerce": ["e-commerce", "ecommerce", "shop", "cart", "product"],
        "AI Application": ["ai", "machine learning", "openai", "anthropic", "claude"],
        "Mobile App": ["mobile", "react native", "expo", "ios", "android"],
        "Dashboard": ["dashboard", "admin", "analytics", "chart"],
        "API": ["api", "rest", "graphql", "endpoint"]
    }
    
    for project_type, patterns in project_type_patterns.items():
        if any(pattern in content_lower for pattern in patterns):
            analysis["project_type"] = project_type
            break
    
    # Complexity assessment
    complexity_indicators = {
        "simple": ["simple", "basic", "starter", "template"],
        "moderate": ["moderate", "full-stack", "database", "auth"],
        "complex": ["complex", "microservices", "scale", "enterprise", "distributed"]
    }
    
    for complexity, patterns in complexity_indicators.items():
        if any(pattern in content_lower for pattern in patterns):
            analysis["complexity"] = complexity
    
    # Agent mentions detection
    agent_patterns = [
        "rapid-prototyper", "frontend-developer", "backend-architect", "ui-designer",
        "devops-automator", "ai-engineer", "mobile-app-builder", "test-writer-fixer"
    ]
    
    for agent in agent_patterns:
        if agent in content_lower:
            analysis["agents_mentioned"].append(agent)
    
    # Extract structure information
    sections = ["commands", "architecture", "tech stack", "important", "instructions"]
    for section in sections:
        if section in content_lower:
            # Find the section and extract relevant info
            # This is a simplified extraction - could be enhanced with proper markdown parsing
            start_idx = content_lower.find(section)
            if start_idx != -1:
                # Extract next 200 characters as section content
                section_content = content[start_idx:start_idx + 200]
                analysis["structure_info"][section] = section_content
    
    # Generate recommendations based on analysis
    recommendations = []
    
    if not analysis["technologies"]:
        recommendations.append("Consider adding technology stack information to your CLAUDE.md")
    
    if not analysis["agents_mentioned"]:
        recommendations.append("Add specific AI agent requirements to optimize your workflow")
    
    if analysis["complexity"] == "complex":
        recommendations.append("Consider using DevOps and Backend Architect agents for complex projects")
    
    if "authentication" in content_lower or "auth" in content_lower:
        recommendations.append("Use Backend Architect agent for secure authentication implementation")
    
    analysis["recommendations"] = recommendations
    
    return analysis

@router.post("/save-progress")
async def save_onboarding_progress(
    progress_data: Dict[str, Any],
    request: Request,
    current_user: TokenData = Depends(get_current_user)
):
    """
    Save onboarding progress to MongoDB for backup and analytics.
    Primary persistence is through Clerk, but we also save to our database.
    """
    
    try:
        db = request.app.state.db
        
        # Prepare onboarding document
        onboarding_doc = {
            "user_id": current_user.user_id,
            "email": current_user.email,
            "progress_data": progress_data,
            "saved_at": datetime.utcnow(),
            "version": "1.0"
        }
        
        if db is not None:
            # Upsert onboarding progress
            await db.onboarding_progress.update_one(
                {"user_id": current_user.user_id},
                {"$set": onboarding_doc},
                upsert=True
            )
        
        return {
            "success": True,
            "saved_at": datetime.utcnow().isoformat(),
            "message": "Onboarding progress saved successfully",
            "backup_saved": db is not None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving progress: {str(e)}")

@router.get("/resume-progress")
async def get_onboarding_progress(
    request: Request,
    current_user: TokenData = Depends(get_current_user)
):
    """
    Retrieve saved onboarding progress for the current user.
    This serves as backup to Clerk data.
    """
    
    try:
        db = request.app.state.db
        
        if db is None:
            return {
                "has_saved_progress": False,
                "progress_data": None,
                "saved_at": None,
                "source": "no_database"
            }
        
        # Retrieve from MongoDB
        saved_progress = await db.onboarding_progress.find_one(
            {"user_id": current_user.user_id}
        )
        
        if saved_progress:
            return {
                "has_saved_progress": True,
                "progress_data": saved_progress.get("progress_data"),
                "saved_at": saved_progress.get("saved_at"),
                "source": "database"
            }
        else:
            return {
                "has_saved_progress": False,
                "progress_data": None,
                "saved_at": None,
                "source": "database"
            }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving progress: {str(e)}")