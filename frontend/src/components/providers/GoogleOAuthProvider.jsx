import React from 'react';
import { GoogleOAuthProvider as GoogleProvider } from '@react-oauth/google';

// Get Google OAuth Client ID from environment variables
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

const GoogleOAuthProvider = ({ children }) => {
  // Validate that Client ID is configured
  if (!GOOGLE_CLIENT_ID) {
    console.error('REACT_APP_GOOGLE_CLIENT_ID environment variable is not set');
    throw new Error('Google OAuth Client ID is not configured. Please set REACT_APP_GOOGLE_CLIENT_ID environment variable.');
  }

  // Validate Client ID format (basic check)
  if (!GOOGLE_CLIENT_ID.includes('.apps.googleusercontent.com')) {
    console.error('Invalid Google OAuth Client ID format:', GOOGLE_CLIENT_ID);
    throw new Error('Invalid Google OAuth Client ID format');
  }

  return (
    <GoogleProvider clientId={GOOGLE_CLIENT_ID}>
      {children}
    </GoogleProvider>
  );
};

export default GoogleOAuthProvider;