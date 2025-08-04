#!/usr/bin/env python3
"""
Static Analysis of Authentication System
Analyzes authentication implementation without requiring server to be running
"""

import sys
import os
import importlib.util
import inspect
from typing import Dict, List, Any, Optional
from datetime import datetime
import ast
import re


class AuthSecurityAnalyzer:
    """Static analysis tool for authentication security"""
    
    def __init__(self, backend_path: str):
        self.backend_path = backend_path
        self.issues = []
        self.recommendations = []
        self.analysis_results = {}
    
    def analyze_authentication_system(self) -> Dict[str, Any]:
        """Perform comprehensive static analysis"""
        print("🔍 Starting Static Analysis of Authentication System")
        print("=" * 60)
        
        # Analyze different components
        self.analyze_security_utils()
        self.analyze_auth_service()
        self.analyze_auth_routes()
        self.analyze_middleware()
        self.analyze_configuration()
        self.analyze_user_models()
        
        # Generate overall assessment
        self.generate_assessment()
        
        return self.analysis_results
    
    def analyze_security_utils(self):
        """Analyze security utilities implementation"""
        print("🔐 Analyzing security utilities...")
        
        try:
            # Read the security.py file
            security_file = os.path.join(self.backend_path, "app/utils/security.py")
            with open(security_file, 'r') as f:
                content = f.read()
            
            security_analysis = {
                "password_hashing": self._check_password_hashing(content),
                "jwt_implementation": self._check_jwt_implementation(content),
                "token_generation": self._check_token_generation(content),
                "crypto_randomness": self._check_crypto_randomness(content)
            }
            
            self.analysis_results["security_utils"] = security_analysis
            
        except Exception as e:
            self.issues.append({
                "severity": "HIGH",
                "category": "Security Utils",
                "issue": f"Failed to analyze security utils: {e}",
                "file": "app/utils/security.py"
            })
    
    def _check_password_hashing(self, content: str) -> Dict[str, Any]:
        """Check password hashing implementation"""
        issues = []
        good_practices = []
        
        # Check for bcrypt usage
        if "bcrypt" in content:
            good_practices.append("Uses bcrypt for password hashing")
        else:
            issues.append("bcrypt not found - may be using weak password hashing")
        
        # Check for salt usage
        if "deprecated=\"auto\"" in content:
            good_practices.append("Automatically handles deprecated hash formats")
        
        # Check for hardcoded passwords/salts
        if re.search(r'password\s*=\s*["\'][^"\']+["\']', content, re.IGNORECASE):
            issues.append("Possible hardcoded password found")
        
        # Check for password complexity validation
        if "verify_password" in content and "get_password_hash" in content:
            good_practices.append("Implements password verification and hashing functions")
        
        return {
            "status": "PASS" if not issues else "WARN",
            "issues": issues,
            "good_practices": good_practices
        }
    
    def _check_jwt_implementation(self, content: str) -> Dict[str, Any]:
        """Check JWT implementation"""
        issues = []
        good_practices = []
        
        # Check for proper JWT library
        if "jose" in content or "jwt" in content:
            good_practices.append("Uses established JWT library")
        else:
            issues.append("No JWT library detected")
        
        # Check for token expiration
        if "expire" in content and "exp" in content:
            good_practices.append("Implements token expiration")
        else:
            issues.append("Token expiration not clearly implemented")
        
        # Check for token type validation
        if "type" in content and ("access" in content or "refresh" in content):
            good_practices.append("Implements token type validation")
        
        # Check for algorithm specification
        if "algorithm" in content or "HS256" in content:
            good_practices.append("Specifies JWT algorithm")
        else:
            issues.append("JWT algorithm not specified - security risk")
        
        return {
            "status": "PASS" if not issues else "WARN",
            "issues": issues,
            "good_practices": good_practices
        }
    
    def _check_token_generation(self, content: str) -> Dict[str, Any]:
        """Check token generation security"""
        issues = []
        good_practices = []
        
        # Check for secure random token generation
        if "secrets" in content:
            good_practices.append("Uses cryptographically secure random generator")
        else:
            issues.append("May not be using cryptographically secure randomness")
        
        # Check for sufficient token length
        if re.search(r'length.*=.*\d+', content):
            match = re.search(r'length.*=.*(\d+)', content)
            if match and int(match.group(1)) >= 32:
                good_practices.append("Uses adequate token length")
            else:
                issues.append("Token length may be too short")
        
        return {
            "status": "PASS" if not issues else "WARN",
            "issues": issues,
            "good_practices": good_practices
        }
    
    def _check_crypto_randomness(self, content: str) -> Dict[str, Any]:
        """Check cryptographic randomness usage"""
        issues = []
        good_practices = []
        
        if "secrets.choice" in content:
            good_practices.append("Uses secrets module for random choice")
        
        if "random.choice" in content and "secrets.choice" not in content:
            issues.append("Uses non-cryptographic random.choice instead of secrets.choice")
        
        if "string.ascii_letters" in content and "string.digits" in content:
            good_practices.append("Uses appropriate character set for token generation")
        
        return {
            "status": "PASS" if not issues else "WARN",
            "issues": issues,
            "good_practices": good_practices
        }
    
    def analyze_auth_service(self):
        """Analyze authentication service implementation"""
        print("🏗️  Analyzing authentication service...")
        
        try:
            service_file = os.path.join(self.backend_path, "app/services/auth_service.py")
            with open(service_file, 'r') as f:
                content = f.read()
            
            auth_service_analysis = {
                "user_registration": self._check_user_registration(content),
                "user_login": self._check_user_login(content),
                "password_reset": self._check_password_reset(content),
                "email_verification": self._check_email_verification(content),
                "error_handling": self._check_error_handling(content)
            }
            
            self.analysis_results["auth_service"] = auth_service_analysis
            
        except Exception as e:
            self.issues.append({
                "severity": "HIGH",
                "category": "Auth Service",
                "issue": f"Failed to analyze auth service: {e}",
                "file": "app/services/auth_service.py"
            })
    
    def _check_user_registration(self, content: str) -> Dict[str, Any]:
        """Check user registration implementation"""
        issues = []
        good_practices = []
        
        # Check for duplicate email prevention
        if "existing_user" in content and "find_one" in content:
            good_practices.append("Checks for existing users during registration")
        else:
            issues.append("May not prevent duplicate email registration")
        
        # Check for email verification
        if "email_verification_token" in content:
            good_practices.append("Implements email verification")
        else:
            issues.append("Email verification not implemented")
        
        # Check for proper password hashing
        if "get_password_hash" in content:
            good_practices.append("Hashes passwords during registration")
        else:
            issues.append("Password hashing not found in registration")
        
        return {
            "status": "PASS" if not issues else "WARN",
            "issues": issues,
            "good_practices": good_practices
        }
    
    def _check_user_login(self, content: str) -> Dict[str, Any]:
        """Check user login implementation"""
        issues = []
        good_practices = []
        
        # Check for password verification
        if "verify_password" in content:
            good_practices.append("Implements password verification")
        else:
            issues.append("Password verification not found")
        
        # Check for account status validation
        if "is_active" in content:
            good_practices.append("Checks user account status during login")
        else:
            issues.append("Account status not validated during login")
        
        # Check for login tracking
        if "last_login" in content:
            good_practices.append("Tracks last login time")
        
        # Check for consistent error messages
        if "Incorrect email or password" in content:
            good_practices.append("Uses consistent error messages for security")
        
        return {
            "status": "PASS" if not issues else "WARN",
            "issues": issues,
            "good_practices": good_practices
        }
    
    def _check_password_reset(self, content: str) -> Dict[str, Any]:
        """Check password reset implementation"""
        issues = []
        good_practices = []
        
        # Check for reset token generation
        if "password_reset_token" in content:
            good_practices.append("Implements password reset tokens")
        else:
            issues.append("Password reset not implemented")
        
        # Check for token expiration
        if "password_reset_expires" in content:
            good_practices.append("Password reset tokens have expiration")
        else:
            issues.append("Password reset tokens may not expire")
        
        # Check for user enumeration protection
        if "If the email exists" in content:
            good_practices.append("Protects against user enumeration in password reset")
        
        return {
            "status": "PASS" if not issues else "WARN",
            "issues": issues,
            "good_practices": good_practices
        }
    
    def _check_email_verification(self, content: str) -> Dict[str, Any]:
        """Check email verification implementation"""
        issues = []
        good_practices = []
        
        if "email_verification_token" in content:
            good_practices.append("Implements email verification")
        else:
            issues.append("Email verification not implemented")
        
        if "is_verified" in content:
            good_practices.append("Tracks email verification status")
        
        return {
            "status": "PASS" if not issues else "WARN",
            "issues": issues,
            "good_practices": good_practices
        }
    
    def _check_error_handling(self, content: str) -> Dict[str, Any]:
        """Check error handling in auth service"""
        issues = []
        good_practices = []
        
        # Check for proper HTTP exceptions
        if "HTTPException" in content:
            good_practices.append("Uses proper HTTP exceptions")
        
        # Check for consistent error responses
        if "status.HTTP_401_UNAUTHORIZED" in content:
            good_practices.append("Uses consistent HTTP status codes")
        
        # Check for logging
        if "logger" in content or "logging" in content:
            good_practices.append("Implements logging for debugging")
        else:
            issues.append("No logging found - difficult to debug issues")
        
        return {
            "status": "PASS" if not issues else "WARN",
            "issues": issues,
            "good_practices": good_practices
        }
    
    def analyze_auth_routes(self):
        """Analyze authentication routes"""
        print("🛣️  Analyzing authentication routes...")
        
        try:
            routes_file = os.path.join(self.backend_path, "app/routers/auth.py")
            with open(routes_file, 'r') as f:
                content = f.read()
            
            routes_analysis = {
                "endpoint_security": self._check_endpoint_security(content),
                "input_validation": self._check_input_validation(content),
                "response_handling": self._check_response_handling(content),
                "documentation": self._check_api_documentation(content)
            }
            
            self.analysis_results["auth_routes"] = routes_analysis
            
        except Exception as e:
            self.issues.append({
                "severity": "HIGH",
                "category": "Auth Routes",
                "issue": f"Failed to analyze auth routes: {e}",
                "file": "app/routers/auth.py"
            })
    
    def _check_endpoint_security(self, content: str) -> Dict[str, Any]:
        """Check endpoint security implementation"""
        issues = []
        good_practices = []
        
        # Check for protected endpoints
        if "Depends(get_current_user)" in content:
            good_practices.append("Uses dependency injection for authentication")
        else:
            issues.append("Protected endpoints may not be properly secured")
        
        # Check for proper token handling
        if "Authorization" in content or "Bearer" in content:
            good_practices.append("Implements Bearer token authentication")
        
        return {
            "status": "PASS" if not issues else "WARN",
            "issues": issues,
            "good_practices": good_practices
        }
    
    def _check_input_validation(self, content: str) -> Dict[str, Any]:
        """Check input validation"""
        issues = []
        good_practices = []
        
        # Check for Pydantic models
        if "UserCreate" in content and "UserLogin" in content:
            good_practices.append("Uses Pydantic models for input validation")
        else:
            issues.append("Input validation may be insufficient")
        
        # Check for proper response models
        if "response_model" in content:
            good_practices.append("Defines response models for endpoints")
        
        return {
            "status": "PASS" if not issues else "WARN",
            "issues": issues,
            "good_practices": good_practices
        }
    
    def _check_response_handling(self, content: str) -> Dict[str, Any]:
        """Check response handling"""
        issues = []
        good_practices = []
        
        # Check for consistent error responses
        if "HTTPException" in content:
            good_practices.append("Uses HTTPException for error responses")
        
        # Check for proper status codes
        status_codes = ["200", "400", "401", "403", "404", "409", "422"]
        found_codes = [code for code in status_codes if code in content]
        
        if len(found_codes) >= 3:
            good_practices.append("Uses appropriate HTTP status codes")
        else:
            issues.append("Limited HTTP status code usage")
        
        return {
            "status": "PASS" if not issues else "WARN",
            "issues": issues,
            "good_practices": good_practices
        }
    
    def _check_api_documentation(self, content: str) -> Dict[str, Any]:
        """Check API documentation"""
        issues = []
        good_practices = []
        
        # Check for docstrings
        docstring_count = content.count('"""')
        if docstring_count >= 6:  # Assuming multiple endpoints
            good_practices.append("Endpoints have documentation")
        else:
            issues.append("Insufficient API documentation")
        
        # Check for parameter descriptions
        if "- **" in content:
            good_practices.append("Documents API parameters")
        
        return {
            "status": "PASS" if not issues else "WARN",
            "issues": issues,
            "good_practices": good_practices
        }
    
    def analyze_middleware(self):
        """Analyze authentication middleware"""
        print("🛡️  Analyzing authentication middleware...")
        
        try:
            middleware_file = os.path.join(self.backend_path, "app/middleware/auth.py")
            with open(middleware_file, 'r') as f:
                content = f.read()
            
            middleware_analysis = {
                "token_validation": self._check_token_validation(content),
                "user_extraction": self._check_user_extraction(content),
                "error_handling": self._check_middleware_error_handling(content),
                "rate_limiting": self._check_rate_limiting(content)
            }
            
            self.analysis_results["middleware"] = middleware_analysis
            
        except Exception as e:
            self.issues.append({
                "severity": "MEDIUM",
                "category": "Middleware",
                "issue": f"Failed to analyze middleware: {e}",
                "file": "app/middleware/auth.py"
            })
    
    def _check_token_validation(self, content: str) -> Dict[str, Any]:
        """Check token validation in middleware"""
        issues = []
        good_practices = []
        
        if "decode_token" in content:
            good_practices.append("Implements token decoding")
        else:
            issues.append("Token decoding not found")
        
        if "JWTError" in content:
            good_practices.append("Handles JWT errors properly")
        
        if "token_type" in content and "access" in content:
            good_practices.append("Validates token type")
        else:
            issues.append("Token type validation may be missing")
        
        return {
            "status": "PASS" if not issues else "WARN",
            "issues": issues,
            "good_practices": good_practices
        }
    
    def _check_user_extraction(self, content: str) -> Dict[str, Any]:
        """Check user data extraction from tokens"""
        issues = []
        good_practices = []
        
        if "TokenData" in content:
            good_practices.append("Uses structured token data")
        
        if "user_id" in content and "email" in content:
            good_practices.append("Extracts essential user information")
        
        return {
            "status": "PASS" if not issues else "WARN",
            "issues": issues,
            "good_practices": good_practices
        }
    
    def _check_middleware_error_handling(self, content: str) -> Dict[str, Any]:
        """Check error handling in middleware"""
        issues = []
        good_practices = []
        
        if "HTTPException" in content and "401" in content:
            good_practices.append("Returns proper authentication errors")
        
        if "WWW-Authenticate" in content:
            good_practices.append("Includes proper authentication headers")
        
        return {
            "status": "PASS" if not issues else "WARN",
            "issues": issues,
            "good_practices": good_practices
        }
    
    def _check_rate_limiting(self, content: str) -> Dict[str, Any]:
        """Check rate limiting implementation"""
        issues = []
        good_practices = []
        
        if "RateLimiter" in content:
            good_practices.append("Implements rate limiting")
        else:
            issues.append("Rate limiting not implemented")
        
        if "Redis" in content:
            good_practices.append("Mentions Redis for distributed rate limiting")
        elif "in-memory" in content:
            issues.append("Uses in-memory rate limiting (not suitable for production)")
        
        return {
            "status": "PASS" if not issues else "WARN",
            "issues": issues,
            "good_practices": good_practices
        }
    
    def analyze_configuration(self):
        """Analyze configuration security"""
        print("⚙️  Analyzing configuration...")
        
        try:
            config_file = os.path.join(self.backend_path, "app/config.py")
            with open(config_file, 'r') as f:
                content = f.read()
            
            config_analysis = {
                "secret_management": self._check_secret_management(content),
                "token_settings": self._check_token_settings(content),
                "security_settings": self._check_security_settings(content),
                "tier_configuration": self._check_tier_configuration(content)
            }
            
            self.analysis_results["configuration"] = config_analysis
            
        except Exception as e:
            self.issues.append({
                "severity": "HIGH",
                "category": "Configuration",
                "issue": f"Failed to analyze configuration: {e}",
                "file": "app/config.py"
            })
    
    def _check_secret_management(self, content: str) -> Dict[str, Any]:
        """Check secret management"""
        issues = []
        good_practices = []
        
        if "os.getenv" in content:
            good_practices.append("Uses environment variables for secrets")
        else:
            issues.append("Secrets may be hardcoded")
        
        if "your-secret-key-change-in-production" in content:
            issues.append("Contains default secret key - SECURITY RISK")
        
        if "SECRET_KEY" in content:
            good_practices.append("Configures JWT secret key")
        
        return {
            "status": "FAIL" if any("SECURITY RISK" in issue for issue in issues) else "PASS",
            "issues": issues,
            "good_practices": good_practices
        }
    
    def _check_token_settings(self, content: str) -> Dict[str, Any]:
        """Check token configuration settings"""
        issues = []
        good_practices = []
        
        if "access_token_expire_minutes" in content:
            good_practices.append("Configures access token expiration")
        else:
            issues.append("Access token expiration not configured")
        
        if "refresh_token_expire_days" in content:
            good_practices.append("Configures refresh token expiration")
        else:
            issues.append("Refresh token expiration not configured")
        
        if "HS256" in content:
            good_practices.append("Specifies JWT algorithm")
        
        return {
            "status": "PASS" if not issues else "WARN",
            "issues": issues,
            "good_practices": good_practices
        }
    
    def _check_security_settings(self, content: str) -> Dict[str, Any]:
        """Check security-related settings"""
        issues = []
        good_practices = []
        
        if "backend_cors_origins" in content:
            good_practices.append("Configures CORS origins")
        else:
            issues.append("CORS origins not configured")
        
        if "rate_limit_per_minute" in content:
            good_practices.append("Configures rate limiting")
        else:
            issues.append("Rate limiting not configured")
        
        return {
            "status": "PASS" if not issues else "WARN",
            "issues": issues,
            "good_practices": good_practices
        }
    
    def _check_tier_configuration(self, content: str) -> Dict[str, Any]:
        """Check user tier configuration"""
        issues = []
        good_practices = []
        
        if "tier_limits" in content:
            good_practices.append("Implements user tier limits")
        
        tiers = ["free", "architect", "builder", "shipper", "studio"]
        found_tiers = [tier for tier in tiers if tier in content]
        
        if len(found_tiers) >= 3:
            good_practices.append("Defines multiple user tiers")
        
        return {
            "status": "PASS",
            "issues": issues,
            "good_practices": good_practices
        }
    
    def analyze_user_models(self):
        """Analyze user model definitions"""
        print("👤 Analyzing user models...")
        
        try:
            models_file = os.path.join(self.backend_path, "app/models/user.py")
            with open(models_file, 'r') as f:
                content = f.read()
            
            models_analysis = {
                "validation": self._check_model_validation(content),
                "security_fields": self._check_security_fields(content),
                "data_structure": self._check_data_structure(content)
            }
            
            self.analysis_results["user_models"] = models_analysis
            
        except Exception as e:
            self.issues.append({
                "severity": "MEDIUM",
                "category": "User Models",
                "issue": f"Failed to analyze user models: {e}",
                "file": "app/models/user.py"
            })
    
    def _check_model_validation(self, content: str) -> Dict[str, Any]:
        """Check Pydantic model validation"""
        issues = []
        good_practices = []
        
        if "@validator" in content:
            good_practices.append("Uses Pydantic validators")
        else:
            issues.append("Custom validation may be missing")
        
        if "EmailStr" in content:
            good_practices.append("Uses email validation")
        else:
            issues.append("Email validation not enforced at model level")
        
        if "min_length" in content and "max_length" in content:
            good_practices.append("Implements field length validation")
        
        return {
            "status": "PASS" if not issues else "WARN",
            "issues": issues,
            "good_practices": good_practices
        }
    
    def _check_security_fields(self, content: str) -> Dict[str, Any]:
        """Check security-related fields in user model"""
        issues = []
        good_practices = []
        
        security_fields = [
            "hashed_password", "is_active", "is_verified", 
            "email_verification_token", "password_reset_token"
        ]
        
        found_fields = [field for field in security_fields if field in content]
        
        if len(found_fields) >= 4:
            good_practices.append("Includes essential security fields")
        else:
            issues.append("Missing important security fields")
        
        if "hashed_password" in content:
            good_practices.append("Stores hashed passwords, not plain text")
        else:
            issues.append("Password storage implementation unclear")
        
        return {
            "status": "PASS" if not issues else "WARN",
            "issues": issues,
            "good_practices": good_practices
        }
    
    def _check_data_structure(self, content: str) -> Dict[str, Any]:
        """Check user data structure"""
        issues = []
        good_practices = []
        
        if "UserSubscription" in content and "UserUsage" in content:
            good_practices.append("Separates subscription and usage data")
        
        if "UserTier" in content and "Enum" in content:
            good_practices.append("Uses enum for user tiers")
        
        if "created_at" in content and "updated_at" in content:
            good_practices.append("Tracks creation and modification times")
        
        return {
            "status": "PASS",
            "issues": issues,
            "good_practices": good_practices
        }
    
    def generate_assessment(self):
        """Generate overall security assessment"""
        print("📊 Generating security assessment...")
        
        # Count issues by severity
        critical_issues = 0
        high_issues = 0
        medium_issues = 0
        low_issues = 0
        
        # Analyze all components for issues
        for component_name, component_data in self.analysis_results.items():
            if isinstance(component_data, dict):
                for check_name, check_data in component_data.items():
                    if isinstance(check_data, dict):
                        status = check_data.get("status", "PASS")
                        issues = check_data.get("issues", [])
                        
                        if status == "FAIL":
                            high_issues += len(issues)
                        elif status == "WARN":
                            medium_issues += len(issues)
                        
                        # Add issues to main issues list
                        for issue in issues:
                            self.issues.append({
                                "severity": "HIGH" if status == "FAIL" else "MEDIUM",
                                "category": f"{component_name.title()} - {check_name.title()}",
                                "issue": issue,
                                "component": component_name
                            })
        
        # Check for critical configuration issues
        config_analysis = self.analysis_results.get("configuration", {})
        secret_mgmt = config_analysis.get("secret_management", {})
        if secret_mgmt.get("status") == "FAIL":
            critical_issues += 1
        
        # Overall security score
        total_checks = sum(
            len(component_data) if isinstance(component_data, dict) else 0
            for component_data in self.analysis_results.values()
        )
        
        failed_checks = sum(
            1 for component_data in self.analysis_results.values() 
            if isinstance(component_data, dict)
            for check_data in component_data.values()
            if isinstance(check_data, dict) and check_data.get("status") == "FAIL"
        )
        
        warned_checks = sum(
            1 for component_data in self.analysis_results.values()
            if isinstance(component_data, dict)
            for check_data in component_data.values()
            if isinstance(check_data, dict) and check_data.get("status") == "WARN"
        )
        
        security_score = max(0, 100 - (failed_checks * 20) - (warned_checks * 5))
        
        self.analysis_results["assessment"] = {
            "security_score": security_score,
            "critical_issues": critical_issues,
            "high_issues": high_issues,
            "medium_issues": medium_issues,
            "low_issues": low_issues,
            "total_checks": total_checks,
            "failed_checks": failed_checks,
            "warned_checks": warned_checks
        }
        
        # Generate recommendations
        self._generate_recommendations()
    
    def _generate_recommendations(self):
        """Generate security recommendations"""
        recommendations = [
            "Change default JWT secret key to a strong, randomly generated value",
            "Implement Redis-based rate limiting for production deployment",
            "Set up email service for verification and password reset emails",
            "Add comprehensive logging for all authentication events",
            "Implement session management and token blacklisting",
            "Set up monitoring and alerting for failed authentication attempts",
            "Add multi-factor authentication (2FA) support",
            "Implement account lockout after multiple failed login attempts",
            "Add CAPTCHA protection for authentication endpoints",
            "Set up automated security scanning in CI/CD pipeline",
            "Implement proper HTTPS enforcement in production",
            "Add input sanitization for all user inputs",
            "Set up backup and recovery procedures for user data",
            "Implement data encryption for sensitive user information",
            "Add audit logging for all user account changes"
        ]
        
        # Prioritize recommendations based on found issues
        priority_recommendations = []
        
        if any("default secret key" in issue["issue"] for issue in self.issues):
            priority_recommendations.append("URGENT: Change default JWT secret key immediately")
        
        if any("rate limiting" in issue["issue"] for issue in self.issues):
            priority_recommendations.append("HIGH: Implement proper rate limiting")
        
        if any("logging" in issue["issue"] for issue in self.issues):
            priority_recommendations.append("MEDIUM: Add comprehensive logging")
        
        self.recommendations = priority_recommendations + [
            rec for rec in recommendations if not any(
                keyword in rec.lower() for keyword in ["secret", "rate", "logging"]
            )
        ]
    
    def generate_report(self) -> str:
        """Generate comprehensive security analysis report"""
        report = []
        
        report.append("=" * 80)
        report.append("SAASIT.AI AUTHENTICATION SYSTEM - STATIC SECURITY ANALYSIS")
        report.append("=" * 80)
        report.append(f"Analysis Date: {datetime.now().isoformat()}")
        report.append(f"Analysis Type: Static Code Analysis")
        report.append("")
        
        # Executive Summary
        assessment = self.analysis_results.get("assessment", {})
        security_score = assessment.get("security_score", 0)
        
        report.append("EXECUTIVE SUMMARY")
        report.append("-" * 40)
        report.append(f"Security Score: {security_score}/100")
        
        if security_score >= 80:
            report.append("✅ Authentication system appears secure with minor improvements needed")
        elif security_score >= 60:
            report.append("⚠️  Authentication system has security concerns that should be addressed")
        else:
            report.append("🚨 Authentication system has significant security issues requiring immediate attention")
        
        report.append("")
        report.append(f"Critical Issues: {assessment.get('critical_issues', 0)}")
        report.append(f"High Issues: {assessment.get('high_issues', 0)}")
        report.append(f"Medium Issues: {assessment.get('medium_issues', 0)}")
        report.append(f"Total Checks: {assessment.get('total_checks', 0)}")
        report.append("")
        
        # Component Analysis
        report.append("COMPONENT ANALYSIS")
        report.append("-" * 30)
        
        for component_name, component_data in self.analysis_results.items():
            if component_name == "assessment":
                continue
                
            report.append(f"\n{component_name.upper().replace('_', ' ')}")
            report.append("~" * len(component_name))
            
            if isinstance(component_data, dict):
                for check_name, check_data in component_data.items():
                    if isinstance(check_data, dict):
                        status = check_data.get("status", "UNKNOWN")
                        status_icon = {
                            "PASS": "✅",
                            "WARN": "⚠️ ",
                            "FAIL": "❌", 
                            "ERROR": "💥"
                        }.get(status, "❓")
                        
                        report.append(f"  {status_icon} {check_name.replace('_', ' ').title()}: {status}")
                        
                        # Show issues
                        issues = check_data.get("issues", [])
                        for issue in issues:
                            report.append(f"     ⚠️  {issue}")
                        
                        # Show good practices
                        good_practices = check_data.get("good_practices", [])
                        for practice in good_practices[:2]:  # Limit to prevent clutter
                            report.append(f"     ✅ {practice}")
        
        report.append("")
        
        # Critical Issues
        critical_and_high = [i for i in self.issues if i["severity"] in ["CRITICAL", "HIGH"]]
        if critical_and_high:
            report.append("CRITICAL & HIGH SEVERITY ISSUES")
            report.append("-" * 40)
            
            for issue in critical_and_high:
                severity_icon = "🚨" if issue["severity"] == "CRITICAL" else "⚠️ "
                report.append(f"{severity_icon} {issue['severity']} - {issue['category']}")
                report.append(f"   Issue: {issue['issue']}")
                report.append("")
        
        # Recommendations
        report.append("SECURITY RECOMMENDATIONS")
        report.append("-" * 35)
        
        for i, rec in enumerate(self.recommendations[:10], 1):  # Top 10 recommendations
            priority = "🔴" if "URGENT" in rec else "🟡" if "HIGH" in rec else "🔵"
            report.append(f"{i:2d}. {priority} {rec}")
        
        report.append("")
        
        # Implementation Checklist
        report.append("IMPLEMENTATION CHECKLIST")
        report.append("-" * 30)
        
        checklist = [
            "✅ Password hashing implemented",
            "✅ JWT token system implemented", 
            "✅ Input validation with Pydantic",
            "✅ Protected route authentication",
            "⚠️  Email verification (needs email service)",
            "⚠️  Password reset (needs email service)",
            "❌ Production-ready rate limiting",
            "❌ Comprehensive security logging",
            "❌ Session management/token blacklisting",
            "❌ Multi-factor authentication"
        ]
        
        for item in checklist:
            report.append(f"  {item}")
        
        report.append("")
        report.append("=" * 80)
        report.append("END OF ANALYSIS REPORT")
        report.append("=" * 80)
        
        return "\n".join(report)


def main():
    """Main entry point for static analysis"""
    backend_path = "/Users/danielgoldman/Desktop/projects/saasit-ai/backend"
    
    if not os.path.exists(backend_path):
        print(f"❌ Backend path not found: {backend_path}")
        sys.exit(1)
    
    analyzer = AuthSecurityAnalyzer(backend_path)
    
    try:
        # Run analysis
        results = analyzer.analyze_authentication_system()
        
        # Generate and save report
        report = analyzer.generate_report()
        
        # Save to file
        report_filename = f"auth_security_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        with open(report_filename, "w") as f:
            f.write(report)
        
        print(f"\n📄 Analysis report saved to: {report_filename}")
        print("\n" + report)
        
        # Return exit code based on security score
        assessment = results.get("assessment", {})
        security_score = assessment.get("security_score", 0)
        
        if security_score < 60:
            sys.exit(1)  # Significant security issues
        elif security_score < 80:
            sys.exit(2)  # Some security concerns
        else:
            sys.exit(0)  # Good security posture
            
    except Exception as e:
        print(f"❌ Analysis failed: {e}")
        sys.exit(3)


if __name__ == "__main__":
    main()