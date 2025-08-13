import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

const useAuthStore = create()(
  devtools(
    immer((set, get) => ({
      // State
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: null,
      accessToken: null,
      
      // OAuth state
      isGoogleLoading: false,
      loginModalOpen: false,

      // Actions
      setLoading: (loading) =>
        set((state) => {
          state.isLoading = loading;
        }),

      setGoogleLoading: (loading) =>
        set((state) => {
          state.isGoogleLoading = loading;
        }),

      setError: (error) =>
        set((state) => {
          state.error = error;
        }),

      clearError: () =>
        set((state) => {
          state.error = null;
        }),

      setLoginModalOpen: (open) =>
        set((state) => {
          state.loginModalOpen = open;
        }),

      // Google OAuth login
      googleLogin: async (credentialResponse) => {
        set((state) => {
          state.isGoogleLoading = true;
          state.error = null;
        });

        try {
          // Validate credential response
          if (!credentialResponse?.credential) {
            throw new Error('No credential received from Google');
          }

          console.log('Sending Google OAuth credential to backend...');

          // Send the Google credential to your backend
          const response = await fetch('/api/v1/auth/google', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              credential: credentialResponse.credential,
            }),
          });

          let data;
          try {
            data = await response.json();
          } catch (parseError) {
            console.error('Failed to parse backend response:', parseError);
            throw new Error('Invalid response from authentication server');
          }

          if (!response.ok) {
            // Handle specific error responses from backend
            const errorMessage = data?.detail || data?.message || `Authentication failed (${response.status})`;
            console.error('Backend authentication error:', {
              status: response.status,
              statusText: response.statusText,
              error: errorMessage,
              data
            });
            throw new Error(errorMessage);
          }

          // Validate response data
          if (!data.token || !data.user) {
            console.error('Invalid response data from backend:', data);
            throw new Error('Invalid response from authentication server');
          }

          console.log('Google OAuth authentication successful');

          // Store the JWT token
          localStorage.setItem('authToken', data.token);

          set((state) => {
            state.isAuthenticated = true;
            state.user = data.user;
            state.accessToken = data.token;
            state.isGoogleLoading = false;
            state.loginModalOpen = false;
          });

        } catch (error) {
          console.error('Google login error:', error);
          
          // Set appropriate error message based on error type
          let errorMessage = 'Google login failed';
          if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorMessage = 'Unable to connect to authentication server. Please check your internet connection.';
          } else if (error.message.includes('Google')) {
            errorMessage = error.message;
          } else if (error.message.includes('Authentication')) {
            errorMessage = 'Google authentication failed. Please try again.';
          } else if (error.message.includes('Invalid response')) {
            errorMessage = 'Server error. Please try again later.';
          }

          set((state) => {
            state.error = errorMessage;
            state.isGoogleLoading = false;
          });
        }
      },

      // Traditional email/password login
      login: async (email, password) => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          const response = await fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          });

          if (!response.ok) {
            throw new Error('Login failed');
          }

          const data = await response.json();

          // Store the JWT token
          localStorage.setItem('authToken', data.token);

          set((state) => {
            state.isAuthenticated = true;
            state.user = data.user;
            state.accessToken = data.token;
            state.isLoading = false;
            state.loginModalOpen = false;
          });

        } catch (error) {
          console.error('Login error:', error);
          set((state) => {
            state.error = error.message || 'Login failed';
            state.isLoading = false;
          });
        }
      },

      // Register
      register: async (email, password, name) => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          // Split name into first and last name
          const nameParts = name.trim().split(' ');
          const first_name = nameParts[0] || '';
          const last_name = nameParts.slice(1).join(' ') || nameParts[0] || '';

          const response = await fetch('/api/v1/auth/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password, first_name, last_name }),
          });

          if (!response.ok) {
            throw new Error('Registration failed');
          }

          const data = await response.json();

          // Store the JWT token
          localStorage.setItem('authToken', data.token);

          set((state) => {
            state.isAuthenticated = true;
            state.user = data.user;
            state.accessToken = data.token;
            state.isLoading = false;
            state.loginModalOpen = false;
          });

        } catch (error) {
          console.error('Registration error:', error);
          set((state) => {
            state.error = error.message || 'Registration failed';
            state.isLoading = false;
          });
        }
      },

      // Logout
      logout: () => {
        // Remove token from localStorage
        localStorage.removeItem('authToken');

        set((state) => {
          state.isAuthenticated = false;
          state.user = null;
          state.accessToken = null;
          state.error = null;
        });
      },

      // Initialize auth state from localStorage
      initializeAuth: async () => {
        const token = localStorage.getItem('authToken');
        
        if (!token) {
          return;
        }

        set((state) => {
          state.isLoading = true;
        });

        try {
          // Verify token with backend
          const response = await fetch('/api/v1/auth/verify', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            throw new Error('Token verification failed');
          }

          const data = await response.json();

          set((state) => {
            state.isAuthenticated = true;
            state.user = data.user;
            state.accessToken = token;
            state.isLoading = false;
          });

        } catch (error) {
          console.error('Token verification error:', error);
          // Remove invalid token
          localStorage.removeItem('authToken');
          
          set((state) => {
            state.isAuthenticated = false;
            state.user = null;
            state.accessToken = null;
            state.isLoading = false;
          });
        }
      },

      // Get authenticated headers for API calls
      getAuthHeaders: () => {
        const { accessToken } = get();
        return accessToken ? {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        } : {
          'Content-Type': 'application/json',
        };
      },

      // Handle Google OAuth error
      handleGoogleError: (error) => {
        console.error('Google OAuth error:', error);
        
        let errorMessage = 'Google Sign-In failed';
        
        if (error?.error === 'popup_closed_by_user') {
          errorMessage = 'Google Sign-In was cancelled';
        } else if (error?.error === 'popup_blocked_by_browser') {
          errorMessage = 'Google Sign-In popup was blocked. Please allow popups and try again.';
        } else if (error?.error === 'idpiframe_initialization_failed') {
          errorMessage = 'Google Sign-In is not available. Please check your internet connection.';
        } else if (error?.type === 'network_error') {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (error?.message) {
          errorMessage = error.message;
        }
        
        set((state) => {
          state.error = errorMessage;
          state.isGoogleLoading = false;
        });
      },
    }))
  )
);

export default useAuthStore;