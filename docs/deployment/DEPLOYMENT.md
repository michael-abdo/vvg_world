# {PROJECT_DISPLAY_NAME} - Deployment Guide

This guide covers deployment of the {PROJECT_DISPLAY_NAME} application to production environments.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Deployment Methods](#deployment-methods)
- [Post-Deployment](#post-deployment)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements
- Node.js 18.x or higher
- MySQL 8.0 or compatible database
- AWS S3 bucket (or local storage for development)
- OpenAI API key
- Azure AD application (for authentication)

### Required Tools
- npm or yarn
- PM2 (recommended for process management)
- nginx or Apache (for reverse proxy)
- SSL certificate

## Environment Configuration

### 1. Create Production Environment File

Copy the example file and configure:
```bash
cp .env.production.example .env.production
```

### 2. Required Environment Variables

#### Database Configuration
```bash
MYSQL_HOST=your-production-db-host
MYSQL_PORT=3306
MYSQL_USER=your-db-user
MYSQL_DATABASE=your-db-name
MYSQL_PASSWORD=your-secure-password
DB_CREATE_ACCESS=false  # Should be false in production
```

#### Storage Configuration
```bash
STORAGE_PROVIDER=s3  # or 'local' for file system storage
S3_BUCKET_NAME=your-s3-bucket
S3_ACCESS=true
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
S3_FOLDER_PREFIX={PROJECT_NAME}/
```

#### Authentication
```bash
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-generated-secret-key  # Generate with: openssl rand -base64 32
AZURE_AD_CLIENT_ID=your-azure-client-id
AZURE_AD_CLIENT_SECRET=your-azure-client-secret
AZURE_AD_TENANT_ID=your-azure-tenant-id
```

#### API Configuration
```bash
QUEUE_SYSTEM_TOKEN=your-secure-queue-token  # Generate a secure token
OPENAI_API_KEY=your-openai-api-key
```

#### Development Settings (MUST be disabled in production)
```bash
DEV_BYPASS_ENABLED=false  # CRITICAL: Must be false in production
DEV_SEED_USER=           # Leave empty in production
TEST_USER_EMAIL=         # Leave empty in production
```

## Deployment Methods

### Method 1: Automated Deployment Script

Use the provided deployment script:
```bash
NODE_ENV=production ./scripts/deploy-production.sh
```

This script will:
1. Validate environment variables
2. Install production dependencies
3. Run database migrations
4. Build the production bundle
5. Run health checks

### Method 2: Manual Deployment

1. **Set environment to production:**
   ```bash
   export NODE_ENV=production
   ```

2. **Install dependencies:**
   ```bash
   npm ci --production
   ```

3. **Run database migrations:**
   ```bash
   npm run db:migrate
   ```

4. **Build the application:**
   ```bash
   npm run build
   ```

5. **Start the application:**
   ```bash
   npm start
   ```

### Method 3: PM2 Deployment

1. **Install PM2 globally:**
   ```bash
   npm install -g pm2
   ```

2. **Start with ecosystem file:**
   ```bash
   pm2 start ecosystem.config.js --env production
   ```

3. **Save PM2 configuration:**
   ```bash
   pm2 save
   pm2 startup  # Follow the instructions to enable auto-start
   ```

### Method 4: Docker Deployment

Create a `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --production

# Copy application files
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t {PROJECT_NAME} .
docker run -p 3000:3000 --env-file .env.production {PROJECT_NAME}
```

## Reverse Proxy Configuration

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Post-Deployment

### 1. Health Checks

Verify the application is running:
```bash
curl https://your-domain.com/api/db-health
curl https://your-domain.com/api/storage-health
```

### 2. Test Core Functionality

1. **Authentication:**
   - Navigate to your domain
   - Sign in with Azure AD
   - Verify redirect works correctly

2. **File Upload:**
   - Upload a test NDA document
   - Verify it appears in documents list
   - Check S3 bucket for uploaded file

3. **Document Comparison:**
   - Upload two documents
   - Run comparison
   - Verify OpenAI integration works

### 3. Set Up Monitoring

1. **Application Logs:**
   ```bash
   pm2 logs {PROJECT_NAME}
   ```

2. **PM2 Monitoring:**
   ```bash
   pm2 monit
   ```

3. **Database Monitoring:**
   - Set up slow query logs
   - Monitor connection pool usage

4. **S3 Monitoring:**
   - Enable S3 access logs
   - Set up CloudWatch alarms

## Security Checklist

- [ ] All environment variables are set correctly
- [ ] DEV_BYPASS_ENABLED is false
- [ ] SSL certificates are installed
- [ ] Database uses secure connection
- [ ] S3 bucket has proper access policies
- [ ] Rate limiting is enabled
- [ ] Error messages don't expose sensitive info
- [ ] CORS is properly configured
- [ ] Session secrets are strong and unique

## Monitoring

### Application Metrics
Monitor these key metrics:
- Response times
- Error rates
- Queue processing times
- Database query performance
- S3 upload/download times
- OpenAI API usage

### Logging
The application uses centralized logging via the Logger service:
- API requests/responses
- Error tracking
- Queue processing
- Authentication events

### Alerts
Set up alerts for:
- High error rates
- Database connection failures
- S3 access issues
- OpenAI API failures
- Rate limit exceeded events

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify MySQL is running
   - Check connection credentials
   - Ensure firewall allows connection
   - Check max_connections setting

2. **S3 Access Denied**
   - Verify AWS credentials
   - Check bucket policy
   - Ensure IAM permissions are correct

3. **Authentication Failures**
   - Verify Azure AD configuration
   - Check NEXTAUTH_URL matches actual domain
   - Ensure NEXTAUTH_SECRET is set

4. **Build Failures**
   - Clear .next directory
   - Remove node_modules and reinstall
   - Check for TypeScript errors
   - Verify all environment variables

### Debug Mode
For troubleshooting, you can enable debug logging:
```bash
DEBUG=* npm start
```

## Maintenance

### Regular Tasks
1. **Database Maintenance:**
   - Regular backups
   - Index optimization
   - Clean old queue items

2. **Storage Cleanup:**
   - Remove orphaned files
   - Archive old documents
   - Monitor storage usage

3. **Dependency Updates:**
   - Regular security updates
   - Framework updates
   - API version updates

### Backup Strategy
1. **Database Backups:**
   ```bash
   mysqldump -u $MYSQL_USER -p$MYSQL_PASSWORD $MYSQL_DATABASE > backup.sql
   ```

2. **S3 Backup:**
   - Enable versioning
   - Set up cross-region replication
   - Regular snapshots

3. **Application Backup:**
   - Git repository
   - Environment configurations
   - SSL certificates

## Scaling Considerations

### Horizontal Scaling
- Use PM2 cluster mode
- Load balancer configuration
- Session store (Redis)
- Database read replicas

### Vertical Scaling
- Increase server resources
- Optimize database queries
- Implement caching layer
- CDN for static assets

## Support

For deployment issues:
1. Check application logs
2. Review this documentation
3. Check CLAUDE.md for development principles
4. Contact system administrator

Remember: **NO MOCK DATA** in production. All systems must use real integrations.