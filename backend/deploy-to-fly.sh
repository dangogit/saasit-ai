#!/bin/bash
# Deploy SaasIt.ai Backend to Fly.io

# Add flyctl to PATH
export PATH="/Users/danielgoldman/.fly/bin:$PATH"

# Navigate to backend directory
cd "$(dirname "$0")"

echo "🚀 Deploying SaasIt.ai Backend to Fly.io..."

# Create app if it doesn't exist
echo "Creating Fly.io app..."
flyctl apps create saasit-ai-backend-dgoldman --org personal || echo "App already exists"

# Set secrets (you'll need to replace these with your actual values)
echo "Setting environment secrets..."
flyctl secrets set \
  MONGO_URL="mongodb+srv://your-mongodb-atlas-url" \
  DB_NAME="saasit_ai" \
  JWT_SECRET="$(openssl rand -hex 32)" \
  ANTHROPIC_API_KEY="your-anthropic-api-key" \
  CORS_ORIGINS='["https://your-frontend.pages.dev"]'

# Deploy the app
echo "Deploying application..."
flyctl deploy

# Show app info
echo "✅ Deployment complete!"
flyctl info
flyctl status