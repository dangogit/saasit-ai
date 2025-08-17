"""
End-to-end tests for the complete onboarding flow
Tests the full user journey from start to completion
"""
import pytest
import asyncio
from httpx import AsyncClient
from datetime import datetime
from unittest.mock import patch, AsyncMock

from app.models.user import TokenData
from tests.fixtures.onboarding_fixtures import *


class TestOnboardingFlow:
    """Test complete onboarding user journeys"""
    
    @pytest.mark.asyncio
    async def test_complete_new_project_flow(
        self, 
        authenticated_client: AsyncClient,
        test_user_token: str,
        mock_clerk_metadata
    ):
        """Test complete onboarding flow for new project"""
        
        # Step 1: Detect Claude Code (skip)
        detection_response = await authenticated_client.post(
            "/api/v1/onboarding/detect-claude-code",
            json={"check_method": "both"},
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        assert detection_response.status_code == 200
        detection_data = detection_response.json()
        
        # Step 2: Start AI questions for new project
        question_response = await authenticated_client.post(
            "/api/v1/onboarding/next-question",
            json={
                "question_id": "project_type", 
                "answer": "new",
                "context": {"project_type": "new"}
            },
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        assert question_response.status_code == 200
        question_data = question_response.json()
        assert question_data["question_id"] == "project_goal"
        
        # Step 3: Answer project goal question
        goal_response = await authenticated_client.post(
            "/api/v1/onboarding/next-question",
            json={
                "question_id": "project_goal",
                "answer": "Build a SaaS application",
                "context": {"project_type": "new", "goal": "saas"}
            },
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        assert goal_response.status_code == 200
        goal_data = goal_response.json()
        assert goal_data["question_id"] == "target_users"
        
        # Step 4: Complete remaining questions
        questions_and_answers = [
            ("target_users", "Small businesses and startups"),
            ("timeline", "Within a few weeks"),
            ("experience", "Intermediate - I have some experience")
        ]
        
        for question_id, answer in questions_and_answers:
            response = await authenticated_client.post(
                "/api/v1/onboarding/next-question",
                json={
                    "question_id": question_id,
                    "answer": answer,
                    "context": {"project_type": "new"}
                },
                headers={"Authorization": f"Bearer {test_user_token}"}
            )
            assert response.status_code == 200
            if not response.json().get("is_final", False):
                assert "question_id" in response.json()
        
        # Step 5: Save progress throughout
        progress_data = {
            "project_type": "new",
            "questions_answered": len(questions_and_answers) + 1,
            "current_step": "templates",
            "claude_code_detected": detection_data["has_claude_code"],
            "completed_steps": ["welcome", "detection", "project-type", "questions"]
        }
        
        save_response = await authenticated_client.post(
            "/api/v1/onboarding/save-progress",
            json=progress_data,
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        assert save_response.status_code == 200
        save_data = save_response.json()
        assert save_data["success"] is True
        assert "saved_at" in save_data

    @pytest.mark.asyncio
    async def test_complete_existing_project_flow(
        self,
        authenticated_client: AsyncClient,
        test_user_token: str,
        mock_github_api,
        sample_claude_md_content: str
    ):
        """Test complete onboarding flow for existing project with GitHub integration"""
        
        # Step 1: Detect Claude Code (success scenario)
        with patch('app.routers.onboarding._detect_via_api') as mock_api_detect:
            mock_api_detect.return_value = {
                "found": True,
                "method": "api",
                "port": 3001,
                "version": "1.0.0"
            }
            
            detection_response = await authenticated_client.post(
                "/api/v1/onboarding/detect-claude-code",
                json={"check_method": "api"},
                headers={"Authorization": f"Bearer {test_user_token}"}
            )
            assert detection_response.status_code == 200
            detection_data = detection_response.json()
            assert detection_data["has_claude_code"] is True
            assert detection_data["version"] == "1.0.0"
        
        # Step 2: Choose existing project
        question_response = await authenticated_client.post(
            "/api/v1/onboarding/next-question",
            json={
                "question_id": "project_type",
                "answer": "existing",
                "context": {"project_type": "existing", "has_github": True}
            },
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        assert question_response.status_code == 200
        
        # Step 3: Analyze CLAUDE.md content
        analysis_response = await authenticated_client.post(
            "/api/v1/onboarding/analyze-claude-md",
            json={
                "content": sample_claude_md_content,
                "repo_url": "https://github.com/testuser/test-repo"
            },
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        assert analysis_response.status_code == 200
        analysis_data = analysis_response.json()
        
        # Verify analysis results
        assert "technologies" in analysis_data
        assert "React" in analysis_data["technologies"]
        assert "FastAPI" in analysis_data["technologies"]
        assert analysis_data["framework"] == "React"
        assert analysis_data["project_type"] == "SaaS"
        assert len(analysis_data["recommendations"]) > 0
        
        # Step 4: Save comprehensive progress
        progress_data = {
            "project_type": "existing",
            "claude_code_detected": True,
            "github_connected": True,
            "project_analysis": analysis_data,
            "current_step": "templates",
            "completed_steps": ["welcome", "detection", "project-type", "github", "analysis"]
        }
        
        save_response = await authenticated_client.post(
            "/api/v1/onboarding/save-progress",
            json=progress_data,
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        assert save_response.status_code == 200

    @pytest.mark.asyncio
    async def test_resume_onboarding_flow(
        self,
        authenticated_client: AsyncClient,
        test_user_token: str,
        saved_onboarding_progress: dict
    ):
        """Test resuming onboarding from saved progress"""
        
        # Try to resume progress
        resume_response = await authenticated_client.get(
            "/api/v1/onboarding/resume-progress",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        assert resume_response.status_code == 200
        resume_data = resume_response.json()
        
        if resume_data["has_saved_progress"]:
            progress = resume_data["progress_data"]
            assert progress["current_step"] in [
                "welcome", "detection", "project-type", "github", 
                "questions", "analysis", "templates"
            ]
            assert isinstance(progress["completed_steps"], list)
            
            # Continue from where left off
            if progress["current_step"] == "questions":
                # Continue with questions
                question_response = await authenticated_client.post(
                    "/api/v1/onboarding/next-question",
                    json={
                        "question_id": "project_goal",
                        "answer": "Build a SaaS application",
                        "context": progress
                    },
                    headers={"Authorization": f"Bearer {test_user_token}"}
                )
                assert question_response.status_code == 200

    @pytest.mark.asyncio
    async def test_skip_optional_steps_flow(
        self,
        authenticated_client: AsyncClient,
        test_user_token: str
    ):
        """Test completing onboarding by skipping all optional steps"""
        
        # Skip Claude Code detection
        detection_response = await authenticated_client.post(
            "/api/v1/onboarding/detect-claude-code",
            json={"check_method": "both"},
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        # Even if detection fails, should be able to continue
        
        # Required: Answer project type (only required step)
        question_response = await authenticated_client.post(
            "/api/v1/onboarding/next-question",
            json={
                "question_id": "project_type",
                "answer": "new",
                "context": {"skip_optional": True}
            },
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        assert question_response.status_code == 200
        
        # Save minimal progress (skipped most steps)
        progress_data = {
            "project_type": "new",
            "current_step": "complete",
            "completed_steps": ["welcome", "project-type"],
            "skipped_steps": ["detection", "github", "questions", "analysis", "templates"]
        }
        
        save_response = await authenticated_client.post(
            "/api/v1/onboarding/save-progress",
            json=progress_data,
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        assert save_response.status_code == 200
        assert save_response.json()["success"] is True


class TestOnboardingErrorScenarios:
    """Test error handling throughout onboarding flow"""
    
    @pytest.mark.asyncio
    async def test_network_timeout_recovery(
        self,
        authenticated_client: AsyncClient,
        test_user_token: str
    ):
        """Test handling of network timeouts during detection"""
        
        with patch('app.routers.onboarding._detect_via_api') as mock_detect:
            # Simulate timeout
            mock_detect.side_effect = asyncio.TimeoutError("Detection timeout")
            
            response = await authenticated_client.post(
                "/api/v1/onboarding/detect-claude-code",
                json={"check_method": "api"},
                headers={"Authorization": f"Bearer {test_user_token}"}
            )
            
            # Should return graceful error response
            assert response.status_code == 200
            data = response.json()
            assert data["has_claude_code"] is False
            assert data["status"] == "error"
            assert "timeout" in data["error_message"].lower()

    @pytest.mark.asyncio
    async def test_invalid_claude_md_content(
        self,
        authenticated_client: AsyncClient,
        test_user_token: str
    ):
        """Test handling of malformed CLAUDE.md content"""
        
        # Send malformed content
        response = await authenticated_client.post(
            "/api/v1/onboarding/analyze-claude-md",
            json={
                "content": "This is not a valid CLAUDE.md file\nNo structure at all",
                "repo_url": "https://github.com/test/repo"
            },
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return basic analysis even with malformed content
        assert "technologies" in data
        assert "recommendations" in data
        assert data["complexity"] in ["simple", "moderate", "complex"]

    @pytest.mark.asyncio
    async def test_rate_limiting_enforcement(
        self,
        authenticated_client: AsyncClient,
        free_tier_user_token: str
    ):
        """Test rate limiting for free tier users"""
        
        # Make requests up to the limit
        for i in range(21):  # Free tier limit is 20/minute
            response = await authenticated_client.post(
                "/api/v1/onboarding/detect-claude-code",
                json={"check_method": "api"},
                headers={"Authorization": f"Bearer {free_tier_user_token}"}
            )
            
            if i < 20:
                assert response.status_code == 200
            else:
                # Should hit rate limit
                assert response.status_code == 429
                data = response.json()
                assert "rate limit" in data["detail"].lower()

    @pytest.mark.asyncio
    async def test_authentication_required(
        self,
        client: AsyncClient
    ):
        """Test that all onboarding endpoints require authentication"""
        
        endpoints = [
            ("POST", "/api/v1/onboarding/detect-claude-code", {"check_method": "api"}),
            ("POST", "/api/v1/onboarding/next-question", {"question_id": "test", "answer": "test"}),
            ("POST", "/api/v1/onboarding/analyze-claude-md", {"content": "test"}),
            ("POST", "/api/v1/onboarding/save-progress", {"test": "data"}),
            ("GET", "/api/v1/onboarding/resume-progress", None)
        ]
        
        for method, endpoint, payload in endpoints:
            if method == "POST":
                response = await client.post(endpoint, json=payload)
            else:
                response = await client.get(endpoint)
            
            assert response.status_code == 401
            assert "authorization" in response.json()["detail"].lower()


class TestOnboardingDataValidation:
    """Test input validation for onboarding endpoints"""
    
    @pytest.mark.asyncio
    async def test_claude_code_detection_validation(
        self,
        authenticated_client: AsyncClient,
        test_user_token: str
    ):
        """Test input validation for Claude Code detection"""
        
        # Invalid check method
        response = await authenticated_client.post(
            "/api/v1/onboarding/detect-claude-code",
            json={"check_method": "invalid"},
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        assert response.status_code == 422
        
        # Missing required field (should use default)
        response = await authenticated_client.post(
            "/api/v1/onboarding/detect-claude-code",
            json={},
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        assert response.status_code == 200  # Should use default value

    @pytest.mark.asyncio
    async def test_question_answer_validation(
        self,
        authenticated_client: AsyncClient,
        test_user_token: str
    ):
        """Test input validation for question answers"""
        
        # Empty question ID
        response = await authenticated_client.post(
            "/api/v1/onboarding/next-question",
            json={"question_id": "", "answer": "test"},
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        assert response.status_code == 422
        
        # Too long answer
        response = await authenticated_client.post(
            "/api/v1/onboarding/next-question",
            json={
                "question_id": "test",
                "answer": "x" * 1001  # Max length is 1000
            },
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_claude_md_analysis_validation(
        self,
        authenticated_client: AsyncClient,
        test_user_token: str
    ):
        """Test input validation for CLAUDE.md analysis"""
        
        # Content too short
        response = await authenticated_client.post(
            "/api/v1/onboarding/analyze-claude-md",
            json={"content": "short"},
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        assert response.status_code == 422
        
        # Content too long
        response = await authenticated_client.post(
            "/api/v1/onboarding/analyze-claude-md",
            json={"content": "x" * 50001},  # Max length is 50000
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        assert response.status_code == 422
        
        # Invalid repo URL format
        response = await authenticated_client.post(
            "/api/v1/onboarding/analyze-claude-md",
            json={
                "content": "Valid content here",
                "repo_url": "x" * 501  # Max length is 500
            },
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        assert response.status_code == 422


class TestOnboardingPerformance:
    """Test performance characteristics of onboarding endpoints"""
    
    @pytest.mark.asyncio
    async def test_detection_performance(
        self,
        authenticated_client: AsyncClient,
        test_user_token: str
    ):
        """Test that Claude Code detection completes within reasonable time"""
        
        start_time = asyncio.get_event_loop().time()
        
        response = await authenticated_client.post(
            "/api/v1/onboarding/detect-claude-code",
            json={"check_method": "both"},
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        
        end_time = asyncio.get_event_loop().time()
        duration = end_time - start_time
        
        assert response.status_code == 200
        assert duration < 10.0  # Should complete within 10 seconds

    @pytest.mark.asyncio
    async def test_analysis_performance(
        self,
        authenticated_client: AsyncClient,
        test_user_token: str,
        large_claude_md_content: str
    ):
        """Test that CLAUDE.md analysis handles large files efficiently"""
        
        start_time = asyncio.get_event_loop().time()
        
        response = await authenticated_client.post(
            "/api/v1/onboarding/analyze-claude-md",
            json={"content": large_claude_md_content},
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        
        end_time = asyncio.get_event_loop().time()
        duration = end_time - start_time
        
        assert response.status_code == 200
        assert duration < 5.0  # Should complete within 5 seconds

    @pytest.mark.asyncio
    async def test_concurrent_users_performance(
        self,
        authenticated_client: AsyncClient,
        multiple_user_tokens: list
    ):
        """Test system performance with multiple concurrent users"""
        
        async def single_user_flow(token: str):
            """Single user onboarding flow"""
            response = await authenticated_client.post(
                "/api/v1/onboarding/detect-claude-code",
                json={"check_method": "api"},
                headers={"Authorization": f"Bearer {token}"}
            )
            return response.status_code == 200
        
        # Run concurrent onboarding flows
        tasks = [single_user_flow(token) for token in multiple_user_tokens[:10]]
        results = await asyncio.gather(*tasks)
        
        # All should succeed
        assert all(results)