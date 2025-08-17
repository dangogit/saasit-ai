/**
 * E2E Test Configuration
 * Environment-specific settings for test execution
 */

const config = {
  // Test environment settings
  environments: {
    local: {
      frontend_url: 'http://localhost:3000',
      backend_url: 'http://localhost:8000',
      timeout: 30000,
      retries: 0,
      workers: 'auto'
    },
    ci: {
      frontend_url: 'http://localhost:3000', 
      backend_url: 'http://localhost:8000',
      timeout: 45000,
      retries: 2,
      workers: 2
    },
    staging: {
      frontend_url: 'https://staging.saasit.ai',
      backend_url: 'https://api-staging.saasit.ai',
      timeout: 60000,
      retries: 1,
      workers: 1
    },
    production: {
      frontend_url: 'https://saasit.ai',
      backend_url: 'https://api.saasit.ai',
      timeout: 30000,
      retries: 3,
      workers: 1
    }
  },

  // Test data configuration
  testData: {
    users: {
      free: {
        email: 'test+free@saasit.ai',
        tier: 'free'
      },
      premium: {
        email: 'test+premium@saasit.ai', 
        tier: 'architect'
      }
    },
    mockResponses: {
      claudeCodeDetection: {
        found: {
          has_claude_code: true,
          version: '1.0.0',
          status: 'found',
          detection_method: 'api',
          additional_info: {
            port: 3001,
            endpoint: 'http://localhost:3001/health'
          }
        },
        notFound: {
          has_claude_code: false,
          version: null,
          status: 'not-found',
          detection_method: null,
          additional_info: {
            checked_methods: 'both',
            suggestions: [
              'Install Claude Code from https://claude.ai/code',
              'Ensure Claude Code is in your PATH'
            ]
          }
        }
      },
      projectAnalysis: {
        simple: {
          technologies: ['React', 'Node.js'],
          framework: 'React',
          project_type: 'Web App',
          complexity: 'simple',
          recommendations: [
            'Use Frontend Developer agent for React components',
            'Consider Backend Architect for API design'
          ]
        },
        complex: {
          technologies: [
            'React', 'TypeScript', 'Node.js', 'FastAPI', 'Python',
            'MongoDB', 'Redis', 'Docker', 'Kubernetes', 'AWS'
          ],
          framework: 'React',
          project_type: 'Microservices',
          complexity: 'complex',
          recommendations: [
            'Use DevOps Automator for Kubernetes deployment',
            'Backend Architect for microservices design',
            'Frontend Developer for React optimization',
            'Infrastructure Maintainer for monitoring'
          ]
        }
      }
    }
  },

  // Performance thresholds
  performance: {
    pageLoad: 3000,       // Max page load time (ms)
    apiResponse: 5000,    // Max API response time (ms)
    detection: 10000,     // Max Claude Code detection time (ms)
    analysis: 15000       // Max project analysis time (ms)
  },

  // Test selectors (centralized for maintainability)
  selectors: {
    onboarding: {
      welcomeStep: '[data-testid="onboarding-step-welcome"]',
      detectionStep: '[data-testid="onboarding-step-detection"]',
      projectTypeStep: '[data-testid="onboarding-step-project-type"]',
      githubStep: '[data-testid="onboarding-step-github"]',
      questionsStep: '[data-testid="onboarding-step-questions"]',
      analysisStep: '[data-testid="onboarding-step-analysis"]',
      templatesStep: '[data-testid="onboarding-step-templates"]',
      progressIndicator: '[data-testid="onboarding-progress"]',
      continueButton: 'button:has-text("Continue"), button:has-text("Let\'s Get Started")',
      skipButton: 'button:has-text("Skip")',
      backButton: 'button:has-text("Back")'
    },
    detection: {
      status: '[data-testid="detection-status"]',
      result: '[data-testid="detection-result"]',
      error: '[data-testid="detection-error"]',
      retryButton: 'button:has-text("Try Again")',
      installGuide: 'button:has-text("Installation Help")'
    },
    projectType: {
      newProjectOption: '[data-testid="project-type-new"]',
      existingProjectOption: '[data-testid="project-type-existing"]',
      option: '[data-testid="project-type-option"]'
    },
    github: {
      connectButton: 'button:has-text("Connect GitHub")',
      skipButton: 'button:has-text("Skip GitHub")',
      repositoryList: '[data-testid="repository-list"]',
      repositoryItem: '[data-testid="repository-item"]'
    },
    analysis: {
      status: '[data-testid="analysis-status"]',
      complete: '[data-testid="analysis-complete"]',
      error: '[data-testid="analysis-error"]',
      technologies: '[data-testid="detected-technologies"]',
      complexity: '[data-testid="project-complexity"]',
      recommendations: '[data-testid="agent-recommendations"]'
    }
  },

  // Browser configurations for cross-browser testing
  browsers: {
    chromium: {
      name: 'chromium',
      viewport: { width: 1280, height: 720 },
      launchOptions: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    },
    firefox: {
      name: 'firefox', 
      viewport: { width: 1280, height: 720 },
      launchOptions: {}
    },
    webkit: {
      name: 'webkit',
      viewport: { width: 1280, height: 720 },
      launchOptions: {}
    },
    mobile: {
      name: 'Mobile Chrome',
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15'
    }
  },

  // Accessibility testing configuration
  accessibility: {
    standards: ['WCAG2A', 'WCAG2AA'],
    rules: {
      'color-contrast': 'error',
      'keyboard-navigation': 'error', 
      'screen-reader': 'error',
      'focus-management': 'error',
      'aria-labels': 'warn'
    },
    ignoreSelectors: [
      // Third-party widgets that we can't control
      '.clerk-components',
      '[data-clerk-element]'
    ]
  }
};

// Get current environment
function getCurrentEnvironment() {
  if (process.env.CI) return 'ci';
  if (process.env.NODE_ENV === 'staging') return 'staging';
  if (process.env.NODE_ENV === 'production') return 'production';
  return 'local';
}

// Get configuration for current environment
function getConfig() {
  const env = getCurrentEnvironment();
  return {
    ...config,
    current: config.environments[env],
    environment: env
  };
}

module.exports = {
  config,
  getCurrentEnvironment,
  getConfig
};