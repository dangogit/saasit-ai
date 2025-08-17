import { Page, expect } from '@playwright/test';
import { getConfig } from '../test.config.js';

const config = getConfig();

/**
 * Test utilities for common operations across E2E tests
 */

/**
 * Wait for application to be fully loaded
 */
export async function waitForAppReady(page: Page) {
  // Wait for main app container
  await page.waitForSelector('[data-testid="app-container"], main, #root', {
    timeout: config.current.timeout
  });
  
  // Wait for any initial loading to complete
  await page.waitForFunction(() => {
    // Check if there are any loading spinners
    const spinners = document.querySelectorAll('.animate-spin, .loading, [data-testid*="loading"]');
    return spinners.length === 0;
  }, { timeout: 5000 });
  
  // Wait for network idle to ensure all initial requests are complete
  await page.waitForLoadState('networkidle');
}

/**
 * Mock Clerk authentication for testing
 */
export async function mockClerkAuth(page: Page, userType: 'free' | 'premium' = 'free') {
  const userData = config.testData.users[userType];
  
  await page.addInitScript((user) => {
    // Mock Clerk user object
    (window as any).Clerk = {
      user: {
        id: `test_${user.tier}_user`,
        emailAddresses: [{ emailAddress: user.email }],
        publicMetadata: { tier: user.tier }
      },
      session: {
        getToken: async () => `mock_jwt_token_${user.tier}`,
        id: `session_${user.tier}`
      },
      isLoaded: true,
      isSignedIn: true
    };
    
    // Mock authentication check
    (window as any).ClerkLoaded = true;
  }, userData);
}

/**
 * Mock API endpoints for consistent testing
 */
export async function mockOnboardingAPI(page: Page) {
  // Mock Claude Code detection
  await page.route('**/api/v1/onboarding/detect-claude-code', async (route) => {
    const found = Math.random() > 0.5; // Random success/failure for realistic testing
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(found ? 
        config.testData.mockResponses.claudeCodeDetection.found :
        config.testData.mockResponses.claudeCodeDetection.notFound
      )
    });
  });

  // Mock project analysis
  await page.route('**/api/v1/onboarding/analyze-claude-md', async (route) => {
    const isComplex = Math.random() > 0.7; // Mostly simple projects
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(isComplex ?
        config.testData.mockResponses.projectAnalysis.complex :
        config.testData.mockResponses.projectAnalysis.simple
      )
    });
  });

  // Mock question flow
  await page.route('**/api/v1/onboarding/next-question', async (route) => {
    const request = route.request();
    const body = request.postDataJSON();
    
    // Simple question flow simulation
    const questions = ['project_goal', 'target_users', 'timeline', 'experience'];
    const currentIndex = questions.indexOf(body.question_id);
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < questions.length) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          question_id: questions[nextIndex],
          question: `Test question ${nextIndex + 1}`,
          question_type: 'single_choice',
          options: ['Option A', 'Option B', 'Option C'],
          is_final: false
        })
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          is_final: true,
          recommendations: 'Test recommendations based on your answers'
        })
      });
    }
  });

  // Mock save progress
  await page.route('**/api/v1/onboarding/save-progress', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        saved_at: new Date().toISOString()
      })
    });
  });

  // Mock resume progress
  await page.route('**/api/v1/onboarding/resume-progress', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        has_saved_progress: false,
        progress_data: null
      })
    });
  });
}

/**
 * Mock GitHub API for testing
 */
export async function mockGitHubAPI(page: Page) {
  // Mock user repositories
  await page.route('**/api.github.com/user/repos*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 123456,
          name: 'test-repo',
          full_name: 'testuser/test-repo',
          description: 'A test repository for E2E testing',
          private: false,
          html_url: 'https://github.com/testuser/test-repo',
          language: 'JavaScript',
          stargazers_count: 42,
          forks_count: 5,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-12-01T00:00:00Z'
        }
      ])
    });
  });

  // Mock CLAUDE.md file content
  await page.route('**/api.github.com/**/contents/CLAUDE.md', async (route) => {
    const claudeMdContent = `# Test Project

## Overview
This is a test project for E2E testing.

## Tech Stack
- React
- FastAPI  
- MongoDB
- Tailwind CSS

## Architecture
Modern full-stack web application.`;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        name: 'CLAUDE.md',
        content: btoa(claudeMdContent),
        encoding: 'base64'
      })
    });
  });
}

/**
 * Check for accessibility violations
 */
export async function checkAccessibility(page: Page, testName: string) {
  // Basic accessibility checks
  const violations = await page.evaluate(() => {
    const issues: string[] = [];
    
    // Check for missing alt text on images
    const images = document.querySelectorAll('img:not([alt])');
    if (images.length > 0) {
      issues.push(`${images.length} images missing alt text`);
    }
    
    // Check for headings structure
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headings.length === 0) {
      issues.push('No heading elements found');
    }
    
    // Check for form labels
    const inputs = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])');
    const unlabeledInputs = Array.from(inputs).filter(input => {
      const labels = document.querySelectorAll(`label[for="${input.id}"]`);
      return labels.length === 0 && !input.closest('label');
    });
    
    if (unlabeledInputs.length > 0) {
      issues.push(`${unlabeledInputs.length} inputs missing labels`);
    }
    
    return issues;
  });
  
  if (violations.length > 0) {
    console.warn(`Accessibility issues found in ${testName}:`, violations);
  }
  
  return violations;
}

/**
 * Take screenshot for debugging
 */
export async function takeDebugScreenshot(page: Page, name: string) {
  if (process.env.DEBUG_SCREENSHOTS) {
    await page.screenshot({
      path: `test-results/debug-${name}-${Date.now()}.png`,
      fullPage: true
    });
  }
}

/**
 * Wait for element with timeout and helpful error message
 */
export async function waitForElement(
  page: Page, 
  selector: string, 
  options: { timeout?: number; state?: 'visible' | 'hidden' | 'attached' | 'detached' } = {}
) {
  try {
    await page.waitForSelector(selector, {
      timeout: options.timeout || config.current.timeout,
      state: options.state || 'visible'
    });
  } catch (error) {
    // Take screenshot for debugging
    await takeDebugScreenshot(page, `element-not-found-${selector.replace(/[^a-zA-Z0-9]/g, '-')}`);
    
    // Provide helpful error message
    const elements = await page.locator(selector).count();
    throw new Error(
      `Element "${selector}" not found. ` +
      `Found ${elements} matching elements. ` +
      `Current URL: ${page.url()}`
    );
  }
}

/**
 * Performance measurement utilities
 */
export async function measurePerformance(page: Page, action: () => Promise<void>) {
  const startTime = performance.now();
  await action();
  const endTime = performance.now();
  return endTime - startTime;
}

/**
 * Custom expect matchers for common assertions
 */
export async function expectToBeOnboardingStep(page: Page, step: string) {
  await waitForElement(page, `[data-testid="onboarding-step-${step}"]`);
  await expect(page.locator(`[data-testid="onboarding-step-${step}"]`)).toBeVisible();
}

export async function expectOnboardingProgress(page: Page, expectedProgress: number) {
  const progressElement = page.locator('[data-testid="onboarding-progress"]');
  await expect(progressElement).toBeVisible();
  
  const actualProgress = await progressElement.getAttribute('aria-valuenow');
  expect(Number(actualProgress)).toBeCloseTo(expectedProgress, 0);
}

/**
 * Clean up test data
 */
export async function cleanupTestData(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Generate test IDs for dynamic content
 */
export function generateTestId(prefix: string, suffix?: string) {
  const timestamp = Date.now();
  return suffix ? `${prefix}-${suffix}-${timestamp}` : `${prefix}-${timestamp}`;
}