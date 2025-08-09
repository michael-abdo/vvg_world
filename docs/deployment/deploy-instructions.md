# Deployment Instructions for EC2

The API endpoint fixes have been pushed to the `main-frontend-debug` branch.

## Quick Deployment Steps:

1. SSH into EC2:
```bash
ssh ubuntu@legal.vtc.systems
```

2. Navigate to project directory:
```bash
cd /home/ubuntu/{PROJECT_NAME}
```

3. Pull latest changes:
```bash
git fetch origin
git checkout main-frontend-debug
git pull origin main-frontend-debug
```

4. Rebuild and deploy with Docker:
```bash
# Build new image
docker build -t {PROJECT_NAME}:latest .

# Stop current container
docker stop {PROJECT_NAME}
docker rm {PROJECT_NAME}

# Start new container
docker run -d \
  --name {PROJECT_NAME} \
  -p 3000:3000 \
  --env-file .env.production \
  --restart unless-stopped \
  {PROJECT_NAME}:latest
```

5. Verify deployment:
```bash
# Check container status
docker ps | grep {PROJECT_NAME}

# Test health endpoint
curl http://localhost:3000/api/health
```

## Changes Deployed:

- Fixed `/api/upload` → `/{PROJECT_NAME}/api/upload` in upload-nda.tsx
- Fixed all API calls in documents page
- Fixed dashboard stats API endpoint  
- Fixed compare page API endpoints

This resolves the 404 errors when uploading files and accessing other API endpoints.