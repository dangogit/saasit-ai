import React from 'react';
import { GoogleOAuthProvider as GoogleProvider } from '@react-oauth/google';

// Google OAuth Client ID - In production, this should come from environment variables
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "your-google-client-id";

const GoogleOAuthProvider = ({ children }) => {
  return (
    <GoogleProvider clientId={GOOGLE_CLIENT_ID}>
      {children}
    </GoogleProvider>
  );
};

export default GoogleOAuthProvider;