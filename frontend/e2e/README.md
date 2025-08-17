# E2E Tests Quick Start Guide

## 🚀 Quick Commands

```bash
# Install and setup
npm run test:e2e:install     # Install Playwright browsers
npm run test:e2e             # Run all tests
npm run test:e2e:ui          # Interactive mode with UI
npm run test:e2e:headed      # See browser while testing
npm run test:e2e:debug       # Debug failed tests

# Specific test types
npm run test:e2e:accessibility    # Accessibility tests only
npm run test:e2e:cross-browser   # All browsers (Chrome, Firefox, Safari)
npm run test:e2e:ci              # CI configuration (headless)
```

## 📁 File Structure

```
e2e/
├── fixtures/           # Test mocks and data
├── helpers/           # Reusable test functions  
├── tests/             # Test specifications
├── utils/             # Common utilities
└── global-setup.ts   # Test environment setup
```

## 🧪 Writing Your First Test

```typescript
import { test, expect } from '../fixtures/auth.fixture';
import { OnboardingHelper } from '../helpers/onboarding.helper';

test('my new feature', async ({ authenticatedPage, mockOnboardingEndpoints }) => {
  const helper = new OnboardingHelper(authenticatedPage);
  await mockOnboardingEndpoints();
  
  await helper.navigateToOnboarding();
  await helper.waitForStep('welcome');
  
  await expect(authenticatedPage.locator('h1')).toContainText('Welcome');
});
```

## 🔧 Common Patterns

### Using the OnboardingHelper

```typescript
const helper = new OnboardingHelper(authenticatedPage);

// Navigate through onboarding
await helper.navigateToOnboarding();
await helper.waitForStep('detection');
await helper.handleClaudeCodeDetection(true);
await helper.selectProjectType('new');
await helper.clickContinue();

// Complete full flow
await helper.completeOnboardingFlow({
  projectType: 'existing',
  skipClaudeCode: false,
  connectGitHub: true,
  answerQuestions: true
});
```

### Mocking APIs

```typescript
test('test with mocks', async ({ 
  authenticatedPage,
  mockOnboardingEndpoints,
  mockGitHubAPI,
  mockClaudeCodeDetection 
}) => {
  await mockOnboardingEndpoints();
  await mockGitHubAPI(); 
  await mockClaudeCodeDetection(true); // or false for failure
  
  // Your test logic here
});
```

### Custom Selectors

```typescript
// Use data-testid attributes (preferred)
await page.locator('[data-testid="submit-button"]').click();

// Use text content when appropriate
await page.locator('button:has-text("Continue")').click();

// Wait for elements to appear
await page.waitForSelector('[data-testid="result"]');
```

## 🐛 Debugging Tips

### See What's Happening
```bash
npm run test:e2e:headed    # Watch browser during test
npm run test:e2e:debug     # Step through with debugger
```

### Debug in Code
```typescript
// Pause execution for manual inspection
await page.pause();

// Take screenshots
await page.screenshot({ path: 'debug.png', fullPage: true });

// Log page content
console.log(await page.textContent('body'));
```

### Common Issues

**Test timeouts?**
```typescript
// Increase timeout for slow operations
await page.waitForSelector('[data-testid="slow-element"]', { timeout: 30000 });
```

**Element not found?**
```typescript
// Wait for page to load completely
await page.waitForLoadState('networkidle');

// Check if element exists before interacting
const element = page.locator('[data-testid="my-element"]');
await expect(element).toBeVisible();
await element.click();
```

**Authentication issues?**
```typescript
// Use the auth fixture
test('my test', async ({ authenticatedPage }) => {
  // authenticatedPage already has mock Clerk auth
});
```

## 📊 Test Categories

### Core Flow Tests (`onboarding-flow.spec.ts`)
- Complete user journeys
- New vs existing project flows  
- Skip and error scenarios

### Detection Tests (`claude-detection.spec.ts`) 
- Claude Code installation detection
- Success, failure, and timeout scenarios
- Retry and skip functionality

### Analysis Tests (`project-analysis.spec.ts`)
- CLAUDE.md file parsing
- GitHub repository integration
- Technology detection and recommendations

### Accessibility Tests (`accessibility.spec.ts`)
- Keyboard navigation
- Screen reader support
- WCAG compliance
- Color contrast and zoom support

## 🚨 Test Requirements

### Before Committing
```bash
# Run the full test suite
npm run test:e2e

# Check accessibility
npm run test:e2e:accessibility

# Test across browsers (optional locally)
npm run test:e2e:cross-browser
```

### Data-TestId Convention
Always add `data-testid` attributes to interactive elements:

```jsx
// Good
<button data-testid="submit-button" onClick={handleClick}>
  Submit
</button>

// Also good for step containers
<div data-testid="onboarding-step-welcome">
  Welcome content
</div>
```

### Performance Guidelines
- Keep tests under 30 seconds each
- Use `waitForLoadState('networkidle')` for page loads
- Mock external APIs consistently
- Avoid unnecessary `page.waitForTimeout()` calls

## 🔗 Related Files

- **Main Config**: `playwright.config.ts`
- **CI Config**: `playwright.ci.config.ts` 
- **Test Data**: `test.config.js`
- **Backend Tests**: `../backend/tests/e2e/`
- **Full Documentation**: `../docs/TESTING.md`

## 🆘 Need Help?

1. Check the [full testing documentation](../docs/TESTING.md)
2. Look at existing tests for examples
3. Use `npm run test:e2e:debug` to step through issues
4. Check GitHub Actions logs for CI failures

Happy testing! 🧪✨