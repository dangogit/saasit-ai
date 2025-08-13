import React from 'react';
import { ClerkProvider } from '@clerk/clerk-react';

// Get Clerk publishable key from environment
const clerkPubKey = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  console.error('Missing REACT_APP_CLERK_PUBLISHABLE_KEY in environment variables');
}

const ClerkAuthProvider = ({ children }) => {
  return (
    <ClerkProvider 
      publishableKey={clerkPubKey}
      appearance={{
        layout: {
          socialButtonsPlacement: 'top',
          socialButtonsVariant: 'iconButton',
          termsPageUrl: 'https://saasit.ai/terms',
          privacyPageUrl: 'https://saasit.ai/privacy',
        },
        elements: {
          formButtonPrimary: 
            'bg-blue-600 hover:bg-blue-700 text-white',
          card: 'shadow-xl',
          headerTitle: 'text-2xl font-bold',
          headerSubtitle: 'text-gray-600',
          socialButtonsIconButton: 
            'border-gray-300 hover:bg-gray-50',
          formFieldInput: 
            'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
          footerActionLink: 
            'text-blue-600 hover:text-blue-700',
        },
        variables: {
          colorPrimary: '#2563eb',
          colorText: '#111827',
          colorTextSecondary: '#6b7280',
          colorBackground: '#ffffff',
          colorInputBackground: '#ffffff',
          colorInputText: '#111827',
          borderRadius: '0.5rem',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        }
      }}
    >
      {children}
    </ClerkProvider>
  );
};

export default ClerkAuthProvider;