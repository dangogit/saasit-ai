#!/bin/bash

# ======================================================================
# SaasIt.ai Complete Test Suite Runner
# ======================================================================
# Runs all tests with complete environment setup using Docker
# Usage: ./test-all.sh [options]
# Options:
#   --frontend-only    Run only frontend E2E tests
#   --backend-only     Run only backend API tests
#   --no-docker        Skip Docker setup (use existing services)
#   --ci               Run in CI mode (headless, optimized)
#   --clean            Clean all containers and volumes before running
#   --help             Show this help message
# ======================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BACKEND_DIR="$PROJECT_ROOT/backend"
REPORTS_DIR="$PROJECT_ROOT/test-reports"

# Default options
RUN_FRONTEND=true
RUN_BACKEND=true
USE_DOCKER=true
CI_MODE=false
CLEAN_DOCKER=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --frontend-only)
            RUN_FRONTEND=true
            RUN_BACKEND=false
            shift
            ;;
        --backend-only)
            RUN_FRONTEND=false
            RUN_BACKEND=true
            shift
            ;;
        --no-docker)
            USE_DOCKER=false
            shift
            ;;
        --ci)
            CI_MODE=true
            export CI=true
            shift
            ;;
        --clean)
            CLEAN_DOCKER=true
            shift
            ;;
        --help)
            echo "SaasIt.ai Test Suite Runner"
            echo ""
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --frontend-only    Run only frontend E2E tests"
            echo "  --backend-only     Run only backend API tests"
            echo "  --no-docker        Skip Docker setup (use existing services)"
            echo "  --ci               Run in CI mode (headless, optimized)"
            echo "  --clean            Clean all containers and volumes before running"
            echo "  --help             Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                 # Run all tests with Docker"
            echo "  $0 --frontend-only # Run only E2E tests"
            echo "  $0 --ci            # Run in CI mode"
            echo "  $0 --clean         # Clean and run all tests"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# ======================================================================
# Helper Functions
# ======================================================================

print_header() {
    echo -e "\n${PURPLE}======================================================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}======================================================================${NC}\n"
}

print_step() {
    echo -e "${BLUE}🔧 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

cleanup() {
    print_step "Cleaning up test environment..."
    
    # Stop and remove test containers
    if [ "$USE_DOCKER" = true ]; then
        docker-compose -f docker-compose.test.yml down --volumes --remove-orphans 2>/dev/null || true
    fi
    
    # Kill any background processes
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    print_success "Cleanup completed"
}

# Trap cleanup on script exit
trap cleanup EXIT

check_prerequisites() {
    print_step "Checking prerequisites..."
    
    local missing_tools=()
    
    # Check Docker
    if [ "$USE_DOCKER" = true ]; then
        if ! command -v docker &> /dev/null; then
            missing_tools+=("Docker")
        fi
        
        if ! command -v docker-compose &> /dev/null; then
            missing_tools+=("Docker Compose")
        fi
        
        # Check if Docker is running
        if ! docker info &> /dev/null; then
            print_error "Docker is not running. Please start Docker and try again."
            exit 1
        fi
    fi
    
    # Check Node.js
    if [ "$RUN_FRONTEND" = true ]; then
        if ! command -v node &> /dev/null; then
            missing_tools+=("Node.js")
        fi
        
        if ! command -v npm &> /dev/null; then
            missing_tools+=("npm")
        fi
    fi
    
    # Check Python
    if [ "$RUN_BACKEND" = true ]; then
        if ! command -v python3 &> /dev/null; then
            missing_tools+=("Python 3")
        fi
        
        if ! command -v pip3 &> /dev/null; then
            missing_tools+=("pip3")
        fi
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        print_info "Please install the missing tools and run the script again."
        exit 1
    fi
    
    print_success "All prerequisites satisfied"
    
    # Print versions for debugging
    print_info "Tool versions:"
    if [ "$USE_DOCKER" = true ]; then
        echo "  Docker: $(docker --version)"
        echo "  Docker Compose: $(docker-compose --version)"
    fi
    if [ "$RUN_FRONTEND" = true ]; then
        echo "  Node.js: $(node --version)"
        echo "  npm: $(npm --version)"
    fi
    if [ "$RUN_BACKEND" = true ]; then
        echo "  Python: $(python3 --version)"
        echo "  pip: $(pip3 --version)"
    fi
}

setup_docker_environment() {
    if [ "$USE_DOCKER" = false ]; then
        print_info "Skipping Docker setup (--no-docker flag)"
        return
    fi
    
    print_step "Setting up Docker test environment..."
    
    # Clean existing containers if requested
    if [ "$CLEAN_DOCKER" = true ]; then
        print_step "Cleaning existing Docker containers and volumes..."
        docker-compose -f docker-compose.test.yml down --volumes --remove-orphans 2>/dev/null || true
        docker system prune -f || true
    fi
    
    # Start test environment
    print_step "Starting test database..."
    docker-compose -f docker-compose.test.yml up -d mongodb
    
    # Wait for MongoDB to be ready
    print_step "Waiting for MongoDB to be ready..."
    for i in {1..30}; do
        if docker-compose -f docker-compose.test.yml exec -T mongodb mongosh --eval "db.admin.ping()" --quiet &>/dev/null; then
            print_success "MongoDB is ready"
            break
        fi
        
        if [ $i -eq 30 ]; then
            print_error "MongoDB failed to start within 30 seconds"
            exit 1
        fi
        
        echo -n "."
        sleep 1
    done
    
    print_success "Docker environment ready"
}

setup_test_environment() {
    print_step "Setting up test environment variables..."
    
    # Create reports directory
    mkdir -p "$REPORTS_DIR"
    
    # Create test environment file
    cat > "$PROJECT_ROOT/.env.test" << EOF
# Test Environment Configuration
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
EOF

    print_success "Test environment configured"
}

install_dependencies() {
    print_step "Installing dependencies..."
    
    # Install frontend dependencies
    if [ "$RUN_FRONTEND" = true ]; then
        print_step "Installing frontend dependencies..."
        cd "$FRONTEND_DIR"
        
        if [ "$CI_MODE" = true ]; then
            npm ci --silent
        else
            npm install --silent
        fi
        
        # Install Playwright browsers
        if ! npx playwright --version &>/dev/null; then
            print_step "Installing Playwright browsers..."
            npx playwright install --with-deps
        fi
        
        print_success "Frontend dependencies installed"
    fi
    
    # Install backend dependencies
    if [ "$RUN_BACKEND" = true ]; then
        print_step "Installing backend dependencies..."
        cd "$BACKEND_DIR"
        
        # Create virtual environment if it doesn't exist
        if [ ! -d "venv" ]; then
            python3 -m venv venv
        fi
        
        # Activate virtual environment
        source venv/bin/activate
        
        # Upgrade pip
        pip install --upgrade pip --quiet
        
        # Install requirements
        pip install -r requirements.txt --quiet
        
        # Install additional test dependencies
        pip install pytest-asyncio pytest-cov httpx pytest-xdist --quiet
        
        print_success "Backend dependencies installed"
    fi
    
    cd "$PROJECT_ROOT"
}

start_test_services() {
    if [ "$USE_DOCKER" = false ]; then
        print_step "Starting services manually..."
        
        # Start backend
        if [ "$RUN_BACKEND" = true ]; then
            cd "$BACKEND_DIR"
            source venv/bin/activate
            
            print_step "Starting backend server..."
            set -a && source "$PROJECT_ROOT/.env.test" && set +a
            uvicorn server:app --host 0.0.0.0 --port 8000 &
            BACKEND_PID=$!
            
            # Wait for backend to be ready
            print_step "Waiting for backend to be ready..."
            for i in {1..30}; do
                if curl -s http://localhost:8000/api/ &>/dev/null; then
                    print_success "Backend is ready"
                    break
                fi
                
                if [ $i -eq 30 ]; then
                    print_error "Backend failed to start within 30 seconds"
                    exit 1
                fi
                
                sleep 1
            done
        fi
        
        # Start frontend (for E2E tests)
        if [ "$RUN_FRONTEND" = true ] && [ "$CI_MODE" = false ]; then
            cd "$FRONTEND_DIR"
            
            print_step "Starting frontend development server..."
            set -a && source "$PROJECT_ROOT/.env.test" && set +a
            npm start &
            FRONTEND_PID=$!
            
            # Wait for frontend to be ready
            print_step "Waiting for frontend to be ready..."
            for i in {1..60}; do
                if curl -s http://localhost:3000 &>/dev/null; then
                    print_success "Frontend is ready"
                    break
                fi
                
                if [ $i -eq 60 ]; then
                    print_error "Frontend failed to start within 60 seconds"
                    exit 1
                fi
                
                sleep 2
            done
        fi
        
        cd "$PROJECT_ROOT"
    fi
}

run_backend_tests() {
    if [ "$RUN_BACKEND" = false ]; then
        return
    fi
    
    print_header "Running Backend API Tests"
    
    cd "$BACKEND_DIR"
    source venv/bin/activate
    
    # Set test environment
    export $(cat "$PROJECT_ROOT/.env.test" | xargs)
    export TESTING=true
    
    print_step "Running pytest with coverage..."
    
    # Configure pytest arguments
    local pytest_args=(
        "tests/e2e/"
        "-v"
        "--tb=short"
        "--cov=app"
        "--cov-report=html:$REPORTS_DIR/backend-coverage"
        "--cov-report=xml:$REPORTS_DIR/backend-coverage.xml"
        "--cov-report=term-missing"
        "--junit-xml=$REPORTS_DIR/backend-results.xml"
    )
    
    # Add parallel execution for faster tests
    if [ "$CI_MODE" = false ]; then
        pytest_args+=("-n" "auto")  # Parallel execution
    fi
    
    # Run tests
    if pytest "${pytest_args[@]}"; then
        print_success "Backend tests passed"
        BACKEND_SUCCESS=true
    else
        print_error "Backend tests failed"
        BACKEND_SUCCESS=false
    fi
    
    cd "$PROJECT_ROOT"
}

run_frontend_tests() {
    if [ "$RUN_FRONTEND" = false ]; then
        return
    fi
    
    print_header "Running Frontend E2E Tests"
    
    cd "$FRONTEND_DIR"
    
    # Set test environment
    export $(cat "$PROJECT_ROOT/.env.test" | xargs)
    
    # Configure Playwright for CI or local
    local playwright_config="playwright.config.ts"
    if [ "$CI_MODE" = true ]; then
        playwright_config="playwright.ci.config.ts"
        export CI=true
    fi
    
    print_step "Running Playwright E2E tests..."
    
    # Configure test command
    local test_cmd="npx playwright test --config=$playwright_config"
    
    # Add reporter options
    if [ "$CI_MODE" = true ]; then
        test_cmd="$test_cmd --reporter=html,json,junit"
    else
        test_cmd="$test_cmd --reporter=html"
    fi
    
    # Set output directory
    export PLAYWRIGHT_HTML_REPORT="$REPORTS_DIR/frontend-report"
    export PLAYWRIGHT_JSON_OUTPUT_FILE="$REPORTS_DIR/frontend-results.json"
    export PLAYWRIGHT_JUNIT_OUTPUT_FILE="$REPORTS_DIR/frontend-results.xml"
    
    # Run tests
    if eval $test_cmd; then
        print_success "Frontend E2E tests passed"
        FRONTEND_SUCCESS=true
    else
        print_error "Frontend E2E tests failed"
        FRONTEND_SUCCESS=false
    fi
    
    # Copy test artifacts to reports directory
    if [ -d "playwright-report" ]; then
        cp -r playwright-report/* "$REPORTS_DIR/frontend-report/" 2>/dev/null || true
    fi
    
    if [ -d "test-results" ]; then
        cp -r test-results "$REPORTS_DIR/frontend-artifacts/" 2>/dev/null || true
    fi
    
    cd "$PROJECT_ROOT"
}

generate_final_report() {
    print_header "Test Results Summary"
    
    # Create summary report
    local summary_file="$REPORTS_DIR/test-summary.html"
    
    cat > "$summary_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>SaasIt.ai Test Results Summary</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
        .success { background: #dcfce7; border-color: #16a34a; }
        .failure { background: #fef2f2; border-color: #dc2626; }
        .warning { background: #fefce8; border-color: #ca8a04; }
        .timestamp { color: #666; font-size: 0.9em; }
        ul { margin: 10px 0; padding-left: 20px; }
        a { color: #2563eb; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 SaasIt.ai Test Results</h1>
        <p class="timestamp">Generated: $(date)</p>
    </div>
EOF

    # Backend results
    if [ "$RUN_BACKEND" = true ]; then
        if [ "$BACKEND_SUCCESS" = true ]; then
            cat >> "$summary_file" << EOF
    <div class="section success">
        <h2>✅ Backend API Tests - PASSED</h2>
        <ul>
            <li><a href="backend-coverage/index.html">View Coverage Report</a></li>
            <li><a href="backend-coverage.xml">Coverage XML</a></li>
            <li><a href="backend-results.xml">Test Results XML</a></li>
        </ul>
    </div>
EOF
        else
            cat >> "$summary_file" << EOF
    <div class="section failure">
        <h2>❌ Backend API Tests - FAILED</h2>
        <ul>
            <li><a href="backend-coverage/index.html">View Coverage Report</a></li>
            <li><a href="backend-results.xml">Test Results XML</a></li>
        </ul>
    </div>
EOF
        fi
    fi

    # Frontend results
    if [ "$RUN_FRONTEND" = true ]; then
        if [ "$FRONTEND_SUCCESS" = true ]; then
            cat >> "$summary_file" << EOF
    <div class="section success">
        <h2>✅ Frontend E2E Tests - PASSED</h2>
        <ul>
            <li><a href="frontend-report/index.html">View Test Report</a></li>
            <li><a href="frontend-results.json">Test Results JSON</a></li>
            <li><a href="frontend-artifacts/">Test Artifacts</a></li>
        </ul>
    </div>
EOF
        else
            cat >> "$summary_file" << EOF
    <div class="section failure">
        <h2>❌ Frontend E2E Tests - FAILED</h2>
        <ul>
            <li><a href="frontend-report/index.html">View Test Report</a></li>
            <li><a href="frontend-artifacts/">Test Artifacts & Screenshots</a></li>
        </ul>
    </div>
EOF
        fi
    fi

    cat >> "$summary_file" << EOF
    <div class="section">
        <h2>📊 Test Coverage Overview</h2>
        <ul>
            <li><strong>Complete Onboarding Flows:</strong> New & existing project paths</li>
            <li><strong>Claude Code Detection:</strong> Success, failure, and error scenarios</li>
            <li><strong>Project Analysis:</strong> CLAUDE.md parsing and GitHub integration</li>
            <li><strong>Accessibility:</strong> WCAG compliance and keyboard navigation</li>
            <li><strong>Cross-browser:</strong> Chrome, Firefox, Safari compatibility</li>
            <li><strong>API Endpoints:</strong> Authentication, validation, error handling</li>
        </ul>
    </div>

    <div class="section">
        <h2>🚀 Next Steps</h2>
        <ul>
            <li>Review detailed reports for any failures</li>
            <li>Check screenshots/videos for visual issues</li>
            <li>Verify coverage metrics meet requirements</li>
            <li>Run accessibility audits if needed</li>
        </ul>
    </div>
</body>
</html>
EOF

    # Print console summary
    echo ""
    print_info "Test Execution Summary:"
    echo ""
    
    if [ "$RUN_BACKEND" = true ]; then
        if [ "$BACKEND_SUCCESS" = true ]; then
            print_success "Backend API Tests: PASSED"
        else
            print_error "Backend API Tests: FAILED"
        fi
    fi
    
    if [ "$RUN_FRONTEND" = true ]; then
        if [ "$FRONTEND_SUCCESS" = true ]; then
            print_success "Frontend E2E Tests: PASSED"
        else
            print_error "Frontend E2E Tests: FAILED"
        fi
    fi
    
    echo ""
    print_info "Reports generated in: $REPORTS_DIR"
    print_info "Open test-summary.html for detailed results"
    
    # Open summary report if not in CI mode
    if [ "$CI_MODE" = false ] && command -v open &> /dev/null; then
        print_info "Opening test summary..."
        open "$summary_file"
    fi
}

# ======================================================================
# Main Execution
# ======================================================================

main() {
    # Print banner
    echo -e "${PURPLE}"
    cat << "EOF"
 ____                 ___ _            _   
/ ___|  __ _  __ _ ___|_ _| |_   __ _  (_) 
\___ \ / _` |/ _` / __|| || __| / _` | | | 
 ___) | (_| | (_| \__ \| || |_ | (_| |_| | 
|____/ \__,_|\__,_|___/___|\__(_)__,_(_)_| 

    Complete Test Suite Runner
EOF
    echo -e "${NC}"
    
    print_info "Starting test execution with options:"
    echo "  Frontend: $RUN_FRONTEND"
    echo "  Backend: $RUN_BACKEND" 
    echo "  Docker: $USE_DOCKER"
    echo "  CI Mode: $CI_MODE"
    echo "  Clean: $CLEAN_DOCKER"
    echo ""
    
    # Initialize success flags
    BACKEND_SUCCESS=true
    FRONTEND_SUCCESS=true
    
    # Execute test pipeline
    check_prerequisites
    setup_docker_environment
    setup_test_environment
    install_dependencies
    start_test_services
    
    # Run tests (can run in parallel)
    if [ "$RUN_BACKEND" = true ] && [ "$RUN_FRONTEND" = true ]; then
        print_info "Running backend and frontend tests in parallel..."
        
        # Run backend tests in background
        (run_backend_tests) &
        BACKEND_JOB=$!
        
        # Run frontend tests in foreground
        run_frontend_tests
        
        # Wait for backend tests to complete
        wait $BACKEND_JOB
    else
        run_backend_tests
        run_frontend_tests
    fi
    
    # Generate reports
    generate_final_report
    
    # Exit with appropriate code
    if [ "$BACKEND_SUCCESS" = true ] && [ "$FRONTEND_SUCCESS" = true ]; then
        print_success "All tests completed successfully! 🎉"
        exit 0
    else
        print_error "Some tests failed. Check the reports for details."
        exit 1
    fi
}

# Run main function
main "$@"