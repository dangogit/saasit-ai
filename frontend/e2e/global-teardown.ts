/**
 * Global teardown for Playwright tests
 * Cleans up test data and resources
 */
async function globalTeardown() {
  console.log('🧹 Starting global teardown...');
  
  try {
    // Clean up any remaining test data
    console.log('🗑️  Cleaning up test artifacts...');
    
    // Additional cleanup can be added here
    
    console.log('✅ Global teardown completed successfully');
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error in teardown to avoid masking test failures
  }
}

export default globalTeardown;