# Fly.io Deployment Steps for SaasIt.ai Backend

## Prerequisites
1. ✅ Fly CLI installed
2. ✅ Logged in to Fly.io
3. ❌ **Payment method added** - Required even for free tier
   - Visit: https://fly.io/dashboard/daniel-goldman-719/billing
   - Add a credit card (won't be charged for free tier usage)

## Deployment Steps

### 1. Add Payment Method
First, add a payment method to your Fly.io account:
```
https://fly.io/dashboard/daniel-goldman-719/billing
```

### 2. Create MongoDB Database
You'll need a MongoDB instance. Options:
- **MongoDB Atlas** (Recommended - Free tier available)
  - Sign up at https://www.mongodb.com/cloud/atlas
  - Create a free M0 cluster
  - Get your connection string
- **Local MongoDB** (for testing only)

### 3. Prepare Environment Variables
You'll need:
- `MONGO_URL`: Your MongoDB connection string
- `JWT_SECRET`: A secure random string (generated automatically)
- `ANTHROPIC_API_KEY`: Your Claude API key from https://console.anthropic.com/
- `CORS_ORIGINS`: Your frontend URL (will be your Cloudflare Pages URL)

### 4. Deploy Backend

Option A: Use the deployment script:
```bash
cd backend
./deploy-to-fly.sh
```

Option B: Manual deployment:
```bash
# Set PATH for flyctl
export PATH="/Users/danielgoldman/.fly/bin:$PATH"

# Navigate to backend
cd backend

# Create the app
flyctl apps create saasit-ai-backend-dgoldman

# Set secrets (replace with your actual values)
flyctl secrets set MONGO_URL="mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority"
flyctl secrets set DB_NAME="saasit_ai"
flyctl secrets set JWT_SECRET="$(openssl rand -hex 32)"
flyctl secrets set ANTHROPIC_API_KEY="sk-ant-YOUR_KEY_HERE"
flyctl secrets set CORS_ORIGINS='["https://your-frontend.pages.dev", "http://localhost:3000"]'

# Deploy
flyctl deploy

# Check status
flyctl status
```

### 5. Get Your Backend URL
After deployment, your backend will be available at:
```
https://saasit-ai-backend-dgoldman.fly.dev
```

### 6. Update Frontend Configuration
Update your frontend to use the deployed backend:
1. In Cloudflare Pages settings, set:
   - `REACT_APP_API_URL`: `https://saasit-ai-backend-dgoldman.fly.dev/api`
2. Update `frontend/_redirects`:
   ```
   /api/*  https://saasit-ai-backend-dgoldman.fly.dev/api/:splat  200
   ```

## Monitoring & Management

### View logs:
```bash
flyctl logs
```

### SSH into container:
```bash
flyctl ssh console
```

### Check app status:
```bash
flyctl status
```

### Scale app:
```bash
flyctl scale count 2  # Run 2 instances
```

### Update secrets:
```bash
flyctl secrets set KEY="new-value"
```

## Troubleshooting

### If deployment fails:
1. Check logs: `flyctl logs`
2. Verify Dockerfile syntax
3. Ensure all dependencies in requirements.txt
4. Check Python version compatibility

### If app crashes:
1. Check health endpoint: `curl https://saasit-ai-backend-dgoldman.fly.dev/api/`
2. Review environment variables: `flyctl secrets list`
3. Check MongoDB connection string is correct

### Common issues:
- **Port binding**: Ensure app listens on port 8000
- **Health checks failing**: Verify `/api/` endpoint returns 200
- **Memory issues**: Scale up if needed: `flyctl scale memory 512`

## Next Steps
1. Complete payment setup on Fly.io
2. Set up MongoDB Atlas
3. Deploy using the script or manual commands
4. Update frontend with backend URL
5. Deploy frontend to Cloudflare Pages