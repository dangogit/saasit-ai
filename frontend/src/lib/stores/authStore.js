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
          // Send the Google credential to your backend
          const response = await fetch('/api/auth/google', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              credential: credentialResponse.credential,
            }),
          });

          if (!response.ok) {
            throw new Error('Authentication failed');
          }

          const data = await response.json();

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
          set((state) => {
            state.error = error.message || 'Google login failed';
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
          const response = await fetch('/api/auth/login', {
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
          const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password, name }),
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
          const response = await fetch('/api/auth/verify', {
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
        set((state) => {
          state.error = 'Google Sign-In failed. Please try again.';
          state.isGoogleLoading = false;
        });
      },
    }))
  )
);

export default useAuthStore;