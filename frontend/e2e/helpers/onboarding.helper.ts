import { Page, expect } from '@playwright/test';

/**
 * Helper functions for onboarding E2E tests
 */

export class OnboardingHelper {
  constructor(private page: Page) {}

  /**
   * Navigate to onboarding flow
   */
  async navigateToOnboarding(): Promise<void> {
    await this.page.goto('/onboarding');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for current step to be visible
   */
  async waitForStep(stepId: string): Promise<void> {
    await this.page.waitForSelector(`[data-testid="onboarding-step-${stepId}"]`, {
      state: 'visible',
      timeout: 10000
    });
  }

  /**
   * Click continue button
   */
  async clickContinue(): Promise<void> {
    const continueButton = this.page.locator('button:has-text("Continue"), button:has-text("Let\'s Get Started"), button:has-text("Complete Setup")');
    await continueButton.click();
    await this.page.waitForTimeout(1000); // Wait for animations
  }

  /**
   * Click skip button
   */
  async clickSkip(): Promise<void> {
    const skipButton = this.page.locator('button:has-text("Skip")');
    await skipButton.click();
    
    // Handle skip confirmation modal if it appears
    const confirmSkip = this.page.locator('button:has-text("Skip Step")');
    if (await confirmSkip.isVisible()) {
      await confirmSkip.click();
    }
    
    await this.page.waitForTimeout(1000);
  }

  /**
   * Click back button
   */
  async clickBack(): Promise<void> {
    const backButton = this.page.locator('button:has-text("Back")');
    await backButton.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Check if step is completed
   */
  async isStepCompleted(stepId: string): Promise<boolean> {
    const progressIndicator = this.page.locator(`[data-testid="progress-step-${stepId}"]`);
    const isCompleted = await progressIndicator.getAttribute('data-status');
    return isCompleted === 'completed';
  }

  /**
   * Check if step is current
   */
  async isStepCurrent(stepId: string): Promise<boolean> {
    const progressIndicator = this.page.locator(`[data-testid="progress-step-${stepId}"]`);
    const status = await progressIndicator.getAttribute('data-status');
    return status === 'current';
  }

  /**
   * Get current step ID
   */
  async getCurrentStep(): Promise<string> {
    const currentStep = this.page.locator('[data-testid^="onboarding-step-"]:visible');
    const testId = await currentStep.getAttribute('data-testid');
    return testId?.replace('onboarding-step-', '') || '';
  }

  /**
   * Wait for onboarding completion
   */
  async waitForCompletion(): Promise<void> {
    await this.page.waitForURL('**/app', { timeout: 30000 });
    await expect(this.page).toHaveURL(/\/app/);
  }

  /**
   * Fill project type selection
   */
  async selectProjectType(type: 'new' | 'existing'): Promise<void> {
    const selector = type === 'new' 
      ? 'button:has-text("New Project"), button:has-text("Start Fresh")'
      : 'button:has-text("Existing Project"), button:has-text("Enhance Existing")';
    
    await this.page.locator(selector).click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Handle Claude Code detection step
   */
  async handleClaudeCodeDetection(skipIfNotFound: boolean = true): Promise<void> {
    await this.waitForStep('detection');
    
    // Wait for detection to complete
    await this.page.waitForTimeout(3000);
    
    const hasError = await this.page.locator('.text-red-500, .bg-red-500').isVisible();
    const hasSuccess = await this.page.locator('.text-green-500, .bg-green-500').isVisible();
    
    if (hasError && skipIfNotFound) {
      await this.clickSkip();
    } else if (hasSuccess || !skipIfNotFound) {
      await this.clickContinue();
    }
  }

  /**
   * Handle GitHub integration step
   */
  async handleGitHubIntegration(connectGitHub: boolean = false): Promise<void> {
    await this.waitForStep('github');
    
    if (connectGitHub) {
      // Click connect GitHub button
      const connectButton = this.page.locator('button:has-text("Connect GitHub"), button:has-text("Connect Repository")');
      if (await connectButton.isVisible()) {
        await connectButton.click();
        await this.page.waitForTimeout(1000);
      }
    }
    
    // Skip or continue based on connection status
    const hasConnection = await this.page.locator('[data-testid="github-connected"]').isVisible();
    if (hasConnection) {
      await this.clickContinue();
    } else {
      await this.clickSkip();
    }
  }

  /**
   * Handle AI question flow
   */
  async handleAIQuestions(answers: Record<string, string> = {}): Promise<void> {
    await this.waitForStep('questions');
    
    // Default answers for common questions
    const defaultAnswers = {
      'project_goal': 'Build a SaaS application',
      'target_users': 'Developers and small businesses',
      'timeline': 'Within a few weeks',
      'experience': 'Intermediate - I have some experience',
      ...answers
    };
    
    let questionCount = 0;
    const maxQuestions = 5;
    
    while (questionCount < maxQuestions) {
      const questionElement = this.page.locator('[data-testid="current-question"]');
      if (!(await questionElement.isVisible())) {
        break;
      }
      
      const questionId = await questionElement.getAttribute('data-question-id');
      if (!questionId) break;
      
      const answer = defaultAnswers[questionId];
      if (answer) {
        // Check if it's a multiple choice question
        const optionButton = this.page.locator(`button:has-text("${answer}")`);
        if (await optionButton.isVisible()) {
          await optionButton.click();
        } else {
          // Handle text input
          const textInput = this.page.locator('input[type="text"], textarea');
          if (await textInput.isVisible()) {
            await textInput.fill(answer);
          }
        }
        
        // Submit answer
        const submitButton = this.page.locator('button:has-text("Submit"), button:has-text("Next")');
        if (await submitButton.isVisible()) {
          await submitButton.click();
          await this.page.waitForTimeout(1000);
        }
      }
      
      questionCount++;
    }
    
    // Continue or skip if no more questions
    const canContinue = await this.page.locator('button:has-text("Continue")').isVisible();
    if (canContinue) {
      await this.clickContinue();
    } else {
      await this.clickSkip();
    }
  }

  /**
   * Handle project analysis step (for existing projects)
   */
  async handleProjectAnalysis(): Promise<void> {
    await this.waitForStep('analysis');
    
    // Wait for analysis to complete
    await this.page.waitForTimeout(5000);
    
    const analysisComplete = await this.page.locator('[data-testid="analysis-complete"]').isVisible();
    if (analysisComplete) {
      await this.clickContinue();
    } else {
      await this.clickSkip();
    }
  }

  /**
   * Handle template selection step
   */
  async handleTemplateSelection(templateName?: string): Promise<void> {
    await this.waitForStep('templates');
    
    if (templateName) {
      const templateButton = this.page.locator(`button:has-text("${templateName}")`);
      if (await templateButton.isVisible()) {
        await templateButton.click();
        await this.page.waitForTimeout(500);
      }
    } else {
      // Select first recommended template
      const firstTemplate = this.page.locator('[data-testid="template-option"]').first();
      if (await firstTemplate.isVisible()) {
        await firstTemplate.click();
        await this.page.waitForTimeout(500);
      }
    }
    
    await this.clickContinue();
  }

  /**
   * Complete entire onboarding flow with default options
   */
  async completeOnboardingFlow(options: {
    projectType?: 'new' | 'existing';
    skipClaudeCode?: boolean;
    connectGitHub?: boolean;
    answerQuestions?: boolean;
    templateName?: string;
  } = {}): Promise<void> {
    const {
      projectType = 'new',
      skipClaudeCode = true,
      connectGitHub = false,
      answerQuestions = true,
      templateName
    } = options;
    
    // Navigate to onboarding
    await this.navigateToOnboarding();
    
    // Welcome step
    await this.waitForStep('welcome');
    await this.clickContinue();
    
    // Claude Code detection
    await this.handleClaudeCodeDetection(skipClaudeCode);
    
    // Project type selection
    await this.waitForStep('project-type');
    await this.selectProjectType(projectType);
    await this.clickContinue();
    
    // GitHub integration
    await this.handleGitHubIntegration(connectGitHub);
    
    // AI questions
    if (answerQuestions) {
      await this.handleAIQuestions();
    } else {
      await this.waitForStep('questions');
      await this.clickSkip();
    }
    
    // Project analysis (only for existing projects)
    if (projectType === 'existing') {
      await this.handleProjectAnalysis();
    }
    
    // Template selection
    await this.handleTemplateSelection(templateName);
    
    // Wait for completion
    await this.waitForCompletion();
  }

  /**
   * Verify onboarding progress is saved
   */
  async verifyProgressSaved(): Promise<void> {
    // Check for success indicator or network request
    const saveIndicator = this.page.locator('[data-testid="progress-saved"]');
    await expect(saveIndicator).toBeVisible({ timeout: 5000 });
  }

  /**
   * Verify error handling
   */
  async verifyErrorHandling(expectedError: string): Promise<void> {
    const errorMessage = this.page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(expectedError);
  }

  /**
   * Get onboarding completion percentage
   */
  async getCompletionPercentage(): Promise<number> {
    const progressBar = this.page.locator('[data-testid="onboarding-progress"]');
    const progress = await progressBar.getAttribute('data-progress');
    return progress ? parseInt(progress, 10) : 0;
  }
}