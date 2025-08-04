# SaasIt.ai Backend Test Suite

Comprehensive test suite for the SaasIt.ai backend API and services.

## Test Structure

```
tests/
├── conftest.py              # Pytest fixtures and configuration
├── unit/                    # Unit tests for individual components
│   ├── test_auth_service.py
│   ├── test_project_service.py
│   └── test_export_service.py
├── integration/             # Integration tests for API endpoints
│   ├── test_auth_endpoints.py
│   ├── test_project_endpoints.py
│   ├── test_export_endpoints.py
│   └── test_claude_integration.py
├── security/                # Security and authorization tests
│   └── test_authentication_security.py
└── performance/             # Performance and rate limiting tests
    └── test_rate_limiting.py
```

## Running Tests

### Quick Start

```bash
# Run all tests
python run_tests.py

# Run specific test categories
python run_tests.py unit         # Unit tests only
python run_tests.py integration  # Integration tests only
python run_tests.py security     # Security tests only
python run_tests.py performance  # Performance tests only

# Run with verbose output
python run_tests.py -v all

# Run specific test file
python run_tests.py --specific tests/unit/test_auth_service.py
```

### Using pytest directly

```bash
# Run all tests with coverage
pytest --cov=app --cov-report=html

# Run tests matching a pattern
pytest -k "test_login"

# Run with specific markers
pytest -m "not slow"

# Run with debugging
pytest -vv --tb=long
```

## Test Categories

### Unit Tests
- **Purpose**: Test individual services and components in isolation
- **Location**: `tests/unit/`
- **Coverage**: 
  - Authentication service (registration, login, JWT handling)
  - Project service (CRUD operations, tier limits)
  - Export service (format conversions, tier restrictions)

### Integration Tests
- **Purpose**: Test API endpoints and full request/response cycles
- **Location**: `tests/integration/`
- **Coverage**:
  - Auth endpoints (register, login, refresh, logout)
  - Project endpoints (create, read, update, delete, duplicate)
  - Export endpoints (JSON, YAML, Claude Code, Docker, Kubernetes)
  - Claude AI integration (workflow generation, refinement)

### Security Tests
- **Purpose**: Verify authentication, authorization, and security measures
- **Location**: `tests/security/`
- **Coverage**:
  - JWT token security and expiration
  - Password requirements enforcement
  - Cross-user access prevention
  - Rate limiting enforcement
  - Sensitive data protection

### Performance Tests
- **Purpose**: Test system performance and rate limiting
- **Location**: `tests/performance/`
- **Coverage**:
  - Rate limiting per tier
  - Concurrent request handling
  - Rate limit accuracy and headers

## Key Test Fixtures

### Authentication Fixtures
- `test_user_data`: Basic user registration data
- `registered_user`: Pre-registered user with tokens
- `auth_headers`: Authorization headers with valid JWT
- `test_users_with_tiers`: Users with different subscription tiers

### Project Fixtures
- `test_project_data`: Sample project with workflow
- `sample_project`: Project model instance for testing

### Database Fixtures
- `test_db`: Isolated test database (cleaned between tests)
- `db_client`: MongoDB client for test database
- `client`: FastAPI test client with database

## Test Environment

### Required Environment Variables
```bash
TESTING=true
MONGO_URL=mongodb://localhost:27017
DB_NAME=saasit_test
SECRET_KEY=test-secret-key-for-testing-only
ANTHROPIC_API_KEY=test-api-key
```

### Prerequisites
- MongoDB running on localhost:27017
- Python 3.8+
- All backend dependencies installed

## Writing New Tests

### Unit Test Example
```python
class TestNewService:
    @pytest.mark.asyncio
    async def test_service_method(self, test_db):
        service = NewService(test_db)
        result = await service.do_something()
        assert result.success is True
```

### Integration Test Example
```python
class TestNewEndpoint:
    def test_endpoint_success(self, client, auth_headers):
        response = client.post(
            "/api/v1/new-endpoint",
            json={"data": "value"},
            headers=auth_headers
        )
        assert response.status_code == 200
```

## Coverage Reports

After running tests with coverage, view the HTML report:
```bash
open htmlcov/index.html
```

## Continuous Integration

Tests are designed to run in CI/CD pipelines. See `.github/workflows/` for GitHub Actions configuration.

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running: `mongod`
- Check connection string in environment variables
- Verify test database permissions

### Test Failures
- Check test output for specific error messages
- Run with `-vv` for detailed output
- Ensure all dependencies are installed
- Check for conflicting test data

### Rate Limit Tests
- Some tests may fail if rate limits are not implemented
- Adjust test expectations based on actual implementation
- Use mocks for external API calls

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Use fixtures to ensure clean state
3. **Mocking**: Mock external services (Claude API, email)
4. **Assertions**: Be specific about what you're testing
5. **Documentation**: Document complex test scenarios
6. **Performance**: Keep tests fast, mark slow tests

## Future Improvements

- [ ] Add WebSocket tests for real-time features
- [ ] Implement load testing with Locust
- [ ] Add mutation testing
- [ ] Create test data factories
- [ ] Add API contract tests
- [ ] Implement end-to-end tests