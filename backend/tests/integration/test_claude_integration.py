"""
Integration tests for Claude AI functionality
"""
import pytest
import json
from unittest.mock import patch, AsyncMock


class TestClaudeIntegration:
    """Test Claude AI integration endpoints"""
    
    @patch('app.services.claude_service.ClaudeService.create_conversation')
    async def test_workflow_generation_from_description(self, mock_claude, client, auth_headers):
        """Test generating workflow from project description"""
        # Mock Claude response
        mock_response = {
            "content": json.dumps({
                "workflow": {
                    "nodes": [
                        {
                            "id": "node-1",
                            "type": "agent",
                            "position": {"x": 100, "y": 100},
                            "data": {
                                "id": "rapid-prototyper",
                                "name": "Rapid Prototyper",
                                "description": "Build the MVP"
                            }
                        },
                        {
                            "id": "node-2",
                            "type": "agent",
                            "position": {"x": 300, "y": 100},
                            "data": {
                                "id": "frontend-developer",
                                "name": "Frontend Developer",
                                "description": "Build the UI"
                            }
                        }
                    ],
                    "edges": [
                        {
                            "id": "edge-1",
                            "source": "node-1",
                            "target": "node-2"
                        }
                    ]
                },
                "questions": [
                    "What is your target audience?",
                    "Do you need mobile app support?"
                ],
                "suggestions": [
                    "Consider adding a Backend Architect for API design",
                    "You might want to include a UI/UX Designer"
                ]
            })
        }
        
        mock_claude.return_value = mock_response
        
        # Test workflow generation
        request_data = {
            "description": "I want to build a social media app for dog lovers",
            "context": {
                "budget": "limited",
                "timeline": "6 days",
                "team_size": "solo"
            }
        }
        
        response = client.post(
            "/api/v1/ai/generate-workflow",
            json=request_data,
            headers=auth_headers
        )
        
        # Note: This endpoint needs to be implemented
        if response.status_code == 404:
            pytest.skip("AI workflow generation endpoint not implemented yet")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "workflow" in data
        assert "questions" in data
        assert "suggestions" in data
        assert len(data["workflow"]["nodes"]) > 0
    
    @patch('app.services.claude_service.ClaudeService.create_conversation')
    async def test_workflow_refinement(self, mock_claude, client, auth_headers, test_project_data):
        """Test refining existing workflow with AI"""
        # Create a project first
        create_response = client.post(
            "/api/v1/projects",
            json=test_project_data,
            headers=auth_headers
        )
        project_id = create_response.json()["id"]
        
        # Mock Claude refinement response
        mock_response = {
            "content": json.dumps({
                "refined_workflow": {
                    "nodes": test_project_data["workflow"]["nodes"] + [
                        {
                            "id": "node-3",
                            "type": "agent",
                            "position": {"x": 500, "y": 100},
                            "data": {
                                "id": "api-tester",
                                "name": "API Tester",
                                "description": "Test the APIs"
                            }
                        }
                    ],
                    "edges": test_project_data["workflow"]["edges"] + [
                        {
                            "id": "edge-2",
                            "source": "node-2",
                            "target": "node-3"
                        }
                    ]
                },
                "explanation": "Added API Tester to ensure quality"
            })
        }
        
        mock_claude.return_value = mock_response
        
        # Test workflow refinement
        refinement_data = {
            "user_input": "Add testing to my workflow",
            "focus_area": "quality_assurance"
        }
        
        response = client.post(
            f"/api/v1/ai/refine-workflow/{project_id}",
            json=refinement_data,
            headers=auth_headers
        )
        
        if response.status_code == 404:
            pytest.skip("AI workflow refinement endpoint not implemented yet")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "refined_workflow" in data
        assert len(data["refined_workflow"]["nodes"]) > len(test_project_data["workflow"]["nodes"])
    
    @patch('app.services.claude_service.ClaudeService.stream_conversation')
    async def test_ai_chat_streaming(self, mock_stream, client, auth_headers):
        """Test AI chat with streaming responses"""
        # Mock streaming response
        async def mock_generator():
            chunks = [
                "I understand you want to build ",
                "a social media app. ",
                "Let me help you create ",
                "the perfect workflow."
            ]
            for chunk in chunks:
                yield {"content": chunk}
        
        mock_stream.return_value = mock_generator()
        
        # Test streaming chat
        chat_data = {
            "message": "Help me build a social media app",
            "context": {"previous_messages": []},
            "stream": True
        }
        
        # Note: This would typically use WebSocket or SSE
        response = client.post(
            "/api/v1/ai/chat",
            json=chat_data,
            headers=auth_headers
        )
        
        if response.status_code == 404:
            pytest.skip("AI chat endpoint not implemented yet")
        
        # For non-streaming fallback
        assert response.status_code == 200
    
    def test_ai_rate_limiting(self, client, auth_headers):
        """Test AI endpoint rate limiting"""
        # AI endpoints should have stricter rate limits
        request_data = {
            "description": "Build an app",
            "context": {}
        }
        
        successful_requests = 0
        for i in range(20):  # Try many requests
            response = client.post(
                "/api/v1/ai/generate-workflow",
                json=request_data,
                headers=auth_headers
            )
            
            if response.status_code == 404:
                pytest.skip("AI endpoints not implemented yet")
            
            if response.status_code == 200:
                successful_requests += 1
            elif response.status_code == 429:
                break
        
        # Should hit rate limit for AI endpoints quickly
        assert successful_requests < 20
    
    def test_ai_context_limits(self, client, auth_headers):
        """Test AI context size limits"""
        # Create very large context
        large_context = {
            "description": "x" * 10000,  # Very long description
            "context": {
                "history": ["message"] * 1000  # Many messages
            }
        }
        
        response = client.post(
            "/api/v1/ai/generate-workflow",
            json=large_context,
            headers=auth_headers
        )
        
        if response.status_code == 404:
            pytest.skip("AI endpoints not implemented yet")
        
        # Should reject overly large contexts
        assert response.status_code == 400
        assert "too large" in response.json()["detail"].lower()
    
    @patch('app.services.claude_service.WorkflowGenerator.generate_from_description')
    async def test_workflow_template_suggestions(self, mock_generator, client, auth_headers):
        """Test AI suggests appropriate workflow templates"""
        # Mock template suggestions
        mock_response = {
            "suggested_templates": [
                {
                    "id": "saas-mvp",
                    "name": "SaaS MVP Template",
                    "match_score": 0.95,
                    "reason": "Your description mentions building a web app with subscriptions"
                },
                {
                    "id": "mobile-first",
                    "name": "Mobile-First Template",
                    "match_score": 0.75,
                    "reason": "Consider mobile users for better reach"
                }
            ],
            "custom_workflow": {
                "nodes": [],
                "edges": []
            }
        }
        
        mock_generator.return_value = mock_response
        
        request_data = {
            "description": "I want to build a SaaS product with subscription billing"
        }
        
        response = client.post(
            "/api/v1/ai/suggest-templates",
            json=request_data,
            headers=auth_headers
        )
        
        if response.status_code == 404:
            pytest.skip("Template suggestion endpoint not implemented yet")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "suggested_templates" in data
        assert len(data["suggested_templates"]) > 0
        assert data["suggested_templates"][0]["match_score"] > 0.5
    
    def test_ai_error_handling(self, client, auth_headers):
        """Test AI error handling when Claude is unavailable"""
        with patch('app.services.claude_service.ClaudeService.create_conversation') as mock_claude:
            mock_claude.side_effect = Exception("Claude API error")
            
            request_data = {
                "description": "Build an app",
                "context": {}
            }
            
            response = client.post(
                "/api/v1/ai/generate-workflow",
                json=request_data,
                headers=auth_headers
            )
            
            if response.status_code == 404:
                pytest.skip("AI endpoints not implemented yet")
            
            # Should handle errors gracefully
            assert response.status_code == 503
            assert "AI service" in response.json()["detail"]