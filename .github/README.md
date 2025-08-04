# SaasIt.ai CI/CD Documentation

This directory contains the Continuous Integration and Continuous Deployment (CI/CD) configuration for SaasIt.ai.

## Workflows Overview

### 1. Main CI Pipeline (`ci.yml`)
**Trigger**: Push to `main`/`develop`, Pull Requests
**Purpose**: Comprehensive testing and deployment pipeline

**Jobs**:
- **Changes Detection**: Determines which parts of the codebase changed
- **Backend Tests**: Runs Python tests with MongoDB
- **Frontend Tests**: Runs JavaScript tests and builds
- **E2E Tests**: End-to-end integration testing
- **Security Scan**: Vulnerability scanning with Trivy
- **Deploy Staging**: Automatic deployment to staging (develop branch)
- **Deploy Production**: Automatic deployment to production (main branch)

### 2. Backend Tests (`backend-tests.yml`)
**Trigger**: Changes to `backend/` directory
**Purpose**: Comprehensive backend testing across Python versions

**Features**:
- Tests on Python 3.9, 3.10, 3.11
- MongoDB service container
- Unit, integration, security, and performance tests
- Code coverage reporting
- Security scanning with Bandit, Safety, Semgrep
- Code quality checks with Black, isort, Flake8, MyPy

### 3. Frontend Tests (`frontend-tests.yml`)
**Trigger**: Changes to `frontend/` directory
**Purpose**: Frontend testing and quality assurance

**Features**:
- Tests on Node.js 18, 20
- Build size analysis
- Accessibility testing with axe-core
- Performance testing with Lighthouse CI
- Security scanning with npm audit

## Environment Setup

### Required Secrets
Configure these in GitHub Settings → Secrets and Variables → Actions:

```bash
# Production deployment (if applicable)
PRODUCTION_SERVER_HOST
PRODUCTION_SERVER_USER
PRODUCTION_SSH_KEY

# Staging deployment (if applicable)  
STAGING_SERVER_HOST
STAGING_SERVER_USER
STAGING_SSH_KEY

# External services
ANTHROPIC_API_KEY     # For AI features (if testing against real API)
CODECOV_TOKEN         # For coverage reporting
```

### Environment Variables
Set in workflow files or repository settings:

```yaml
MONGO_URL: mongodb://localhost:27017
DB_NAME: saasit_test_ci
SECRET_KEY: test-secret-key-for-ci-only
TESTING: true
```

## Code Quality Standards

### Pre-commit Hooks
The repository uses pre-commit hooks to ensure code quality:

```bash
# Install pre-commit
pip install pre-commit

# Install hooks
pre-commit install

# Run on all files
pre-commit run --all-files
```

### Backend Standards
- **Black**: Code formatting
- **isort**: Import sorting
- **Flake8**: Linting (max line length: 88)
- **MyPy**: Type checking
- **Bandit**: Security scanning
- **Safety**: Dependency vulnerability scanning

### Frontend Standards
- **Prettier**: Code formatting
- **ESLint**: Linting (if configured)
- **TypeScript**: Type checking (if configured)
- **npm audit**: Security scanning

## Test Categories

### Backend Tests
- **Unit Tests**: Individual service/component testing
- **Integration Tests**: API endpoint testing
- **Security Tests**: Authentication, authorization, rate limiting
- **Performance Tests**: Load and stress testing

### Frontend Tests
- **Unit Tests**: Component testing
- **Integration Tests**: Page flow testing
- **Accessibility Tests**: WCAG compliance
- **Performance Tests**: Lighthouse scoring

### E2E Tests
- **User Flows**: Complete user journey testing
- **API Integration**: Frontend-backend communication
- **Cross-browser**: Multi-browser compatibility

## Coverage Requirements

### Backend Coverage
- **Minimum**: 80% line coverage
- **Target**: 90% line coverage
- **Critical Paths**: 100% coverage for auth and payment flows

### Frontend Coverage
- **Minimum**: 70% line coverage
- **Target**: 85% line coverage
- **Components**: All UI components should have tests

## Deployment Strategy

### Branch Strategy
- `main`: Production deployments
- `develop`: Staging deployments
- `feature/*`: Feature development
- `hotfix/*`: Emergency fixes

### Deployment Environments
1. **Development**: Local development
2. **Staging**: `develop` branch auto-deployment
3. **Production**: `main` branch auto-deployment (with approval)

### Rollback Strategy
- Automated rollback on deployment failure
- Manual rollback capability via GitHub Actions
- Database migration rollback procedures

## Monitoring and Alerts

### Success Metrics
- ✅ All tests pass
- ✅ Coverage thresholds met
- ✅ Security scans clean
- ✅ Performance benchmarks met

### Failure Handling
- 🔄 Automatic retry on transient failures
- 📧 Team notification on persistent failures
- 🚨 Immediate alerts for security issues
- 📊 Performance regression alerts

## Troubleshooting

### Common Issues

#### MongoDB Connection Failures
```bash
# Check service health
mongosh --host localhost:27017 --eval "db.adminCommand('ping')"

# Increase timeout in workflow
timeout 60 bash -c 'until mongosh --host localhost:27017 --eval "db.adminCommand(\"ping\")" &>/dev/null; do sleep 2; done'
```

#### Test Timeouts
```yaml
# Increase job timeout
timeout-minutes: 30

# Increase test timeout
pytest --timeout=300
```

#### Cache Issues
```bash
# Clear GitHub Actions cache
# Go to Actions tab → Caches → Delete relevant caches
```

### Debug Mode
Enable debug logging by setting repository variable:
```
ACTIONS_STEP_DEBUG=true
ACTIONS_RUNNER_DEBUG=true
```

## Performance Optimization

### Caching Strategy
- **pip dependencies**: Cached by Python version and requirements hash
- **npm dependencies**: Cached by Node version and package-lock hash
- **Docker layers**: Multi-stage build optimization

### Parallel Execution
- Matrix builds for multiple Python/Node versions
- Concurrent job execution where possible
- Conditional job execution based on changed files

### Resource Management
- Appropriate runner types for different jobs
- Job timeout limits
- Artifact retention policies

## Security Considerations

### Secret Management
- No secrets in repository code
- Environment-specific secret management
- Rotation policies for API keys

### Dependency Security
- Automated vulnerability scanning
- Regular dependency updates
- Security patch management

### Access Control
- Branch protection rules
- Required status checks
- Review requirements for sensitive changes

## Metrics and Reporting

### Coverage Reports
- Codecov integration for detailed coverage analysis
- Trend analysis over time
- Pull request coverage comparisons

### Performance Metrics
- Lighthouse scores tracking
- Bundle size monitoring
- API response time benchmarks

### Security Reports
- Vulnerability scan results
- Dependency audit reports
- Security trend analysis

## Future Enhancements

### Planned Improvements
- [ ] Integration with external staging environment
- [ ] Automated performance regression detection
- [ ] Advanced security scanning with CodeQL
- [ ] Multi-region deployment support
- [ ] A/B testing framework integration

### Monitoring Expansion
- [ ] Real-time performance monitoring
- [ ] User experience monitoring
- [ ] Business metrics tracking
- [ ] Error rate and uptime monitoring