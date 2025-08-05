# Google OAuth CORS Configuration

This document explains the enhanced CORS configuration implemented for Google OAuth integration in the SaasIt.ai backend.

## Overview

The backend now includes comprehensive CORS (Cross-Origin Resource Sharing) configuration specifically designed to support Google OAuth flows while maintaining security in both development and production environments.

## Key Components

### 1. Enhanced CORS Origins (`app/config.py`)

The following origins are now allowed by default:

#### Development Origins
- `http://localhost:3000` - Primary development server
- `http://localhost:3001` - Secondary development server  
- `http://127.0.0.1:3000` - Alternative localhost reference
- `http://127.0.0.1:3001` - Alternative localhost reference

#### Production Origins
- `https://saasit.ai` - Main production domain
- `https://www.saasit.ai` - WWW subdomain
- `https://app.saasit.ai` - Application subdomain

#### Google OAuth Required Origins
- `https://accounts.google.com` - Google's OAuth authorization server
- `https://oauth2.googleapis.com` - Google's OAuth token endpoint
- `https://www.googleapis.com` - Google APIs general endpoint

#### Staging/Preview Origins
- `https://*.pages.dev` - Cloudflare Pages wildcard (note: middleware handles wildcards)
- `https://saasit-ai.pages.dev` - Specific Cloudflare Pages domain

### 2. OAuth-Specific CORS Middleware (`app/middleware/oauth_cors.py`)

A specialized middleware that provides:

#### Enhanced Security Validation
- Origin validation specifically for OAuth endpoints
- State parameter validation for CSRF protection
- Callback request parameter validation
- Strict mode enforcement in production

#### Protected Endpoints
- `/api/v1/auth/google/login`
- `/api/v1/auth/google/callback`
- `/api/v1/auth/google/link`
- Legacy `/api/auth/google/*` paths

#### Features
- Preflight request handling with OAuth-specific headers
- Enhanced error responses with proper CORS headers
- Development vs production security modes
- Comprehensive logging for security events

### 3. CORS Utilities (`app/utils/cors_utils.py`)

Utility functions for OAuth CORS management:

#### Origin Validation
```python
validate_origin_for_oauth(origin: str) -> bool
```
Validates if an origin is allowed for OAuth operations.

#### Redirect URI Validation  
```python
is_valid_redirect_uri(redirect_uri: str) -> bool
```
Validates OAuth redirect URIs against allowed hosts.

#### Dynamic Redirect URI Generation
```python
get_google_oauth_redirect_uri() -> str
```
Generates appropriate redirect URI based on environment.

#### State Parameter Validation
```python
validate_oauth_state_parameter(state: str) -> bool
```
Validates OAuth state parameters for CSRF protection.

## Environment Configuration

### Required Environment Variables

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback

# OAuth Security Settings
OAUTH_ALLOWED_REDIRECT_HOSTS=localhost,127.0.0.1,saasit.ai,www.saasit.ai,app.saasit.ai

# CORS Configuration (comma-separated)
BACKEND_CORS_ORIGINS=http://localhost:3000,https://saasit.ai,https://accounts.google.com

# Environment Mode
ENVIRONMENT=development  # or production
```

### Dynamic Configuration

The system automatically adjusts CORS settings based on the `ENVIRONMENT` variable:

#### Development Mode
- More lenient origin validation
- Allows missing state parameters with warnings
- Includes development-specific origins

#### Production Mode
- Strict origin validation
- Requires state parameters for CSRF protection
- Enhanced security logging
- Restrictive error responses

## Google Cloud Console Configuration

### Required OAuth 2.0 Settings

1. **Authorized JavaScript Origins:**
   - `http://localhost:3000` (development)
   - `https://saasit.ai` (production)
   - `https://www.saasit.ai` (production)
   - `https://app.saasit.ai` (production)

2. **Authorized Redirect URIs:**
   - `http://localhost:8000/api/v1/auth/google/callback` (development)
   - `https://your-backend-domain.com/api/v1/auth/google/callback` (production)

### OAuth Consent Screen

Configure the OAuth consent screen with:
- Application name: "SaasIt.ai"
- User support email
- Developer contact information
- Authorized domains: `saasit.ai`

## Security Features

### CSRF Protection
- State parameter generation and validation
- Origin header validation
- Referer header checks

### Enhanced Headers
The middleware sets specific headers for OAuth operations:

```
Access-Control-Allow-Origin: [validated-origin]
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Origin, Accept, X-CSRF-Token
Access-Control-Max-Age: 86400
```

### Request Validation
- Authorization code presence validation
- State parameter format validation
- Origin whitelist enforcement
- Content-Type validation for different request types

## Troubleshooting

### Common Issues

#### CORS Errors in Development
1. Ensure `http://localhost:3000` is in `BACKEND_CORS_ORIGINS`
2. Check that the frontend is making requests to the correct backend URL
3. Verify `ENVIRONMENT=development` is set

#### OAuth Callback Failures
1. Verify redirect URI matches Google Console configuration exactly
2. Check that the callback endpoint receives both `code` and `state` parameters
3. Ensure the origin making the OAuth request is whitelisted

#### Production CORS Issues
1. Update `BACKEND_CORS_ORIGINS` with production frontend URL
2. Set `ENVIRONMENT=production` for strict validation
3. Ensure HTTPS is used for all production URLs

### Debug Information

Enable debug logging to see detailed CORS and OAuth validation:

```python
import logging
logging.getLogger("app.middleware.oauth_cors").setLevel(logging.DEBUG)
logging.getLogger("app.utils.cors_utils").setLevel(logging.DEBUG)
```

## Testing

### Local Testing
1. Start backend: `uvicorn server:app --reload`
2. Start frontend: `npm start`
3. Test OAuth flow through the frontend
4. Check browser developer tools for CORS-related errors

### Production Testing
1. Deploy with production environment variables
2. Test OAuth flow from production frontend
3. Monitor logs for security validation events
4. Verify all origins are properly validated

## Migration Notes

### From Previous Configuration
- Update environment variables to include new OAuth and CORS settings
- Test OAuth flows thoroughly after deployment
- Monitor logs for any origin validation failures
- Update Google Cloud Console with new redirect URIs if needed

### Frontend Changes Required
- Ensure frontend makes OAuth requests to correct backend endpoints
- Handle enhanced error responses from OAuth middleware
- Update any hardcoded OAuth URLs to use environment-specific values

## Security Considerations

### Production Deployment
- Always use HTTPS for production OAuth flows
- Regularly rotate Google OAuth client secrets
- Monitor OAuth-related logs for suspicious activity
- Keep allowed origins list minimal and specific

### Monitoring
- Set up alerts for OAuth validation failures
- Monitor for unusual patterns in OAuth requests
- Log all OAuth-related security events
- Regular security audits of allowed origins

This configuration provides a robust, secure foundation for Google OAuth integration while maintaining flexibility for development workflows.