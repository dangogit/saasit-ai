import { test as base, APIRequestContext } from '@playwright/test';

/**
 * API fixture for mocking backend responses during E2E tests
 */

export interface ApiFixture {
  mockAPI: APIRequestContext;
  mockOnboardingEndpoints: () => Promise<void>;
  mockClaudeCodeDetection: (hasClaudeCode: boolean) => Promise<void>;
  mockGitHubAPI: () => Promise<void>;
  mockClaudeAnalysis: () => Promise<void>;
}

export const test = base.extend<ApiFixture>({
  mockAPI: async ({ request }, use) => {
    await use(request);
  },

  mockOnboardingEndpoints: async ({ page }, use) => {
    const mockOnboardingEndpoints = async () => {
      // Mock onboarding API endpoints
      await page.route('**/api/v1/onboarding/**', async (route) => {
        const url = route.request().url();
        const method = route.request().method();
        
        // Mock different endpoints
        if (url.includes('/detect-claude-code')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              has_claude_code: true,
              version: '1.0.0',
              status: 'found',
              detection_method: 'api',
              additional_info: {
                port: 3001,
                endpoint: 'http://localhost:3001/health'
              }
            })
          });
        } else if (url.includes('/next-question')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              question_id: 'project_goal',
              question: 'What\'s the main goal of your project?',
              question_type: 'single_choice',
              options: [
                'Build a SaaS application',
                'Create an AI-powered tool',
                'Develop an e-commerce platform',
                'Build a mobile app',
                'Create a data analysis tool',
                'Other'
              ],
              context: 'This helps us recommend the right AI agents and templates for your needs.',
              reasoning: 'Understanding the project goal allows us to suggest specialized agents.',
              is_final: false
            })
          });
        } else if (url.includes('/analyze-claude-md')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              technologies: ['React', 'FastAPI', 'MongoDB', 'Tailwind'],
              framework: 'React',
              project_type: 'SaaS',
              complexity: 'moderate',
              agents_mentioned: ['rapid-prototyper', 'frontend-developer'],
              structure_info: {
                'tech stack': 'React with FastAPI backend',
                'architecture': 'Full-stack web application'
              },
              recommendations: [
                'Use Frontend Developer agent for React components',
                'Use Backend Architect agent for API design',
                'Consider DevOps Automator for deployment'
              ]
            })
          });
        } else if (url.includes('/save-progress')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              saved_at: new Date().toISOString(),
              message: 'Onboarding progress saved successfully',
              backup_saved: true
            })
          });
        } else if (url.includes('/resume-progress')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              has_saved_progress: false,
              progress_data: null,
              saved_at: null,
              source: 'database'
            })
          });
        } else {
          // Default success response
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true })
          });
        }
      });
    };
    
    await use(mockOnboardingEndpoints);
  },

  mockClaudeCodeDetection: async ({ page }, use) => {
    const mockClaudeCodeDetection = async (hasClaudeCode: boolean) => {
      await page.route('**/api/v1/onboarding/detect-claude-code', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            has_claude_code: hasClaudeCode,
            version: hasClaudeCode ? '1.0.0' : null,
            status: hasClaudeCode ? 'found' : 'not-found',
            detection_method: hasClaudeCode ? 'api' : null,
            additional_info: hasClaudeCode ? {
              port: 3001,
              endpoint: 'http://localhost:3001/health'
            } : {
              checked_methods: 'both',
              suggestions: [
                'Install Claude Code from https://claude.ai/code',
                'Ensure Claude Code is in your PATH',
                'Try restarting your terminal after installation'
              ]
            }
          })
        });
      });
    };
    
    await use(mockClaudeCodeDetection);
  },

  mockGitHubAPI: async ({ page }, use) => {
    const mockGitHubAPI = async () => {
      // Mock GitHub API endpoints
      await page.route('**/api.github.com/**', async (route) => {
        const url = route.request().url();
        
        if (url.includes('/user/repos')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
              {
                id: 123456,
                name: 'test-repo',
                full_name: 'testuser/test-repo',
                description: 'A test repository',
                private: false,
                html_url: 'https://github.com/testuser/test-repo',
                clone_url: 'https://github.com/testuser/test-repo.git',
                created_at: '2023-01-01T00:00:00Z',
                updated_at: '2023-12-01T00:00:00Z',
                language: 'JavaScript',
                stargazers_count: 42,
                forks_count: 5
              }
            ])
          });
        } else if (url.includes('/contents/CLAUDE.md')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              name: 'CLAUDE.md',
              content: btoa(`# Test Project

## Overview
This is a test project for E2E testing.

## Tech Stack
- React
- FastAPI
- MongoDB
- Tailwind CSS

## Architecture
Full-stack web application with modern technologies.`),
              encoding: 'base64'
            })
          });
        } else {
          await route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Not Found' })
          });
        }
      });
    };
    
    await use(mockGitHubAPI);
  },

  mockClaudeAnalysis: async ({ page }, use) => {
    const mockClaudeAnalysis = async () => {
      // Mock Claude AI analysis endpoints
      await page.route('**/api/v1/workflow/generate', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            workflow: {
              agents: [
                {
                  id: 'rapid-prototyper',
                  name: 'Rapid Prototyper',
                  description: 'Build an MVP quickly',
                  category: 'Engineering'
                },
                {
                  id: 'frontend-developer',
                  name: 'Frontend Developer',
                  description: 'Create beautiful user interfaces',
                  category: 'Engineering'
                }
              ],
              connections: [
                {
                  from: 'rapid-prototyper',
                  to: 'frontend-developer',
                  type: 'sequential'
                }
              ]
            },
            message: 'Based on your requirements, I\'ve created a development workflow.',
            phase: 'workflow_ready',
            questions: [],
            usage: {
              input_tokens: 100,
              output_tokens: 250
            }
          })
        });
      });
    };
    
    await use(mockClaudeAnalysis);
  }
});

export { expect } from '@playwright/test';