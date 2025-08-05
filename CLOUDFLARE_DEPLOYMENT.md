# Cloudflare Deployment Guide for SaasIt.ai

This guide explains how to deploy SaasIt.ai using Cloudflare Pages (frontend) and either Cloudflare Workers or an external Python hosting service (backend).

## Architecture Overview

Since Cloudflare doesn't natively support Python, we have two options:
1. **Hybrid Approach**: Cloudflare Pages for frontend + External Python host (Fly.io, Railway, Render) for backend
2. **Full Cloudflare**: Cloudflare Pages for frontend + Workers as API proxy to external Python backend

## Prerequisites

- Cloudflare account
- GitHub repository connected to Cloudflare
- Python backend hosted externally (Fly.io, Railway, or Render recommended)
- Domain name (optional but recommended)

## Step 1: Deploy Python Backend First

Since Cloudflare doesn't run Python natively, deploy your backend to one of these services:

### Option A: Deploy to Fly.io (Recommended)
```bash
cd backend
# Install flyctl: https://fly.io/docs/flyctl/install/
fly launch
fly secrets set MONGO_URL="your-mongodb-url"
fly secrets set JWT_SECRET="your-jwt-secret"
fly secrets set ANTHROPIC_API_KEY="your-anthropic-key"
fly deploy
```

### Option B: Deploy to Railway
1. Connect your GitHub repo to Railway
2. Add environment variables in Railway dashboard
3. Deploy from the backend directory

### Option C: Deploy to Render
1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set root directory to `backend`
4. Add environment variables

Note your backend URL (e.g., `https://saasit-backend.fly.dev`)

## Step 2: Deploy Frontend to Cloudflare Pages

### Via Cloudflare Dashboard (Recommended)

1. Go to Cloudflare Dashboard > Pages
2. Click "Create a project"
3. Connect your GitHub repository
4. Configure build settings:
   - **Framework preset**: Create React App
   - **Build command**: `cd frontend && yarn install && yarn build`
   - **Build output directory**: `frontend/build`
   - **Root directory**: `/`

5. Add environment variables:
   - `REACT_APP_API_URL`: Your backend URL (e.g., `https://saasit-backend.fly.dev/api`)
   - `NODE_VERSION`: `18`

6. Click "Save and Deploy"

### Via Wrangler CLI

```bash
# Install wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy frontend
cd frontend
yarn build
wrangler pages deploy build --project-name=saasit-frontend
```

## Step 3: Configure API Proxy

### Option A: Using Pages Functions (Recommended)

The `backend/functions/api/[[catchall]].js` file is already set up to proxy API requests.

1. In Cloudflare Pages settings, add environment variable:
   - `BACKEND_URL`: Your Python backend URL

2. Update `frontend/_redirects` with your actual backend URL:
```
/*    /index.html   200
/api/*  https://your-backend.fly.dev/api/:splat  200
```

### Option B: Using Cloudflare Workers

1. Deploy the Worker:
```bash
cd backend
wrangler deploy
```

2. Configure Worker environment variables in Cloudflare dashboard:
   - `BACKEND_URL`: Your Python backend URL
   - `CORS_ORIGIN`: Your Cloudflare Pages URL

## Step 4: Custom Domain Setup (Optional)

1. In Cloudflare Pages > Custom domains
2. Add your domain (e.g., `saasit.ai`)
3. Update DNS records as instructed
4. SSL will be automatically provisioned

## Step 5: Environment Variables Summary

### Cloudflare Pages (Frontend)
- `REACT_APP_API_URL`: Set to `/api` (uses Pages Functions) or your Worker URL
- `NODE_VERSION`: `18`

### Backend (on Fly.io/Railway/Render)
- `MONGO_URL`: MongoDB connection string
- `DB_NAME`: Database name
- `JWT_SECRET`: Secure random string
- `ANTHROPIC_API_KEY`: Your Claude API key
- `CORS_ORIGINS`: Your Cloudflare Pages URL

### Cloudflare Worker/Functions
- `BACKEND_URL`: Your Python backend URL
- `CORS_ORIGIN`: Your frontend domain

## Deployment Commands

### Frontend Updates
```bash
# Automatic via GitHub integration
git push origin main

# Or manual deployment
cd frontend
yarn build
wrangler pages deploy build --project-name=saasit-frontend
```

### Backend Updates
```bash
# For Fly.io
cd backend
fly deploy

# For Railway/Render
git push origin main
```

## Monitoring and Logs

- **Frontend**: Cloudflare Pages > Analytics
- **Workers**: Cloudflare Workers > Logs
- **Backend**: Check your hosting provider's logs

## Troubleshooting

### CORS Issues
- Ensure `CORS_ORIGINS` includes your Cloudflare Pages URL
- Check that API proxy is correctly configured

### API Connection Failed
- Verify `BACKEND_URL` is correct in Worker/Functions
- Check backend is running and accessible
- Review network logs in browser DevTools

### Build Failures
- Check Node version is set to 18
- Verify all dependencies are in package.json
- Review build logs in Cloudflare dashboard

## Cost Optimization

- **Cloudflare Pages**: Free for up to 500 builds/month
- **Cloudflare Workers**: Free for up to 100k requests/day
- **Backend hosting**: Varies by provider (Fly.io has generous free tier)

## Security Notes

1. Never commit `.env` files
2. Use Cloudflare Access for additional security
3. Enable rate limiting on Workers
4. Use environment variables for all secrets
5. Consider Cloudflare WAF for production

## Next Steps

1. Set up monitoring (Sentry, LogRocket)
2. Configure Cloudflare Analytics
3. Enable Cloudflare caching rules
4. Set up CI/CD with GitHub Actions
5. Configure preview deployments for PRs