"""
Unit tests for ExportService
"""
import pytest
import yaml
import json
from app.services.export_service import ExportService
from app.models.project import Project, ProjectStatus, Workflow
from app.models.user import UserSubscription
from fastapi import HTTPException
from datetime import datetime


class TestExportService:
    """Test cases for export service"""
    
    @pytest.fixture
    def sample_project(self):
        """Create a sample project for testing"""
        return Project(
            id="test-project-id",
            name="Test AI Workflow",
            description="A test project for export testing",
            user_id="test-user-id",
            status=ProjectStatus.ACTIVE,
            tags=["test", "ai", "workflow"],
            workflow=Workflow(
                nodes=[
                    {
                        "id": "node-1",
                        "type": "agent",
                        "position": {"x": 100, "y": 100},
                        "data": {
                            "id": "rapid-prototyper",
                            "name": "Rapid Prototyper",
                            "description": "Build the MVP quickly",
                            "capabilities": ["prototyping", "mvp"],
                            "category": "Engineering"
                        }
                    },
                    {
                        "id": "node-2",
                        "type": "agent",
                        "position": {"x": 300, "y": 100},
                        "data": {
                            "id": "frontend-developer",
                            "name": "Frontend Developer",
                            "description": "Build the UI components",
                            "capabilities": ["react", "ui", "css"],
                            "category": "Engineering"
                        }
                    }
                ],
                edges=[
                    {
                        "id": "edge-1",
                        "source": "node-1",
                        "target": "node-2",
                        "type": "smoothstep"
                    }
                ],
                layout="sequential"
            ),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            version=1
        )
    
    @pytest.fixture
    def user_subscription_free(self):
        """Create a free tier subscription"""
        return UserSubscription(tier="free")
    
    @pytest.fixture
    def user_subscription_architect(self):
        """Create an architect tier subscription"""
        return UserSubscription(tier="architect")
    
    def test_export_json_success(self, sample_project, user_subscription_architect):
        """Test successful JSON export"""
        export_service = ExportService()
        
        result = export_service.export_json(sample_project, user_subscription_architect)
        
        # Parse the JSON to verify structure
        exported_data = json.loads(result)
        
        assert exported_data["name"] == "Test AI Workflow"
        assert exported_data["description"] == "A test project for export testing"
        assert len(exported_data["workflow"]["nodes"]) == 2
        assert len(exported_data["workflow"]["edges"]) == 1
        assert "metadata" in exported_data
        assert exported_data["metadata"]["version"] == 1
        assert exported_data["metadata"]["export_format"] == "saasit-workflow-v1"
    
    def test_export_json_free_tier_blocked(self, sample_project, user_subscription_free):
        """Test JSON export blocked for free tier"""
        export_service = ExportService()
        
        with pytest.raises(HTTPException) as exc_info:
            export_service.export_json(sample_project, user_subscription_free)
        
        assert exc_info.value.status_code == 403
        assert "not available" in str(exc_info.value.detail)
    
    def test_export_yaml_success(self, sample_project, user_subscription_architect):
        """Test successful YAML export"""
        export_service = ExportService()
        
        result = export_service.export_yaml(sample_project, user_subscription_architect)
        
        # Parse the YAML to verify structure
        exported_data = yaml.safe_load(result)
        
        assert exported_data["name"] == "Test AI Workflow"
        assert exported_data["description"] == "A test project for export testing"
        assert len(exported_data["workflow"]["nodes"]) == 2
        assert len(exported_data["workflow"]["edges"]) == 1
        assert exported_data["metadata"]["export_format"] == "saasit-workflow-v1"
    
    def test_export_claude_code_success(self, sample_project, user_subscription_architect):
        """Test successful Claude Code SDK export"""
        export_service = ExportService()
        
        result = export_service.export_claude_code(sample_project, user_subscription_architect)
        
        # Verify Claude Code structure
        assert "import" in result
        assert "ClaudeCodeSDK" in result
        assert "rapid-prototyper" in result
        assert "frontend-developer" in result
        assert "execute_workflow" in result
        assert "# Test AI Workflow" in result
        assert "async def main():" in result
    
    def test_export_docker_compose_success(self, sample_project, user_subscription_architect):
        """Test successful Docker Compose export"""
        export_service = ExportService()
        
        result = export_service.export_docker_compose(sample_project, user_subscription_architect)
        
        # Parse the YAML to verify Docker Compose structure
        compose_data = yaml.safe_load(result)
        
        assert "version" in compose_data
        assert compose_data["version"] == "3.8"
        assert "services" in compose_data
        assert "rapid-prototyper" in compose_data["services"]
        assert "frontend-developer" in compose_data["services"]
        
        # Check service configuration
        prototyper = compose_data["services"]["rapid-prototyper"]
        assert prototyper["image"] == "saasit/claude-agent:latest"
        assert "AGENT_TYPE" in prototyper["environment"]
        assert prototyper["environment"]["AGENT_TYPE"] == "rapid-prototyper"
    
    def test_export_kubernetes_success(self, sample_project, user_subscription_architect):
        """Test successful Kubernetes export"""
        export_service = ExportService()
        
        result = export_service.export_kubernetes(sample_project, user_subscription_architect)
        
        # Verify Kubernetes manifests
        assert "---" in result  # YAML document separator
        assert "apiVersion: apps/v1" in result
        assert "kind: Deployment" in result
        assert "kind: Service" in result
        assert "rapid-prototyper" in result
        assert "frontend-developer" in result
        
        # Count number of resources (2 deployments + 2 services)
        assert result.count("kind: Deployment") == 2
        assert result.count("kind: Service") == 2
    
    def test_export_kubernetes_lower_tier_blocked(self, sample_project, user_subscription_free):
        """Test Kubernetes export blocked for lower tiers"""
        export_service = ExportService()
        
        # Free tier
        with pytest.raises(HTTPException) as exc_info:
            export_service.export_kubernetes(sample_project, user_subscription_free)
        
        assert exc_info.value.status_code == 403
        assert "shipper tier or higher" in str(exc_info.value.detail)
    
    def test_export_workflow_with_complex_data(self, user_subscription_architect):
        """Test export with complex workflow data"""
        complex_project = Project(
            id="complex-project",
            name="Complex Workflow",
            description="A workflow with special characters: 'quotes', \"double\", \n newlines",
            user_id="test-user",
            status=ProjectStatus.ACTIVE,
            tags=["test", "complex", "edge-cases"],
            workflow=Workflow(
                nodes=[
                    {
                        "id": "node-1",
                        "type": "agent",
                        "position": {"x": 0, "y": 0},
                        "data": {
                            "id": "agent-with-special-chars",
                            "name": "Agent with 'special' \"chars\"",
                            "description": "Handles:\n- Lists\n- Special chars: < > & ' \"",
                            "capabilities": ["special-handling"],
                            "config": {
                                "nested": {
                                    "deeply": {
                                        "value": "test"
                                    }
                                }
                            }
                        }
                    }
                ],
                edges=[],
                layout="circular"
            ),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            version=2
        )
        
        export_service = ExportService()
        
        # Test JSON export handles special characters
        json_result = export_service.export_json(complex_project, user_subscription_architect)
        json_data = json.loads(json_result)
        assert json_data["description"] == complex_project.description
        
        # Test YAML export handles special characters
        yaml_result = export_service.export_yaml(complex_project, user_subscription_architect)
        yaml_data = yaml.safe_load(yaml_result)
        assert yaml_data["description"] == complex_project.description
        
        # Test Claude Code export handles special characters
        claude_result = export_service.export_claude_code(complex_project, user_subscription_architect)
        assert "special" in claude_result
    
    def test_export_empty_workflow(self, user_subscription_architect):
        """Test export with empty workflow"""
        empty_project = Project(
            id="empty-project",
            name="Empty Workflow",
            description="No nodes or edges",
            user_id="test-user",
            status=ProjectStatus.DRAFT,
            workflow=Workflow(nodes=[], edges=[], layout="dagre"),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            version=1
        )
        
        export_service = ExportService()
        
        # JSON export should work with empty workflow
        json_result = export_service.export_json(empty_project, user_subscription_architect)
        json_data = json.loads(json_result)
        assert len(json_data["workflow"]["nodes"]) == 0
        assert len(json_data["workflow"]["edges"]) == 0
        
        # Claude Code should handle empty workflow
        claude_result = export_service.export_claude_code(empty_project, user_subscription_architect)
        assert "# No agents defined" in claude_result
        
        # Docker Compose should have minimal setup
        docker_result = export_service.export_docker_compose(empty_project, user_subscription_architect)
        compose_data = yaml.safe_load(docker_result)
        assert len(compose_data["services"]) == 0 or "placeholder" in compose_data["services"]
    
    def test_export_formats_match_tier_limits(self):
        """Test that export format availability matches tier configuration"""
        from app.config import settings
        export_service = ExportService()
        
        # Check each tier's export capabilities
        for tier, limits in settings.tier_limits.items():
            subscription = UserSubscription(tier=tier)
            
            # JSON should be available for architect and above
            if tier in ["architect", "builder", "shipper", "studio"]:
                # Should not raise exception
                try:
                    export_service._check_export_permission("json", subscription)
                except HTTPException:
                    pytest.fail(f"JSON export should be allowed for {tier} tier")
            else:
                with pytest.raises(HTTPException):
                    export_service._check_export_permission("json", subscription)
            
            # Kubernetes should be available for shipper and above
            if tier in ["shipper", "studio"]:
                try:
                    export_service._check_export_permission("kubernetes", subscription)
                except HTTPException:
                    pytest.fail(f"Kubernetes export should be allowed for {tier} tier")
            else:
                with pytest.raises(HTTPException):
                    export_service._check_export_permission("kubernetes", subscription)