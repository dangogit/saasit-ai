# E2E Testing Guide for SaasIt.ai

This guide covers the comprehensive end-to-end testing suite for the SaasIt.ai user onboarding system.

## 📋 Table of Contents

- [Overview](#overview)
- [Test Architecture](#test-architecture)
- [Getting Started](#getting-started)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [CI/CD Integration](#cicd-integration)
- [Debugging](#debugging)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

Our E2E testing suite ensures the user onboarding flow works correctly across all browsers, devices, and user scenarios. The tests cover:

- **Complete onboarding flows** (new and existing projects)
- **Claude Code detection** (success, failure, and error scenarios)
- **Project analysis** (CLAUDE.md parsing, GitHub integration)
- **Cross-browser compatibility** (Chrome, Firefox, Safari)
- **Accessibility compliance** (WCAG 2.1 AA standards)
- **Performance testing** (load times, API response times)

### Test Coverage

- ✅ **Frontend E2E Tests**: Complete user journeys with Playwright
- ✅ **Backend API Tests**: Endpoint testing with pytest
- ✅ **Cross-browser Tests**: Chrome, Firefox, Safari compatibility
- ✅ **Accessibility Tests**: WCAG compliance and keyboard navigation
- ✅ **Performance Tests**: Response time and load testing
- ✅ **CI/CD Integration**: Automated testing on every PR

## 🏗️ Test Architecture

```
├── frontend/e2e/                    # Frontend E2E tests
│   ├── fixtures/                    # Test fixtures and mocks
│   │   ├── auth.fixture.ts          # Authentication mocks
│   │   └── api.fixture.ts           # API endpoint mocks
│   ├── helpers/                     # Test helper functions
│   │   └── onboarding.helper.ts     # Onboarding flow helpers
│   ├── tests/                       # Test specifications
│   │   ├── onboarding-flow.spec.ts  # Complete onboarding tests
│   │   ├── claude-detection.spec.ts # Claude Code detection tests
│   │   ├── project-analysis.spec.ts # Project analysis tests
│   │   └── accessibility.spec.ts    # Accessibility tests
│   ├── utils/                       # Test utilities
│   │   └── test-utils.ts            # Common test functions
│   ├── global-setup.ts              # Global test setup
│   ├── global-teardown.ts           # Global test cleanup
│   └── test.config.js               # Environment configurations
├── backend/tests/e2e/               # Backend API tests
│   ├── test_onboarding_flow.py      # API endpoint tests
│   └── fixtures/                    # Test data fixtures
└── .github/workflows/               # CI/CD workflows
    ├── e2e-tests.yml                # Main test workflow
    └── test-report.yml              # Test reporting workflow
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and Python 3.11+
- MongoDB running locally or via Docker
- Clone the repository and install dependencies

### Installation

```bash
# Frontend dependencies
cd frontend
npm ci
npm run test:e2e:install  # Install Playwright browsers

# Backend dependencies  
cd backend
pip install -r requirements.txt
pip install pytest pytest-asyncio pytest-cov httpx
```

### Environment Setup

Create test environment files:

```bash
# Backend test environment
echo "MONGO_URL=mongodb://localhost:27017" >> backend/.env.test
echo "DB_NAME=saasit_test" >> backend/.env.test
echo "ANTHROPIC_API_KEY=test_key" >> backend/.env.test
echo "CLERK_SECRET_KEY=test_clerk_secret" >> backend/.env.test
echo "JWT_SECRET=test_jwt_secret_key" >> backend/.env.test

# Frontend test environment
echo "REACT_APP_API_URL=http://localhost:8000" >> frontend/.env.test
echo "REACT_APP_CLERK_PUBLISHABLE_KEY=pk_test_example" >> frontend/.env.test
```

## 🧪 Running Tests

### Local Development

```bash
# Run all E2E tests
npm run test:e2e

# Run tests with UI (interactive mode)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Run specific test file
npx playwright test onboarding-flow.spec.ts

# Run accessibility tests only
npm run test:e2e:accessibility

# Run cross-browser tests
npm run test:e2e:cross-browser
```

### Backend API Tests

```bash
cd backend

# Run all API tests
pytest tests/e2e/ -v

# Run specific test class
pytest tests/e2e/test_onboarding_flow.py::TestOnboardingFlow -v

# Run with coverage
pytest tests/e2e/ --cov=app --cov-report=html
```

### CI Configuration

```bash
# Run tests as they would run in CI
npm run test:e2e:ci

# Generate test reports
npm run test:e2e:report
```

## 📁 Test Structure

### Frontend Test Categories

#### 1. Onboarding Flow Tests (`onboarding-flow.spec.ts`)
Tests the complete user journey from welcome to completion:

```typescript
test('should complete onboarding for new project', async ({ authenticatedPage }) => {
  await onboardingHelper.completeOnboardingFlow({
    projectType: 'new',
    skipClaudeCode: false,
    connectGitHub: true,
    answerQuestions: true
  });
  
  await expect(authenticatedPage).toHaveURL(/\/app/);
});
```

#### 2. Claude Code Detection Tests (`claude-detection.spec.ts`)
Tests the detection system in various scenarios:

```typescript
test('should detect Claude Code when available', async ({ authenticatedPage }) => {
  await mockClaudeCodeDetection(true);
  await onboardingHelper.waitForStep('detection');
  
  await expect(authenticatedPage.locator('[data-testid="detection-result"]'))
    .toContainText('Found');
});
```

#### 3. Project Analysis Tests (`project-analysis.spec.ts`)
Tests CLAUDE.md analysis and GitHub integration:

```typescript
test('should analyze CLAUDE.md file successfully', async ({ authenticatedPage }) => {
  await onboardingHelper.waitForStep('analysis');
  
  await expect(authenticatedPage.locator('[data-testid="detected-technologies"]'))
    .toContainText('React');
});
```

#### 4. Accessibility Tests (`accessibility.spec.ts`)
Tests WCAG compliance and keyboard navigation:

```typescript
test('should support full keyboard navigation', async ({ authenticatedPage }) => {
  await onboardingHelper.navigateToOnboarding();
  
  // Tab through all interactive elements
  await authenticatedPage.keyboard.press('Tab');
  await expect(authenticatedPage.locator('button:has-text("Continue")')).toBeFocused();
});
```

### Backend Test Categories

#### 1. Complete Flow Tests
Tests API endpoints in realistic user scenarios:

```python
async def test_complete_new_project_flow(self, authenticated_client, test_user_token):
    # Step 1: Detect Claude Code
    detection_response = await authenticated_client.post(
        "/api/v1/onboarding/detect-claude-code",
        json={"check_method": "both"}
    )
    assert detection_response.status_code == 200
    
    # Step 2: Answer questions...
```

#### 2. Error Scenario Tests
Tests error handling and recovery:

```python
async def test_network_timeout_recovery(self, authenticated_client):
    with patch('app.routers.onboarding._detect_via_api') as mock_detect:
        mock_detect.side_effect = asyncio.TimeoutError("Detection timeout")
        # Test graceful timeout handling...
```

#### 3. Performance Tests
Tests API response times and concurrent users:

```python
async def test_detection_performance(self, authenticated_client):
    start_time = asyncio.get_event_loop().time()
    response = await authenticated_client.post("/api/v1/onboarding/detect-claude-code")
    duration = asyncio.get_event_loop().time() - start_time
    
    assert duration < 10.0  # Should complete within 10 seconds
```

## ✍️ Writing Tests

### Test Organization

Follow this structure for new tests:

```typescript
test.describe('Feature Name', () => {
  test.beforeEach(async ({ authenticatedPage, mockEndpoints }) => {
    // Setup common to all tests in this describe block
  });

  test.describe('Success Scenarios', () => {
    test('should handle normal case', async ({ authenticatedPage }) => {
      // Test implementation
    });
  });

  test.describe('Error Scenarios', () => {
    test('should handle error case', async ({ authenticatedPage }) => {
      // Error test implementation
    });
  });
});
```

### Using Test Helpers

Our `OnboardingHelper` class provides common operations:

```typescript
const onboardingHelper = new OnboardingHelper(authenticatedPage);

// Navigate to onboarding
await onboardingHelper.navigateToOnboarding();

// Complete specific steps
await onboardingHelper.waitForStep('welcome');
await onboardingHelper.clickContinue();
await onboardingHelper.selectProjectType('new');

// Complete entire flow
await onboardingHelper.completeOnboardingFlow({
  projectType: 'existing',
  skipClaudeCode: false,
  connectGitHub: true
});
```

### Mocking External Services

Use our fixtures for consistent mocking:

```typescript
test('my test', async ({ 
  authenticatedPage, 
  mockOnboardingEndpoints,
  mockGitHubAPI,
  mockClaudeCodeDetection 
}) => {
  await mockOnboardingEndpoints();
  await mockGitHubAPI();
  await mockClaudeCodeDetection(true);
  
  // Test implementation with mocked services
});
```

### Test Data Management

Use the centralized test configuration:

```typescript
import { getConfig } from '../test.config.js';

const config = getConfig();
const testUser = config.testData.users.premium;
const mockResponse = config.testData.mockResponses.claudeCodeDetection.found;
```

## 🚀 CI/CD Integration

### GitHub Actions Workflow

Our CI workflow runs on every push and PR:

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests
on: [push, pull_request]

jobs:
  backend-tests:    # API tests with pytest
  frontend-e2e:     # E2E tests with Playwright  
  cross-browser:    # Multi-browser testing
  accessibility:    # WCAG compliance tests
  performance:      # Load and response time tests
```

### Test Environments

- **Local**: Full development environment with hot reload
- **CI**: Headless testing with MongoDB service
- **Staging**: End-to-end testing against staging environment
- **Production**: Smoke tests only (no data modification)

### Artifact Collection

The CI system automatically collects:

- 📊 Test reports (HTML, JUnit, JSON)
- 📸 Screenshots of failures
- 🎥 Videos of test runs
- 📈 Coverage reports
- ♿ Accessibility audit results

## 🐛 Debugging

### Local Debugging

```bash
# Run tests in debug mode
npm run test:e2e:debug

# Run with headed browser to see what's happening
npm run test:e2e:headed

# Generate trace files for analysis
npx playwright test --trace on
```

### Using the Playwright Inspector

```bash
# Open Playwright inspector
npx playwright test --debug

# Pause test execution for manual inspection
await page.pause();
```

### Common Debug Commands

```typescript
// Take screenshot for manual review
await page.screenshot({ path: 'debug.png', fullPage: true });

// Print current page content
console.log(await page.content());

// Wait and inspect element state
await page.locator('[data-testid="my-element"]').click();
await page.waitForTimeout(1000); // Brief pause to see result
```

### CI Debugging

When tests fail in CI:

1. **Check the workflow logs** for error messages
2. **Download artifacts** (screenshots, videos, reports)
3. **Review the HTML report** for detailed failure information
4. **Check timing issues** - CI environments are slower

## 📋 Best Practices

### 1. Test Independence
- Each test should work in isolation
- Use `test.beforeEach` for setup
- Don't depend on state from other tests

### 2. Reliable Selectors
```typescript
// Good: Use data-testid attributes
await page.locator('[data-testid="submit-button"]').click();

// Better: Use semantic selectors when possible
await page.locator('button:has-text("Submit")').click();

// Avoid: Fragile CSS selectors
await page.locator('.btn.btn-primary.submit').click(); // ❌
```

### 3. Waiting Strategies
```typescript
// Wait for element to appear
await page.waitForSelector('[data-testid="result"]');

// Wait for network requests to complete
await page.waitForLoadState('networkidle');

// Wait for specific condition
await page.waitForFunction(() => {
  return document.querySelector('[data-testid="loading"]') === null;
});
```

### 4. Error Handling
```typescript
test('should handle API errors gracefully', async ({ page }) => {
  // Mock API failure
  await page.route('**/api/onboarding/**', route => 
    route.fulfill({ status: 500 })
  );
  
  await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  await expect(page.locator('button:has-text("Try Again")')).toBeEnabled();
});
```

### 5. Performance Considerations
```typescript
// Use timeouts appropriate for the action
await page.waitForSelector('[data-testid="result"]', { timeout: 30000 });

// Batch similar operations
await page.evaluate(() => {
  // Multiple DOM operations in one evaluate call
  localStorage.setItem('key1', 'value1');
  localStorage.setItem('key2', 'value2');
  sessionStorage.clear();
});
```

## 🔧 Troubleshooting

### Common Issues

#### Test Timeouts
```bash
# Increase timeout for slow operations
await page.waitForSelector('[data-testid="slow-element"]', { 
  timeout: 60000 
});

# Check for network issues
await page.waitForLoadState('networkidle');
```

#### Flaky Tests
```typescript
// Add retry logic for flaky interactions
await expect(async () => {
  await page.locator('button').click();
  await expect(page.locator('[data-testid="result"]')).toBeVisible();
}).toPass({ timeout: 30000 });
```

#### CI vs Local Differences
- **Timing**: CI is slower, increase timeouts
- **Screen size**: Set consistent viewport sizes
- **Resources**: CI has limited CPU/memory
- **Networking**: Mock external services

#### Authentication Issues
```typescript
// Ensure Clerk is properly mocked
await page.addInitScript(() => {
  window.Clerk = {
    user: { id: 'test_user' },
    session: { getToken: () => 'mock_token' },
    isLoaded: true,
    isSignedIn: true
  };
});
```

### Getting Help

1. **Check the logs** in GitHub Actions workflow
2. **Review test artifacts** (screenshots, videos, reports)
3. **Run tests locally** to reproduce issues
4. **Use Playwright Inspector** for step-by-step debugging
5. **Check configuration** files for environment-specific settings

### Performance Optimization

#### Test Execution Speed
```typescript
// Run tests in parallel
test.describe.configure({ mode: 'parallel' });

// Skip non-critical tests in CI
test.skip(process.env.CI && !process.env.FULL_TEST_SUITE, 'Skipping in CI');

// Use page.goto with waitUntil options
await page.goto('/onboarding', { waitUntil: 'domcontentloaded' });
```

#### Resource Management
```typescript
// Close unnecessary pages/contexts
await context.close();

// Use lighthouse for performance audits
import { playAudit } from 'playwright-lighthouse';
await playAudit({
  page,
  thresholds: {
    performance: 50,
    accessibility: 90
  }
});
```

## 📈 Metrics and Reporting

### Test Coverage Metrics
- **Frontend E2E Coverage**: User journey completion rates
- **Backend API Coverage**: Endpoint and error scenario coverage  
- **Accessibility Coverage**: WCAG 2.1 AA compliance percentage
- **Cross-browser Coverage**: Feature compatibility across browsers

### Performance Benchmarks
- **Page Load Time**: < 3 seconds
- **API Response Time**: < 5 seconds  
- **Detection Time**: < 10 seconds
- **Analysis Time**: < 15 seconds

### Success Criteria
- ✅ **99%** of core user journeys must pass
- ✅ **95%** accessibility compliance score
- ✅ **100%** critical API endpoints covered
- ✅ **Zero** security vulnerabilities in dependencies

---

## 🎯 Quick Reference

### Essential Commands
```bash
# Development
npm run test:e2e              # Run all E2E tests
npm run test:e2e:ui           # Interactive mode
npm run test:e2e:debug        # Debug mode

# CI/Production
npm run test:e2e:ci           # CI configuration
npm run test:e2e:cross-browser # Multi-browser testing
npm run test:e2e:accessibility # Accessibility testing

# Backend
pytest tests/e2e/ -v         # Run API tests
pytest --cov=app --cov-report=html # With coverage
```

### Key Files
- `playwright.config.ts` - Main Playwright configuration
- `playwright.ci.config.ts` - CI-optimized configuration
- `e2e/test.config.js` - Environment and test data configuration
- `e2e/helpers/onboarding.helper.ts` - Main test helper class
- `e2e/utils/test-utils.ts` - Common utility functions

### Test Data Locations
- Mock API responses: `e2e/test.config.js`
- Test fixtures: `backend/tests/fixtures/`
- Authentication mocks: `e2e/fixtures/auth.fixture.ts`
- API mocks: `e2e/fixtures/api.fixture.ts`

This comprehensive testing suite ensures SaasIt.ai's onboarding system provides a reliable, accessible, and performant user experience across all platforms and scenarios.