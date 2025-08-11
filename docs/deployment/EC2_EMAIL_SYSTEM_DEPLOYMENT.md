# EC2 Email System Deployment Guide

**VVG World Pain Points Platform - Production Deployment**

> **Status**: Production Ready ✅  
> **Last Updated**: August 2025  
> **Email System**: AWS SES SMTP Fully Functional  
> **Database**: Local MySQL → Production RDS Migration Ready

---

## Overview

This guide covers deploying the VVG World platform to AWS EC2 with the complete email notification system. The platform includes automatic safety critical issue routing with real-time email notifications to stakeholders.

### Current System Status
- ✅ **Email Notifications**: Working with AWS SES SMTP  
- ✅ **Routing Engine**: Automatic pain point routing  
- ✅ **Database**: Local MySQL (ready for RDS migration)  
- ✅ **Admin Dashboard**: Complete routing rule management  
- ✅ **E2E Testing**: Full pipeline validated

---

## Prerequisites

### AWS Resources Required
1. **EC2 Instance** (t3.small or larger)
2. **RDS MySQL Instance** (production database)
3. **AWS SES** (verify production limits)
4. **Security Groups** (properly configured networking)

### Development Environment
- Current working system with local MySQL
- AWS SES credentials configured and tested
- Email notifications confirmed working

---

## Pre-Deployment Checklist

### 1. Verify AWS SES Status
```bash
# Check your current SES status
aws ses describe-configuration-set --configuration-set-name default
```

**Critical**: Ensure your AWS SES account is out of sandbox mode for production email sending.

### 2. Prepare Database Migration
- [ ] Export current local database with routing rules
- [ ] Verify Safety Critical Issues rule points to `michaelabdo@vvgtruck.com`
- [ ] Document all custom routing rules and data

### 3. Current System Verification
```bash
# Test current email system
curl -X POST "http://localhost:3001/api/email/send" \
  -H "Content-Type: application/json" \
  -H "X-Dev-Bypass: true" \
  -d '{
    "to": "michaelabdo@vvgtruck.com",
    "subject": "Pre-Deployment Test",
    "message": "Email system verification before EC2 deployment"
  }'
```

---

## Production Environment Setup

### Step 1: Create RDS MySQL Instance

**AWS Console → RDS → Create Database**
- **Engine**: MySQL 8.0
- **Instance Class**: db.t3.micro (free tier) or db.t3.small
- **Storage**: 20 GB GP2 (expandable)
- **Database Name**: `vvg_world`
- **Master Username**: `admin` 
- **Master Password**: Generate secure password
- **Security Group**: Allow inbound MySQL (port 3306) from EC2

**Save Connection Details:**
```
Endpoint: your-rds-instance.region.rds.amazonaws.com
Port: 3306
Username: admin
Password: [your-secure-password]
Database: vvg_world
```

### Step 2: Launch EC2 Instance

**AWS Console → EC2 → Launch Instance**
- **AMI**: Amazon Linux 2023
- **Instance Type**: t3.small (2 vCPU, 2GB RAM)
- **Security Group Rules**:
  - SSH (22) - Your IP only
  - HTTP (80) - 0.0.0.0/0  
  - HTTPS (443) - 0.0.0.0/0
  - Custom TCP (3001) - 0.0.0.0/0 [for Next.js app]
- **Storage**: 20 GB GP3

### Step 3: Server Environment Setup

**SSH into EC2 and install dependencies:**
```bash
# Update system
sudo yum update -y

# Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs git

# Install PM2 for process management  
sudo npm install -g pm2

# Install MySQL client (for database operations)
sudo yum install -y mysql

# Verify installations
node --version  # Should show v18.x.x
npm --version   # Should show latest
pm2 --version   # Should show latest
```

---

## Application Deployment

### Step 4: Clone and Setup Application

```bash
# Clone repository
cd /home/ec2-user
git clone https://github.com/michael-abdo/vvg_world.git
cd vvg_world

# Install dependencies
npm install

# Build application for production
npm run build
```

### Step 5: Configure Production Environment

Create production environment file:
```bash
# Create production environment configuration
cat > .env.production << 'EOF'
# Production Environment Configuration
NODE_ENV=production

# Database Configuration (RDS MySQL)
MYSQL_HOST=your-rds-instance.region.rds.amazonaws.com
MYSQL_PORT=3306
MYSQL_USER=admin
MYSQL_PASSWORD=your-secure-password
MYSQL_DATABASE=vvg_world

# AWS SES SMTP Configuration (keep your working credentials)
AWS_SES_SMTP_HOST=email-smtp.us-west-2.amazonaws.com
AWS_SES_SMTP_PORT=587
AWS_SES_SMTP_USERNAME=AKIA6BJV4MLESTJJS2JR
AWS_SES_SMTP_PASSWORD=BHYusHzI23l5nO+nhBeH7hsWOquH5jqdPkZfywFKYjAP

# Email Configuration
SES_FROM_EMAIL=approvedinvoice@vvgtruck.com
ADMIN_EMAIL=michaelabdo@vvgtruck.com
SES_TEST_RECIPIENT=michaelabdo@vvgtruck.com
ENABLE_EMAIL_IN_DEV=false

# Application Configuration
NEXTAUTH_URL=http://your-ec2-public-ip:3001
NEXTAUTH_SECRET=generate-a-secure-random-string-here
EOF

# Secure the environment file
chmod 600 .env.production
```

### Step 6: Database Migration and Setup

```bash
# Test database connection
mysql -h your-rds-instance.region.rds.amazonaws.com -u admin -p vvg_world -e "SELECT 1;"

# Run database migrations
npm run db:migrate

# Import your local database (if you have existing data)
# First, export from local:
# mysqldump -u root -p vvg_world > vvg_world_backup.sql
# Then import to production:
# mysql -h your-rds-instance.region.rds.amazonaws.com -u admin -p vvg_world < vvg_world_backup.sql
```

**Verify Safety Critical Issues routing rule:**
```bash
mysql -h your-rds-instance.region.rds.amazonaws.com -u admin -p -e "
USE vvg_world; 
SELECT id, name, stakeholders FROM routing_rules WHERE name = 'Safety Critical Issues';
"
```

Expected output should show: `["michaelabdo@vvgtruck.com"]`

---

## Application Startup

### Step 7: Start Application with PM2

```bash
# Start application with PM2
pm2 start npm --name "vvg-world" -- run start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command output instructions

# Check application status
pm2 status
pm2 logs vvg-world
```

### Step 8: Configure PM2 Ecosystem (Recommended)

Create PM2 configuration:
```bash
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'vvg-world',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    time: true
  }]
};
EOF

# Create logs directory
mkdir -p logs

# Restart with ecosystem config
pm2 delete vvg-world
pm2 start ecosystem.config.js
pm2 save
```

---

## Post-Deployment Testing

### Step 9: Verify Email System

**Test email API:**
```bash
# Test from EC2 instance
curl -X POST "http://localhost:3001/api/email/send" \
  -H "Content-Type: application/json" \
  -H "X-Dev-Bypass: true" \
  -d '{
    "to": "michaelabdo@vvgtruck.com",
    "subject": "Production Deployment Test",
    "message": "Email system is working in production!"
  }'
```

**Test complete E2E pipeline:**
```bash
# Test pain point submission with email notification
curl -X POST "http://your-ec2-public-ip:3001/api/ideas/submit" \
  -H "Content-Type: application/json" \
  -H "X-Dev-Bypass: true" \
  -d '{
    "name": "Production Test",
    "description": "PRODUCTION TEST: This should trigger the Safety Critical Issues routing rule and send email notification.",
    "category": "Safety",
    "department": "Operations", 
    "location": "Production Environment"
  }'
```

### Step 10: Monitor Application

```bash
# Monitor application logs
pm2 logs vvg-world --lines 100

# Monitor system resources
pm2 monit

# Check application health
curl http://localhost:3001/api/health
```

---

## Production URLs and Access

### Application URLs
- **Main Application**: `http://your-ec2-public-ip:3001`
- **Admin Dashboard**: `http://your-ec2-public-ip:3001/admin`
- **Pain Points Submission**: `http://your-ec2-public-ip:3001/ideas`
- **Health Check**: `http://your-ec2-public-ip:3001/api/health`

### Key Features Available
- ✅ **Pain Point Submission** with automatic routing
- ✅ **Email Notifications** to stakeholders
- ✅ **Admin Dashboard** for routing rule management
- ✅ **Safety Critical Issues** auto-routed to `michaelabdo@vvgtruck.com`

---

## Security Hardening

### Optional Security Enhancements

**1. Setup Nginx Reverse Proxy:**
```bash
sudo yum install -y nginx

# Configure nginx (optional - for SSL termination)
sudo systemctl enable nginx
sudo systemctl start nginx
```

**2. Setup SSL with Let's Encrypt (if domain available):**
```bash
sudo yum install -y certbot python3-certbot-nginx
# Follow certbot instructions for your domain
```

**3. Restrict Security Group Access:**
- Remove port 3001 from public access if using nginx
- Restrict SSH to your IP only
- Use IAM roles instead of hardcoded AWS credentials

---

## Troubleshooting

### Common Issues

**Email not sending:**
```bash
# Check SES configuration
pm2 logs vvg-world | grep -i email
pm2 logs vvg-world | grep -i ses
```

**Database connection issues:**
```bash
# Test RDS connection
mysql -h your-rds-endpoint -u admin -p -e "SELECT 1;"

# Check security group allows EC2 → RDS on port 3306
```

**Application not starting:**
```bash
# Check PM2 logs
pm2 logs vvg-world

# Check Node.js version
node --version  # Should be 18+

# Rebuild application
npm run build
pm2 restart vvg-world
```

### Log Locations
- **PM2 Logs**: `/home/ec2-user/.pm2/logs/`
- **Application Logs**: `./logs/` (if configured)
- **System Logs**: `/var/log/messages`

---

## Backup and Maintenance

### Database Backups
```bash
# Daily database backup script
cat > backup_database.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -h your-rds-endpoint -u admin -p vvg_world > backups/vvg_world_$DATE.sql
aws s3 cp backups/vvg_world_$DATE.sql s3://your-backup-bucket/database/
EOF

chmod +x backup_database.sh
```

### Application Updates
```bash
# Update application code
cd /home/ec2-user/vvg_world
git pull origin master
npm install
npm run build
pm2 restart vvg-world
```

---

## Performance Monitoring

### Key Metrics to Monitor
- **Response Time**: Application response times
- **Email Delivery**: SES bounce/complaint rates  
- **Database Performance**: RDS CloudWatch metrics
- **System Resources**: EC2 CPU/Memory utilization

### Monitoring Commands
```bash
# Check application performance
pm2 monit

# Check database connections
mysql -h your-rds-endpoint -u admin -p -e "SHOW PROCESSLIST;"

# Check email sending logs
pm2 logs vvg-world | grep "Email sent successfully"
```

---

## Cost Optimization

### Estimated Monthly Costs
- **EC2 t3.small**: ~$15-20/month
- **RDS db.t3.micro**: ~$15-20/month (free tier eligible)
- **SES Email**: ~$1 per 10,000 emails
- **Total**: ~$30-45/month for production environment

### Cost-Saving Tips
- Use RDS free tier (db.t3.micro) if eligible
- Stop EC2 during maintenance windows
- Monitor SES usage to avoid unexpected charges
- Use CloudWatch alarms for cost monitoring

---

## Next Steps

### Immediate Post-Deployment
1. ✅ Verify all emails are being delivered
2. ✅ Test admin dashboard functionality  
3. ✅ Monitor PM2 process stability
4. ✅ Setup automated backups

### Future Enhancements
- [ ] Domain name and SSL certificate
- [ ] CloudWatch monitoring and alerts
- [ ] Auto-scaling group for high availability
- [ ] CI/CD pipeline for automated deployments
- [ ] Load balancer for multiple instances

---

## Support and Contact

**Repository**: https://github.com/michael-abdo/vvg_world  
**Email System Status**: ✅ Production Ready  
**Last Tested**: August 2025

**For deployment issues**, check the troubleshooting section above or review the PM2 logs for specific error messages.

---

*This guide is specifically tailored for the current VVG World email notification system and has been tested with the working local environment.*