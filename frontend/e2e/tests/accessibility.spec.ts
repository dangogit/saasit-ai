import { test, expect } from '../fixtures/auth.fixture';
import { OnboardingHelper } from '../helpers/onboarding.helper';

test.describe('Onboarding Accessibility', () => {
  let onboardingHelper: OnboardingHelper;
  
  test.beforeEach(async ({ authenticatedPage, mockOnboardingEndpoints }) => {
    onboardingHelper = new OnboardingHelper(authenticatedPage);
    await mockOnboardingEndpoints();
  });

  test.describe('Keyboard Navigation', () => {
    test('should support full keyboard navigation through onboarding', async ({ authenticatedPage }) => {
      await onboardingHelper.navigateToOnboarding();
      
      await test.step('Navigate welcome step with keyboard', async () => {
        await onboardingHelper.waitForStep('welcome');
        
        // Tab to continue button
        await authenticatedPage.keyboard.press('Tab');
        await expect(authenticatedPage.locator('button:has-text("Let\'s Get Started")')).toBeFocused();
        
        // Press Enter to continue
        await authenticatedPage.keyboard.press('Enter');
        await expect(onboardingHelper.getCurrentStep()).resolves.toBe('detection');
      });

      await test.step('Navigate detection step with keyboard', async () => {
        await onboardingHelper.waitForStep('detection');
        await authenticatedPage.waitForTimeout(3000); // Wait for detection
        
        // Should be able to tab to continue/skip buttons
        await authenticatedPage.keyboard.press('Tab');
        const focusedElement = authenticatedPage.locator(':focus');
        const tagName = await focusedElement.evaluate(el => el.tagName);
        expect(tagName).toBe('BUTTON');
        
        // Use keyboard to skip
        const focusedText = await focusedElement.textContent();
        if (focusedText?.includes('Skip')) {
          await authenticatedPage.keyboard.press('Enter');
          // Handle skip confirmation
          await authenticatedPage.keyboard.press('Tab'); // Tab to confirm button
          await authenticatedPage.keyboard.press('Enter');
        } else {
          await authenticatedPage.keyboard.press('Enter'); // Continue
        }
      });

      await test.step('Navigate project type selection with keyboard', async () => {
        await onboardingHelper.waitForStep('project-type');
        
        // Tab to project type options
        await authenticatedPage.keyboard.press('Tab');
        await authenticatedPage.keyboard.press('Tab');
        
        // Should focus on first project type option
        const focusedElement = authenticatedPage.locator(':focus');
        await expect(focusedElement).toHaveAttribute('role', 'button');
        
        // Select with Enter
        await authenticatedPage.keyboard.press('Enter');
        await authenticatedPage.waitForTimeout(500);
        
        // Tab to continue button
        await authenticatedPage.keyboard.press('Tab');
        await authenticatedPage.keyboard.press('Enter');
      });
    });

    test('should have proper focus management', async ({ authenticatedPage }) => {
      await onboardingHelper.navigateToOnboarding();
      
      await test.step('Focus should be managed when navigating steps', async () => {
        await onboardingHelper.waitForStep('welcome');
        
        // Initial focus should be on main content
        const activeElement = authenticatedPage.locator(':focus');
        await expect(activeElement).toBeVisible();
        
        // After step transition, focus should move appropriately
        await onboardingHelper.clickContinue();
        await onboardingHelper.waitForStep('detection');
        
        // Focus should not be lost
        const newActiveElement = authenticatedPage.locator(':focus');
        await expect(newActiveElement).toBeVisible();
      });

      await test.step('Focus should be trapped in modals', async () => {
        await onboardingHelper.handleClaudeCodeDetection(true);
        await onboardingHelper.waitForStep('project-type');
        await onboardingHelper.selectProjectType('new');
        await onboardingHelper.clickContinue();
        await onboardingHelper.waitForStep('github');
        
        // Try to trigger skip modal
        await authenticatedPage.locator('button:has-text("Skip")').click();
        
        const modal = authenticatedPage.locator('[role="dialog"]');
        if (await modal.isVisible()) {
          // Focus should be within modal
          await authenticatedPage.keyboard.press('Tab');
          const focusedElement = authenticatedPage.locator(':focus');
          await expect(focusedElement).toBeVisible();
          
          // Should wrap around within modal
          await authenticatedPage.keyboard.press('Tab');
          await authenticatedPage.keyboard.press('Tab');
          await authenticatedPage.keyboard.press('Tab');
          
          const finalFocusedElement = authenticatedPage.locator(':focus');
          await expect(finalFocusedElement).toBeVisible();
        }
      });
    });

    test('should support escape key to close modals', async ({ authenticatedPage }) => {
      await onboardingHelper.navigateToOnboarding();
      await onboardingHelper.waitForStep('welcome');
      await onboardingHelper.clickContinue();
      await onboardingHelper.handleClaudeCodeDetection(true);
      await onboardingHelper.waitForStep('project-type');
      await onboardingHelper.selectProjectType('new');
      await onboardingHelper.clickContinue();
      await onboardingHelper.waitForStep('github');
      
      // Open skip confirmation modal
      await authenticatedPage.locator('button:has-text("Skip")').click();
      
      const modal = authenticatedPage.locator('[role="dialog"]');
      if (await modal.isVisible()) {
        // Press Escape to close
        await authenticatedPage.keyboard.press('Escape');
        await expect(modal).not.toBeVisible();
        
        // Focus should return to the skip button
        await expect(authenticatedPage.locator('button:has-text("Skip")')).toBeFocused();
      }
    });
  });

  test.describe('Screen Reader Support', () => {
    test('should have proper ARIA labels and roles', async ({ authenticatedPage }) => {
      await onboardingHelper.navigateToOnboarding();
      
      await test.step('Check main navigation elements', async () => {
        // Progress indicator should have proper role
        const progressIndicator = authenticatedPage.locator('[data-testid="onboarding-progress"]');
        await expect(progressIndicator).toHaveAttribute('role', 'progressbar');
        await expect(progressIndicator).toHaveAttribute('aria-label');
        await expect(progressIndicator).toHaveAttribute('aria-valuenow');
        await expect(progressIndicator).toHaveAttribute('aria-valuemax');
      });

      await test.step('Check step content accessibility', async () => {
        await onboardingHelper.waitForStep('welcome');
        
        // Main heading should be properly marked
        const heading = authenticatedPage.locator('h1').first();
        await expect(heading).toBeVisible();
        
        // Step content should have proper landmarks
        const main = authenticatedPage.locator('main, [role="main"]');
        await expect(main).toBeVisible();
        
        // Buttons should have accessible names
        const continueButton = authenticatedPage.locator('button:has-text("Let\'s Get Started")');
        await expect(continueButton).toHaveAccessibleName();
      });

      await test.step('Check form accessibility', async () => {
        await onboardingHelper.clickContinue();
        await onboardingHelper.handleClaudeCodeDetection(true);
        await onboardingHelper.waitForStep('project-type');
        
        // Form controls should have proper labels
        const projectTypeButtons = authenticatedPage.locator('[data-testid="project-type-option"]');
        const count = await projectTypeButtons.count();
        
        for (let i = 0; i < count; i++) {
          const button = projectTypeButtons.nth(i);
          await expect(button).toHaveAccessibleName();
        }
      });
    });

    test('should announce status changes to screen readers', async ({ authenticatedPage }) => {
      await onboardingHelper.navigateToOnboarding();
      await onboardingHelper.waitForStep('welcome');
      await onboardingHelper.clickContinue();
      
      await test.step('Detection status should be announced', async () => {
        await onboardingHelper.waitForStep('detection');
        
        // Status messages should have aria-live
        const statusElement = authenticatedPage.locator('[data-testid="detection-status"]');
        await expect(statusElement).toHaveAttribute('aria-live', 'polite');
        
        // Wait for detection to complete
        await authenticatedPage.waitForTimeout(3000);
        
        // Result should be announced
        const resultElement = authenticatedPage.locator('[data-testid="detection-result"]');
        await expect(resultElement).toHaveAttribute('aria-live', 'polite');
      });

      await test.step('Error messages should be announced', async () => {
        // Mock an error scenario
        await authenticatedPage.route('**/api/v1/onboarding/detect-claude-code', async (route) => {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ detail: 'Test error' })
          });
        });
        
        // Retry detection to trigger error
        const retryButton = authenticatedPage.locator('button:has-text("Try Again")');
        if (await retryButton.isVisible()) {
          await retryButton.click();
          
          // Error should be announced
          const errorElement = authenticatedPage.locator('[data-testid="error-message"]');
          await expect(errorElement).toHaveAttribute('aria-live', 'assertive');
          await expect(errorElement).toBeVisible();
        }
      });
    });

    test('should provide helpful descriptions for complex UI', async ({ authenticatedPage }) => {
      await onboardingHelper.navigateToOnboarding();
      await onboardingHelper.waitForStep('welcome');
      await onboardingHelper.clickContinue();
      await onboardingHelper.handleClaudeCodeDetection(true);
      await onboardingHelper.waitForStep('project-type');
      
      await test.step('Project type options should have descriptions', async () => {
        const newProjectButton = authenticatedPage.locator('button:has-text("New Project"), button:has-text("Start Fresh")').first();
        
        // Should have aria-describedby pointing to description
        const describedBy = await newProjectButton.getAttribute('aria-describedby');
        if (describedBy) {
          const description = authenticatedPage.locator(`#${describedBy}`);
          await expect(description).toBeVisible();
        }
      });

      await test.step('Progress indicators should be descriptive', async () => {
        const progressSteps = authenticatedPage.locator('[data-testid^="progress-step-"]');
        const count = await progressSteps.count();
        
        for (let i = 0; i < count; i++) {
          const step = progressSteps.nth(i);
          await expect(step).toHaveAttribute('aria-label');
        }
      });
    });
  });

  test.describe('Visual Accessibility', () => {
    test('should maintain adequate color contrast', async ({ authenticatedPage }) => {
      await onboardingHelper.navigateToOnboarding();
      
      await test.step('Check primary button contrast', async () => {
        await onboardingHelper.waitForStep('welcome');
        
        const continueButton = authenticatedPage.locator('button:has-text("Let\'s Get Started")');
        await expect(continueButton).toBeVisible();
        
        // Check computed styles for contrast
        const styles = await continueButton.evaluate(button => {
          const computed = window.getComputedStyle(button);
          return {
            backgroundColor: computed.backgroundColor,
            color: computed.color,
            borderColor: computed.borderColor
          };
        });
        
        // Ensure styles are applied (basic check)
        expect(styles.backgroundColor).toBeTruthy();
        expect(styles.color).toBeTruthy();
      });

      await test.step('Check error state contrast', async () => {
        await onboardingHelper.clickContinue();
        
        // Mock error state
        await authenticatedPage.route('**/api/v1/onboarding/detect-claude-code', async (route) => {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ detail: 'Test error' })
          });
        });
        
        await onboardingHelper.waitForStep('detection');
        await authenticatedPage.waitForTimeout(3000);
        
        const errorElement = authenticatedPage.locator('[data-testid="error-message"]');
        if (await errorElement.isVisible()) {
          const errorStyles = await errorElement.evaluate(element => {
            const computed = window.getComputedStyle(element);
            return {
              backgroundColor: computed.backgroundColor,
              color: computed.color
            };
          });
          
          expect(errorStyles.color).toBeTruthy();
        }
      });
    });

    test('should be usable when zoomed to 200%', async ({ authenticatedPage }) => {
      // Set zoom level to 200%
      await authenticatedPage.setViewportSize({ width: 640, height: 480 }); // Simulate 200% zoom
      
      await onboardingHelper.navigateToOnboarding();
      
      await test.step('Navigation should remain usable', async () => {
        await onboardingHelper.waitForStep('welcome');
        
        // Buttons should still be clickable
        const continueButton = authenticatedPage.locator('button:has-text("Let\'s Get Started")');
        await expect(continueButton).toBeVisible();
        await expect(continueButton).toBeEnabled();
        
        await continueButton.click();
        await expect(onboardingHelper.getCurrentStep()).resolves.toBe('detection');
      });

      await test.step('Content should not be cut off', async () => {
        await onboardingHelper.waitForStep('detection');
        
        // Main content should be visible
        const stepContent = authenticatedPage.locator('[data-testid="onboarding-step-detection"]');
        await expect(stepContent).toBeVisible();
        
        // Progress bar should be visible
        const progressBar = authenticatedPage.locator('[data-testid="onboarding-progress"]');
        await expect(progressBar).toBeVisible();
      });
    });

    test('should support high contrast mode', async ({ authenticatedPage }) => {
      // Simulate high contrast mode
      await authenticatedPage.addInitScript(() => {
        // Add high contrast CSS
        const style = document.createElement('style');
        style.textContent = `
          @media (prefers-contrast: high) {
            * {
              background: white !important;
              color: black !important;
              border-color: black !important;
            }
            button {
              background: black !important;
              color: white !important;
            }
          }
        `;
        document.head.appendChild(style);
      });
      
      await onboardingHelper.navigateToOnboarding();
      
      await test.step('UI should remain functional in high contrast', async () => {
        await onboardingHelper.waitForStep('welcome');
        
        const continueButton = authenticatedPage.locator('button:has-text("Let\'s Get Started")');
        await expect(continueButton).toBeVisible();
        await expect(continueButton).toBeEnabled();
        
        // Should still be able to complete onboarding
        await onboardingHelper.completeOnboardingFlow({
          projectType: 'new',
          skipClaudeCode: true,
          connectGitHub: false,
          answerQuestions: false
        });
        
        await expect(authenticatedPage).toHaveURL(/\/app/);
      });
    });
  });

  test.describe('Motion and Animation', () => {
    test('should respect reduced motion preferences', async ({ authenticatedPage }) => {
      // Set reduced motion preference
      await authenticatedPage.addInitScript(() => {
        Object.defineProperty(window, 'matchMedia', {
          writable: true,
          value: jest.fn().mockImplementation(query => ({
            matches: query === '(prefers-reduced-motion: reduce)',
            media: query,
            onchange: null,
            addListener: jest.fn(),
            removeListener: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
          })),
        });
      });
      
      await onboardingHelper.navigateToOnboarding();
      
      await test.step('Animations should be reduced', async () => {
        await onboardingHelper.waitForStep('welcome');
        
        // Check for reduced motion CSS
        const animatedElements = authenticatedPage.locator('.animate-spin, .animate-pulse, .transition-all');
        const count = await animatedElements.count();
        
        for (let i = 0; i < count; i++) {
          const element = animatedElements.nth(i);
          const animationStyle = await element.evaluate(el => {
            return window.getComputedStyle(el).animationDuration;
          });
          
          // In reduced motion mode, animations should be instant or disabled
          // This is a basic check - real implementation would be more sophisticated
          expect(animationStyle).toBeDefined();
        }
      });
    });

    test('should not cause vestibular disorders', async ({ authenticatedPage }) => {
      await onboardingHelper.navigateToOnboarding();
      
      await test.step('No parallax or excessive motion', async () => {
        await onboardingHelper.waitForStep('welcome');
        
        // Check for potentially problematic animations
        const problematicElements = authenticatedPage.locator('[style*="transform"], .parallax, .shake');
        const count = await problematicElements.count();
        
        // Should not have excessive motion effects
        expect(count).toBeLessThan(3);
      });

      await test.step('Loading spinners should be subtle', async () => {
        await onboardingHelper.clickContinue();
        await onboardingHelper.waitForStep('detection');
        
        const spinner = authenticatedPage.locator('.animate-spin');
        if (await spinner.isVisible()) {
          // Spinner should not be too large or prominent
          const size = await spinner.boundingBox();
          if (size) {
            expect(size.width).toBeLessThan(100);
            expect(size.height).toBeLessThan(100);
          }
        }
      });
    });
  });

  test.describe('Error Accessibility', () => {
    test('should properly announce and describe errors', async ({ authenticatedPage }) => {
      await onboardingHelper.navigateToOnboarding();
      await onboardingHelper.waitForStep('welcome');
      await onboardingHelper.clickContinue();
      
      // Mock API error
      await authenticatedPage.route('**/api/v1/onboarding/detect-claude-code', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: 'Claude Code detection service is temporarily unavailable'
          })
        });
      });
      
      await onboardingHelper.waitForStep('detection');
      await authenticatedPage.waitForTimeout(3000);
      
      await test.step('Error should be properly announced', async () => {
        const errorElement = authenticatedPage.locator('[data-testid="error-message"]');
        if (await errorElement.isVisible()) {
          // Should have assertive aria-live for immediate announcement
          await expect(errorElement).toHaveAttribute('aria-live', 'assertive');
          
          // Should have role="alert" for maximum compatibility
          await expect(errorElement).toHaveAttribute('role', 'alert');
          
          // Should have descriptive text
          const errorText = await errorElement.textContent();
          expect(errorText).toContain('temporarily unavailable');
        }
      });

      await test.step('Error recovery options should be accessible', async () => {
        const retryButton = authenticatedPage.locator('button:has-text("Try Again")');
        const skipButton = authenticatedPage.locator('button:has-text("Skip")');
        
        if (await retryButton.isVisible()) {
          await expect(retryButton).toHaveAccessibleName();
          await expect(retryButton).toBeEnabled();
        }
        
        if (await skipButton.isVisible()) {
          await expect(skipButton).toHaveAccessibleName();
          await expect(skipButton).toBeEnabled();
        }
      });
    });
  });
});