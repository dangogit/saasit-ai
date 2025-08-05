import useAuthStore from '../lib/stores/authStore';

/**
 * Custom hook for authentication functionality
 * Provides a clean interface to the auth store
 */
const useAuth = () => {
  const {
    // State
    isAuthenticated,
    user,
    isLoading,
    error,
    accessToken,
    isGoogleLoading,
    loginModalOpen,
    
    // Actions
    setLoginModalOpen,
    login,
    register,
    logout,
    googleLogin,
    clearError,
    getAuthHeaders,
  } = useAuthStore();

  // Derived state
  const isLoggedIn = isAuthenticated && !!user;
  const userName = user?.name || user?.email || '';
  const userEmail = user?.email || '';
  const userAvatar = user?.picture || user?.avatar;

  // Helper functions
  const openLoginModal = () => setLoginModalOpen(true);
  const closeLoginModal = () => setLoginModalOpen(false);

  const signOut = () => {
    logout();
    // Optionally redirect to home page
    if (window.location.pathname !== '/') {
      window.location.href = '/';
    }
  };

  return {
    // State
    isAuthenticated: isLoggedIn,
    user,
    userName,
    userEmail,
    userAvatar,
    isLoading,
    isGoogleLoading,
    error,
    accessToken,
    loginModalOpen,
    
    // Actions
    login,
    register,
    logout: signOut,
    googleLogin,
    clearError,
    openLoginModal,
    closeLoginModal,
    getAuthHeaders,
  };
};

export default useAuth;