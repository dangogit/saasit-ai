#!/usr/bin/env python3
"""
Test runner script for SaasIt.ai backend
Executes all tests with proper configuration and reporting
"""
import sys
import subprocess
import os
from pathlib import Path

# Set test environment variables
os.environ["TESTING"] = "true"
os.environ["MONGO_URL"] = os.getenv("TEST_MONGO_URL", "mongodb://localhost:27017")
os.environ["DB_NAME"] = "saasit_test"
os.environ["SECRET_KEY"] = "test-secret-key-for-testing-only"
os.environ["ANTHROPIC_API_KEY"] = "test-api-key"


def run_tests(test_type=None, verbose=False):
    """Run tests with pytest"""
    # Base pytest command
    cmd = ["pytest"]
    
    # Add coverage if available
    try:
        import pytest_cov
        cmd.extend(["--cov=app", "--cov-report=html", "--cov-report=term"])
    except ImportError:
        print("Note: Install pytest-cov for coverage reports")
    
    # Add verbose flag
    if verbose:
        cmd.append("-v")
    else:
        cmd.append("-q")
    
    # Add test markers and paths based on type
    if test_type == "unit":
        cmd.extend(["-m", "not integration", "tests/unit/"])
    elif test_type == "integration":
        cmd.extend(["-m", "not unit", "tests/integration/"])
    elif test_type == "security":
        cmd.append("tests/security/")
    elif test_type == "performance":
        cmd.append("tests/performance/")
    elif test_type == "all":
        cmd.append("tests/")
    else:
        # Run specific test file or directory if provided
        if test_type:
            cmd.append(test_type)
        else:
            cmd.append("tests/")
    
    # Add other useful options
    cmd.extend([
        "--tb=short",  # Shorter traceback format
        "--strict-markers",  # Ensure all markers are registered
        "-W", "ignore::DeprecationWarning",  # Ignore deprecation warnings
    ])
    
    # Print command being run
    print(f"Running: {' '.join(cmd)}")
    print("-" * 80)
    
    # Run tests
    result = subprocess.run(cmd, cwd=Path(__file__).parent)
    
    return result.returncode


def main():
    """Main test runner"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Run SaasIt.ai backend tests")
    parser.add_argument(
        "type",
        nargs="?",
        default="all",
        choices=["all", "unit", "integration", "security", "performance"],
        help="Type of tests to run (default: all)"
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Verbose output"
    )
    parser.add_argument(
        "--specific",
        help="Run specific test file or directory"
    )
    parser.add_argument(
        "--failfast",
        action="store_true",
        help="Stop on first failure"
    )
    
    args = parser.parse_args()
    
    # Check MongoDB connection
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        import asyncio
        
        async def check_mongo():
            client = AsyncIOMotorClient(os.environ["MONGO_URL"])
            await client.server_info()
            client.close()
        
        asyncio.run(check_mongo())
        print("✓ MongoDB connection successful")
    except Exception as e:
        print(f"✗ MongoDB connection failed: {e}")
        print("Make sure MongoDB is running on localhost:27017")
        return 1
    
    # Install test dependencies if needed
    test_deps = ["pytest", "pytest-asyncio", "pytest-mock", "httpx"]
    missing_deps = []
    
    for dep in test_deps:
        try:
            __import__(dep.replace("-", "_"))
        except ImportError:
            missing_deps.append(dep)
    
    if missing_deps:
        print(f"Installing missing test dependencies: {', '.join(missing_deps)}")
        subprocess.run([sys.executable, "-m", "pip", "install"] + missing_deps)
    
    # Run tests
    test_target = args.specific if args.specific else args.type
    exit_code = run_tests(test_target, args.verbose)
    
    # Print summary
    print("\n" + "=" * 80)
    if exit_code == 0:
        print("✅ All tests passed!")
    else:
        print("❌ Some tests failed!")
    
    # Print coverage report location if generated
    if os.path.exists("htmlcov/index.html"):
        print(f"\n📊 Coverage report: file://{os.path.abspath('htmlcov/index.html')}")
    
    return exit_code


if __name__ == "__main__":
    sys.exit(main())