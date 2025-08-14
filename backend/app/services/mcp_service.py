import json
import os
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

class MCPServerConfig(BaseModel):
    name: str
    type: str
    config: Dict[str, Any]
    enabled: bool = True

class MCPToolConfig(BaseModel):
    name: str
    enabled: bool = True
    rate_limit: Optional[int] = None
    config: Optional[Dict[str, Any]] = None

class ExecutionEnvironment(BaseModel):
    type: str  # "native", "docker", "codespace"
    resources: Optional[Dict[str, Any]] = None
    workspace_dir: Optional[str] = None

class MCPConfigGenerator:
    """Generate MCP configurations for different execution modes"""
    
    def __init__(self):
        self.version = "1.0"
        self.default_servers = self._get_default_servers()
        self.default_tools = self._get_default_tools()
    
    def generate_config(
        self,
        execution_mode: str,
        workflow_data: Dict[str, Any],
        github_repo: Optional[Dict[str, Any]] = None,
        user_preferences: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Generate MCP configuration based on execution mode and context"""
        
        config = {
            "version": self.version,
            "execution": {
                "mode": execution_mode,
                "environment": self._get_environment_config(execution_mode),
                "workflow_id": workflow_data.get("id"),
                "created_at": workflow_data.get("created_at")
            },
            "servers": self._get_servers_for_mode(execution_mode, github_repo),
            "tools": self._get_tools_for_workflow(workflow_data),
            "security": self._get_security_config(execution_mode),
            "monitoring": self._get_monitoring_config(execution_mode)
        }
        
        # Apply user preferences
        if user_preferences:
            config = self._apply_user_preferences(config, user_preferences)
        
        return config
    
    def _get_environment_config(self, execution_mode: str) -> ExecutionEnvironment:
        """Get environment configuration for execution mode"""
        if execution_mode == "local":
            return ExecutionEnvironment(
                type="native",
                workspace_dir="${PROJECT_ROOT}",
                resources={
                    "max_memory": "2GB",
                    "max_cpu": "80%",
                    "timeout": "30m"
                }
            ).dict()
        elif execution_mode == "cloud":
            return ExecutionEnvironment(
                type="codespace",
                workspace_dir="/workspaces/project",
                resources={
                    "max_memory": "4GB", 
                    "max_cpu": "100%",
                    "timeout": "60m"
                }
            ).dict()
        elif execution_mode == "hybrid":
            return ExecutionEnvironment(
                type="docker",
                workspace_dir="/app",
                resources={
                    "max_memory": "3GB",
                    "max_cpu": "90%", 
                    "timeout": "45m"
                }
            ).dict()
        else:
            raise ValueError(f"Unknown execution mode: {execution_mode}")
    
    def _get_servers_for_mode(
        self, 
        execution_mode: str, 
        github_repo: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Get MCP servers configuration for execution mode"""
        servers = []
        
        # Filesystem server (always included)
        filesystem_config = {
            "name": "filesystem",
            "type": "@modelcontextprotocol/server-filesystem",
            "enabled": True,
            "config": {
                "rootPath": "${WORKSPACE_DIR}",
                "allowedPaths": ["${WORKSPACE_DIR}"],
                "allowedOperations": ["read", "write", "execute", "list"],
                "watchEnabled": execution_mode in ["local", "hybrid"],
                "excludePatterns": [
                    "node_modules/**",
                    ".git/**",
                    "*.log",
                    "__pycache__/**",
                    "*.pyc",
                    ".DS_Store"
                ]
            }
        }
        servers.append(filesystem_config)
        
        # GitHub server (if repo provided)
        if github_repo:
            github_config = {
                "name": "github",
                "type": "@modelcontextprotocol/server-github",
                "enabled": True,
                "config": {
                    "repository": github_repo["full_name"],
                    "branch": github_repo.get("default_branch", "main"),
                    "token": "${GITHUB_TOKEN}",
                    "operations": ["read", "write", "pr", "issues", "actions"],
                    "webhookUrl": "${SAASIT_WEBHOOK_URL}" if execution_mode == "cloud" else None
                }
            }
            servers.append(github_config)
        
        # SaasIt bridge server (for monitoring)
        if execution_mode in ["local", "hybrid"]:
            bridge_config = {
                "name": "saasit-bridge",
                "type": "@saasit/mcp-bridge",
                "enabled": True,
                "config": {
                    "endpoint": "wss://api.saasit.ai/mcp/bridge",
                    "authToken": "${SAASIT_AUTH_TOKEN}",
                    "streamUpdates": True,
                    "filterSensitive": True,
                    "batchUpdates": True,
                    "updateInterval": 1000  # ms
                }
            }
            servers.append(bridge_config)
        
        # Web search server
        web_search_config = {
            "name": "web-search",
            "type": "@modelcontextprotocol/server-web-search",
            "enabled": True,
            "config": {
                "provider": "brave",  # or "google", "bing"
                "rateLimit": 100,
                "timeout": 10000
            }
        }
        servers.append(web_search_config)
        
        # Code interpreter server
        code_interpreter_config = {
            "name": "code-interpreter",
            "type": "@modelcontextprotocol/server-code-interpreter",
            "enabled": True,
            "config": {
                "languages": ["python", "javascript", "typescript", "bash"],
                "timeout": 30000,
                "allowNetworkAccess": execution_mode == "cloud",
                "allowFileSystemAccess": True,
                "maxMemory": "1GB"
            }
        }
        servers.append(code_interpreter_config)
        
        return servers
    
    def _get_tools_for_workflow(self, workflow_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get tools configuration based on workflow agents"""
        tools = []
        
        # Extract agent types from workflow
        agent_types = set()
        for node in workflow_data.get("nodes", []):
            if node.get("type") == "agent":
                agent_type = node.get("data", {}).get("type")
                if agent_type:
                    agent_types.add(agent_type)
        
        # Configure tools based on agent requirements
        for agent_type in agent_types:
            tools.extend(self._get_tools_for_agent(agent_type))
        
        # Remove duplicates and add default tools
        tool_names = {tool["name"] for tool in tools}
        
        # Default tools for all workflows
        default_tools = [
            {"name": "file_operations", "enabled": True},
            {"name": "terminal", "enabled": True},
            {"name": "git_operations", "enabled": True}
        ]
        
        for default_tool in default_tools:
            if default_tool["name"] not in tool_names:
                tools.append(default_tool)
        
        return tools
    
    def _get_tools_for_agent(self, agent_type: str) -> List[Dict[str, Any]]:
        """Get required tools for specific agent type"""
        tool_mappings = {
            "frontend-developer": [
                {"name": "npm_operations", "enabled": True},
                {"name": "webpack_tools", "enabled": True},
                {"name": "browser_tools", "enabled": True}
            ],
            "backend-architect": [
                {"name": "database_tools", "enabled": True},
                {"name": "api_tools", "enabled": True},
                {"name": "docker_tools", "enabled": True}
            ],
            "devops-automator": [
                {"name": "docker_tools", "enabled": True},
                {"name": "kubernetes_tools", "enabled": True},
                {"name": "terraform_tools", "enabled": True},
                {"name": "aws_tools", "enabled": True}
            ],
            "test-writer-fixer": [
                {"name": "testing_frameworks", "enabled": True},
                {"name": "coverage_tools", "enabled": True},
                {"name": "mocking_tools", "enabled": True}
            ],
            "ai-engineer": [
                {"name": "ml_tools", "enabled": True},
                {"name": "data_processing", "enabled": True},
                {"name": "model_tools", "enabled": True}
            ]
        }
        
        return tool_mappings.get(agent_type, [])
    
    def _get_security_config(self, execution_mode: str) -> Dict[str, Any]:
        """Get security configuration for execution mode"""
        base_config = {
            "sandbox_enabled": True,
            "network_isolation": execution_mode == "local",
            "file_access_restrictions": True,
            "command_whitelist_enabled": True,
            "sensitive_data_filtering": True
        }
        
        if execution_mode == "local":
            base_config.update({
                "allow_system_calls": False,
                "restrict_network_access": True,
                "sandbox_type": "process"
            })
        elif execution_mode == "cloud":
            base_config.update({
                "allow_system_calls": True,
                "restrict_network_access": False,
                "sandbox_type": "container"
            })
        elif execution_mode == "hybrid":
            base_config.update({
                "allow_system_calls": True,
                "restrict_network_access": False,
                "sandbox_type": "vm"
            })
        
        return base_config
    
    def _get_monitoring_config(self, execution_mode: str) -> Dict[str, Any]:
        """Get monitoring configuration for execution mode"""
        return {
            "enabled": True,
            "stream_output": True,
            "collect_metrics": True,
            "log_level": "info",
            "progress_updates": True,
            "error_reporting": True,
            "performance_tracking": execution_mode in ["cloud", "hybrid"],
            "real_time_streaming": execution_mode in ["local", "hybrid"]
        }
    
    def _apply_user_preferences(
        self, 
        config: Dict[str, Any], 
        preferences: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Apply user preferences to configuration"""
        
        # Privacy preferences
        if preferences.get("privacy_mode"):
            config["monitoring"]["collect_metrics"] = False
            config["monitoring"]["error_reporting"] = False
        
        # Resource preferences  
        if "max_memory" in preferences:
            config["execution"]["environment"]["resources"]["max_memory"] = preferences["max_memory"]
        
        # Tool preferences
        if "disabled_tools" in preferences:
            for tool in config["tools"]:
                if tool["name"] in preferences["disabled_tools"]:
                    tool["enabled"] = False
        
        return config
    
    def _get_default_servers(self) -> List[MCPServerConfig]:
        """Get default MCP server configurations"""
        return [
            MCPServerConfig(
                name="filesystem",
                type="@modelcontextprotocol/server-filesystem", 
                config={}
            ),
            MCPServerConfig(
                name="web-search",
                type="@modelcontextprotocol/server-web-search",
                config={}
            )
        ]
    
    def _get_default_tools(self) -> List[MCPToolConfig]:
        """Get default tool configurations"""
        return [
            MCPToolConfig(name="file_operations"),
            MCPToolConfig(name="terminal"),
            MCPToolConfig(name="git_operations"),
            MCPToolConfig(name="web_search", rate_limit=100)
        ]
    
    def generate_local_config(
        self,
        workflow_data: Dict[str, Any],
        workspace_dir: str,
        github_repo: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Generate configuration optimized for local execution"""
        config = self.generate_config("local", workflow_data, github_repo)
        
        # Local-specific optimizations
        config["execution"]["environment"]["workspace_dir"] = workspace_dir
        config["monitoring"]["real_time_streaming"] = True
        config["security"]["network_isolation"] = True
        
        return config
    
    def generate_cloud_config(
        self,
        workflow_data: Dict[str, Any],
        github_repo: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate configuration optimized for cloud execution"""
        config = self.generate_config("cloud", workflow_data, github_repo)
        
        # Cloud-specific optimizations
        config["monitoring"]["performance_tracking"] = True
        config["security"]["sandbox_type"] = "container"
        
        return config
    
    def export_config_file(self, config: Dict[str, Any], output_path: str) -> str:
        """Export configuration to file"""
        try:
            with open(output_path, 'w') as f:
                json.dump(config, f, indent=2)
            return output_path
        except Exception as e:
            logger.error(f"Failed to export config: {e}")
            raise
    
    def validate_config(self, config: Dict[str, Any]) -> bool:
        """Validate MCP configuration"""
        required_fields = ["version", "execution", "servers", "tools"]
        
        for field in required_fields:
            if field not in config:
                logger.error(f"Missing required field: {field}")
                return False
        
        # Validate servers
        for server in config["servers"]:
            if not all(key in server for key in ["name", "type", "enabled"]):
                logger.error(f"Invalid server configuration: {server}")
                return False
        
        return True