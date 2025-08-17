import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration optimized for CI environments
 * Focuses on reliability, speed, and comprehensive reporting
 */
export default defineConfig({
  testDir: './e2e',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI for more stable runs */
  workers: process.env.CI ? 2 : undefined,
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { 
      outputFolder: 'playwright-report',
      open: 'never'
    }],
    ['json', { 
      outputFile: 'test-results/results.json' 
    }],
    ['junit', { 
      outputFile: 'test-results/junit.xml' 
    }],
    ['github'], // GitHub Actions annotations
    process.env.CI ? ['dot'] : ['list']
  ],
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.CI ? 'http://localhost:3000' : 'http://localhost:3000',
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'retain-on-failure',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Timeout for each action */
    actionTimeout: process.env.CI ? 15000 : 10000,
    
    /* Timeout for navigation */
    navigationTimeout: process.env.CI ? 30000 : 20000,
    
    /* Ignore HTTPS errors for CI environment */
    ignoreHTTPSErrors: true,
    
    /* Viewport for tests */
    viewport: { width: 1280, height: 720 },
    
    /* User agent for tests */
    userAgent: 'SaasIt-E2E-Tests'
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Additional CI-specific settings
        launchOptions: {
          args: process.env.CI ? [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-extensions'
          ] : []
        }
      },
    },

    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        launchOptions: {
          firefoxUserPrefs: process.env.CI ? {
            'media.navigator.streams.fake': true,
            'media.navigator.permission.disabled': true
          } : {}
        }
      },
    },

    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        // WebKit specific CI settings
        contextOptions: process.env.CI ? {
          reducedMotion: 'reduce'
        } : {}
      },
    },

    /* Mobile browsers for mobile testing */
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        launchOptions: {
          args: process.env.CI ? [
            '--no-sandbox',
            '--disable-setuid-sandbox'
          ] : []
        }
      },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Accessibility testing project */
    {
      name: 'accessibility',
      testMatch: '**/accessibility.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--force-prefers-reduced-motion',
            '--force-dark-mode'
          ]
        }
      }
    }
  ],

  /* Global setup and teardown */
  globalSetup: process.env.CI ? undefined : require.resolve('./e2e/global-setup.ts'),
  globalTeardown: process.env.CI ? undefined : require.resolve('./e2e/global-teardown.ts'),

  /* Timeout settings for CI */
  timeout: process.env.CI ? 45000 : 30000,
  expect: {
    timeout: process.env.CI ? 10000 : 5000
  },

  /* Output directory */
  outputDir: 'test-results/',

  /* Run your local dev server before starting the tests */
  webServer: process.env.CI ? undefined : {
    command: 'npm start',
    port: 3000,
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
    env: {
      NODE_ENV: 'test',
      REACT_APP_API_URL: 'http://localhost:8000'
    }
  },
});