# Authentication System Documentation

## Overview

The SaasIt.ai frontend implements a comprehensive authentication system with support for:
- Google OAuth Sign-In
- Traditional email/password authentication
- JWT token management
- Protected routes
- Persistent authentication state

## Components

### Core Components

#### 1. `useAuthStore` (Zustand Store)
**Location**: `src/lib/stores/authStore.js`

The main state management for authentication using Zustand with immer middleware.

**State**:
- `isAuthenticated`: Boolean indicating if user is logged in
- `user`: User object with profile information
- `accessToken`: JWT token for API requests
- `isLoading`: Loading state for auth operations
- `isGoogleLoading`: Loading state specifically for Google OAuth
- `error`: Error messages from auth operations
- `loginModalOpen`: Controls visibility of login modal

**Actions**:
- `login(email, password)`: Traditional email/password login
- `register(email, password, name)`: User registration
- `googleLogin(credentialResponse)`: Google OAuth login
- `logout()`: Sign out user and clear tokens
- `initializeAuth()`: Initialize auth state from localStorage
- `getAuthHeaders()`: Get headers for authenticated API requests

#### 2. `AuthModal`
**Location**: `src/components/ui/auth-modal.jsx`

A comprehensive modal component for authentication with:
- Login/Register mode switching
- Form validation
- Google Sign-In integration
- Error handling
- Responsive design

#### 3. `GoogleSignInButton`
**Location**: `src/components/ui/google-signin-button.jsx`

A customizable Google Sign-In button component that:
- Integrates with @react-oauth/google
- Matches the app's design system
- Handles loading states
- Provides error handling

#### 4. `UserMenu`
**Location**: `src/components/ui/user-menu.jsx`

A dropdown menu for authenticated users featuring:
- User avatar and profile info
- Navigation to profile/settings
- Logout functionality
- Responsive design

#### 5. `ProtectedRoute`
**Location**: `src/components/ui/protected-route.jsx`

A wrapper component that:
- Protects routes requiring authentication
- Shows loading states during auth check
- Prompts unauthenticated users to sign in
- Automatically opens login modal when needed

### Provider Components

#### 1. `GoogleOAuthProvider`
**Location**: `src/components/providers/GoogleOAuthProvider.jsx`

Wraps the app with Google OAuth context using the client ID from environment variables.

#### 2. `AuthProvider`
**Location**: `src/components/providers/AuthProvider.jsx`

Initializes authentication state on app startup by checking for stored tokens.

### Hooks

#### `useAuth`
**Location**: `src/hooks/useAuth.js`

A custom hook that provides a clean interface to the auth store with:
- Simplified state access
- Helper functions
- Derived state calculations

## Setup & Configuration

### 1. Environment Variables

Add to your `.env` file:
```
REACT_APP_GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

### 2. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add your domain to authorized origins
6. Copy the client ID to your environment variables

### 3. Backend Integration

The auth system expects these API endpoints:

```
POST /api/auth/google
POST /api/auth/login
POST /api/auth/register
GET /api/auth/verify
```

Expected response format:
```json
{
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "User Name",
    "picture": "avatar-url"
  }
}
```

## Usage Examples

### Basic Usage in Components

```jsx
import useAuth from '../hooks/useAuth';

const MyComponent = () => {
  const { 
    isAuthenticated, 
    user, 
    openLoginModal, 
    logout 
  } = useAuth();

  if (!isAuthenticated) {
    return (
      <button onClick={openLoginModal}>
        Sign In
      </button>
    );
  }

  return (
    <div>
      <p>Welcome, {user.name}!</p>
      <button onClick={logout}>Sign Out</button>
    </div>
  );
};
```

### Protected Routes

```jsx
import { ProtectedRoute } from '../components/ui';

const App = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route 
      path="/dashboard" 
      element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } 
    />
  </Routes>
);
```

### Making Authenticated API Calls

```jsx
import useAuth from '../hooks/useAuth';

const MyComponent = () => {
  const { getAuthHeaders } = useAuth();

  const fetchUserData = async () => {
    const response = await fetch('/api/user/profile', {
      headers: getAuthHeaders()
    });
    return response.json();
  };

  // ... rest of component
};
```

## Security Features

1. **JWT Token Storage**: Tokens are stored in localStorage and automatically included in API requests
2. **Token Validation**: Tokens are verified on app initialization
3. **Automatic Cleanup**: Invalid tokens are automatically removed
4. **Protected Routes**: Sensitive pages require authentication
5. **Error Handling**: Comprehensive error handling for auth failures

## Styling & Theming

The authentication components use the app's design system:
- CSS custom properties for consistent colors
- Tailwind CSS for responsive design
- Shadcn/ui components for consistency
- Custom animations and transitions
- Accessible form controls

## Testing Considerations

When testing authentication:
1. Mock the auth store state
2. Test protected route behavior
3. Verify token storage/retrieval
4. Test error handling scenarios
5. Ensure accessibility compliance

## Browser Support

The authentication system supports:
- Modern browsers with localStorage support
- Browsers that support the Google Identity Services library
- Mobile browsers for responsive design

## Performance

- Lazy loading of auth components
- Optimized re-renders with Zustand
- Minimal bundle size impact
- Efficient token validation