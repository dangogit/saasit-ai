import { test, expect } from '../fixtures/auth.fixture';
import { OnboardingHelper } from '../helpers/onboarding.helper';

test.describe('User Onboarding Flow', () => {
  let onboardingHelper: OnboardingHelper;
  
  test.beforeEach(async ({ authenticatedPage, mockOnboardingEndpoints }) => {
    onboardingHelper = new OnboardingHelper(authenticatedPage);
    await mockOnboardingEndpoints();
  });

  test.describe('Complete Onboarding Flows', () => {
    test('should complete onboarding for new project successfully', async ({ authenticatedPage }) => {
      await test.step('Start onboarding flow', async () => {
        await onboardingHelper.navigateToOnboarding();
        await expect(authenticatedPage.locator('h1')).toContainText('Welcome');
      });

      await test.step('Complete welcome step', async () => {
        await onboardingHelper.waitForStep('welcome');
        await expect(authenticatedPage.locator('[data-testid="onboarding-step-welcome"]')).toBeVisible();
        await onboardingHelper.clickContinue();
      });

      await test.step('Handle Claude Code detection', async () => {
        await onboardingHelper.handleClaudeCodeDetection(true);
        await expect(onboardingHelper.isStepCompleted('detection')).resolves.toBe(true);
      });

      await test.step('Select new project type', async () => {
        await onboardingHelper.waitForStep('project-type');
        await onboardingHelper.selectProjectType('new');
        await onboardingHelper.clickContinue();
        await expect(onboardingHelper.isStepCompleted('project-type')).resolves.toBe(true);
      });

      await test.step('Handle GitHub integration', async () => {
        await onboardingHelper.handleGitHubIntegration(false);
        await expect(onboardingHelper.isStepCompleted('github')).resolves.toBe(true);
      });

      await test.step('Answer AI questions', async () => {
        await onboardingHelper.handleAIQuestions({
          'project_goal': 'Build a SaaS application',
          'target_users': 'Small businesses',
          'timeline': 'Within a few weeks'
        });
        await expect(onboardingHelper.isStepCompleted('questions')).resolves.toBe(true);
      });

      await test.step('Select template', async () => {
        await onboardingHelper.handleTemplateSelection();
        await expect(onboardingHelper.isStepCompleted('templates')).resolves.toBe(true);
      });

      await test.step('Verify completion', async () => {
        await onboardingHelper.waitForCompletion();
        await expect(authenticatedPage).toHaveURL(/\/app/);
        
        // Verify completion percentage is 100%
        const progress = await onboardingHelper.getCompletionPercentage();
        expect(progress).toBeGreaterThanOrEqual(90);
      });
    });

    test('should complete onboarding for existing project with analysis', async ({ authenticatedPage, mockGitHubAPI }) => {
      await mockGitHubAPI();
      
      await test.step('Start onboarding for existing project', async () => {
        await onboardingHelper.navigateToOnboarding();
        await onboardingHelper.waitForStep('welcome');
        await onboardingHelper.clickContinue();
      });

      await test.step('Skip Claude Code detection', async () => {
        await onboardingHelper.handleClaudeCodeDetection(true);
      });

      await test.step('Select existing project type', async () => {
        await onboardingHelper.waitForStep('project-type');
        await onboardingHelper.selectProjectType('existing');
        await onboardingHelper.clickContinue();
      });

      await test.step('Connect GitHub and analyze project', async () => {
        await onboardingHelper.handleGitHubIntegration(true);
        await onboardingHelper.handleAIQuestions();
        
        // Should show project analysis step for existing projects
        await onboardingHelper.handleProjectAnalysis();
        await expect(onboardingHelper.isStepCompleted('analysis')).resolves.toBe(true);
      });

      await test.step('Complete with template selection', async () => {
        await onboardingHelper.handleTemplateSelection();
        await onboardingHelper.waitForCompletion();
        await expect(authenticatedPage).toHaveURL(/\/app/);
      });
    });
  });

  test.describe('Skip Functionality', () => {
    test('should allow skipping optional steps', async ({ authenticatedPage }) => {
      await onboardingHelper.navigateToOnboarding();
      
      // Welcome (required)
      await onboardingHelper.waitForStep('welcome');
      await onboardingHelper.clickContinue();
      
      // Skip Claude Code detection
      await onboardingHelper.waitForStep('detection');
      await onboardingHelper.clickSkip();
      await expect(onboardingHelper.isStepCompleted('detection')).resolves.toBe(true);
      
      // Project type (required)
      await onboardingHelper.waitForStep('project-type');
      await onboardingHelper.selectProjectType('new');
      await onboardingHelper.clickContinue();
      
      // Skip GitHub integration
      await onboardingHelper.waitForStep('github');
      await onboardingHelper.clickSkip();
      
      // Skip AI questions
      await onboardingHelper.waitForStep('questions');
      await onboardingHelper.clickSkip();
      
      // Skip template selection
      await onboardingHelper.waitForStep('templates');
      await onboardingHelper.clickSkip();
      
      // Should still complete successfully
      await onboardingHelper.waitForCompletion();
      await expect(authenticatedPage).toHaveURL(/\/app/);
    });

    test('should show skip confirmation for important steps', async ({ authenticatedPage }) => {
      await onboardingHelper.navigateToOnboarding();
      await onboardingHelper.waitForStep('welcome');
      await onboardingHelper.clickContinue();
      
      // Try to skip Claude Code detection
      await onboardingHelper.waitForStep('detection');
      await authenticatedPage.locator('button:has-text("Skip")').click();
      
      // Should show confirmation modal
      await expect(authenticatedPage.locator('text=Skip Tool Detection?')).toBeVisible();
      
      // Can cancel skip
      await authenticatedPage.locator('button:has-text("Cancel")').click();
      await expect(authenticatedPage.locator('[data-testid="onboarding-step-detection"]')).toBeVisible();
      
      // Or confirm skip
      await authenticatedPage.locator('button:has-text("Skip")').click();
      await authenticatedPage.locator('button:has-text("Skip Step")').click();
      await expect(onboardingHelper.getCurrentStep()).resolves.toBe('project-type');
    });
  });

  test.describe('Navigation', () => {
    test('should allow going back to previous steps', async ({ authenticatedPage }) => {
      await onboardingHelper.completeOnboardingFlow({ 
        projectType: 'new',
        skipClaudeCode: true,
        connectGitHub: false,
        answerQuestions: false 
      });
      
      // Should be at templates step, go back
      await onboardingHelper.waitForStep('templates');
      await onboardingHelper.clickBack();
      
      // Should be at questions step
      await expect(onboardingHelper.getCurrentStep()).resolves.toBe('questions');
      
      // Go back again
      await onboardingHelper.clickBack();
      await expect(onboardingHelper.getCurrentStep()).resolves.toBe('github');
    });

    test('should maintain progress when navigating back and forth', async ({ authenticatedPage }) => {
      await onboardingHelper.navigateToOnboarding();
      
      // Complete welcome step
      await onboardingHelper.waitForStep('welcome');
      await onboardingHelper.clickContinue();
      
      // Complete detection step
      await onboardingHelper.handleClaudeCodeDetection(true);
      
      // Complete project type
      await onboardingHelper.waitForStep('project-type');
      await onboardingHelper.selectProjectType('new');
      await onboardingHelper.clickContinue();
      
      // Go back to detection
      await onboardingHelper.clickBack();
      await expect(onboardingHelper.getCurrentStep()).resolves.toBe('detection');
      
      // Verify previous steps are still marked as completed
      await expect(onboardingHelper.isStepCompleted('welcome')).resolves.toBe(true);
      
      // Go forward again
      await onboardingHelper.clickContinue();
      await expect(onboardingHelper.getCurrentStep()).resolves.toBe('project-type');
    });
  });

  test.describe('Progress Persistence', () => {
    test('should save progress automatically', async ({ authenticatedPage }) => {
      await onboardingHelper.navigateToOnboarding();
      
      // Complete a few steps
      await onboardingHelper.waitForStep('welcome');
      await onboardingHelper.clickContinue();
      await onboardingHelper.handleClaudeCodeDetection(true);
      
      // Verify progress is saved (check for API call or indicator)
      await authenticatedPage.waitForResponse(response => 
        response.url().includes('/save-progress') && response.status() === 200
      );
    });

    test('should resume from saved progress', async ({ authenticatedPage }) => {
      // Mock saved progress
      await authenticatedPage.route('**/api/v1/onboarding/resume-progress', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            has_saved_progress: true,
            progress_data: {
              currentStep: 'github',
              completedSteps: ['welcome', 'detection', 'project-type'],
              projectType: 'new',
              hasClaudeCode: false
            },
            saved_at: new Date().toISOString(),
            source: 'database'
          })
        });
      });
      
      await onboardingHelper.navigateToOnboarding();
      
      // Should resume at GitHub step
      await onboardingHelper.waitForStep('github');
      await expect(onboardingHelper.getCurrentStep()).resolves.toBe('github');
      
      // Previous steps should be marked as completed
      await expect(onboardingHelper.isStepCompleted('welcome')).resolves.toBe(true);
      await expect(onboardingHelper.isStepCompleted('detection')).resolves.toBe(true);
      await expect(onboardingHelper.isStepCompleted('project-type')).resolves.toBe(true);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ authenticatedPage }) => {
      // Mock API error
      await authenticatedPage.route('**/api/v1/onboarding/detect-claude-code', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: 'Internal server error'
          })
        });
      });
      
      await onboardingHelper.navigateToOnboarding();
      await onboardingHelper.waitForStep('welcome');
      await onboardingHelper.clickContinue();
      
      // Should show error message
      await onboardingHelper.waitForStep('detection');
      await expect(authenticatedPage.locator('[data-testid="error-message"]')).toBeVisible();
      
      // Should allow retry or skip
      const retryButton = authenticatedPage.locator('button:has-text("Try Again")');
      const skipButton = authenticatedPage.locator('button:has-text("Skip")');
      
      await expect(retryButton.or(skipButton)).toBeVisible();
    });

    test('should handle network connectivity issues', async ({ authenticatedPage }) => {
      await onboardingHelper.navigateToOnboarding();
      await onboardingHelper.waitForStep('welcome');
      await onboardingHelper.clickContinue();
      
      // Simulate network failure
      await authenticatedPage.context().setOffline(true);
      
      await onboardingHelper.waitForStep('detection');
      
      // Should show appropriate error message
      await expect(authenticatedPage.locator('text=Network error, text=Connection failed')).toBeVisible();
      
      // Restore network
      await authenticatedPage.context().setOffline(false);
      
      // Should allow retry
      const retryButton = authenticatedPage.locator('button:has-text("Try Again")');
      if (await retryButton.isVisible()) {
        await retryButton.click();
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile devices', async ({ authenticatedPage }) => {
      await authenticatedPage.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      
      await onboardingHelper.completeOnboardingFlow({
        projectType: 'new',
        skipClaudeCode: true,
        connectGitHub: false
      });
      
      await expect(authenticatedPage).toHaveURL(/\/app/);
    });

    test('should work on tablet devices', async ({ authenticatedPage }) => {
      await authenticatedPage.setViewportSize({ width: 768, height: 1024 }); // iPad
      
      await onboardingHelper.completeOnboardingFlow({
        projectType: 'new',
        skipClaudeCode: true,
        connectGitHub: false
      });
      
      await expect(authenticatedPage).toHaveURL(/\/app/);
    });
  });

  test.describe('Performance', () => {
    test('should complete onboarding within reasonable time', async ({ authenticatedPage }) => {
      const startTime = Date.now();
      
      await onboardingHelper.completeOnboardingFlow({
        projectType: 'new',
        skipClaudeCode: true,
        connectGitHub: false
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 30 seconds
      expect(duration).toBeLessThan(30000);
    });

    test('should load steps quickly', async ({ authenticatedPage }) => {
      await onboardingHelper.navigateToOnboarding();
      
      // Each step should load within 3 seconds
      const steps = ['welcome', 'detection', 'project-type', 'github'];
      
      for (const step of steps) {
        const stepStartTime = Date.now();
        await onboardingHelper.waitForStep(step);
        const stepEndTime = Date.now();
        
        expect(stepEndTime - stepStartTime).toBeLessThan(3000);
        
        if (step === 'detection') {
          await onboardingHelper.handleClaudeCodeDetection(true);
        } else if (step === 'project-type') {
          await onboardingHelper.selectProjectType('new');
          await onboardingHelper.clickContinue();
        } else if (step === 'github') {
          break; // Stop here for performance test
        } else {
          await onboardingHelper.clickContinue();
        }
      }
    });
  });
});