import React, { useEffect } from 'react';
import useAuthStore from '../../lib/stores/authStore';

const AuthProvider = ({ children }) => {
  const { initializeAuth } = useAuthStore();

  useEffect(() => {
    // Initialize auth state on app startup
    initializeAuth();
  }, [initializeAuth]);

  return <>{children}</>;
};

export default AuthProvider;