import httpx
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import asyncio

logger = logging.getLogger(__name__)

class GitHubService:
    """GitHub API service that works with Clerk authentication tokens"""
    
    def __init__(self):
        self.base_url = "https://api.github.com"
        self.client = httpx.AsyncClient(
            timeout=30.0,
            headers={
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "SaasIt.ai/1.0"
            }
        )
    
    async def get_authenticated_headers(self, github_token: str) -> Dict[str, str]:
        """Get headers with GitHub token from Clerk"""
        return {
            "Authorization": f"Bearer {github_token}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "SaasIt.ai/1.0"
        }
    
    async def get_user_info(self, github_token: str) -> Dict[str, Any]:
        """Get GitHub user information"""
        try:
            headers = await self.get_authenticated_headers(github_token)
            response = await self.client.get(
                f"{self.base_url}/user",
                headers=headers
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Failed to get GitHub user info: {e}")
            raise Exception(f"GitHub API error: {str(e)}")
    
    async def get_user_repositories(
        self, 
        github_token: str,
        sort: str = "updated",
        per_page: int = 100
    ) -> List[Dict[str, Any]]:
        """Get user's GitHub repositories"""
        try:
            headers = await self.get_authenticated_headers(github_token)
            response = await self.client.get(
                f"{self.base_url}/user/repos",
                headers=headers,
                params={
                    "sort": sort,
                    "per_page": per_page,
                    "type": "all"  # owner, collaborator, member
                }
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Failed to get repositories: {e}")
            raise Exception(f"GitHub API error: {str(e)}")
    
    async def get_repository(
        self, 
        github_token: str, 
        owner: str, 
        repo: str
    ) -> Dict[str, Any]:
        """Get specific repository information"""
        try:
            headers = await self.get_authenticated_headers(github_token)
            response = await self.client.get(
                f"{self.base_url}/repos/{owner}/{repo}",
                headers=headers
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Failed to get repository {owner}/{repo}: {e}")
            raise Exception(f"GitHub API error: {str(e)}")
    
    async def create_repository(
        self,
        github_token: str,
        name: str,
        description: str = None,
        private: bool = False,
        auto_init: bool = True
    ) -> Dict[str, Any]:
        """Create a new repository"""
        try:
            headers = await self.get_authenticated_headers(github_token)
            data = {
                "name": name,
                "private": private,
                "auto_init": auto_init,
                "description": description or f"AI agent project created with SaasIt.ai"
            }
            
            response = await self.client.post(
                f"{self.base_url}/user/repos",
                headers=headers,
                json=data
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Failed to create repository: {e}")
            raise Exception(f"GitHub API error: {str(e)}")
    
    async def fork_repository(
        self,
        github_token: str,
        owner: str,
        repo: str,
        organization: str = None
    ) -> Dict[str, Any]:
        """Fork a repository"""
        try:
            headers = await self.get_authenticated_headers(github_token)
            data = {}
            if organization:
                data["organization"] = organization
                
            response = await self.client.post(
                f"{self.base_url}/repos/{owner}/{repo}/forks",
                headers=headers,
                json=data
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Failed to fork repository {owner}/{repo}: {e}")
            raise Exception(f"GitHub API error: {str(e)}")
    
    async def get_repository_contents(
        self,
        github_token: str,
        owner: str,
        repo: str,
        path: str = "",
        ref: str = None
    ) -> List[Dict[str, Any]]:
        """Get repository contents"""
        try:
            headers = await self.get_authenticated_headers(github_token)
            params = {}
            if ref:
                params["ref"] = ref
                
            response = await self.client.get(
                f"{self.base_url}/repos/{owner}/{repo}/contents/{path}",
                headers=headers,
                params=params
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Failed to get repository contents: {e}")
            raise Exception(f"GitHub API error: {str(e)}")
    
    async def get_file_content(
        self,
        github_token: str,
        owner: str,
        repo: str,
        path: str,
        ref: str = None
    ) -> str:
        """Get content of a specific file"""
        try:
            contents = await self.get_repository_contents(
                github_token, owner, repo, path, ref
            )
            
            if isinstance(contents, list):
                raise Exception(f"Path {path} is a directory, not a file")
            
            import base64
            content = base64.b64decode(contents["content"]).decode("utf-8")
            return content
        except Exception as e:
            logger.error(f"Failed to get file content: {e}")
            raise
    
    async def create_file(
        self,
        github_token: str,
        owner: str,
        repo: str,
        path: str,
        content: str,
        message: str,
        branch: str = "main"
    ) -> Dict[str, Any]:
        """Create a new file in repository"""
        try:
            headers = await self.get_authenticated_headers(github_token)
            
            import base64
            encoded_content = base64.b64encode(content.encode("utf-8")).decode("ascii")
            
            data = {
                "message": message,
                "content": encoded_content,
                "branch": branch
            }
            
            response = await self.client.put(
                f"{self.base_url}/repos/{owner}/{repo}/contents/{path}",
                headers=headers,
                json=data
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Failed to create file: {e}")
            raise Exception(f"GitHub API error: {str(e)}")
    
    async def update_file(
        self,
        github_token: str,
        owner: str,
        repo: str,
        path: str,
        content: str,
        message: str,
        sha: str,
        branch: str = "main"
    ) -> Dict[str, Any]:
        """Update an existing file in repository"""
        try:
            headers = await self.get_authenticated_headers(github_token)
            
            import base64
            encoded_content = base64.b64encode(content.encode("utf-8")).decode("ascii")
            
            data = {
                "message": message,
                "content": encoded_content,
                "sha": sha,
                "branch": branch
            }
            
            response = await self.client.put(
                f"{self.base_url}/repos/{owner}/{repo}/contents/{path}",
                headers=headers,
                json=data
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Failed to update file: {e}")
            raise Exception(f"GitHub API error: {str(e)}")
    
    async def create_branch(
        self,
        github_token: str,
        owner: str,
        repo: str,
        branch_name: str,
        from_branch: str = "main"
    ) -> Dict[str, Any]:
        """Create a new branch"""
        try:
            headers = await self.get_authenticated_headers(github_token)
            
            # Get the SHA of the source branch
            response = await self.client.get(
                f"{self.base_url}/repos/{owner}/{repo}/git/refs/heads/{from_branch}",
                headers=headers
            )
            response.raise_for_status()
            source_sha = response.json()["object"]["sha"]
            
            # Create new branch
            data = {
                "ref": f"refs/heads/{branch_name}",
                "sha": source_sha
            }
            
            response = await self.client.post(
                f"{self.base_url}/repos/{owner}/{repo}/git/refs",
                headers=headers,
                json=data
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Failed to create branch: {e}")
            raise Exception(f"GitHub API error: {str(e)}")
    
    async def create_pull_request(
        self,
        github_token: str,
        owner: str,
        repo: str,
        title: str,
        body: str,
        head: str,
        base: str = "main"
    ) -> Dict[str, Any]:
        """Create a pull request"""
        try:
            headers = await self.get_authenticated_headers(github_token)
            
            data = {
                "title": title,
                "body": body,
                "head": head,
                "base": base
            }
            
            response = await self.client.post(
                f"{self.base_url}/repos/{owner}/{repo}/pulls",
                headers=headers,
                json=data
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Failed to create pull request: {e}")
            raise Exception(f"GitHub API error: {str(e)}")
    
    async def analyze_repository_structure(
        self,
        github_token: str,
        owner: str,
        repo: str
    ) -> Dict[str, Any]:
        """Analyze repository to understand project structure and conventions"""
        try:
            # Get root contents
            contents = await self.get_repository_contents(github_token, owner, repo)
            
            analysis = {
                "framework": "unknown",
                "languages": [],
                "build_tools": [],
                "package_managers": [],
                "test_frameworks": [],
                "config_files": [],
                "has_docs": False,
                "has_tests": False,
                "has_ci": False,
                "structure": {
                    "files": [],
                    "directories": []
                }
            }
            
            for item in contents:
                if item["type"] == "file":
                    filename = item["name"].lower()
                    analysis["structure"]["files"].append(item["name"])
                    
                    # Detect framework and tools
                    if filename == "package.json":
                        analysis["package_managers"].append("npm")
                        # Could fetch and parse package.json for more details
                    elif filename == "requirements.txt":
                        analysis["package_managers"].append("pip")
                    elif filename == "cargo.toml":
                        analysis["package_managers"].append("cargo")
                    elif filename == "go.mod":
                        analysis["package_managers"].append("go")
                    elif filename in ["dockerfile", "docker-compose.yml"]:
                        analysis["build_tools"].append("docker")
                    elif filename in ["readme.md", "readme.rst"]:
                        analysis["has_docs"] = True
                    elif item["name"].endswith((".js", ".jsx", ".ts", ".tsx")):
                        analysis["languages"].append("javascript")
                    elif item["name"].endswith(".py"):
                        analysis["languages"].append("python")
                    elif item["name"].endswith((".go")):
                        analysis["languages"].append("go")
                    elif item["name"].endswith((".rs")):
                        analysis["languages"].append("rust")
                        
                elif item["type"] == "dir":
                    dirname = item["name"].lower()
                    analysis["structure"]["directories"].append(item["name"])
                    
                    if dirname in ["test", "tests", "__tests__", "spec"]:
                        analysis["has_tests"] = True
                    elif dirname == ".github":
                        analysis["has_ci"] = True
                    elif dirname in ["src", "lib", "app"]:
                        # Could analyze subdirectories
                        pass
            
            # Remove duplicates
            analysis["languages"] = list(set(analysis["languages"]))
            analysis["build_tools"] = list(set(analysis["build_tools"]))
            analysis["package_managers"] = list(set(analysis["package_managers"]))
            
            return analysis
            
        except Exception as e:
            logger.error(f"Failed to analyze repository: {e}")
            raise
    
    async def setup_saasit_workflow(
        self,
        github_token: str,
        owner: str,
        repo: str,
        workflow_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Setup GitHub Actions workflow for SaasIt.ai execution"""
        try:
            workflow_yml = self._generate_github_actions_workflow(workflow_config)
            
            # Create .github/workflows directory structure
            await self.create_file(
                github_token=github_token,
                owner=owner,
                repo=repo,
                path=".github/workflows/saasit-execution.yml",
                content=workflow_yml,
                message="🤖 Add SaasIt.ai workflow execution",
                branch="main"
            )
            
            return {
                "workflow_created": True,
                "workflow_path": ".github/workflows/saasit-execution.yml"
            }
            
        except Exception as e:
            logger.error(f"Failed to setup workflow: {e}")
            raise
    
    def _generate_github_actions_workflow(self, config: Dict[str, Any]) -> str:
        """Generate GitHub Actions workflow YAML for SaasIt execution"""
        return f"""name: SaasIt.ai Agent Execution

on:
  workflow_dispatch:
    inputs:
      workflow_id:
        description: 'SaasIt.ai Workflow ID'
        required: true
      execution_mode:
        description: 'Execution mode'
        required: true
        default: 'cloud'
      notify_url:
        description: 'Webhook URL for notifications'
        required: true

jobs:
  execute-agents:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout repository
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        
    - name: Install Claude Code SDK
      run: npm install -g @anthropic-ai/claude-code
      
    - name: Setup MCP configuration
      run: |
        echo '${{{{ inputs.mcp_config }}}}' > .saasit-mcp.json
        
    - name: Execute AI Agents
      env:
        ANTHROPIC_API_KEY: ${{{{ secrets.ANTHROPIC_API_KEY }}}}
        SAASIT_WEBHOOK_URL: ${{{{ inputs.notify_url }}}}
        GITHUB_TOKEN: ${{{{ secrets.GITHUB_TOKEN }}}}
      run: |
        claude-code execute \\
          --mcp-config=.saasit-mcp.json \\
          --workflow-id=${{{{ inputs.workflow_id }}}} \\
          --stream-to=${{{{ inputs.notify_url }}}}
        
    - name: Commit changes
      if: success()
      run: |
        git config --local user.email "action@saasit.ai"
        git config --local user.name "SaasIt.ai Agent"
        git add -A
        git diff --staged --quiet || git commit -m "🤖 AI agents completed execution"
        git push
"""
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()