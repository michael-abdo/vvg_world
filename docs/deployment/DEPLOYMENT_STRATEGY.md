# {PROJECT_DISPLAY_NAME} Deployment Strategy Guide

## Health Check Implementation ✅

Health check endpoint is now available at `/api/health` returning:
```json
{
  "status": "healthy",
  "timestamp": "2025-07-08T12:00:00.000Z",
  "environment": "production",
  "version": "0.1.0",
  "service": "{PROJECT_NAME}",
  "uptime": 3600,
  "memory": {
    "used": 120,
    "total": 512,
    "unit": "MB"
  }
}
```

## Deployment Architecture Options

### Option 1: PM2 on EC2 (Recommended for MVP)

**When to use:** Single server, need maximum performance, simple deployment

```bash
# Deploy to EC2
scp -r . ubuntu@legal.vtc.systems:~/{PROJECT_NAME}/
ssh ubuntu@legal.vtc.systems

# Install dependencies and build
cd ~/{PROJECT_NAME}
npm ci
npm run build

# Start with PM2
pm2 start deployment/ecosystem.config.js --env production
pm2 save
pm2 startup
```

**Advantages:**
- ✅ No container overhead (2-5% performance gain)
- ✅ PM2 clustering utilizes all CPU cores
- ✅ Simple deployment via git pull
- ✅ Native file system access
- ✅ Direct system monitoring

**Health Check Integration:**
```javascript
// PM2 will use health check endpoint
pm2 set pm2-plus:webapp_host legal.vtc.systems
pm2 set pm2-plus:webapp_health_check_path /{PROJECT_NAME}/api/health
```

### Option 2: Docker for Development/Staging

**When to use:** Need consistent environments, testing production configs

```bash
# Build and run locally
docker-compose up

# For production-like testing
docker-compose -f docker-compose.production.yml up
```

**Advantages:**
- ✅ Identical environments across team
- ✅ Easy rollback via image tags
- ✅ Built-in poppler for PDF processing
- ✅ No system dependency conflicts

### Option 3: PM2 + Docker Hybrid (Advanced)

**When to use:** Need both container isolation AND process management

```dockerfile
# Dockerfile.pm2
FROM node:20-alpine
# ... (existing Dockerfile content)

# Install PM2 globally
RUN npm install -g pm2

# Copy PM2 config
COPY ecosystem.config.js .

# Start with PM2
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
```

**Note:** This adds complexity - only use if you need both Docker isolation AND PM2 features

## Migration Path

### Current State → PM2 Deployment

1. **Prepare EC2 Instance**
   ```bash
   # Install Node.js and PM2
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   sudo npm install -g pm2
   ```

2. **Deploy Application**
   ```bash
   # Clone or copy application
   cd /home/ubuntu
   git clone <your-repo> {PROJECT_NAME}
   cd {PROJECT_NAME}
   
   # Install and build
   npm ci
   npm run build
   
   # Copy production env
   cp .env.production .env
   ```

3. **Start with PM2**
   ```bash
   pm2 start deployment/ecosystem.config.js --env production
   pm2 save
   pm2 startup systemd -u ubuntu --hp /home/ubuntu
   ```

4. **Configure Nginx** (existing)
   ```nginx
   location /{PROJECT_NAME} {
       proxy_pass http://localhost:3000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
       
       # Health check passthrough
       location = /{PROJECT_NAME}/api/health {
           access_log off;
           proxy_pass http://localhost:3000/api/health;
       }
   }
   ```

## Monitoring Setup

### PM2 Monitoring
```bash
# Built-in monitoring
pm2 monit

# Web dashboard (optional)
pm2 install pm2-web
pm2 web

# Log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 7
```

### Health Check Monitoring
```bash
# Simple cron health check
*/5 * * * * curl -f http://localhost:3000/api/health || pm2 restart {PROJECT_NAME}

# CloudWatch integration (if on AWS)
aws cloudwatch put-metric-data \
  --metric-name HealthCheck \
  --namespace NDAAnalyzer \
  --value 1 \
  --dimensions Instance=i-1234567890abcdef0
```

## Performance Optimization

### PM2 Cluster Mode (Future)
```javascript
// ecosystem.config.js modification for scaling
{
  instances: 'max', // Use all CPU cores
  exec_mode: 'cluster', // Enable cluster mode
}
```

### Memory Management
```javascript
// Current setting
max_memory_restart: '1G',

// For production tuning
max_memory_restart: process.env.WEB_MEMORY || '750M',
```

## Rollback Strategy

### With PM2
```bash
# Quick rollback
pm2 restart {PROJECT_NAME}
pm2 reload {PROJECT_NAME} # Zero-downtime reload

# Code rollback
git checkout <previous-version>
npm ci && npm run build
pm2 reload ecosystem.config.js
```

### With Docker (if used)
```bash
# Tag releases
docker tag {PROJECT_NAME}:latest {PROJECT_NAME}:backup
docker build -t {PROJECT_NAME}:v1.2.0 .

# Rollback
docker stop {PROJECT_NAME}
docker run -d --name {PROJECT_NAME} {PROJECT_NAME}:backup
```

## Decision Matrix

| Criteria | PM2 Only | Docker Only | PM2 + Docker |
|----------|----------|-------------|--------------|
| Performance | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Simplicity | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| Scalability | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Dev/Prod Parity | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Resource Usage | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |

## Recommendation

**For your immediate deployment:** Use PM2 directly on EC2
- You already have the ecosystem.config.js configured
- Health check endpoint is implemented
- Nginx is already set up
- Minimal changes required from current setup

**Keep Docker for:**
- Local development
- Testing production configs
- Future microservices split
- CI/CD pipeline builds