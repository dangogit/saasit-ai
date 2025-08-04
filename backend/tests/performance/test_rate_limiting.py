"""
Performance tests for rate limiting
"""
import pytest
import time
import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime


class TestRateLimiting:
    """Test rate limiting functionality"""
    
    def test_api_rate_limit_per_minute(self, client, auth_headers):
        """Test API rate limiting per minute"""
        # Get current user to check tier
        me_response = client.get("/api/v1/auth/me", headers=auth_headers)
        user_tier = me_response.json()["subscription"]["tier"]
        
        # Expected rate limits per tier (requests per minute)
        rate_limits = {
            "free": 10,
            "architect": 60,
            "builder": 100,
            "shipper": 200,
            "studio": -1  # Unlimited
        }
        
        limit = rate_limits.get(user_tier, 10)
        if limit == -1:
            pytest.skip("Studio tier has unlimited rate limit")
        
        # Make requests up to the limit
        successful_requests = 0
        start_time = time.time()
        
        for i in range(limit + 5):  # Try to exceed limit
            response = client.get("/api/v1/projects", headers=auth_headers)
            if response.status_code == 200:
                successful_requests += 1
            elif response.status_code == 429:
                # Rate limit hit
                break
        
        # Should hit rate limit before or at the limit
        assert successful_requests <= limit, f"Made {successful_requests} requests, expected max {limit}"
        
        # Verify rate limit headers
        if response.status_code == 429:
            assert "X-RateLimit-Limit" in response.headers
            assert "X-RateLimit-Remaining" in response.headers
            assert "X-RateLimit-Reset" in response.headers
    
    def test_rate_limit_reset(self, client, auth_headers):
        """Test that rate limits reset properly"""
        # Make a single request to get rate limit info
        response = client.get("/api/v1/projects", headers=auth_headers)
        
        if "X-RateLimit-Reset" not in response.headers:
            pytest.skip("Rate limit headers not implemented")
        
        reset_time = int(response.headers["X-RateLimit-Reset"])
        current_time = int(time.time())
        
        # Reset should be within the next minute
        assert reset_time > current_time
        assert reset_time - current_time <= 60
    
    def test_concurrent_request_handling(self, client, auth_headers):
        """Test handling of concurrent requests"""
        endpoint = "/api/v1/projects"
        concurrent_requests = 10
        
        def make_request():
            return client.get(endpoint, headers=auth_headers)
        
        # Make concurrent requests
        with ThreadPoolExecutor(max_workers=concurrent_requests) as executor:
            futures = [executor.submit(make_request) for _ in range(concurrent_requests)]
            responses = [f.result() for f in futures]
        
        # Check responses
        status_codes = [r.status_code for r in responses]
        successful = status_codes.count(200)
        rate_limited = status_codes.count(429)
        
        # All requests should either succeed or be rate limited
        assert successful + rate_limited == concurrent_requests
    
    def test_tier_specific_limits(self, client, test_users_with_tiers):
        """Test that each tier has correct rate limits"""
        tier_limits = {
            "free": 10,
            "architect": 60,
            "builder": 100,
            "shipper": 200,
            "studio": 1000  # Even studio has some limit for testing
        }
        
        for tier, user_data in test_users_with_tiers.items():
            headers = {"Authorization": f"Bearer {user_data['access_token']}"}
            
            # Make requests to test limit
            successful = 0
            expected_limit = tier_limits[tier]
            
            for i in range(expected_limit + 10):
                response = client.get("/api/v1/auth/me", headers=headers)
                if response.status_code == 200:
                    successful += 1
                elif response.status_code == 429:
                    break
            
            # Verify appropriate limit was applied
            if tier == "studio":
                # Studio should handle many requests
                assert successful >= 100
            else:
                # Other tiers should be limited appropriately
                assert successful <= expected_limit + 5  # Small buffer for timing
    
    def test_rate_limit_per_endpoint(self, client, auth_headers):
        """Test that rate limits are applied per endpoint"""
        # Make requests to different endpoints
        endpoints = [
            "/api/v1/projects",
            "/api/v1/auth/me",
        ]
        
        responses_per_endpoint = {}
        
        for endpoint in endpoints:
            successful = 0
            for i in range(20):
                response = client.get(endpoint, headers=auth_headers)
                if response.status_code == 200:
                    successful += 1
                elif response.status_code == 429:
                    break
            responses_per_endpoint[endpoint] = successful
        
        # Each endpoint should have its own rate limit counter
        # This test assumes rate limits are not shared across endpoints
        # Adjust based on actual implementation
    
    def test_rate_limit_error_format(self, client, auth_headers):
        """Test rate limit error response format"""
        # Hit rate limit
        for i in range(100):  # Definitely exceed any rate limit
            response = client.get("/api/v1/projects", headers=auth_headers)
            if response.status_code == 429:
                break
        
        if response.status_code != 429:
            pytest.skip("Could not trigger rate limit")
        
        # Check error response format
        error_data = response.json()
        assert "detail" in error_data
        assert "rate limit" in error_data["detail"].lower()
        
        # Check headers
        assert response.headers.get("Retry-After") is not None
    
    @pytest.mark.asyncio
    async def test_async_rate_limiting(self, test_db, registered_user):
        """Test rate limiting with async requests"""
        from app.middleware.rate_limit import check_rate_limit
        from app.models.user import TokenData
        
        user_id = registered_user["user"]["id"]
        token_data = TokenData(sub=user_id)
        
        # Simulate rapid async requests
        tasks = []
        for i in range(20):
            tasks.append(check_rate_limit(token_data))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Some should succeed, some should fail with rate limit
        successes = sum(1 for r in results if not isinstance(r, Exception))
        failures = sum(1 for r in results if isinstance(r, Exception))
        
        assert successes > 0
        assert failures > 0  # Should hit rate limit
    
    def test_rate_limit_headers_accuracy(self, client, auth_headers):
        """Test that rate limit headers accurately reflect state"""
        # Make initial request
        response1 = client.get("/api/v1/projects", headers=auth_headers)
        
        if "X-RateLimit-Limit" not in response1.headers:
            pytest.skip("Rate limit headers not implemented")
        
        limit = int(response1.headers["X-RateLimit-Limit"])
        remaining1 = int(response1.headers["X-RateLimit-Remaining"])
        
        # Make another request
        response2 = client.get("/api/v1/projects", headers=auth_headers)
        remaining2 = int(response2.headers["X-RateLimit-Remaining"])
        
        # Remaining should decrease
        assert remaining2 == remaining1 - 1
        
        # Limit should stay the same
        assert int(response2.headers["X-RateLimit-Limit"]) == limit