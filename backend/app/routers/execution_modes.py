from fastapi import APIRouter, HTTPException, Depends, Request, BackgroundTasks
from fastapi.responses import FileResponse
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
import tempfile
import os
import json
import logging

from app.services.mcp_service import MCPConfigGenerator
from app.services.github_service import GitHubService
from app.services.execution_service import ExecutionService
from app.middleware.auth import get_current_active_user
from app.models.user import TokenData
from app.models.execution import ExecutionCreate, WorkflowExecution

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/execution-modes", tags=["execution-modes"])

class LocalExecutionRequest(BaseModel):
    workflow_data: Dict[str, Any] = Field(..., description="Workflow configuration")
    workspace_dir: Optional[str] = Field(None, description="Local workspace directory")
    github_repo: Optional[Dict[str, Any]] = Field(None, description="GitHub repository info")
    user_preferences: Optional[Dict[str, Any]] = Field(None, description="User preferences")

class CloudExecutionRequest(BaseModel):
    workflow_data: Dict[str, Any] = Field(..., description="Workflow configuration")
    github_repo: Dict[str, Any] = Field(..., description="GitHub repository (required for cloud)")
    github_token: str = Field(..., description="GitHub OAuth token")
    execution_config: Optional[Dict[str, Any]] = Field(None, description="Cloud execution settings")

class HybridExecutionRequest(BaseModel):
    workflow_data: Dict[str, Any] = Field(..., description="Workflow configuration")
    workspace_dir: str = Field(..., description="Local workspace directory")
    github_repo: Dict[str, Any] = Field(..., description="GitHub repository for syncing")
    github_token: str = Field(..., description="GitHub OAuth token")
    sync_settings: Optional[Dict[str, Any]] = Field(None, description="Sync preferences")

class ExecutionModeResponse(BaseModel):
    mode: str
    config: Dict[str, Any]
    execution_id: Optional[str] = None
    download_url: Optional[str] = None
    instructions: List[str]
    estimated_duration: str

def get_mcp_generator() -> MCPConfigGenerator:
    """Dependency to get MCP config generator"""
    return MCPConfigGenerator()

def get_github_service() -> GitHubService:
    """Dependency to get GitHub service"""
    return GitHubService()

def get_execution_service(request: Request) -> ExecutionService:
    """Dependency to get execution service"""
    db = request.app.state.db
    if not db:
        raise HTTPException(status_code=503, detail="Database connection not available")
    return ExecutionService(db)

@router.post("/local", response_model=ExecutionModeResponse)
async def setup_local_execution(
    request: LocalExecutionRequest,
    background_tasks: BackgroundTasks,
    mcp_generator: MCPConfigGenerator = Depends(get_mcp_generator),
    current_user: TokenData = Depends(get_current_active_user)
):
    """Setup local execution mode with downloadable MCP configuration"""
    
    try:
        # Generate MCP configuration for local execution
        workspace_dir = request.workspace_dir or "${PROJECT_ROOT}"
        
        mcp_config = mcp_generator.generate_local_config(
            workflow_data=request.workflow_data,
            workspace_dir=workspace_dir,
            github_repo=request.github_repo
        )
        
        # Validate configuration
        if not mcp_generator.validate_config(mcp_config):
            raise HTTPException(status_code=400, detail="Invalid MCP configuration generated")
        
        # Create temporary file for download
        temp_file = tempfile.NamedTemporaryFile(
            mode='w', 
            suffix='.json', 
            delete=False,
            prefix='saasit-mcp-'
        )
        
        json.dump(mcp_config, temp_file, indent=2)
        temp_file.flush()
        temp_file.close()
        
        # Schedule cleanup of temp file
        background_tasks.add_task(cleanup_temp_file, temp_file.name, delay=300)  # 5 minutes
        
        # Generate execution instructions
        instructions = _generate_local_instructions(
            config_path=os.path.basename(temp_file.name),
            workspace_dir=workspace_dir,
            has_github=request.github_repo is not None
        )
        
        return ExecutionModeResponse(
            mode="local",
            config=mcp_config,
            download_url=f"/execution-modes/download/{os.path.basename(temp_file.name)}",
            instructions=instructions,
            estimated_duration=_estimate_execution_time(request.workflow_data)
        )
        
    except Exception as e:
        logger.error(f"Failed to setup local execution: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/cloud", response_model=ExecutionModeResponse)
async def setup_cloud_execution(
    request: CloudExecutionRequest,
    mcp_generator: MCPConfigGenerator = Depends(get_mcp_generator),
    github_service: GitHubService = Depends(get_github_service),
    execution_service: ExecutionService = Depends(get_execution_service),
    current_user: TokenData = Depends(get_current_active_user)
):
    """Setup cloud execution mode via GitHub Actions"""
    
    try:
        # Generate MCP configuration for cloud execution
        mcp_config = mcp_generator.generate_cloud_config(
            workflow_data=request.workflow_data,
            github_repo=request.github_repo
        )
        
        # Setup GitHub Actions workflow
        workflow_result = await github_service.setup_saasit_workflow(
            github_token=request.github_token,
            owner=request.github_repo["owner"]["login"],
            repo=request.github_repo["name"],
            workflow_config={
                "mcp_config": mcp_config,
                "execution_config": request.execution_config or {}
            }
        )
        
        # Create execution record
        execution_create = ExecutionCreate(
            workflow_name=f"Cloud execution: {request.workflow_data.get('name', 'Unnamed')}",
            workflow_data=request.workflow_data,
            estimated_steps=len(request.workflow_data.get('nodes', [])),
            metadata={
                "mode": "cloud",
                "github_repo": request.github_repo["full_name"],
                "workflow_path": workflow_result["workflow_path"]
            }
        )
        
        execution = await execution_service.create_execution(
            user_id=current_user.user_id,
            execution_data=execution_create
        )
        
        instructions = _generate_cloud_instructions(
            repo_name=request.github_repo["full_name"],
            execution_id=execution.id
        )
        
        return ExecutionModeResponse(
            mode="cloud",
            config=mcp_config,
            execution_id=execution.id,
            instructions=instructions,
            estimated_duration=_estimate_execution_time(request.workflow_data)
        )
        
    except Exception as e:
        logger.error(f"Failed to setup cloud execution: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/hybrid", response_model=ExecutionModeResponse)
async def setup_hybrid_execution(
    request: HybridExecutionRequest,
    mcp_generator: MCPConfigGenerator = Depends(get_mcp_generator),
    github_service: GitHubService = Depends(get_github_service),
    execution_service: ExecutionService = Depends(get_execution_service),
    current_user: TokenData = Depends(get_current_active_user)
):
    """Setup hybrid execution mode with local execution and cloud sync"""
    
    try:
        # Generate MCP configuration for hybrid execution
        mcp_config = mcp_generator.generate_config(
            execution_mode="hybrid",
            workflow_data=request.workflow_data,
            github_repo=request.github_repo
        )
        
        # Add hybrid-specific configuration
        mcp_config["sync"] = {
            "github_repo": request.github_repo["full_name"],
            "auto_commit": request.sync_settings.get("auto_commit", True) if request.sync_settings else True,
            "branch_strategy": request.sync_settings.get("branch_strategy", "feature-branch") if request.sync_settings else "feature-branch",
            "sync_interval": request.sync_settings.get("sync_interval", 30) if request.sync_settings else 30  # seconds
        }
        
        # Create execution record
        execution_create = ExecutionCreate(
            workflow_name=f"Hybrid execution: {request.workflow_data.get('name', 'Unnamed')}",
            workflow_data=request.workflow_data,
            estimated_steps=len(request.workflow_data.get('nodes', [])),
            metadata={
                "mode": "hybrid",
                "workspace_dir": request.workspace_dir,
                "github_repo": request.github_repo["full_name"],
                "sync_settings": request.sync_settings
            }
        )
        
        execution = await execution_service.create_execution(
            user_id=current_user.user_id,
            execution_data=execution_create
        )
        
        instructions = _generate_hybrid_instructions(
            workspace_dir=request.workspace_dir,
            repo_name=request.github_repo["full_name"],
            execution_id=execution.id
        )
        
        return ExecutionModeResponse(
            mode="hybrid",
            config=mcp_config,
            execution_id=execution.id,
            instructions=instructions,
            estimated_duration=_estimate_execution_time(request.workflow_data)
        )
        
    except Exception as e:
        logger.error(f"Failed to setup hybrid execution: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/download/{filename}")
async def download_config_file(filename: str):
    """Download MCP configuration file"""
    temp_dir = tempfile.gettempdir()
    file_path = os.path.join(temp_dir, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Configuration file not found")
    
    return FileResponse(
        file_path,
        filename=f"saasit-mcp-config.json",
        media_type="application/json"
    )

@router.get("/modes")
async def get_execution_modes():
    """Get available execution modes with descriptions"""
    return {
        "modes": [
            {
                "id": "local",
                "name": "Local Execution",
                "description": "Run AI agents on your local machine with full privacy",
                "features": [
                    "Complete privacy - nothing leaves your machine",
                    "Real-time local monitoring",
                    "Direct file system access",
                    "Optional GitHub sync when ready"
                ],
                "requirements": [
                    "Claude Code SDK installed",
                    "Local development environment",
                    "Minimum 4GB RAM recommended"
                ],
                "best_for": "Privacy-conscious developers, enterprise environments, testing"
            },
            {
                "id": "cloud",
                "name": "Cloud Execution", 
                "description": "Run AI agents in the cloud via GitHub Actions",
                "features": [
                    "Zero local setup required",
                    "Automatic GitHub integration",
                    "Scalable cloud resources",
                    "Full SaasIt.ai dashboard"
                ],
                "requirements": [
                    "GitHub account",
                    "Repository access",
                    "Internet connection"
                ],
                "best_for": "Beginners, teams, production deployments"
            },
            {
                "id": "hybrid",
                "name": "Hybrid Mode",
                "description": "Best of both worlds - local execution with cloud backup",
                "features": [
                    "Local execution performance",
                    "Automatic cloud sync",
                    "Real-time collaboration",
                    "Seamless mode switching"
                ],
                "requirements": [
                    "Claude Code SDK installed", 
                    "GitHub account",
                    "Local workspace setup"
                ],
                "best_for": "Advanced developers, collaborative projects, flexibility"
            }
        ]
    }

async def cleanup_temp_file(file_path: str, delay: int = 0):
    """Clean up temporary file after delay"""
    import asyncio
    await asyncio.sleep(delay)
    try:
        if os.path.exists(file_path):
            os.unlink(file_path)
            logger.info(f"Cleaned up temp file: {file_path}")
    except Exception as e:
        logger.warning(f"Failed to cleanup temp file {file_path}: {e}")

def _generate_local_instructions(config_path: str, workspace_dir: str, has_github: bool) -> List[str]:
    """Generate step-by-step instructions for local execution"""
    instructions = [
        "1. Download the MCP configuration file",
        "2. Install Claude Code SDK: `npm install -g @anthropic-ai/claude-code`",
        f"3. Navigate to your project directory: `cd {workspace_dir.replace('${PROJECT_ROOT}', 'your-project')}`",
        f"4. Place the downloaded config file in your project root",
        "5. Set your Anthropic API key: `export ANTHROPIC_API_KEY=your_key_here`"
    ]
    
    if has_github:
        instructions.extend([
            "6. Set your GitHub token: `export GITHUB_TOKEN=your_token_here`",
            "7. Run: `claude-code execute --mcp-config=saasit-mcp-config.json`"
        ])
    else:
        instructions.append("6. Run: `claude-code execute --mcp-config=saasit-mcp-config.json`")
    
    instructions.extend([
        "8. Watch the progress in your terminal",
        "9. Results will be saved to your local workspace",
        "10. Optionally push to GitHub when ready"
    ])
    
    return instructions

def _generate_cloud_instructions(repo_name: str, execution_id: str) -> List[str]:
    """Generate instructions for cloud execution"""
    return [
        "1. GitHub Actions workflow has been configured automatically",
        f"2. Visit your repository: https://github.com/{repo_name}",
        "3. Go to the 'Actions' tab",
        "4. Click 'SaasIt.ai Agent Execution' workflow",
        "5. Click 'Run workflow' button",
        f"6. Enter execution ID: {execution_id}",
        "7. Monitor progress in real-time on SaasIt.ai dashboard",
        "8. Results will be committed to your repository",
        "9. Download or clone your repository to get the results",
        "10. Optional: Create pull request to review changes"
    ]

def _generate_hybrid_instructions(workspace_dir: str, repo_name: str, execution_id: str) -> List[str]:
    """Generate instructions for hybrid execution"""
    return [
        "1. Download the MCP configuration file",
        "2. Install Claude Code SDK: `npm install -g @anthropic-ai/claude-code`",
        f"3. Clone your repository: `git clone https://github.com/{repo_name}.git`",
        f"4. Navigate to project: `cd {os.path.basename(repo_name)}`",
        "5. Set environment variables (ANTHROPIC_API_KEY, GITHUB_TOKEN)",
        "6. Run: `claude-code execute --mcp-config=saasit-mcp-config.json --sync`",
        "7. Watch progress locally and on SaasIt.ai dashboard",
        "8. Changes automatically sync to GitHub",
        "9. Switch between local and cloud execution anytime",
        "10. Collaborate with team through GitHub"
    ]

def _estimate_execution_time(workflow_data: Dict[str, Any]) -> str:
    """Estimate execution time based on workflow complexity"""
    nodes = workflow_data.get("nodes", [])
    agent_count = len([n for n in nodes if n.get("type") == "agent"])
    
    if agent_count <= 2:
        return "5-15 minutes"
    elif agent_count <= 5:
        return "15-30 minutes"
    elif agent_count <= 10:
        return "30-60 minutes"
    else:
        return "1-2 hours"