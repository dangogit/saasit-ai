#!/usr/bin/env python3
"""
SaasIt.ai Test Runner
Alternative Python-based test orchestrator with advanced features
"""

import os
import sys
import subprocess
import time
import json
import argparse
import threading
import signal
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import concurrent.futures

# Color codes for terminal output
class Colors:
    PURPLE = '\033[0;35m'
    BLUE = '\033[0;34m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    RED = '\033[0;31m'
    CYAN = '\033[0;36m'
    NC = '\033[0m'  # No Color

class TestRunner:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.frontend_dir = self.project_root / "frontend"
        self.backend_dir = self.project_root / "backend"
        self.reports_dir = self.project_root / "test-reports"
        self.reports_dir.mkdir(exist_ok=True)
        
        # Test results
        self.results = {
            'backend': {'success': False, 'duration': 0, 'output': ''},
            'frontend': {'success': False, 'duration': 0, 'output': ''},
            'start_time': datetime.now(),
            'end_time': None
        }
        
        # Process tracking
        self.processes = []
        self.cleanup_handlers = []

    def print_header(self, text: str):
        print(f"\n{Colors.PURPLE}{'='*70}{Colors.NC}")
        print(f"{Colors.PURPLE}{text}{Colors.NC}")
        print(f"{Colors.PURPLE}{'='*70}{Colors.NC}\n")

    def print_step(self, text: str):
        print(f"{Colors.BLUE}🔧 {text}{Colors.NC}")

    def print_success(self, text: str):
        print(f"{Colors.GREEN}✅ {text}{Colors.NC}")

    def print_error(self, text: str):
        print(f"{Colors.RED}❌ {text}{Colors.NC}")

    def print_warning(self, text: str):
        print(f"{Colors.YELLOW}⚠️  {text}{Colors.NC}")

    def print_info(self, text: str):
        print(f"{Colors.CYAN}ℹ️  {text}{Colors.NC}")

    def run_command(self, cmd: List[str], cwd: Path, env: Optional[Dict] = None) -> Tuple[bool, str]:
        """Run a command and return (success, output)"""
        try:
            full_env = os.environ.copy()
            if env:
                full_env.update(env)
            
            process = subprocess.Popen(
                cmd,
                cwd=cwd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                env=full_env
            )
            
            self.processes.append(process)
            output, _ = process.communicate()
            
            return process.returncode == 0, output
        except Exception as e:
            return False, str(e)

    def check_prerequisites(self) -> bool:
        """Check if all required tools are available"""
        self.print_step("Checking prerequisites...")
        
        required_tools = [
            ("docker", "Docker"),
            ("docker-compose", "Docker Compose"),
            ("node", "Node.js"),
            ("npm", "npm"),
            ("python3", "Python 3"),
            ("pip3", "pip3")
        ]
        
        missing_tools = []
        for cmd, name in required_tools:
            if not self.check_command_exists(cmd):
                missing_tools.append(name)
        
        if missing_tools:
            self.print_error(f"Missing required tools: {', '.join(missing_tools)}")
            return False
        
        # Check Docker daemon
        success, _ = self.run_command(["docker", "info"], self.project_root)
        if not success:
            self.print_error("Docker daemon is not running")
            return False
        
        self.print_success("All prerequisites satisfied")
        return True

    def check_command_exists(self, cmd: str) -> bool:
        """Check if a command exists in PATH"""
        try:
            subprocess.run([cmd, "--version"], 
                         stdout=subprocess.DEVNULL, 
                         stderr=subprocess.DEVNULL, 
                         check=True)
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            return False

    def setup_environment(self) -> bool:
        """Set up test environment"""
        self.print_step("Setting up test environment...")
        
        # Create .env.test file
        env_content = """# Test Environment Configuration
MONGO_URL=mongodb://localhost:27017
DB_NAME=saasit_test
JWT_SECRET=test_jwt_secret_key_for_testing_purposes_only
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=30
CORS_ORIGINS=["http://localhost:3000"]

# Test API keys (mock values)
ANTHROPIC_API_KEY=test_anthropic_key
CLERK_SECRET_KEY=test_clerk_secret_key
CLERK_PUBLISHABLE_KEY=pk_test_example

# Frontend test environment
REACT_APP_API_URL=http://localhost:8000
REACT_APP_CLERK_PUBLISHABLE_KEY=pk_test_example

# Test mode flags
TESTING=true
E2E_TEST_MODE=true
NODE_ENV=test
"""
        
        env_file = self.project_root / ".env.test"
        env_file.write_text(env_content)
        
        self.print_success("Test environment configured")
        return True

    def start_docker_services(self) -> bool:
        """Start Docker services for testing"""
        self.print_step("Starting Docker test services...")
        
        # Stop any existing containers
        self.run_command(
            ["docker-compose", "-f", "docker-compose.test.yml", "down", "--volumes"],
            self.project_root
        )
        
        # Start MongoDB
        success, output = self.run_command(
            ["docker-compose", "-f", "docker-compose.test.yml", "up", "-d", "mongodb"],
            self.project_root
        )
        
        if not success:
            self.print_error(f"Failed to start MongoDB: {output}")
            return False
        
        # Wait for MongoDB to be ready
        self.print_step("Waiting for MongoDB to be ready...")
        for i in range(30):
            success, _ = self.run_command(
                ["docker-compose", "-f", "docker-compose.test.yml", "exec", "-T", "mongodb", 
                 "mongosh", "--eval", "db.admin.ping()", "--quiet"],
                self.project_root
            )
            
            if success:
                self.print_success("MongoDB is ready")
                break
            
            if i == 29:
                self.print_error("MongoDB failed to start within 30 seconds")
                return False
            
            time.sleep(1)
            print(".", end="", flush=True)
        
        print()  # New line after dots
        return True

    def install_dependencies(self) -> bool:
        """Install all dependencies"""
        self.print_step("Installing dependencies...")
        
        # Frontend dependencies
        self.print_step("Installing frontend dependencies...")
        success, output = self.run_command(["npm", "ci"], self.frontend_dir)
        if not success:
            self.print_error(f"Failed to install frontend dependencies: {output}")
            return False
        
        # Install Playwright browsers
        success, output = self.run_command(
            ["npx", "playwright", "install", "--with-deps"], 
            self.frontend_dir
        )
        if not success:
            self.print_warning(f"Failed to install Playwright browsers: {output}")
        
        # Backend dependencies
        self.print_step("Installing backend dependencies...")
        venv_dir = self.backend_dir / "venv"
        
        # Create virtual environment if it doesn't exist
        if not venv_dir.exists():
            success, output = self.run_command(
                ["python3", "-m", "venv", "venv"], 
                self.backend_dir
            )
            if not success:
                self.print_error(f"Failed to create virtual environment: {output}")
                return False
        
        # Install requirements
        pip_cmd = str(venv_dir / "bin" / "pip")
        success, output = self.run_command(
            [pip_cmd, "install", "-r", "requirements.txt"], 
            self.backend_dir
        )
        if not success:
            self.print_error(f"Failed to install backend dependencies: {output}")
            return False
        
        # Install test dependencies
        success, output = self.run_command(
            [pip_cmd, "install", "pytest", "pytest-asyncio", "pytest-cov", "httpx", "pytest-xdist"],
            self.backend_dir
        )
        if not success:
            self.print_warning(f"Failed to install test dependencies: {output}")
        
        self.print_success("All dependencies installed")
        return True

    def run_backend_tests(self) -> Dict:
        """Run backend API tests"""
        self.print_header("Running Backend API Tests")
        
        start_time = time.time()
        
        # Set up environment
        test_env = {
            "MONGO_URL": "mongodb://localhost:27017",
            "DB_NAME": "saasit_test",
            "TESTING": "true"
        }
        
        # Read .env.test file
        env_file = self.project_root / ".env.test"
        if env_file.exists():
            for line in env_file.read_text().splitlines():
                if "=" in line and not line.startswith("#"):
                    key, value = line.split("=", 1)
                    test_env[key.strip()] = value.strip()
        
        # Run pytest
        venv_python = self.backend_dir / "venv" / "bin" / "python"
        pytest_cmd = [
            str(venv_python), "-m", "pytest",
            "tests/e2e/",
            "-v",
            "--tb=short",
            "--cov=app",
            f"--cov-report=html:{self.reports_dir}/backend-coverage",
            f"--cov-report=xml:{self.reports_dir}/backend-coverage.xml",
            "--cov-report=term-missing",
            f"--junit-xml={self.reports_dir}/backend-results.xml"
        ]
        
        success, output = self.run_command(pytest_cmd, self.backend_dir, test_env)
        
        duration = time.time() - start_time
        
        if success:
            self.print_success(f"Backend tests passed ({duration:.1f}s)")
        else:
            self.print_error(f"Backend tests failed ({duration:.1f}s)")
        
        return {
            'success': success,
            'duration': duration,
            'output': output
        }

    def run_frontend_tests(self) -> Dict:
        """Run frontend E2E tests"""
        self.print_header("Running Frontend E2E Tests")
        
        start_time = time.time()
        
        # Set up environment
        test_env = {
            "REACT_APP_API_URL": "http://localhost:8000",
            "REACT_APP_CLERK_PUBLISHABLE_KEY": "pk_test_example",
            "NODE_ENV": "test",
            "E2E_TEST_MODE": "true",
            "CI": "true"
        }
        
        # Configure Playwright
        config_file = "playwright.ci.config.ts"
        
        # Set report directories
        test_env.update({
            "PLAYWRIGHT_HTML_REPORT": str(self.reports_dir / "frontend-report"),
            "PLAYWRIGHT_JSON_OUTPUT_FILE": str(self.reports_dir / "frontend-results.json"),
            "PLAYWRIGHT_JUNIT_OUTPUT_FILE": str(self.reports_dir / "frontend-results.xml")
        })
        
        # Run Playwright tests
        playwright_cmd = [
            "npx", "playwright", "test",
            f"--config={config_file}",
            "--reporter=html,json,junit"
        ]
        
        success, output = self.run_command(playwright_cmd, self.frontend_dir, test_env)
        
        duration = time.time() - start_time
        
        if success:
            self.print_success(f"Frontend E2E tests passed ({duration:.1f}s)")
        else:
            self.print_error(f"Frontend E2E tests failed ({duration:.1f}s)")
        
        # Copy artifacts
        self.copy_test_artifacts()
        
        return {
            'success': success,
            'duration': duration,
            'output': output
        }

    def copy_test_artifacts(self):
        """Copy test artifacts to reports directory"""
        try:
            # Copy Playwright reports
            playwright_report = self.frontend_dir / "playwright-report"
            if playwright_report.exists():
                import shutil
                target_dir = self.reports_dir / "frontend-report"
                if target_dir.exists():
                    shutil.rmtree(target_dir)
                shutil.copytree(playwright_report, target_dir)
            
            # Copy test results
            test_results = self.frontend_dir / "test-results"
            if test_results.exists():
                import shutil
                target_dir = self.reports_dir / "frontend-artifacts"
                if target_dir.exists():
                    shutil.rmtree(target_dir)
                shutil.copytree(test_results, target_dir)
        except Exception as e:
            self.print_warning(f"Failed to copy test artifacts: {e}")

    def run_tests_parallel(self) -> Tuple[Dict, Dict]:
        """Run backend and frontend tests in parallel"""
        self.print_info("Running backend and frontend tests in parallel...")
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            # Submit both test suites
            backend_future = executor.submit(self.run_backend_tests)
            frontend_future = executor.submit(self.run_frontend_tests)
            
            # Wait for both to complete
            backend_result = backend_future.result()
            frontend_result = frontend_future.result()
        
        return backend_result, frontend_result

    def generate_report(self, backend_result: Dict, frontend_result: Dict):
        """Generate comprehensive test report"""
        self.print_step("Generating test report...")
        
        self.results['backend'] = backend_result
        self.results['frontend'] = frontend_result
        self.results['end_time'] = datetime.now()
        
        # Generate JSON report
        json_report = self.reports_dir / "test-results.json"
        with open(json_report, 'w') as f:
            json.dump({
                **self.results,
                'start_time': self.results['start_time'].isoformat(),
                'end_time': self.results['end_time'].isoformat()
            }, f, indent=2)
        
        # Generate HTML report
        html_report = self.generate_html_report(backend_result, frontend_result)
        
        # Print summary
        self.print_summary(backend_result, frontend_result)
        
        return html_report

    def generate_html_report(self, backend_result: Dict, frontend_result: Dict) -> Path:
        """Generate HTML summary report"""
        total_duration = (self.results['end_time'] - self.results['start_time']).total_seconds()
        
        html_content = f"""<!DOCTYPE html>
<html>
<head>
    <title>SaasIt.ai Test Results</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }}
        .container {{ max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
        .header {{ background: #2563eb; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }}
        .section {{ margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }}
        .success {{ background: #dcfce7; border-color: #16a34a; }}
        .failure {{ background: #fef2f2; border-color: #dc2626; }}
        .info {{ background: #eff6ff; border-color: #3b82f6; }}
        .timestamp {{ color: #666; font-size: 0.9em; }}
        .duration {{ font-weight: bold; color: #059669; }}
        .stats {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }}
        .stat-card {{ background: #f8fafc; padding: 15px; border-radius: 6px; text-align: center; }}
        .stat-value {{ font-size: 1.5em; font-weight: bold; color: #1e40af; }}
        .links {{ margin: 15px 0; }}
        .links a {{ color: #2563eb; text-decoration: none; margin-right: 15px; }}
        .links a:hover {{ text-decoration: underline; }}
        .output {{ background: #1f2937; color: #f9fafb; padding: 15px; border-radius: 6px; font-family: monospace; font-size: 0.9em; max-height: 300px; overflow-y: auto; white-space: pre-wrap; }}
        .toggle {{ cursor: pointer; color: #2563eb; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 SaasIt.ai Test Results</h1>
            <p class="timestamp">Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            <p class="duration">Total Duration: {total_duration:.1f} seconds</p>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">{'✅' if backend_result['success'] else '❌'}</div>
                <div>Backend Tests</div>
                <div class="timestamp">{backend_result['duration']:.1f}s</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{'✅' if frontend_result['success'] else '❌'}</div>
                <div>Frontend Tests</div>
                <div class="timestamp">{frontend_result['duration']:.1f}s</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{'✅' if backend_result['success'] and frontend_result['success'] else '❌'}</div>
                <div>Overall</div>
                <div class="timestamp">{(backend_result['success'] and frontend_result['success'])}</div>
            </div>
        </div>"""
        
        # Backend section
        backend_class = "success" if backend_result['success'] else "failure"
        html_content += f"""
        <div class="section {backend_class}">
            <h2>{'✅' if backend_result['success'] else '❌'} Backend API Tests</h2>
            <p><strong>Duration:</strong> {backend_result['duration']:.1f} seconds</p>
            <div class="links">
                <a href="backend-coverage/index.html">Coverage Report</a>
                <a href="backend-coverage.xml">Coverage XML</a>
                <a href="backend-results.xml">Results XML</a>
            </div>
            <div class="toggle" onclick="toggleOutput('backend-output')">Toggle Output ▼</div>
            <div id="backend-output" class="output" style="display: none;">{backend_result['output']}</div>
        </div>"""
        
        # Frontend section
        frontend_class = "success" if frontend_result['success'] else "failure"
        html_content += f"""
        <div class="section {frontend_class}">
            <h2>{'✅' if frontend_result['success'] else '❌'} Frontend E2E Tests</h2>
            <p><strong>Duration:</strong> {frontend_result['duration']:.1f} seconds</p>
            <div class="links">
                <a href="frontend-report/index.html">Test Report</a>
                <a href="frontend-results.json">Results JSON</a>
                <a href="frontend-artifacts/">Test Artifacts</a>
            </div>
            <div class="toggle" onclick="toggleOutput('frontend-output')">Toggle Output ▼</div>
            <div id="frontend-output" class="output" style="display: none;">{frontend_result['output']}</div>
        </div>"""
        
        html_content += """
        <div class="section info">
            <h2>📋 Test Coverage</h2>
            <ul>
                <li><strong>User Onboarding:</strong> Complete flows for new and existing projects</li>
                <li><strong>Claude Code Detection:</strong> Success, failure, and timeout scenarios</li>
                <li><strong>Project Analysis:</strong> CLAUDE.md parsing and GitHub integration</li>
                <li><strong>Accessibility:</strong> WCAG compliance and keyboard navigation</li>
                <li><strong>API Endpoints:</strong> Authentication, validation, and error handling</li>
                <li><strong>Performance:</strong> Response times and concurrent user testing</li>
            </ul>
        </div>
        
        <div class="section">
            <h2>🔗 Additional Resources</h2>
            <ul>
                <li><a href="../docs/TESTING.md">Complete Testing Documentation</a></li>
                <li><a href="../frontend/e2e/README.md">E2E Testing Quick Start</a></li>
                <li><a href="test-results.json">Raw Test Results (JSON)</a></li>
            </ul>
        </div>
    </div>
    
    <script>
        function toggleOutput(id) {
            const element = document.getElementById(id);
            element.style.display = element.style.display === 'none' ? 'block' : 'none';
        }
    </script>
</body>
</html>"""
        
        html_file = self.reports_dir / "test-summary.html"
        html_file.write_text(html_content)
        
        return html_file

    def print_summary(self, backend_result: Dict, frontend_result: Dict):
        """Print test execution summary"""
        self.print_header("Test Execution Summary")
        
        total_duration = (self.results['end_time'] - self.results['start_time']).total_seconds()
        
        print(f"  🕒 Total Duration: {total_duration:.1f} seconds")
        print()
        
        # Backend results
        if backend_result['success']:
            self.print_success(f"Backend API Tests: PASSED ({backend_result['duration']:.1f}s)")
        else:
            self.print_error(f"Backend API Tests: FAILED ({backend_result['duration']:.1f}s)")
        
        # Frontend results
        if frontend_result['success']:
            self.print_success(f"Frontend E2E Tests: PASSED ({frontend_result['duration']:.1f}s)")
        else:
            self.print_error(f"Frontend E2E Tests: FAILED ({frontend_result['duration']:.1f}s)")
        
        print()
        self.print_info(f"Reports available in: {self.reports_dir}")
        self.print_info("View test-summary.html for detailed results")

    def cleanup(self):
        """Clean up resources"""
        self.print_step("Cleaning up...")
        
        # Stop all processes
        for process in self.processes:
            try:
                process.terminate()
                process.wait(timeout=5)
            except:
                try:
                    process.kill()
                except:
                    pass
        
        # Stop Docker containers
        self.run_command(
            ["docker-compose", "-f", "docker-compose.test.yml", "down", "--volumes"],
            self.project_root
        )
        
        # Run cleanup handlers
        for handler in self.cleanup_handlers:
            try:
                handler()
            except:
                pass

    def signal_handler(self, signum, frame):
        """Handle interrupt signals"""
        self.print_warning("Received interrupt signal, cleaning up...")
        self.cleanup()
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="SaasIt.ai Test Runner")
    parser.add_argument("--backend-only", action="store_true", help="Run only backend tests")
    parser.add_argument("--frontend-only", action="store_true", help="Run only frontend tests")
    parser.add_argument("--no-docker", action="store_true", help="Skip Docker setup")
    parser.add_argument("--parallel", action="store_true", default=True, help="Run tests in parallel")
    parser.add_argument("--reports-dir", help="Custom reports directory")
    
    args = parser.parse_args()
    
    runner = TestRunner()
    
    # Set custom reports directory if provided
    if args.reports_dir:
        runner.reports_dir = Path(args.reports_dir)
        runner.reports_dir.mkdir(exist_ok=True)
    
    # Set up signal handlers
    signal.signal(signal.SIGINT, runner.signal_handler)
    signal.signal(signal.SIGTERM, runner.signal_handler)
    
    try:
        # Banner
        runner.print_header("SaasIt.ai Python Test Runner")
        
        # Prerequisites
        if not runner.check_prerequisites():
            sys.exit(1)
        
        # Environment setup
        if not runner.setup_environment():
            sys.exit(1)
        
        # Docker setup
        if not args.no_docker:
            if not runner.start_docker_services():
                sys.exit(1)
        
        # Dependencies
        if not runner.install_dependencies():
            sys.exit(1)
        
        # Run tests
        if args.backend_only:
            backend_result = runner.run_backend_tests()
            frontend_result = {'success': True, 'duration': 0, 'output': 'Skipped'}
        elif args.frontend_only:
            backend_result = {'success': True, 'duration': 0, 'output': 'Skipped'}
            frontend_result = runner.run_frontend_tests()
        elif args.parallel:
            backend_result, frontend_result = runner.run_tests_parallel()
        else:
            backend_result = runner.run_backend_tests()
            frontend_result = runner.run_frontend_tests()
        
        # Generate reports
        html_report = runner.generate_report(backend_result, frontend_result)
        
        # Open report if possible
        if sys.platform == "darwin":  # macOS
            subprocess.run(["open", str(html_report)], check=False)
        elif sys.platform.startswith("linux"):  # Linux
            subprocess.run(["xdg-open", str(html_report)], check=False)
        
        # Exit with appropriate code
        overall_success = backend_result['success'] and frontend_result['success']
        if overall_success:
            runner.print_success("All tests completed successfully! 🎉")
            sys.exit(0)
        else:
            runner.print_error("Some tests failed. Check the reports for details.")
            sys.exit(1)
            
    except KeyboardInterrupt:
        runner.print_warning("Test execution interrupted by user")
        sys.exit(1)
    except Exception as e:
        runner.print_error(f"Test execution failed: {e}")
        sys.exit(1)
    finally:
        runner.cleanup()

if __name__ == "__main__":
    main()