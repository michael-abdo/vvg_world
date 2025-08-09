# EC2 Docker Deployment Guide (Error-Free Approach)

## Why Docker for Your Deployment

Given the errors you encountered with direct deployment:
- ❌ PDF parsing failures → ✅ Docker includes poppler libraries
- ❌ TypeScript build errors → ✅ Docker builds in controlled environment
- ❌ Module loading issues → ✅ Docker isolates dependencies
- ❌ Environment conflicts → ✅ Docker ensures consistency

## Step-by-Step EC2 Deployment

### 1. Prepare EC2 Instance

```bash
# SSH into EC2
ssh ubuntu@legal.vtc.systems

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu
# Log out and back in for group changes

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Transfer Application Files

```bash
# From your local machine
rsync -avz --exclude 'node_modules' --exclude '.next' --exclude 'storage/*' \
  ./ ubuntu@legal.vtc.systems:~/{PROJECT_NAME}/

# Or use git
ssh ubuntu@legal.vtc.systems
git clone <your-repo> {PROJECT_NAME}
cd {PROJECT_NAME}
```

### 3. Configure Production Environment

```bash
# On EC2
cd ~/{PROJECT_NAME}

# Ensure production env file exists
cp .env.docker.production .env.production

# Create storage directory
mkdir -p storage
```

### 4. Deploy with Docker

```bash
# Run the deployment script
./docker-deploy.sh production

# Or manually:
docker build -t {PROJECT_NAME}:latest .
docker-compose -f docker-compose.production.yml up -d
```

### 5. Configure Nginx (Existing)

Your existing Nginx should work perfectly:
```nginx
location /{PROJECT_NAME} {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

### 6. Set Up PM2 for Docker Management (Optional)

If you want PM2 to manage your Docker container:

```bash
# Install PM2
sudo npm install -g pm2

# Create PM2 ecosystem for Docker
cat > ecosystem.docker.config.js << 'EOF'
module.exports = {
  apps: [{
    name: '{PROJECT_NAME}-docker',
    script: 'docker-compose',
    args: '-f docker-compose.production.yml up',
    interpreter: '/bin/bash',
    interpreter_args: '-c',
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/home/ubuntu/logs/docker-pm2-error.log',
    out_file: '/home/ubuntu/logs/docker-pm2-out.log',
    log_file: '/home/ubuntu/logs/docker-pm2-combined.log',
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.docker.config.js
pm2 save
pm2 startup
```

## Monitoring & Maintenance

### Health Checks

```bash
# Check application health
curl http://localhost:3000/api/health

# Check Docker container
docker ps
docker logs {PROJECT_NAME}

# Check with PM2 (if using)
pm2 status
```

### Log Management

```bash
# View logs
docker-compose -f docker-compose.production.yml logs -f

# Log rotation (add to crontab)
0 0 * * * docker logs {PROJECT_NAME} > /var/log/{PROJECT_NAME}-$(date +\%Y\%m\%d).log
```

### Updates & Rollbacks

```bash
# Update application
git pull
./docker-deploy.sh production

# Rollback (tag your images!)
docker tag {PROJECT_NAME}:latest {PROJECT_NAME}:backup
docker build -t {PROJECT_NAME}:latest .
# If issues:
docker tag {PROJECT_NAME}:backup {PROJECT_NAME}:latest
docker-compose -f docker-compose.production.yml up -d
```

## Troubleshooting

### Common Issues & Solutions

1. **Container won't start**
   ```bash
   docker-compose -f docker-compose.production.yml logs --tail=100
   # Check for missing env vars or port conflicts
   ```

2. **Memory issues**
   ```bash
   # Add to docker-compose.production.yml:
   services:
     app:
       deploy:
         resources:
           limits:
             memory: 2G
   ```

3. **Permission issues**
   ```bash
   # Fix storage permissions
   sudo chown -R ubuntu:ubuntu storage/
   ```

4. **Health check failing**
   ```bash
   # Check if app is running
   docker exec {PROJECT_NAME} curl http://localhost:3000/api/health
   ```

## Performance Optimization

### Docker + PM2 Hybrid Benefits

1. **Docker** provides:
   - Consistent environment (no more PDF errors!)
   - Easy rollback
   - Isolated dependencies

2. **PM2** provides:
   - Process monitoring
   - Auto-restart if Docker dies
   - Log management
   - System startup integration

### Resource Allocation

```yaml
# docker-compose.production.yml optimization
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

## Migration from Current State

Since you're already on the Docker branch with all fixes:

1. ✅ All PDF processing fixes are in the Dockerfile
2. ✅ Environment handling is fixed in config.ts
3. ✅ Health check endpoint is implemented
4. ✅ Docker compose files are ready

Just run:
```bash
# On EC2
cd ~/{PROJECT_NAME}
./docker-deploy.sh production
```

## Why This Approach Works

1. **Identical Environment**: The exact same Docker image that works locally will work on EC2
2. **No Build Errors**: TypeScript errors won't affect deployment since build happens in Docker
3. **No Missing Dependencies**: All system libraries (poppler, etc.) are in the container
4. **Easy Rollback**: Just switch Docker images if issues arise
5. **PM2 Benefits**: Still get process monitoring without the deployment headaches

This gives you the best of both worlds: Docker's consistency and PM2's operational features!