# Docker Deployment Instructions

This branch contains the working version from commit `b6a9145` (July 6, 9:58 PM) containerized for consistent deployment.

## Prerequisites

- Docker installed on your machine
- Docker Compose (optional, for local development)
- Environment variables configured

## Local Development with Docker

1. **Build the Docker image:**
   ```bash
   docker build -t {PROJECT_NAME}:latest .
   ```

2. **Run with Docker Compose (recommended):**
   ```bash
   # Copy your .env.production file to the project root
   cp /path/to/your/.env.production .env.production
   
   # Start the container
   docker-compose up
   ```

3. **Or run directly with Docker:**
   ```bash
   docker run -p 3000:3000 \
     --env-file .env.production \
     -v $(pwd)/storage:/app/storage \
     {PROJECT_NAME}:latest
   ```

## Production Deployment

### Option 1: Deploy to AWS ECS/Fargate

1. **Build and push to ECR:**
   ```bash
   # Build the image
   docker build -t {PROJECT_NAME}:latest .
   
   # Tag for ECR
   docker tag {PROJECT_NAME}:latest <your-ecr-uri>/{PROJECT_NAME}:latest
   
   # Push to ECR
   docker push <your-ecr-uri>/{PROJECT_NAME}:latest
   ```

2. **Deploy using ECS:**
   - Create an ECS task definition using the pushed image
   - Configure environment variables in the task definition
   - Deploy as a service

### Option 2: Deploy to any Docker host

1. **On your deployment server:**
   ```bash
   # Pull or transfer the image
   docker pull <your-registry>/{PROJECT_NAME}:latest
   
   # Run with production environment
   docker run -d \
     --name {PROJECT_NAME} \
     --restart unless-stopped \
     -p 80:3000 \
     --env-file /path/to/.env.production \
     -v /path/to/storage:/app/storage \
     <your-registry>/{PROJECT_NAME}:latest
   ```

## Environment Variables

Create a `.env.production` file with the following variables:

```env
# Database
DB_HOST=your-db-host
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=your-db-name

# Authentication
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret-key
AZURE_AD_CLIENT_ID=your-client-id
AZURE_AD_CLIENT_SECRET=your-client-secret
AZURE_AD_TENANT_ID=your-tenant-id

# Storage (S3)
STORAGE_TYPE=s3
S3_BUCKET_NAME=your-bucket
S3_REGION=your-region
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# OpenAI
OPENAI_API_KEY=your-openai-key

# Queue
QUEUE_SYSTEM_TOKEN=your-queue-token
```

## Health Check

The container includes a health check endpoint at `/api/health`. Docker will automatically monitor this endpoint.

## Volumes

- `/app/storage` - Local file storage (only used if STORAGE_TYPE=local)

## Ports

- The application runs on port 3000 inside the container
- Map this to your desired host port (e.g., 80 or 443 with a reverse proxy)

## Benefits of This Approach

1. **Consistency**: The exact code that worked locally on July 6 will run identically in production
2. **No Build Errors**: TypeScript errors won't affect deployment since the build happens inside the container
3. **Environment Parity**: Same Node.js version, same dependencies, same everything
4. **Easy Rollback**: Just deploy a previous image version if needed
5. **Platform Agnostic**: Deploy to AWS, Azure, GCP, or any Docker host

## Troubleshooting

- If the build fails, check that all required files are present and not in `.dockerignore`
- Ensure environment variables are properly set
- Check container logs: `docker logs {PROJECT_NAME}`
- Verify health check: `curl http://localhost:3000/api/health`