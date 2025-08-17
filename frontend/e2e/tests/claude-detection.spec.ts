import { test, expect } from '../fixtures/auth.fixture';
import { OnboardingHelper } from '../helpers/onboarding.helper';

test.describe('Claude Code Detection', () => {
  let onboardingHelper: OnboardingHelper;
  
  test.beforeEach(async ({ authenticatedPage, mockOnboardingEndpoints }) => {
    onboardingHelper = new OnboardingHelper(authenticatedPage);
    await mockOnboardingEndpoints();
    
    // Navigate to detection step
    await onboardingHelper.navigateToOnboarding();
    await onboardingHelper.waitForStep('welcome');
    await onboardingHelper.clickContinue();
    await onboardingHelper.waitForStep('detection');
  });

  test.describe('Successful Detection', () => {
    test('should detect Claude Code when available', async ({ authenticatedPage, mockClaudeCodeDetection }) => {
      await mockClaudeCodeDetection(true);
      
      await test.step('Show detection in progress', async () => {
        await expect(authenticatedPage.locator('[data-testid="detection-status"]')).toContainText('Detecting');
        await expect(authenticatedPage.locator('.animate-spin')).toBeVisible();
      });

      await test.step('Show successful detection', async () => {
        await authenticatedPage.waitForTimeout(3000); // Wait for detection
        
        await expect(authenticatedPage.locator('[data-testid="detection-result"]')).toContainText('Found');
        await expect(authenticatedPage.locator('.text-green-500, .bg-green-500')).toBeVisible();
        await expect(authenticatedPage.locator('text=Claude Code v1.0.0')).toBeVisible();
      });

      await test.step('Show appropriate next steps', async () => {
        await expect(authenticatedPage.locator('button:has-text("Continue")')).toBeEnabled();
        await expect(authenticatedPage.locator('text=Great! Claude Code is ready')).toBeVisible();
      });

      await test.step('Allow continuing to next step', async () => {
        await onboardingHelper.clickContinue();
        await expect(onboardingHelper.getCurrentStep()).resolves.toBe('project-type');
      });
    });

    test('should show detection details and capabilities', async ({ authenticatedPage, mockClaudeCodeDetection }) => {
      await mockClaudeCodeDetection(true);
      await authenticatedPage.waitForTimeout(3000);
      
      await test.step('Display detection method', async () => {
        await expect(authenticatedPage.locator('text=Detected via API')).toBeVisible();
        await expect(authenticatedPage.locator('text=Port: 3001')).toBeVisible();
      });

      await test.step('Show capabilities overview', async () => {
        const capabilities = [
          'File operations',
          'Terminal commands', 
          'API integration',
          'Real-time execution'
        ];
        
        for (const capability of capabilities) {
          await expect(authenticatedPage.locator(`text=${capability}`)).toBeVisible();
        }
      });
    });
  });

  test.describe('Failed Detection', () => {
    test('should handle Claude Code not found', async ({ authenticatedPage, mockClaudeCodeDetection }) => {
      await mockClaudeCodeDetection(false);
      
      await test.step('Show detection failure', async () => {
        await authenticatedPage.waitForTimeout(3000);
        
        await expect(authenticatedPage.locator('[data-testid="detection-result"]')).toContainText('Not Found');
        await expect(authenticatedPage.locator('.text-red-500, .bg-red-500')).toBeVisible();
      });

      await test.step('Show installation instructions', async () => {
        await expect(authenticatedPage.locator('text=Install Claude Code')).toBeVisible();
        await expect(authenticatedPage.locator('text=https://claude.ai/code')).toBeVisible();
        await expect(authenticatedPage.locator('text=Ensure Claude Code is in your PATH')).toBeVisible();
      });

      await test.step('Provide installation help', async () => {
        const helpButton = authenticatedPage.locator('button:has-text("Installation Help")');
        if (await helpButton.isVisible()) {
          await helpButton.click();
          await expect(authenticatedPage.locator('text=Installation Guide')).toBeVisible();
        }
      });

      await test.step('Allow skipping or retrying', async () => {
        await expect(authenticatedPage.locator('button:has-text("Skip")')).toBeEnabled();
        await expect(authenticatedPage.locator('button:has-text("Try Again")')).toBeEnabled();
      });
    });

    test('should allow retrying detection', async ({ authenticatedPage, mockClaudeCodeDetection }) => {
      await mockClaudeCodeDetection(false);
      await authenticatedPage.waitForTimeout(3000);
      
      await test.step('Retry detection', async () => {
        const retryButton = authenticatedPage.locator('button:has-text("Try Again")');
        await retryButton.click();
        
        await expect(authenticatedPage.locator('[data-testid="detection-status"]')).toContainText('Detecting');
        await expect(authenticatedPage.locator('.animate-spin')).toBeVisible();
      });

      await test.step('Mock successful detection on retry', async () => {
        await mockClaudeCodeDetection(true);
        await authenticatedPage.waitForTimeout(3000);
        
        await expect(authenticatedPage.locator('[data-testid="detection-result"]')).toContainText('Found');
        await expect(authenticatedPage.locator('.text-green-500')).toBeVisible();
      });
    });
  });

  test.describe('Detection Methods', () => {
    test('should try multiple detection methods', async ({ authenticatedPage }) => {
      await test.step('Show detection methods being tried', async () => {
        // Mock API to show different detection attempts
        await authenticatedPage.route('**/api/v1/onboarding/detect-claude-code', async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              has_claude_code: true,
              version: '1.0.0',
              status: 'found',
              detection_method: 'command',
              additional_info: {
                command: 'claude-code --version',
                output: 'claude-code@1.0.0'
              }
            })
          });
        });
        
        await authenticatedPage.waitForTimeout(3000);
        
        await expect(authenticatedPage.locator('text=Detected via command line')).toBeVisible();
      });
    });

    test('should handle partial detection results', async ({ authenticatedPage }) => {
      await authenticatedPage.route('**/api/v1/onboarding/detect-claude-code', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            has_claude_code: true,
            version: null,
            status: 'found',
            detection_method: 'api',
            additional_info: {
              port: 3001,
              endpoint: 'http://localhost:3001/health',
              note: 'Version information not available'
            }
          })
        });
      });
      
      await authenticatedPage.waitForTimeout(3000);
      
      await test.step('Show detection with missing version', async () => {
        await expect(authenticatedPage.locator('[data-testid="detection-result"]')).toContainText('Found');
        await expect(authenticatedPage.locator('text=Version information not available')).toBeVisible();
        await expect(authenticatedPage.locator('button:has-text("Continue")')).toBeEnabled();
      });
    });
  });

  test.describe('Error Scenarios', () => {
    test('should handle detection API errors', async ({ authenticatedPage }) => {
      await authenticatedPage.route('**/api/v1/onboarding/detect-claude-code', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: 'Detection service temporarily unavailable'
          })
        });
      });
      
      await test.step('Show error state', async () => {
        await authenticatedPage.waitForTimeout(3000);
        
        await expect(authenticatedPage.locator('[data-testid="detection-error"]')).toBeVisible();
        await expect(authenticatedPage.locator('text=Detection failed')).toBeVisible();
        await expect(authenticatedPage.locator('text=temporarily unavailable')).toBeVisible();
      });

      await test.step('Provide error recovery options', async () => {
        await expect(authenticatedPage.locator('button:has-text("Try Again")')).toBeEnabled();
        await expect(authenticatedPage.locator('button:has-text("Skip")')).toBeEnabled();
        await expect(authenticatedPage.locator('button:has-text("Continue Anyway")')).toBeEnabled();
      });
    });

    test('should handle timeout during detection', async ({ authenticatedPage }) => {
      // Mock slow API response
      await authenticatedPage.route('**/api/v1/onboarding/detect-claude-code', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second delay
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            has_claude_code: false,
            status: 'not-found'
          })
        });
      });
      
      await test.step('Show timeout handling', async () => {
        // Wait for timeout indicator
        await expect(authenticatedPage.locator('text=Detection taking longer than expected')).toBeVisible({ timeout: 8000 });
        await expect(authenticatedPage.locator('button:has-text("Skip")')).toBeEnabled();
      });
    });
  });

  test.describe('User Experience', () => {
    test('should provide clear feedback during detection', async ({ authenticatedPage, mockClaudeCodeDetection }) => {
      await test.step('Show loading state', async () => {
        await expect(authenticatedPage.locator('[data-testid="detection-status"]')).toContainText('Detecting');
        await expect(authenticatedPage.locator('.animate-spin')).toBeVisible();
        await expect(authenticatedPage.locator('text=Looking for Claude Code installation')).toBeVisible();
      });

      await test.step('Show detection progress', async () => {
        // Should show what methods are being tried
        await expect(authenticatedPage.locator('text=Checking local API, text=Checking command line')).toBeVisible();
      });

      await mockClaudeCodeDetection(true);
      await authenticatedPage.waitForTimeout(3000);

      await test.step('Show success with clear next steps', async () => {
        await expect(authenticatedPage.locator('[data-testid="detection-result"]')).toContainText('Found');
        await expect(authenticatedPage.locator('text=You\'re all set to create AI workflows')).toBeVisible();
      });
    });

    test('should be accessible', async ({ authenticatedPage, mockClaudeCodeDetection }) => {
      await mockClaudeCodeDetection(true);
      await authenticatedPage.waitForTimeout(3000);
      
      await test.step('Check accessibility attributes', async () => {
        // Status should be announced to screen readers
        const statusElement = authenticatedPage.locator('[data-testid="detection-result"]');
        await expect(statusElement).toHaveAttribute('aria-live', 'polite');
        
        // Buttons should have proper labels
        const continueButton = authenticatedPage.locator('button:has-text("Continue")');
        await expect(continueButton).toBeEnabled();
        await expect(continueButton).toHaveAccessibleName();
      });

      await test.step('Check keyboard navigation', async () => {
        // Should be able to navigate with keyboard
        await authenticatedPage.keyboard.press('Tab');
        await expect(authenticatedPage.locator('button:has-text("Continue")')).toBeFocused();
        
        await authenticatedPage.keyboard.press('Enter');
        await expect(onboardingHelper.getCurrentStep()).resolves.toBe('project-type');
      });
    });
  });

  test.describe('Skip Functionality', () => {
    test('should allow skipping detection step', async ({ authenticatedPage, mockClaudeCodeDetection }) => {
      await mockClaudeCodeDetection(false);
      await authenticatedPage.waitForTimeout(3000);
      
      await test.step('Show skip option', async () => {
        await expect(authenticatedPage.locator('button:has-text("Skip")')).toBeEnabled();
      });

      await test.step('Skip with confirmation', async () => {
        await authenticatedPage.locator('button:has-text("Skip")').click();
        
        // Should show skip confirmation
        await expect(authenticatedPage.locator('text=Skip Tool Detection?')).toBeVisible();
        await expect(authenticatedPage.locator('text=You can always configure Claude Code later')).toBeVisible();
        
        await authenticatedPage.locator('button:has-text("Skip Step")').click();
      });

      await test.step('Continue to next step', async () => {
        await expect(onboardingHelper.getCurrentStep()).resolves.toBe('project-type');
      });
    });

    test('should remember skip choice for future sessions', async ({ authenticatedPage }) => {
      await test.step('Skip detection', async () => {
        await onboardingHelper.clickSkip();
        await authenticatedPage.locator('button:has-text("Skip Step")').click();
      });

      await test.step('Verify skip is recorded', async () => {
        // Should make API call to save skip choice
        await authenticatedPage.waitForResponse(response => 
          response.url().includes('/save-progress') && response.status() === 200
        );
      });
    });
  });
});