# Google OAuth Setup Guide

This guide explains how to set up and use the Google OAuth service for authentication in SaasIt.ai.

## Prerequisites

1. **Google Cloud Console Setup**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Google+ API
   - Go to "Credentials" and create "OAuth 2.0 Client IDs"
   - Add authorized redirect URIs:
     - `http://localhost:8000/api/auth/google/callback` (development)
     - `https://yourdomain.com/api/auth/google/callback` (production)

2. **Environment Variables**
   Add these to your `.env` file:
   ```bash
   GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback
   ```

## Available Endpoints

### 1. Initialize Google OAuth Flow

```http
GET /api/auth/google/login?state=optional-csrf-token
```

**Response:**
```json
{
  "authorization_url": "https://accounts.google.com/o/oauth2/auth?...",
  "message": "Redirect user to this URL to complete Google OAuth"
}
```

### 2. Handle OAuth Callback

```http
POST /api/auth/google/callback
Content-Type: application/json

{
  "code": "authorization_code_from_google",
  "state": "optional_csrf_token"
}
```

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "is_verified": true,
    "provider": "google",
    "profile_picture": "https://...",
    "subscription": {
      "tier": "free",
      "status": "active"
    }
  },
  "access_token": "jwt_access_token",
  "refresh_token": "jwt_refresh_token",
  "token_type": "bearer"
}
```

### 3. Link Google Account (Authenticated)

```http
POST /api/auth/google/link
Authorization: Bearer your_access_token
Content-Type: application/json

{
  "code": "authorization_code_from_google"
}
```

**Response:**
```json
{
  "message": "Google account linked successfully"
}
```

### 4. Unlink Google Account (Authenticated)

```http
DELETE /api/auth/google/unlink
Authorization: Bearer your_access_token
```

**Response:**
```json
{
  "message": "Google account unlinked successfully"
}
```

## Frontend Integration Example

### JavaScript/React Example

```javascript
// 1. Initiate OAuth flow
const initiateGoogleAuth = async () => {
  const response = await fetch('/api/auth/google/login');
  const data = await response.json();
  
  // Redirect user to Google
  window.location.href = data.authorization_url;
};

// 2. Handle callback (in your callback route)
const handleGoogleCallback = async (code, state) => {
  const response = await fetch('/api/auth/google/callback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code, state }),
  });
  
  const data = await response.json();
  
  if (response.ok) {
    // Store tokens
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    
    // Redirect to dashboard
    window.location.href = '/dashboard';
  } else {
    console.error('Authentication failed:', data.detail);
  }
};
```

### URL Parameters from Google

When Google redirects back to your callback URL, it will include:
- `code`: Authorization code to exchange for tokens
- `state`: The state parameter you provided (for CSRF protection)
- `error`: If authentication failed

Example callback URL:
```
http://localhost:8000/callback?code=4/0AX4XfWh...&state=csrf_token
```

## User Data Flow

1. **New User**: Creates account with Google OAuth data
   - No password required
   - Email is pre-verified
   - Profile picture from Google
   - Default free tier subscription

2. **Existing User**: Updates account with Google OAuth
   - Links Google ID to existing account
   - Updates profile picture if provided
   - Maintains existing subscription and usage data

3. **Account Linking**: Existing users can link Google accounts
   - Prevents duplicate accounts
   - Allows social login for existing email users

## Error Handling

Common error responses:

```json
// Invalid authorization code
{
  "detail": "Failed to exchange authorization code for tokens"
}

// Google account already linked
{
  "detail": "This Google account is already linked to another user"
}

// Invalid ID token
{
  "detail": "Invalid or expired ID token"
}

// Network errors
{
  "detail": "Network error during authentication"
}
```

## Security Features

1. **ID Token Verification**: Validates Google's cryptographic signature
2. **Issuer Validation**: Ensures tokens come from Google
3. **State Parameter**: CSRF protection for OAuth flow
4. **Secure Token Storage**: JWT tokens with expiration
5. **Account Linking Prevention**: Prevents duplicate Google accounts

## Testing

The service includes comprehensive tests covering:
- Authorization URL generation
- Token exchange and verification
- User data extraction and validation
- Account creation and linking
- Error handling scenarios

Run tests with:
```bash
python -m pytest tests/test_google_oauth_service.py -v
```

## Deployment Notes

### Production Setup

1. Update redirect URIs in Google Cloud Console
2. Set production environment variables
3. Use HTTPS for all OAuth endpoints
4. Consider rate limiting for OAuth endpoints
5. Monitor for failed authentication attempts

### Environment Variables for Production

```bash
GOOGLE_CLIENT_ID=your-production-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-production-client-secret
GOOGLE_REDIRECT_URI=https://api.yourdomain.com/api/auth/google/callback
```

## Troubleshooting

### Common Issues

1. **Invalid Redirect URI**
   - Ensure URI exactly matches Google Cloud Console
   - Check for trailing slashes

2. **Invalid Client ID**
   - Verify environment variables are loaded
   - Check for typos in client ID

3. **Token Verification Failed**
   - Ensure system clock is accurate
   - Check network connectivity to Google APIs

4. **User Creation Failed**
   - Verify MongoDB connection
   - Check required user fields are provided

### Debug Mode

Enable debug logging for OAuth operations:

```python
import logging
logging.getLogger('app.services.google_oauth_service').setLevel(logging.DEBUG)
```

This will log all OAuth operations including token exchanges and user data processing.