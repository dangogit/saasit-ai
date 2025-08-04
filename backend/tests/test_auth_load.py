#!/usr/bin/env python3
"""
Load testing for authentication system
Tests performance under various load conditions
"""

import asyncio
import aiohttp
import time
import statistics
from typing import List, Dict, Any
from dataclasses import dataclass
from datetime import datetime
import json
import concurrent.futures
import sys


@dataclass
class LoadTestResult:
    """Results from a load test run"""
    endpoint: str
    total_requests: int
    successful_requests: int
    failed_requests: int
    avg_response_time: float
    min_response_time: float
    max_response_time: float
    p95_response_time: float
    p99_response_time: float
    requests_per_second: float
    error_rate: float
    errors: Dict[str, int]


class AuthLoadTester:
    """Load tester for authentication endpoints"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = None
    
    async def __aenter__(self):
        connector = aiohttp.TCPConnector(limit=100, limit_per_host=50)
        timeout = aiohttp.ClientTimeout(total=30)
        self.session = aiohttp.ClientSession(
            connector=connector,
            timeout=timeout,
            headers={"Content-Type": "application/json"}
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def make_request(self, method: str, endpoint: str, data: Dict = None, headers: Dict = None) -> Dict[str, Any]:
        """Make a single HTTP request and measure response time"""
        start_time = time.time()
        
        try:
            url = f"{self.base_url}{endpoint}"
            kwargs = {}
            if data:
                kwargs['json'] = data
            if headers:
                kwargs['headers'] = headers
            
            async with self.session.request(method, url, **kwargs) as response:
                response_data = await response.json()
                end_time = time.time()
                
                return {
                    'status_code': response.status,
                    'response_time': end_time - start_time,
                    'response_data': response_data,
                    'success': 200 <= response.status < 300
                }
        
        except Exception as e:
            end_time = time.time()
            return {
                'status_code': 0,
                'response_time': end_time - start_time,
                'response_data': {'error': str(e)},
                'success': False,
                'error': str(e)
            }
    
    async def registration_load_test(self, concurrent_users: int, requests_per_user: int = 1) -> LoadTestResult:
        """Load test user registration endpoint"""
        print(f"Running registration load test: {concurrent_users} concurrent users, {requests_per_user} requests each")
        
        async def register_user(user_id: int, request_id: int = 0):
            user_data = {
                "email": f"loadtest_{user_id}_{request_id}_{time.time()}@test.com",
                "password": "LoadTest123!",
                "first_name": f"LoadUser{user_id}",
                "last_name": f"Test{request_id}"
            }
            return await self.make_request("POST", "/api/v1/auth/register", data=user_data)
        
        # Create tasks for concurrent requests
        tasks = []
        for user_id in range(concurrent_users):
            for request_id in range(requests_per_user):
                tasks.append(register_user(user_id, request_id))
        
        # Execute all requests concurrently
        start_time = time.time()
        results = await asyncio.gather(*tasks)
        total_time = time.time() - start_time
        
        return self._analyze_results("/api/v1/auth/register", results, total_time)
    
    async def login_load_test(self, concurrent_users: int, requests_per_user: int = 1) -> LoadTestResult:
        """Load test user login endpoint"""
        print(f"Running login load test: {concurrent_users} concurrent users, {requests_per_user} requests each")
        
        # First, register users for login testing
        registered_users = []
        for i in range(concurrent_users):
            user_data = {
                "email": f"logintest_{i}_{time.time()}@test.com",
                "password": "LoginTest123!",
                "first_name": f"LoginUser{i}",
                "last_name": "Test"
            }
            result = await self.make_request("POST", "/api/v1/auth/register", data=user_data)
            if result['success']:
                registered_users.append(user_data)
        
        print(f"Registered {len(registered_users)} users for login testing")
        
        async def login_user(user_data: Dict, request_id: int = 0):
            login_data = {
                "email": user_data["email"],
                "password": user_data["password"]
            }
            return await self.make_request("POST", "/api/v1/auth/login", data=login_data)
        
        # Create login tasks
        tasks = []
        for i, user_data in enumerate(registered_users):
            for request_id in range(requests_per_user):
                tasks.append(login_user(user_data, request_id))
        
        # Execute all login requests concurrently
        start_time = time.time()
        results = await asyncio.gather(*tasks)
        total_time = time.time() - start_time
        
        return self._analyze_results("/api/v1/auth/login", results, total_time)
    
    async def token_refresh_load_test(self, concurrent_users: int, requests_per_user: int = 1) -> LoadTestResult:
        """Load test token refresh endpoint"""
        print(f"Running token refresh load test: {concurrent_users} concurrent users, {requests_per_user} requests each")
        
        # Register and login users to get refresh tokens
        refresh_tokens = []
        for i in range(concurrent_users):
            user_data = {
                "email": f"refreshtest_{i}_{time.time()}@test.com",
                "password": "RefreshTest123!",
                "first_name": f"RefreshUser{i}",
                "last_name": "Test"
            }
            
            # Register
            reg_result = await self.make_request("POST", "/api/v1/auth/register", data=user_data)
            if reg_result['success']:
                refresh_token = reg_result['response_data']['refresh_token']
                refresh_tokens.append(refresh_token)
        
        print(f"Got {len(refresh_tokens)} refresh tokens for testing")
        
        async def refresh_token(token: str, request_id: int = 0):
            return await self.make_request("POST", "/api/v1/auth/refresh", json={"refresh_token": token})
        
        # Create refresh tasks
        tasks = []
        for i, token in enumerate(refresh_tokens):
            for request_id in range(requests_per_user):
                tasks.append(refresh_token(token, request_id))
        
        # Execute all refresh requests concurrently
        start_time = time.time()
        results = await asyncio.gather(*tasks)
        total_time = time.time() - start_time
        
        return self._analyze_results("/api/v1/auth/refresh", results, total_time)
    
    async def protected_endpoint_load_test(self, concurrent_users: int, requests_per_user: int = 1) -> LoadTestResult:
        """Load test protected endpoint access"""
        print(f"Running protected endpoint load test: {concurrent_users} concurrent users, {requests_per_user} requests each")
        
        # Register users and get access tokens
        access_tokens = []
        for i in range(concurrent_users):
            user_data = {
                "email": f"protectedtest_{i}_{time.time()}@test.com",
                "password": "ProtectedTest123!",
                "first_name": f"ProtectedUser{i}",
                "last_name": "Test"
            }
            
            result = await self.make_request("POST", "/api/v1/auth/register", data=user_data)
            if result['success']:
                access_token = result['response_data']['access_token']
                access_tokens.append(access_token)
        
        print(f"Got {len(access_tokens)} access tokens for testing")
        
        async def access_protected_endpoint(token: str, request_id: int = 0):
            headers = {"Authorization": f"Bearer {token}"}
            return await self.make_request("GET", "/api/v1/auth/me", headers=headers)
        
        # Create tasks
        tasks = []
        for i, token in enumerate(access_tokens):
            for request_id in range(requests_per_user):
                tasks.append(access_protected_endpoint(token, request_id))
        
        # Execute all requests concurrently
        start_time = time.time()
        results = await asyncio.gather(*tasks)
        total_time = time.time() - start_time
        
        return self._analyze_results("/api/v1/auth/me", results, total_time)
    
    def _analyze_results(self, endpoint: str, results: List[Dict], total_time: float) -> LoadTestResult:
        """Analyze load test results"""
        total_requests = len(results)
        successful_requests = sum(1 for r in results if r['success'])
        failed_requests = total_requests - successful_requests
        
        response_times = [r['response_time'] for r in results]
        response_times.sort()
        
        avg_response_time = statistics.mean(response_times)
        min_response_time = min(response_times)
        max_response_time = max(response_times)
        
        # Calculate percentiles
        p95_index = int(0.95 * len(response_times))
        p99_index = int(0.99 * len(response_times))
        p95_response_time = response_times[p95_index] if p95_index < len(response_times) else max_response_time
        p99_response_time = response_times[p99_index] if p99_index < len(response_times) else max_response_time
        
        requests_per_second = total_requests / total_time if total_time > 0 else 0
        error_rate = (failed_requests / total_requests) * 100 if total_requests > 0 else 0
        
        # Collect error types
        errors = {}
        for result in results:
            if not result['success']:
                status_code = result.get('status_code', 0)
                error_key = f"HTTP_{status_code}" if status_code > 0 else "CONNECTION_ERROR"
                errors[error_key] = errors.get(error_key, 0) + 1
        
        return LoadTestResult(
            endpoint=endpoint,
            total_requests=total_requests,
            successful_requests=successful_requests,
            failed_requests=failed_requests,
            avg_response_time=avg_response_time,
            min_response_time=min_response_time,
            max_response_time=max_response_time,
            p95_response_time=p95_response_time,
            p99_response_time=p99_response_time,
            requests_per_second=requests_per_second,
            error_rate=error_rate,
            errors=errors
        )
    
    def print_results(self, result: LoadTestResult):
        """Print load test results in a formatted way"""
        print(f"\n{'='*60}")
        print(f"Load Test Results: {result.endpoint}")
        print(f"{'='*60}")
        print(f"Total Requests:       {result.total_requests}")
        print(f"Successful Requests:  {result.successful_requests}")
        print(f"Failed Requests:      {result.failed_requests}")
        print(f"Error Rate:           {result.error_rate:.2f}%")
        print(f"Requests/Second:      {result.requests_per_second:.2f}")
        print(f"\nResponse Times (seconds):")
        print(f"  Average:            {result.avg_response_time:.3f}")
        print(f"  Minimum:            {result.min_response_time:.3f}")
        print(f"  Maximum:            {result.max_response_time:.3f}")
        print(f"  95th Percentile:    {result.p95_response_time:.3f}")
        print(f"  99th Percentile:    {result.p99_response_time:.3f}")
        
        if result.errors:
            print(f"\nError Breakdown:")
            for error_type, count in result.errors.items():
                print(f"  {error_type}: {count}")
        
        print(f"{'='*60}")


async def run_load_tests():
    """Run comprehensive load tests"""
    print("Starting Authentication Load Tests")
    print(f"Test started at: {datetime.now()}")
    
    # Test configurations
    test_configs = [
        {"users": 5, "requests": 1, "name": "Light Load"},
        {"users": 10, "requests": 2, "name": "Medium Load"},
        {"users": 20, "requests": 1, "name": "High Concurrency"},
        {"users": 50, "requests": 1, "name": "Stress Test"},
    ]
    
    async with AuthLoadTester() as tester:
        all_results = []
        
        for config in test_configs:
            print(f"\n🔄 Running {config['name']} tests...")
            
            # Registration Load Test
            reg_result = await tester.registration_load_test(
                concurrent_users=config['users'],
                requests_per_user=config['requests']
            )
            tester.print_results(reg_result)
            all_results.append(reg_result)
            
            # Login Load Test
            login_result = await tester.login_load_test(
                concurrent_users=config['users'],
                requests_per_user=config['requests']
            )
            tester.print_results(login_result)
            all_results.append(login_result)
            
            # Protected Endpoint Load Test
            protected_result = await tester.protected_endpoint_load_test(
                concurrent_users=config['users'],
                requests_per_user=config['requests']
            )
            tester.print_results(protected_result)
            all_results.append(protected_result)
            
            # Token Refresh Load Test
            refresh_result = await tester.token_refresh_load_test(
                concurrent_users=config['users'],
                requests_per_user=config['requests']
            )
            tester.print_results(refresh_result)
            all_results.append(refresh_result)
            
            # Brief pause between test configurations
            await asyncio.sleep(2)
        
        # Summary Report
        print(f"\n{'='*80}")
        print("LOAD TEST SUMMARY")
        print(f"{'='*80}")
        
        performance_issues = []
        
        for result in all_results:
            print(f"\n{result.endpoint}:")
            print(f"  RPS: {result.requests_per_second:.2f}, "
                  f"Avg Response: {result.avg_response_time:.3f}s, "
                  f"Error Rate: {result.error_rate:.2f}%")
            
            # Flag performance issues
            if result.avg_response_time > 2.0:
                performance_issues.append(f"{result.endpoint}: High average response time ({result.avg_response_time:.3f}s)")
            
            if result.p95_response_time > 5.0:
                performance_issues.append(f"{result.endpoint}: High 95th percentile response time ({result.p95_response_time:.3f}s)")
            
            if result.error_rate > 5.0:
                performance_issues.append(f"{result.endpoint}: High error rate ({result.error_rate:.2f}%)")
            
            if result.requests_per_second < 10:
                performance_issues.append(f"{result.endpoint}: Low throughput ({result.requests_per_second:.2f} RPS)")
        
        if performance_issues:
            print(f"\n⚠️  PERFORMANCE ISSUES DETECTED:")
            for issue in performance_issues:
                print(f"  - {issue}")
        else:
            print(f"\n✅ All performance metrics within acceptable ranges")
        
        print(f"\nTest completed at: {datetime.now()}")


class SpikeTest:
    """Simulate sudden traffic spikes"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
    
    async def simulate_viral_spike(self):
        """Simulate a viral traffic spike scenario"""
        print("\n🚀 Simulating Viral Traffic Spike")
        print("Scenario: App goes viral, traffic increases 100x suddenly")
        
        spike_phases = [
            {"duration": 10, "rps_target": 5, "phase": "Normal Traffic"},
            {"duration": 5, "rps_target": 50, "phase": "Traffic Spike Begins"},
            {"duration": 10, "rps_target": 500, "phase": "Viral Peak"},
            {"duration": 5, "rps_target": 50, "phase": "Traffic Subsiding"},
            {"duration": 10, "rps_target": 10, "phase": "New Normal"},
        ]
        
        async with AuthLoadTester(self.base_url) as tester:
            for phase in spike_phases:
                print(f"\n📈 Phase: {phase['phase']} (Target: {phase['rps_target']} RPS)")
                
                # Calculate concurrent users needed to achieve target RPS
                # Assuming average response time of 0.2s
                concurrent_users = max(1, int(phase['rps_target'] * 0.2))
                
                start_time = time.time()
                phase_results = []
                
                while time.time() - start_time < phase['duration']:
                    # Run quick burst of registrations
                    result = await tester.registration_load_test(
                        concurrent_users=min(concurrent_users, 20),  # Cap at 20 for testing
                        requests_per_user=1
                    )
                    phase_results.append(result)
                    
                    # Brief pause before next burst
                    await asyncio.sleep(1)
                
                # Analyze phase results
                if phase_results:
                    avg_rps = statistics.mean([r.requests_per_second for r in phase_results])
                    avg_error_rate = statistics.mean([r.error_rate for r in phase_results])
                    
                    print(f"  Achieved RPS: {avg_rps:.2f}")
                    print(f"  Error Rate: {avg_error_rate:.2f}%")
                    
                    if avg_error_rate > 1.0:
                        print(f"  ⚠️  High error rate during {phase['phase']}")
                    
                    if avg_rps < phase['rps_target'] * 0.5:
                        print(f"  ⚠️  Failed to achieve target RPS during {phase['phase']}")


async def main():
    """Main entry point for load testing"""
    if len(sys.argv) > 1:
        if sys.argv[1] == "--spike":
            spike_test = SpikeTest()
            await spike_test.simulate_viral_spike()
            return
    
    await run_load_tests()


if __name__ == "__main__":
    asyncio.run(main())