import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for Playwright tests
 * Handles database seeding and environment preparation
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for E2E tests...');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Wait for backend to be ready
    console.log('⏳ Waiting for backend to be ready...');
    await page.waitForResponse(
      response => response.url().includes('/health') && response.status() === 200,
      { timeout: 60000 }
    );
    
    // Clear test database
    console.log('🧹 Clearing test database...');
    const response = await page.request.post('http://localhost:8000/api/v1/test/clear-db', {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok()) {
      console.warn('⚠️  Could not clear test database, continuing anyway...');
    }
    
    console.log('✅ Global setup completed successfully');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;