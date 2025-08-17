# SaasIt.ai Test Suite Makefile
# Provides convenient commands for running tests and managing the development environment

.PHONY: help test test-all test-frontend test-backend test-docker test-clean setup install docker-up docker-down docker-logs clean

# Default target
.DEFAULT_GOAL := help

# Colors for output
BLUE := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
NC := \033[0m

help: ## Show this help message
	@echo "$(BLUE)SaasIt.ai Test Suite Commands$(NC)"
	@echo ""
	@echo "$(GREEN)Quick Start:$(NC)"
	@echo "  make setup     - Install all dependencies and setup environment"
	@echo "  make test      - Run all tests with Docker (recommended)"
	@echo ""
	@echo "$(GREEN)Test Commands:$(NC)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ""
	@echo "$(GREEN)Examples:$(NC)"
	@echo "  make test-frontend         # Run only E2E tests"
	@echo "  make test-backend          # Run only API tests"
	@echo "  make test-clean            # Clean environment and run all tests"
	@echo "  make docker-logs           # View test container logs"

# Main test commands
test: ## Run all tests with Docker (recommended)
	@echo "$(BLUE)Running all tests with Docker...$(NC)"
	./test-all.sh

test-all: ## Run all tests with complete environment setup
	@echo "$(BLUE)Running complete test suite...$(NC)"
	./test-all.sh

test-frontend: ## Run only frontend E2E tests
	@echo "$(BLUE)Running frontend E2E tests...$(NC)"
	./test-all.sh --frontend-only

test-backend: ## Run only backend API tests
	@echo "$(BLUE)Running backend API tests...$(NC)"
	./test-all.sh --backend-only

test-docker: ## Run tests in full Docker environment
	@echo "$(BLUE)Running tests in full Docker environment...$(NC)"
	docker-compose -f docker-compose.test.yml --profile full-integration up --build --abort-on-container-exit

test-clean: ## Clean environment and run all tests
	@echo "$(BLUE)Cleaning environment and running all tests...$(NC)"
	./test-all.sh --clean

test-ci: ## Run tests in CI mode (headless, optimized)
	@echo "$(BLUE)Running tests in CI mode...$(NC)"
	./test-all.sh --ci

test-no-docker: ## Run tests without Docker (use existing services)
	@echo "$(BLUE)Running tests without Docker...$(NC)"
	./test-all.sh --no-docker

# Setup and installation
setup: ## Install all dependencies and setup environment
	@echo "$(BLUE)Setting up development environment...$(NC)"
	@echo "$(YELLOW)Installing frontend dependencies...$(NC)"
	cd frontend && npm install
	@echo "$(YELLOW)Installing Playwright browsers...$(NC)"
	cd frontend && npx playwright install --with-deps
	@echo "$(YELLOW)Setting up Python virtual environment...$(NC)"
	cd backend && python3 -m venv venv
	@echo "$(YELLOW)Installing backend dependencies...$(NC)"
	cd backend && source venv/bin/activate && pip install -r requirements.txt
	@echo "$(YELLOW)Installing additional test dependencies...$(NC)"
	cd backend && source venv/bin/activate && pip install pytest pytest-asyncio pytest-cov httpx pytest-xdist
	@echo "$(GREEN)Setup completed! Run 'make test' to run all tests.$(NC)"

install: setup ## Alias for setup

# Docker management
docker-up: ## Start test database and services
	@echo "$(BLUE)Starting test environment...$(NC)"
	docker-compose -f docker-compose.test.yml up -d mongodb

docker-down: ## Stop and remove test containers
	@echo "$(BLUE)Stopping test environment...$(NC)"
	docker-compose -f docker-compose.test.yml down --volumes --remove-orphans

docker-logs: ## Show logs from test containers
	@echo "$(BLUE)Showing test container logs...$(NC)"
	docker-compose -f docker-compose.test.yml logs -f

docker-shell: ## Open shell in MongoDB test container
	@echo "$(BLUE)Opening MongoDB shell...$(NC)"
	docker-compose -f docker-compose.test.yml exec mongodb mongosh saasit_test

# Development helpers
dev-frontend: ## Start frontend development server
	@echo "$(BLUE)Starting frontend development server...$(NC)"
	cd frontend && npm start

dev-backend: ## Start backend development server
	@echo "$(BLUE)Starting backend development server...$(NC)"
	cd backend && source venv/bin/activate && uvicorn server:app --reload

dev-all: ## Start both frontend and backend development servers
	@echo "$(BLUE)Starting development servers...$(NC)"
	make -j2 dev-frontend dev-backend

# Quality checks
lint-frontend: ## Lint frontend code
	@echo "$(BLUE)Linting frontend code...$(NC)"
	cd frontend && npm run lint

lint-backend: ## Lint backend code
	@echo "$(BLUE)Linting backend code...$(NC)"
	cd backend && source venv/bin/activate && black . && isort . && flake8

lint: lint-frontend lint-backend ## Lint all code

format-frontend: ## Format frontend code
	@echo "$(BLUE)Formatting frontend code...$(NC)"
	cd frontend && npm run format || true

format-backend: ## Format backend code
	@echo "$(BLUE)Formatting backend code...$(NC)"
	cd backend && source venv/bin/activate && black . && isort .

format: format-frontend format-backend ## Format all code

# Test utilities
test-debug: ## Run tests in debug mode
	@echo "$(BLUE)Running tests in debug mode...$(NC)"
	cd frontend && npm run test:e2e:debug

test-headed: ## Run tests with visible browser
	@echo "$(BLUE)Running tests with visible browser...$(NC)"
	cd frontend && npm run test:e2e:headed

test-ui: ## Run tests with Playwright UI
	@echo "$(BLUE)Opening Playwright test UI...$(NC)"
	cd frontend && npm run test:e2e:ui

test-report: ## Open last test report
	@echo "$(BLUE)Opening test reports...$(NC)"
	@if [ -f "test-reports/test-summary.html" ]; then \
		open test-reports/test-summary.html; \
	else \
		echo "$(RED)No test reports found. Run 'make test' first.$(NC)"; \
	fi

# Coverage
coverage-frontend: ## Generate frontend coverage report
	@echo "$(BLUE)Generating frontend coverage...$(NC)"
	cd frontend && npm run test:coverage

coverage-backend: ## Generate backend coverage report
	@echo "$(BLUE)Generating backend coverage...$(NC)"
	cd backend && source venv/bin/activate && pytest tests/ --cov=app --cov-report=html

coverage: coverage-frontend coverage-backend ## Generate all coverage reports

# Cleanup
clean-deps: ## Clean all dependencies
	@echo "$(BLUE)Cleaning dependencies...$(NC)"
	rm -rf frontend/node_modules
	rm -rf backend/venv
	rm -rf backend/__pycache__
	rm -rf backend/.pytest_cache

clean-reports: ## Clean test reports
	@echo "$(BLUE)Cleaning test reports...$(NC)"
	rm -rf test-reports
	rm -rf frontend/playwright-report
	rm -rf frontend/test-results
	rm -rf backend/htmlcov
	rm -rf backend/.coverage

clean-docker: ## Clean Docker resources
	@echo "$(BLUE)Cleaning Docker resources...$(NC)"
	docker-compose -f docker-compose.test.yml down --volumes --remove-orphans
	docker system prune -f

clean: clean-reports clean-docker ## Clean all temporary files and containers

clean-all: clean clean-deps ## Clean everything including dependencies

# Database management
db-reset: ## Reset test database
	@echo "$(BLUE)Resetting test database...$(NC)"
	docker-compose -f docker-compose.test.yml down mongodb
	docker volume rm saasit-test-mongodb-data || true
	docker-compose -f docker-compose.test.yml up -d mongodb

db-seed: ## Seed test database with sample data
	@echo "$(BLUE)Seeding test database...$(NC)"
	docker-compose -f docker-compose.test.yml exec mongodb mongosh saasit_test /docker-entrypoint-initdb.d/mongo-init.js

# Security checks
security-check: ## Run security checks
	@echo "$(BLUE)Running security checks...$(NC)"
	cd frontend && npm audit || true
	cd backend && source venv/bin/activate && pip check || true

# Performance tests
perf-test: ## Run performance tests
	@echo "$(BLUE)Running performance tests...$(NC)"
	cd backend && source venv/bin/activate && pytest tests/e2e/test_onboarding_flow.py::TestOnboardingPerformance -v

# Accessibility tests
a11y-test: ## Run accessibility tests only
	@echo "$(BLUE)Running accessibility tests...$(NC)"
	cd frontend && npm run test:e2e:accessibility

# Cross-browser tests
cross-browser-test: ## Run cross-browser tests
	@echo "$(BLUE)Running cross-browser tests...$(NC)"
	cd frontend && npm run test:e2e:cross-browser

# Health checks
health-check: ## Check health of all services
	@echo "$(BLUE)Checking service health...$(NC)"
	@echo "MongoDB: $(shell curl -s http://localhost:27017 >/dev/null && echo '$(GREEN)✓$(NC)' || echo '$(RED)✗$(NC)')"
	@echo "Backend: $(shell curl -s http://localhost:8000/api/ >/dev/null && echo '$(GREEN)✓$(NC)' || echo '$(RED)✗$(NC)')"
	@echo "Frontend: $(shell curl -s http://localhost:3000 >/dev/null && echo '$(GREEN)✓$(NC)' || echo '$(RED)✗$(NC)')"

# Quick commands for common workflows
quick-test: ## Quick test run (frontend only, no Docker)
	@echo "$(BLUE)Running quick test...$(NC)"
	./test-all.sh --frontend-only --no-docker

full-test: ## Full test run with all browsers and clean environment
	@echo "$(BLUE)Running full test suite...$(NC)"
	./test-all.sh --clean --ci