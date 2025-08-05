import React, { useEffect } from 'react';
import useAuthStore from '../../lib/stores/authStore';
import LoadingSpinner from './loading-spinner';

const ProtectedRoute = ({ children, requireAuth = true }) => {
  const { isAuthenticated, isLoading, setLoginModalOpen } = useAuthStore();

  useEffect(() => {
    // If authentication is required and user is not authenticated,
    // open the login modal
    if (requireAuth && !isAuthenticated && !isLoading) {
      setLoginModalOpen(true);
    }
  }, [isAuthenticated, isLoading, requireAuth, setLoginModalOpen]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" className="text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If authentication is required but user is not authenticated,
  // show a message prompting them to sign in
  if (requireAuth && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md mx-auto p-6">
          <div className="w-16 h-16 mx-auto bg-accent rounded-full flex items-center justify-center">
            <svg 
              className="w-8 h-8 text-accent-foreground" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
              />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-foreground">Authentication Required</h2>
          <p className="text-muted-foreground">
            Please sign in to access the SaasIt.ai workflow designer.
          </p>
          <button 
            onClick={() => setLoginModalOpen(true)}
            className="btn-primary"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // Render the protected content
  return children;
};

export default ProtectedRoute;