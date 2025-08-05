# SaasIt.ai Deployment Guide

This guide covers deployment options for the SaasIt.ai platform.

## Prerequisites

- Docker and Docker Compose installed
- MongoDB instance (local or cloud-based like MongoDB Atlas)
- Domain name (for production deployment)
- SSL certificates (for HTTPS in production)

## Environment Setup

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Update the `.env` file with your actual values:
- `MONGO_URL`: Your MongoDB connection string
- `JWT_SECRET`: A secure random string for JWT signing
- `ANTHROPIC_API_KEY`: Your Claude API key
- `CORS_ORIGINS`: List of allowed frontend origins

## Local Development with Docker

Run the entire stack locally:

```bash
docker-compose up --build
```

This will start:
- Frontend on http://localhost:3000
- Backend API on http://localhost:8000
- MongoDB on localhost:27017

## Production Deployment

### Option 1: Docker Compose on VPS

1. Copy files to your server
2. Update `.env` with production values
3. Run production compose:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Option 2: Cloud Platforms

#### Frontend (Static Hosting)
- **Vercel**: Connect GitHub repo, auto-deploy from main branch
- **Netlify**: Similar to Vercel with automatic builds
- **AWS S3 + CloudFront**: For static hosting with CDN
- **Azure Static Web Apps**: Integrated with GitHub Actions

#### Backend (API Hosting)
- **Railway**: Easy deployment with MongoDB addon
- **Render**: Supports Docker deployments
- **AWS ECS/Fargate**: For containerized deployments
- **Google Cloud Run**: Serverless containers
- **Azure Container Instances**: Quick container deployment

#### Database
- **MongoDB Atlas**: Managed MongoDB service (recommended)
- **AWS DocumentDB**: MongoDB-compatible service
- **Azure Cosmos DB**: Multi-model database with MongoDB API

### Option 3: Kubernetes Deployment

For larger scale deployments, use the Kubernetes manifests (create these based on your needs):
- Deployment manifests for frontend and backend
- Service definitions
- Ingress configuration
- ConfigMaps and Secrets

## Security Considerations

1. **Environment Variables**: Never commit `.env` files
2. **HTTPS**: Always use SSL/TLS in production
3. **CORS**: Configure specific origins, not wildcards
4. **MongoDB**: Use authentication and SSL connections
5. **Secrets Management**: Use cloud provider secret services

## Monitoring and Logging

Consider adding:
- Application monitoring (Sentry, DataDog)
- Log aggregation (ELK Stack, CloudWatch)
- Uptime monitoring (UptimeRobot, Pingdom)
- Performance monitoring (New Relic, AppDynamics)

## CI/CD Pipeline

Example GitHub Actions workflow:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to production
        # Add your deployment steps here
```

## Backup Strategy

1. **Database Backups**: Configure MongoDB Atlas automated backups
2. **Code Backups**: Use Git tags for releases
3. **Environment Backups**: Store `.env` securely (e.g., AWS Secrets Manager)

## Scaling Considerations

- **Frontend**: Use CDN for static assets
- **Backend**: Horizontal scaling with load balancer
- **Database**: MongoDB replica sets for high availability
- **Caching**: Add Redis for session/data caching

## Troubleshooting

Common issues:
1. **CORS errors**: Check `CORS_ORIGINS` in backend
2. **Database connection**: Verify MongoDB URL and network access
3. **Build failures**: Check Node/Python versions match requirements
4. **Port conflicts**: Ensure ports 3000, 8000, 27017 are available

## Support

For deployment assistance, consult:
- Docker documentation
- Your cloud provider's guides
- MongoDB Atlas documentation
- The project's GitHub issues