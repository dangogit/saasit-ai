// Environment configuration for Cloudflare Pages deployment

const getEnvironmentConfig = () => {
  // In Cloudflare Pages, environment variables are available during build
  const isProd = process.env.NODE_ENV === 'production';
  
  return {
    // API URL - in production, this will use the Pages Functions or Workers
    API_BASE_URL: process.env.REACT_APP_API_URL || 
      (isProd ? '/api' : 'http://localhost:8000/api'),
    
    // Other environment variables
    IS_PRODUCTION: isProd,
    IS_DEVELOPMENT: !isProd,
    
    // Feature flags
    ENABLE_ANALYTICS: process.env.REACT_APP_ENABLE_ANALYTICS === 'true',
    ENABLE_DEBUG: process.env.REACT_APP_ENABLE_DEBUG === 'true',
  };
};

export default getEnvironmentConfig();