import { test, expect } from '../fixtures/auth.fixture';
import { OnboardingHelper } from '../helpers/onboarding.helper';

test.describe('Project Analysis', () => {
  let onboardingHelper: OnboardingHelper;
  
  test.beforeEach(async ({ authenticatedPage, mockOnboardingEndpoints, mockGitHubAPI }) => {
    onboardingHelper = new OnboardingHelper(authenticatedPage);
    await mockOnboardingEndpoints();
    await mockGitHubAPI();
    
    // Navigate to analysis step (only appears for existing projects)
    await onboardingHelper.navigateToOnboarding();
    await onboardingHelper.waitForStep('welcome');
    await onboardingHelper.clickContinue();
    await onboardingHelper.handleClaudeCodeDetection(true);
    await onboardingHelper.waitForStep('project-type');
    await onboardingHelper.selectProjectType('existing');
    await onboardingHelper.clickContinue();
    await onboardingHelper.handleGitHubIntegration(true);
    await onboardingHelper.handleAIQuestions();
  });

  test.describe('CLAUDE.md Analysis', () => {
    test('should analyze CLAUDE.md file successfully', async ({ authenticatedPage }) => {
      await onboardingHelper.waitForStep('analysis');
      
      await test.step('Show analysis in progress', async () => {
        await expect(authenticatedPage.locator('[data-testid="analysis-status"]')).toContainText('Analyzing');
        await expect(authenticatedPage.locator('.animate-spin')).toBeVisible();
        await expect(authenticatedPage.locator('text=Reading CLAUDE.md file')).toBeVisible();
      });

      await test.step('Display analysis results', async () => {
        await authenticatedPage.waitForTimeout(5000); // Wait for analysis
        
        // Should show detected technologies
        await expect(authenticatedPage.locator('[data-testid="detected-technologies"]')).toBeVisible();
        await expect(authenticatedPage.locator('text=React')).toBeVisible();
        await expect(authenticatedPage.locator('text=FastAPI')).toBeVisible();
        await expect(authenticatedPage.locator('text=MongoDB')).toBeVisible();
        await expect(authenticatedPage.locator('text=Tailwind')).toBeVisible();
      });

      await test.step('Show project complexity assessment', async () => {
        await expect(authenticatedPage.locator('[data-testid="project-complexity"]')).toContainText('moderate');
        await expect(authenticatedPage.locator('text=Full-stack web application')).toBeVisible();
      });

      await test.step('Display agent recommendations', async () => {
        await expect(authenticatedPage.locator('[data-testid="agent-recommendations"]')).toBeVisible();
        await expect(authenticatedPage.locator('text=Frontend Developer')).toBeVisible();
        await expect(authenticatedPage.locator('text=Backend Architect')).toBeVisible();
        await expect(authenticatedPage.locator('text=DevOps Automator')).toBeVisible();
      });

      await test.step('Show analysis confidence', async () => {
        const confidenceElement = authenticatedPage.locator('[data-testid="analysis-confidence"]');
        await expect(confidenceElement).toBeVisible();
        
        const confidenceText = await confidenceElement.textContent();
        expect(confidenceText).toMatch(/\d+%/); // Should show percentage
      });
    });

    test('should handle missing CLAUDE.md file', async ({ authenticatedPage }) => {
      // Mock GitHub API to return 404 for CLAUDE.md
      await authenticatedPage.route('**/api.github.com/**/contents/CLAUDE.md', async (route) => {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Not Found',
            documentation_url: 'https://docs.github.com/rest'
          })
        });
      });

      await onboardingHelper.waitForStep('analysis');
      await authenticatedPage.waitForTimeout(3000);

      await test.step('Show missing file message', async () => {
        await expect(authenticatedPage.locator('text=CLAUDE.md not found')).toBeVisible();
        await expect(authenticatedPage.locator('text=We recommend creating a CLAUDE.md file')).toBeVisible();
      });

      await test.step('Provide alternative analysis options', async () => {
        await expect(authenticatedPage.locator('button:has-text("Upload CLAUDE.md")')).toBeVisible();
        await expect(authenticatedPage.locator('button:has-text("Manual Input")')).toBeVisible();
        await expect(authenticatedPage.locator('button:has-text("Skip Analysis")')).toBeVisible();
      });

      await test.step('Show CLAUDE.md template', async () => {
        const templateButton = authenticatedPage.locator('button:has-text("Show Template")');
        if (await templateButton.isVisible()) {
          await templateButton.click();
          await expect(authenticatedPage.locator('text=# Project Overview')).toBeVisible();
          await expect(authenticatedPage.locator('text=## Tech Stack')).toBeVisible();
        }
      });
    });

    test('should allow manual project description', async ({ authenticatedPage }) => {
      // Mock missing CLAUDE.md
      await authenticatedPage.route('**/api.github.com/**/contents/CLAUDE.md', async (route) => {
        await route.fulfill({ status: 404 });
      });

      await onboardingHelper.waitForStep('analysis');
      await authenticatedPage.waitForTimeout(3000);

      await test.step('Choose manual input option', async () => {
        await authenticatedPage.locator('button:has-text("Manual Input")').click();
      });

      await test.step('Fill project description form', async () => {
        await expect(authenticatedPage.locator('[data-testid="manual-input-form"]')).toBeVisible();
        
        // Fill in project details
        await authenticatedPage.locator('input[name="projectName"]').fill('My SaaS Project');
        await authenticatedPage.locator('textarea[name="description"]').fill('A modern SaaS application built with React and FastAPI');
        
        // Select technologies
        await authenticatedPage.locator('input[type="checkbox"][value="React"]').check();
        await authenticatedPage.locator('input[type="checkbox"][value="FastAPI"]').check();
        await authenticatedPage.locator('input[type="checkbox"][value="MongoDB"]').check();
        
        // Submit form
        await authenticatedPage.locator('button:has-text("Analyze Project")').click();
      });

      await test.step('Show analysis based on manual input', async () => {
        await authenticatedPage.waitForTimeout(3000);
        
        await expect(authenticatedPage.locator('[data-testid="analysis-complete"]')).toBeVisible();
        await expect(authenticatedPage.locator('[data-testid="detected-technologies"]')).toContainText('React');
        await expect(authenticatedPage.locator('[data-testid="detected-technologies"]')).toContainText('FastAPI');
      });
    });

    test('should allow uploading CLAUDE.md file', async ({ authenticatedPage }) => {
      // Mock missing CLAUDE.md
      await authenticatedPage.route('**/api.github.com/**/contents/CLAUDE.md', async (route) => {
        await route.fulfill({ status: 404 });
      });

      await onboardingHelper.waitForStep('analysis');
      await authenticatedPage.waitForTimeout(3000);

      await test.step('Choose upload option', async () => {
        await authenticatedPage.locator('button:has-text("Upload CLAUDE.md")').click();
      });

      await test.step('Upload file', async () => {
        const fileContent = `# My Project

## Overview
This is a modern web application.

## Tech Stack
- React
- Node.js
- MongoDB

## Architecture
Full-stack application with RESTful API.`;

        // Create a file input and upload
        const fileInput = authenticatedPage.locator('input[type="file"]');
        await expect(fileInput).toBeVisible();
        
        // Mock file upload (in real test, you'd use setInputFiles)
        await authenticatedPage.evaluate((content) => {
          const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
          const file = new File([content], 'CLAUDE.md', { type: 'text/markdown' });
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          fileInput.files = dataTransfer.files;
          fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        }, fileContent);

        // Submit upload
        await authenticatedPage.locator('button:has-text("Upload and Analyze")').click();
      });

      await test.step('Show analysis of uploaded file', async () => {
        await authenticatedPage.waitForTimeout(3000);
        
        await expect(authenticatedPage.locator('[data-testid="analysis-complete"]')).toBeVisible();
        await expect(authenticatedPage.locator('text=Analysis based on uploaded CLAUDE.md')).toBeVisible();
      });
    });
  });

  test.describe('Repository Analysis', () => {
    test('should analyze repository structure', async ({ authenticatedPage }) => {
      await onboardingHelper.waitForStep('analysis');
      await authenticatedPage.waitForTimeout(5000);

      await test.step('Show repository information', async () => {
        await expect(authenticatedPage.locator('[data-testid="repo-info"]')).toBeVisible();
        await expect(authenticatedPage.locator('text=testuser/test-repo')).toBeVisible();
        await expect(authenticatedPage.locator('text=JavaScript')).toBeVisible();
        await expect(authenticatedPage.locator('text=42 stars')).toBeVisible();
      });

      await test.step('Display project insights', async () => {
        await expect(authenticatedPage.locator('[data-testid="project-insights"]')).toBeVisible();
        await expect(authenticatedPage.locator('text=Last updated')).toBeVisible();
        await expect(authenticatedPage.locator('text=Repository size')).toBeVisible();
      });

      await test.step('Show recommended workflow', async () => {
        await expect(authenticatedPage.locator('[data-testid="recommended-workflow"]')).toBeVisible();
        await expect(authenticatedPage.locator('text=Recommended agents for your project')).toBeVisible();
      });
    });

    test('should handle private repositories', async ({ authenticatedPage }) => {
      // Mock private repository
      await authenticatedPage.route('**/api.github.com/user/repos', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 123456,
              name: 'private-repo',
              full_name: 'testuser/private-repo',
              description: 'A private repository',
              private: true,
              html_url: 'https://github.com/testuser/private-repo',
              language: 'TypeScript'
            }
          ])
        });
      });

      await onboardingHelper.waitForStep('analysis');
      await authenticatedPage.waitForTimeout(3000);

      await test.step('Show private repository handling', async () => {
        await expect(authenticatedPage.locator('text=Private repository detected')).toBeVisible();
        await expect(authenticatedPage.locator('text=Limited analysis available')).toBeVisible();
      });

      await test.step('Provide enhanced analysis options', async () => {
        await expect(authenticatedPage.locator('button:has-text("Grant Full Access")')).toBeVisible();
        await expect(authenticatedPage.locator('button:has-text("Provide CLAUDE.md")')).toBeVisible();
      });
    });
  });

  test.describe('Analysis Results', () => {
    test('should categorize technologies correctly', async ({ authenticatedPage }) => {
      await onboardingHelper.waitForStep('analysis');
      await authenticatedPage.waitForTimeout(5000);

      await test.step('Show technology categories', async () => {
        // Frontend technologies
        const frontendSection = authenticatedPage.locator('[data-testid="frontend-technologies"]');
        await expect(frontendSection).toContainText('React');
        await expect(frontendSection).toContainText('Tailwind');

        // Backend technologies  
        const backendSection = authenticatedPage.locator('[data-testid="backend-technologies"]');
        await expect(backendSection).toContainText('FastAPI');

        // Database technologies
        const databaseSection = authenticatedPage.locator('[data-testid="database-technologies"]');
        await expect(databaseSection).toContainText('MongoDB');
      });

      await test.step('Show technology compatibility scores', async () => {
        await expect(authenticatedPage.locator('[data-testid="compatibility-score"]')).toBeVisible();
        
        const scoreElements = authenticatedPage.locator('[data-testid="tech-compatibility"]');
        await expect(scoreElements).toHaveCount(4); // React, FastAPI, MongoDB, Tailwind
      });
    });

    test('should provide actionable recommendations', async ({ authenticatedPage }) => {
      await onboardingHelper.waitForStep('analysis');
      await authenticatedPage.waitForTimeout(5000);

      await test.step('Show specific agent recommendations', async () => {
        const recommendations = authenticatedPage.locator('[data-testid="agent-recommendation"]');
        await expect(recommendations).toHaveCount(3); // Should have 3 recommendations
        
        // Each recommendation should have reasoning
        await expect(authenticatedPage.locator('text=Frontend Developer')).toBeVisible();
        await expect(authenticatedPage.locator('text=Perfect for React components')).toBeVisible();
        
        await expect(authenticatedPage.locator('text=Backend Architect')).toBeVisible();
        await expect(authenticatedPage.locator('text=Ideal for FastAPI development')).toBeVisible();
      });

      await test.step('Show improvement suggestions', async () => {
        await expect(authenticatedPage.locator('[data-testid="improvement-suggestions"]')).toBeVisible();
        await expect(authenticatedPage.locator('text=Consider adding')).toBeVisible();
        await expect(authenticatedPage.locator('text=Recommended practices')).toBeVisible();
      });

      await test.step('Allow customizing recommendations', async () => {
        const customizeButton = authenticatedPage.locator('button:has-text("Customize Recommendations")');
        if (await customizeButton.isVisible()) {
          await customizeButton.click();
          await expect(authenticatedPage.locator('[data-testid="recommendation-settings"]')).toBeVisible();
        }
      });
    });

    test('should handle complex project structures', async ({ authenticatedPage }) => {
      // Mock complex analysis result
      await authenticatedPage.route('**/api/v1/onboarding/analyze-claude-md', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            technologies: ['React', 'Node.js', 'Python', 'FastAPI', 'PostgreSQL', 'Redis', 'Docker', 'Kubernetes'],
            framework: 'React',
            project_type: 'Microservices',
            complexity: 'complex',
            agents_mentioned: ['rapid-prototyper', 'frontend-developer', 'backend-architect', 'devops-automator'],
            structure_info: {
              'architecture': 'Microservices with React frontend',
              'deployment': 'Kubernetes with Docker containers',
              'database': 'PostgreSQL with Redis caching'
            },
            recommendations: [
              'Use DevOps Automator for Kubernetes deployment',
              'Backend Architect for microservices design',
              'Frontend Developer for React optimization',
              'Infrastructure Maintainer for monitoring'
            ]
          })
        });
      });

      await onboardingHelper.waitForStep('analysis');
      await authenticatedPage.waitForTimeout(5000);

      await test.step('Show complex project analysis', async () => {
        await expect(authenticatedPage.locator('[data-testid="project-complexity"]')).toContainText('complex');
        await expect(authenticatedPage.locator('text=Microservices')).toBeVisible();
        await expect(authenticatedPage.locator('text=8 technologies detected')).toBeVisible();
      });

      await test.step('Show architectural insights', async () => {
        await expect(authenticatedPage.locator('[data-testid="architecture-analysis"]')).toBeVisible();
        await expect(authenticatedPage.locator('text=Microservices with React frontend')).toBeVisible();
        await expect(authenticatedPage.locator('text=Kubernetes with Docker containers')).toBeVisible();
      });

      await test.step('Recommend specialized agents', async () => {
        await expect(authenticatedPage.locator('text=DevOps Automator')).toBeVisible();
        await expect(authenticatedPage.locator('text=Infrastructure Maintainer')).toBeVisible();
        await expect(authenticatedPage.locator('text=4 agents recommended')).toBeVisible();
      });
    });
  });

  test.describe('Error Handling', () => {
    test('should handle analysis API errors', async ({ authenticatedPage }) => {
      await authenticatedPage.route('**/api/v1/onboarding/analyze-claude-md', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: 'Analysis service temporarily unavailable'
          })
        });
      });

      await onboardingHelper.waitForStep('analysis');
      await authenticatedPage.waitForTimeout(3000);

      await test.step('Show analysis error', async () => {
        await expect(authenticatedPage.locator('[data-testid="analysis-error"]')).toBeVisible();
        await expect(authenticatedPage.locator('text=Analysis failed')).toBeVisible();
        await expect(authenticatedPage.locator('text=temporarily unavailable')).toBeVisible();
      });

      await test.step('Provide recovery options', async () => {
        await expect(authenticatedPage.locator('button:has-text("Try Again")')).toBeEnabled();
        await expect(authenticatedPage.locator('button:has-text("Skip Analysis")')).toBeEnabled();
        await expect(authenticatedPage.locator('button:has-text("Manual Input")')).toBeEnabled();
      });
    });

    test('should handle malformed CLAUDE.md content', async ({ authenticatedPage }) => {
      // Mock malformed CLAUDE.md
      await authenticatedPage.route('**/api.github.com/**/contents/CLAUDE.md', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            name: 'CLAUDE.md',
            content: btoa('Invalid content without proper structure'),
            encoding: 'base64'
          })
        });
      });

      await onboardingHelper.waitForStep('analysis');
      await authenticatedPage.waitForTimeout(5000);

      await test.step('Show parsing warning', async () => {
        await expect(authenticatedPage.locator('text=Limited information extracted')).toBeVisible();
        await expect(authenticatedPage.locator('text=Consider updating your CLAUDE.md')).toBeVisible();
      });

      await test.step('Show partial results', async () => {
        await expect(authenticatedPage.locator('[data-testid="analysis-complete"]')).toBeVisible();
        await expect(authenticatedPage.locator('text=Basic analysis completed')).toBeVisible();
      });
    });
  });

  test.describe('Navigation', () => {
    test('should allow proceeding after successful analysis', async ({ authenticatedPage }) => {
      await onboardingHelper.waitForStep('analysis');
      await authenticatedPage.waitForTimeout(5000);

      await test.step('Enable continue button after analysis', async () => {
        await expect(authenticatedPage.locator('[data-testid="analysis-complete"]')).toBeVisible();
        await expect(authenticatedPage.locator('button:has-text("Continue")')).toBeEnabled();
      });

      await test.step('Proceed to template selection', async () => {
        await onboardingHelper.clickContinue();
        await expect(onboardingHelper.getCurrentStep()).resolves.toBe('templates');
      });
    });

    test('should allow skipping analysis step', async ({ authenticatedPage }) => {
      await onboardingHelper.waitForStep('analysis');

      await test.step('Skip analysis', async () => {
        await onboardingHelper.clickSkip();
        await authenticatedPage.locator('button:has-text("Skip Step")').click();
      });

      await test.step('Proceed to templates with default recommendations', async () => {
        await expect(onboardingHelper.getCurrentStep()).resolves.toBe('templates');
        await expect(authenticatedPage.locator('text=Default recommendations')).toBeVisible();
      });
    });
  });
});