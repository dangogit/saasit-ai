# Auto-Deploy Setup Guide

This guide helps you configure automatic deployment to Fly.io (backend) and Cloudflare Pages (frontend) when code is merged to main.

## 🔑 Required GitHub Secrets

You need to add these secrets to your GitHub repository settings:

### 1. Fly.io Backend Deployment

Go to [GitHub Repository Settings → Secrets → Actions](https://github.com/dangogit/saasit-ai/settings/secrets/actions) and add:

```
FLY_API_TOKEN
```

**How to get your Fly.io API token:**
```bash
# Generate a new token
flyctl auth token

# Copy the token and add it to GitHub secrets
```

### 2. Cloudflare Frontend Deployment

Add these Cloudflare secrets:

```
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
REACT_APP_CLERK_PUBLISHABLE_KEY
```

**How to get Cloudflare credentials:**

1. **API Token**: Go to [Cloudflare Dashboard → My Profile → API Tokens](https://dash.cloudflare.com/profile/api-tokens)
   - Click "Create Token"
   - Use "Cloudflare Pages:Edit" template
   - Include your account and zone permissions

2. **Account ID**: Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Select your domain/account
   - Account ID is shown in the right sidebar

3. **Clerk Publishable Key**: From your `.env` file (already configured):
   ```
   REACT_APP_CLERK_PUBLISHABLE_KEY=pk_test_Z3Jvd2luZy1maXJlZmx5LTk5LmNsZXJrLmFjY291bnRzLmRldiQ
   ```

## 🚀 Auto-Deploy Workflow

Once secrets are configured, deployments will trigger automatically:

### Backend (Fly.io)
- **Trigger**: Push to main with changes in `backend/` folder
- **Process**: 
  1. Run all backend tests with MongoDB
  2. Deploy to `saasit-ai-backend-dgoldman.fly.dev`
  3. Verify health check
- **URL**: https://saasit-ai-backend-dgoldman.fly.dev

### Frontend (Cloudflare Pages)
- **Trigger**: Push to main with changes in `frontend/` folder  
- **Process**:
  1. Run frontend build and E2E tests
  2. Deploy to Cloudflare Pages
  3. Verify site accessibility
- **URL**: https://saasit.ai

## 🛠 Manual Commands

You can also trigger deployments manually:

```bash
# Manual backend deployment
cd backend
flyctl deploy --remote-only

# Manual frontend deployment (if using Wrangler)
cd frontend
npm run build
npx wrangler pages deploy build --project-name=saasit-ai
```

## 🔍 Monitoring Deployments

- **GitHub Actions**: Check the Actions tab in your repository
- **Fly.io Logs**: `flyctl logs --app saasit-ai-backend-dgoldman`
- **Cloudflare Dashboard**: Monitor deployments in Cloudflare Pages section

## 🚨 Deployment Failures

If deployments fail:

1. **Check GitHub Actions logs** for detailed error messages
2. **Backend issues**: Usually environment variables or database connectivity
3. **Frontend issues**: Usually build errors or missing environment variables

The workflows include health checks to ensure deployments are successful before marking as complete.

## 🎯 Next Steps

1. Add the required secrets to GitHub
2. Make a test commit to trigger deployment
3. Monitor the first deployment in GitHub Actions
4. Verify both services are accessible at their URLs

Your SaasIt.ai platform will now automatically deploy on every merge to main! 🚀