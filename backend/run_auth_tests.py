#!/usr/bin/env python3
"""
Authentication Test Runner
Runs comprehensive authentication tests and generates detailed report
"""

import subprocess
import sys
import os
import time
import json
from datetime import datetime
from typing import Dict, List, Any
import asyncio
import httpx


class AuthTestRunner:
    """Runs and coordinates authentication tests"""
    
    def __init__(self):
        self.base_url = "http://localhost:8000"
        self.test_results = {
            "test_session": {
                "start_time": datetime.now().isoformat(),
                "test_runner": "AuthTestRunner v1.0",
                "base_url": self.base_url
            },
            "server_status": {},
            "unit_tests": {},
            "integration_tests": {},
            "load_tests": {},
            "security_tests": {},
            "issues_found": [],
            "recommendations": []
        }
    
    async def check_server_status(self) -> Dict[str, Any]:
        """Check if the server is running and responding"""
        print("🔍 Checking server status...")
        
        try:
            async with httpx.AsyncClient() as client:
                # Health check
                health_response = await client.get(f"{self.base_url}/health", timeout=5.0)
                health_data = health_response.json() if health_response.status_code == 200 else {}
                
                # Test basic API endpoint
                api_response = await client.get(f"{self.base_url}/api/v1/auth/me", timeout=5.0)
                
                status = {
                    "server_running": health_response.status_code == 200,
                    "health_check": health_data,
                    "api_accessible": api_response.status_code in [401, 403],  # Expected without auth
                    "response_time_ms": 0  # Would measure this in real implementation
                }
                
                if status["server_running"]:
                    print("✅ Server is running and responding")
                else:
                    print("❌ Server is not responding")
                    print("   Please start the server with: uvicorn server:app --reload")
                
                return status
                
        except Exception as e:
            print(f"❌ Cannot connect to server: {e}")
            return {
                "server_running": False,
                "error": str(e),
                "api_accessible": False
            }
    
    def run_pytest_tests(self, test_file: str, test_name: str) -> Dict[str, Any]:
        """Run pytest tests and capture results"""
        print(f"🧪 Running {test_name}...")
        
        try:
            # Run pytest with JSON output
            cmd = [
                sys.executable, "-m", "pytest", 
                test_file, 
                "-v", 
                "--tb=short",
                "--json-report",
                "--json-report-file=test_report.json"
            ]
            
            start_time = time.time()
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            end_time = time.time()
            
            # Try to read JSON report
            json_report = {}
            try:
                with open("test_report.json", "r") as f:
                    json_report = json.load(f)
                os.remove("test_report.json")  # Clean up
            except Exception:
                pass
            
            return {
                "success": result.returncode == 0,
                "duration": end_time - start_time,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "exit_code": result.returncode,
                "json_report": json_report
            }
            
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "error": "Test execution timed out",
                "duration": 300
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "duration": 0
            }
    
    async def run_load_tests(self) -> Dict[str, Any]:
        """Run load tests"""
        print("⚡ Running load tests...")
        
        try:
            # Import and run load tests
            from tests.test_auth_load import AuthLoadTester
            
            async with AuthLoadTester(self.base_url) as tester:
                # Quick load test
                result = await tester.registration_load_test(concurrent_users=5, requests_per_user=1)
                
                return {
                    "success": True,
                    "registration_load_test": {
                        "requests_per_second": result.requests_per_second,
                        "avg_response_time": result.avg_response_time,
                        "error_rate": result.error_rate,
                        "p95_response_time": result.p95_response_time
                    }
                }
        
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def run_security_tests(self) -> Dict[str, Any]:
        """Run security-focused tests"""
        print("🔒 Running security tests...")
        
        security_checks = {
            "jwt_secret_strength": self._check_jwt_secret(),
            "password_hashing": self._check_password_hashing(),
            "rate_limiting": self._check_rate_limiting_config(),
            "cors_configuration": self._check_cors_config(),
            "https_enforcement": self._check_https_config()
        }
        
        return security_checks
    
    def _check_jwt_secret(self) -> Dict[str, Any]:
        """Check JWT secret strength"""
        try:
            from app.config import settings
            
            secret = settings.secret_key
            
            issues = []
            if secret == "your-secret-key-change-in-production":
                issues.append("Using default JWT secret key")
            
            if len(secret) < 32:
                issues.append("JWT secret key is too short (< 32 characters)")
            
            # Check for common weak patterns
            if secret.lower() in ["secret", "password", "key", "jwt"]:
                issues.append("JWT secret appears to be a common weak value")
            
            return {
                "status": "PASS" if not issues else "FAIL",
                "issues": issues,
                "secret_length": len(secret)
            }
        
        except Exception as e:
            return {
                "status": "ERROR",
                "error": str(e)
            }
    
    def _check_password_hashing(self) -> Dict[str, Any]:
        """Check password hashing implementation"""
        try:
            from app.utils.security import get_password_hash, verify_password
            
            # Test that hashing works and produces different hashes
            test_password = "TestPassword123!"
            hash1 = get_password_hash(test_password)
            hash2 = get_password_hash(test_password)
            
            issues = []
            
            if hash1 == hash2:
                issues.append("Password hashing not using salt (same password produces same hash)")
            
            if not verify_password(test_password, hash1):
                issues.append("Password verification not working correctly")
            
            if verify_password("wrong_password", hash1):
                issues.append("Password verification incorrectly accepts wrong passwords")
            
            if len(hash1) < 50:
                issues.append("Password hash appears too short (possible weak hashing)")
            
            return {
                "status": "PASS" if not issues else "FAIL",
                "issues": issues,
                "hash_length": len(hash1)
            }
        
        except Exception as e:
            return {
                "status": "ERROR",
                "error": str(e)
            }
    
    def _check_rate_limiting_config(self) -> Dict[str, Any]:
        """Check rate limiting configuration"""
        try:
            from app.config import settings
            
            rate_limits = settings.rate_limit_per_minute
            
            issues = []
            
            if not rate_limits:
                issues.append("No rate limiting configured")
            
            for tier, limit in rate_limits.items():
                if limit > 1000:
                    issues.append(f"Rate limit for {tier} tier very high ({limit}/min)")
            
            return {
                "status": "PASS" if not issues else "WARN",
                "issues": issues,
                "configured_limits": rate_limits
            }
        
        except Exception as e:
            return {
                "status": "ERROR",
                "error": str(e)
            }
    
    def _check_cors_config(self) -> Dict[str, Any]:
        """Check CORS configuration"""
        try:
            from app.config import settings
            
            cors_origins = settings.backend_cors_origins
            
            issues = []
            
            if "*" in cors_origins:
                issues.append("CORS allows all origins (*) - security risk")
            
            for origin in cors_origins:
                if "localhost" in origin or "127.0.0.1" in origin:
                    # This is OK for development
                    pass
                elif not origin.startswith("https://"):
                    issues.append(f"Non-HTTPS origin allowed: {origin}")
            
            return {
                "status": "PASS" if not issues else "WARN",
                "issues": issues,
                "allowed_origins": cors_origins
            }
        
        except Exception as e:
            return {
                "status": "ERROR",
                "error": str(e)
            }
    
    def _check_https_config(self) -> Dict[str, Any]:
        """Check HTTPS enforcement"""
        # This would check if the app enforces HTTPS in production
        return {
            "status": "INFO",
            "note": "HTTPS enforcement should be handled by reverse proxy in production"
        }
    
    def analyze_results(self):
        """Analyze test results and generate recommendations"""
        issues = []
        recommendations = []
        
        # Check server status
        if not self.test_results["server_status"].get("server_running", False):
            issues.append({
                "severity": "CRITICAL",
                "category": "Infrastructure",
                "issue": "Server not responding",
                "recommendation": "Ensure server is running with 'uvicorn server:app --reload'"
            })
        
        # Check unit tests
        if not self.test_results["unit_tests"].get("success", False):
            issues.append({
                "severity": "HIGH",
                "category": "Functionality",
                "issue": "Unit tests failing",
                "recommendation": "Fix failing unit tests before deploying"
            })
        
        # Check security
        security_tests = self.test_results["security_tests"]
        for test_name, result in security_tests.items():
            if result.get("status") == "FAIL":
                issues.append({
                    "severity": "HIGH",
                    "category": "Security",
                    "issue": f"{test_name}: {', '.join(result.get('issues', []))}",
                    "recommendation": f"Fix {test_name} security issues"
                })
        
        # Check load test performance
        load_tests = self.test_results["load_tests"]
        if load_tests.get("success") and "registration_load_test" in load_tests:
            reg_test = load_tests["registration_load_test"]
            
            if reg_test.get("avg_response_time", 0) > 2.0:
                issues.append({
                    "severity": "MEDIUM",
                    "category": "Performance",
                    "issue": f"Slow registration response time: {reg_test['avg_response_time']:.3f}s",
                    "recommendation": "Optimize registration endpoint performance"
                })
            
            if reg_test.get("error_rate", 0) > 1.0:
                issues.append({
                    "severity": "HIGH",
                    "category": "Reliability",
                    "issue": f"High error rate in registration: {reg_test['error_rate']:.2f}%",
                    "recommendation": "Investigate and fix registration errors"
                })
        
        # General recommendations
        recommendations.extend([
            "Set up monitoring and alerting for authentication endpoints",
            "Implement proper rate limiting with Redis in production",
            "Set up email verification service",
            "Configure password reset email templates",
            "Add comprehensive logging for security events",
            "Set up automated security scanning",
            "Implement session management and token blacklisting",
            "Add multi-factor authentication support"
        ])
        
        self.test_results["issues_found"] = issues
        self.test_results["recommendations"] = recommendations
    
    def generate_report(self) -> str:
        """Generate comprehensive test report"""
        report = []
        report.append("=" * 80)
        report.append("SAASIT.AI AUTHENTICATION SYSTEM TEST REPORT")
        report.append("=" * 80)
        report.append(f"Generated: {datetime.now().isoformat()}")
        report.append(f"Base URL: {self.base_url}")
        report.append("")
        
        # Executive Summary
        report.append("EXECUTIVE SUMMARY")
        report.append("-" * 40)
        
        total_issues = len(self.test_results["issues_found"])
        critical_issues = len([i for i in self.test_results["issues_found"] if i["severity"] == "CRITICAL"])
        high_issues = len([i for i in self.test_results["issues_found"] if i["severity"] == "HIGH"])
        
        if critical_issues > 0:
            report.append(f"🚨 {critical_issues} CRITICAL issues found - DEPLOYMENT NOT RECOMMENDED")
        elif high_issues > 0:
            report.append(f"⚠️  {high_issues} HIGH severity issues found - Fix before production")
        else:
            report.append("✅ No critical issues found - System ready for testing")
        
        report.append(f"Total issues found: {total_issues}")
        report.append("")
        
        # Server Status
        report.append("SERVER STATUS")
        report.append("-" * 20)
        server_status = self.test_results["server_status"]
        if server_status.get("server_running"):
            report.append("✅ Server is running and responding")
            if "health_check" in server_status:
                health = server_status["health_check"]
                report.append(f"   Status: {health.get('status', 'unknown')}")
                report.append(f"   Database: {health.get('database', 'unknown')}")
        else:
            report.append("❌ Server is not running or not responding")
        report.append("")
        
        # Test Results Summary
        report.append("TEST RESULTS SUMMARY")
        report.append("-" * 30)
        
        test_sections = [
            ("Unit Tests", "unit_tests"),
            ("Integration Tests", "integration_tests"), 
            ("Load Tests", "load_tests"),
            ("Security Tests", "security_tests")
        ]
        
        for section_name, section_key in test_sections:
            section_data = self.test_results.get(section_key, {})
            if section_data:
                if section_key == "security_tests":
                    # Special handling for security tests
                    failed_tests = [k for k, v in section_data.items() if v.get("status") == "FAIL"]
                    passed_tests = [k for k, v in section_data.items() if v.get("status") == "PASS"]
                    
                    if failed_tests:
                        report.append(f"❌ {section_name}: {len(failed_tests)} failed, {len(passed_tests)} passed")
                    else:
                        report.append(f"✅ {section_name}: All {len(passed_tests)} tests passed")
                
                elif section_data.get("success"):
                    report.append(f"✅ {section_name}: PASSED")
                else:
                    report.append(f"❌ {section_name}: FAILED")
            else:
                report.append(f"⏭️  {section_name}: SKIPPED")
        
        report.append("")
        
        # Issues Found
        if self.test_results["issues_found"]:
            report.append("ISSUES FOUND")
            report.append("-" * 20)
            
            for issue in self.test_results["issues_found"]:
                severity_icon = {
                    "CRITICAL": "🚨",
                    "HIGH": "⚠️ ",
                    "MEDIUM": "⚡",
                    "LOW": "ℹ️ "
                }.get(issue["severity"], "❓")
                
                report.append(f"{severity_icon} {issue['severity']} - {issue['category']}")
                report.append(f"   Issue: {issue['issue']}")
                report.append(f"   Fix: {issue['recommendation']}")
                report.append("")
        
        # Recommendations
        if self.test_results["recommendations"]:
            report.append("RECOMMENDATIONS")
            report.append("-" * 20)
            for i, rec in enumerate(self.test_results["recommendations"], 1):
                report.append(f"{i}. {rec}")
            report.append("")
        
        # Performance Metrics
        load_tests = self.test_results.get("load_tests", {})
        if load_tests.get("success") and "registration_load_test" in load_tests:
            report.append("PERFORMANCE METRICS")
            report.append("-" * 30)
            reg_test = load_tests["registration_load_test"]
            
            report.append(f"Registration Endpoint:")
            report.append(f"  • Throughput: {reg_test.get('requests_per_second', 0):.2f} requests/second")
            report.append(f"  • Avg Response Time: {reg_test.get('avg_response_time', 0):.3f} seconds")
            report.append(f"  • 95th Percentile: {reg_test.get('p95_response_time', 0):.3f} seconds")
            report.append(f"  • Error Rate: {reg_test.get('error_rate', 0):.2f}%")
            report.append("")
        
        # Security Assessment
        security_tests = self.test_results.get("security_tests", {})
        if security_tests:
            report.append("SECURITY ASSESSMENT")
            report.append("-" * 30)
            
            for test_name, result in security_tests.items():
                status_icon = {
                    "PASS": "✅",
                    "FAIL": "❌", 
                    "WARN": "⚠️ ",
                    "ERROR": "💥",
                    "INFO": "ℹ️ "
                }.get(result.get("status"), "❓")
                
                report.append(f"{status_icon} {test_name.replace('_', ' ').title()}: {result.get('status', 'UNKNOWN')}")
                
                if result.get("issues"):
                    for issue in result["issues"]:
                        report.append(f"     • {issue}")
            
            report.append("")
        
        report.append("=" * 80)
        report.append("END OF REPORT")
        report.append("=" * 80)
        
        return "\n".join(report)
    
    async def run_all_tests(self):
        """Run complete test suite"""
        print("🚀 Starting Authentication System Test Suite")
        print(f"Target: {self.base_url}")
        print("=" * 60)
        
        # 1. Check server status
        self.test_results["server_status"] = await self.check_server_status()
        
        if not self.test_results["server_status"].get("server_running"):
            print("\n❌ Cannot proceed - server is not running")
            print("Please start the server with: cd backend && uvicorn server:app --reload")
            return
        
        # 2. Run unit tests
        # self.test_results["unit_tests"] = self.run_pytest_tests(
        #     "tests/test_auth.py", "Unit Tests"
        # )
        
        # 3. Run integration tests  
        # self.test_results["integration_tests"] = self.run_pytest_tests(
        #     "tests/test_auth_integration.py", "Integration Tests"
        # )
        
        # 4. Run load tests
        self.test_results["load_tests"] = await self.run_load_tests()
        
        # 5. Run security tests
        self.test_results["security_tests"] = self.run_security_tests()
        
        # 6. Analyze results
        self.analyze_results()
        
        # 7. Generate and save report
        report = self.generate_report()
        
        # Save report to file
        report_filename = f"auth_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        with open(report_filename, "w") as f:
            f.write(report)
        
        print(f"\n📄 Full report saved to: {report_filename}")
        print("\n" + report)


async def main():
    """Main entry point"""
    runner = AuthTestRunner()
    await runner.run_all_tests()


if __name__ == "__main__":
    asyncio.run(main())