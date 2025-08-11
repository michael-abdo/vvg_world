#!/bin/bash
set -e

# VVG Template - Auto-Documentation Generator
# Generates comprehensive deployment documentation automatically
# Usage: ./scripts/generate-docs.sh <project-name> [staging|production]

PROJECT_NAME=${1}
ENVIRONMENT=${2:-staging}

if [ -z "$PROJECT_NAME" ]; then
    echo "❌ Error: Project name required"
    echo "Usage: ./scripts/generate-docs.sh <project-name> [staging|production]"
    exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📚 VVG Auto-Documentation Generator${NC}"
echo -e "${BLUE}Project: $PROJECT_NAME${NC}"
echo -e "${BLUE}Environment: $ENVIRONMENT${NC}"
echo "================================="

# Setup variables based on environment
if [ "$ENVIRONMENT" = "production" ]; then
    PORT=3000
    BASE_PATH="/$PROJECT_NAME"
    DOMAIN="legal.vtc.systems"
    FULL_URL="https://$DOMAIN$BASE_PATH"
    BRANCH="main"
    ENV_FILE=".env.production"
else
    PORT=3001
    BASE_PATH="/$PROJECT_NAME-staging"
    DOMAIN="staging.vtc.systems"
    FULL_URL="https://$DOMAIN$BASE_PATH"
    BRANCH="main-staging"
    ENV_FILE=".env.staging"
fi

# Read project configuration
if [ -f "package.json" ]; then
    PACKAGE_NAME=$(grep '"name"' package.json | cut -d'"' -f4)
    PACKAGE_VERSION=$(grep '"version"' package.json | cut -d'"' -f4)
    PACKAGE_DESCRIPTION=$(grep '"description"' package.json | cut -d'"' -f4)
else
    PACKAGE_NAME=$PROJECT_NAME
    PACKAGE_VERSION="1.0.0"
    PACKAGE_DESCRIPTION="VVG Application"
fi

# Check for infrastructure summary
INFRA_FILE="infrastructure-${PROJECT_NAME}-${ENVIRONMENT}.txt"
if [ -f "$INFRA_FILE" ]; then
    echo -e "${GREEN}✅ Found infrastructure summary: $INFRA_FILE${NC}"
    source <(grep -E '^[A-Z_]+=.*' "$INFRA_FILE" 2>/dev/null || echo "")
else
    echo -e "${YELLOW}⚠️ Infrastructure summary not found, using defaults${NC}"
fi

# Generate main documentation
DOC_FILE="deploy-instructions-${PROJECT_NAME}-${ENVIRONMENT}.md"

echo -e "${BLUE}📝 Generating documentation...${NC}"

cat > "$DOC_FILE" << EOF
# VVG Deployment Instructions: $PROJECT_NAME ($ENVIRONMENT)

**Generated on:** $(date)  
**Project:** $PACKAGE_NAME v$PACKAGE_VERSION  
**Environment:** $ENVIRONMENT  
**Description:** $PACKAGE_DESCRIPTION  

## 🔗 Quick Links

- **Application URL:** [$FULL_URL]($FULL_URL)
- **Repository:** [GitHub](https://github.com/vtcsystems/vvg_$PROJECT_NAME)
- **Environment Branch:** \`$BRANCH\`
- **Port:** $PORT

---

## 📋 Project Overview

This is a VVG application built with the standardized tech stack:

- **Framework:** Next.js 15.2.4 with App Router
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS with shadcn/ui components  
- **Authentication:** NextAuth.js with Azure AD
- **Database:** MySQL 8.0
- **Storage:** AWS S3
- **AI/ML:** OpenAI API integration
- **Process Manager:** PM2
- **Web Server:** Nginx
- **Infrastructure:** AWS (EC2, RDS, S3, IAM)

---

## 🚀 Quick Deployment

### Prerequisites Validation
\`\`\`bash
# Run preflight checks
./scripts/preflight-check.sh $ENVIRONMENT

# Provision infrastructure (first time only)
./scripts/provision-infrastructure.sh $PROJECT_NAME $ENVIRONMENT

# Validate deployment
./scripts/validate-deployment.sh $ENVIRONMENT
\`\`\`

### Environment Setup
\`\`\`bash
# Copy environment template
cp $ENV_FILE.example $ENV_FILE

# Edit with your values
nano $ENV_FILE
\`\`\`

### Deploy
\`\`\`bash
# For staging
git push origin $BRANCH

# For production  
git tag v1.0.0 && git push --tags
\`\`\`

---

## 🏗️ Infrastructure Details

EOF

# Add infrastructure section if available
if [ -f "$INFRA_FILE" ]; then
cat >> "$DOC_FILE" << EOF
### AWS Resources

\`\`\`
$(grep -A 50 "=== S3 STORAGE ===" "$INFRA_FILE" | head -20)
\`\`\`

\`\`\`  
$(grep -A 50 "=== RDS DATABASE ===" "$INFRA_FILE" | head -15)
\`\`\`

\`\`\`
$(grep -A 50 "=== IAM ===" "$INFRA_FILE" | head -10)
\`\`\`

EOF
else
cat >> "$DOC_FILE" << EOF
### AWS Resources

*Infrastructure summary not available. Run \`./scripts/provision-infrastructure.sh $PROJECT_NAME $ENVIRONMENT\` to generate.*

EOF
fi

# Continue with environment configuration
cat >> "$DOC_FILE" << EOF
---

## ⚙️ Environment Configuration

### Required Environment Variables

Copy \`$ENV_FILE.example\` to \`$ENV_FILE\` and configure:

#### Core Settings
\`\`\`bash
NODE_ENV=production
ENVIRONMENT=$ENVIRONMENT
PROJECT_NAME=$PROJECT_NAME
APP_DOMAIN=$DOMAIN
APP_BASE_PATH=$BASE_PATH
NEXTAUTH_URL=$FULL_URL
\`\`\`

#### Authentication (Azure AD)
\`\`\`bash
NEXTAUTH_SECRET=your-secret-here
AZURE_AD_CLIENT_ID=your-client-id
AZURE_AD_CLIENT_SECRET=your-client-secret  
AZURE_AD_TENANT_ID=your-tenant-id
\`\`\`

#### Database (MySQL)
\`\`\`bash
MYSQL_HOST=your-db-host
MYSQL_PORT=3306
MYSQL_USER=your-db-user
MYSQL_PASSWORD=your-db-password
MYSQL_DATABASE=your-db-name
\`\`\`

#### Storage (AWS S3)
\`\`\`bash
STORAGE_PROVIDER=s3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=your-bucket-name
\`\`\`

#### AI/ML Services
\`\`\`bash
OPENAI_API_KEY=your-openai-key
\`\`\`

---

## 🔧 Server Setup

### EC2 Instance Requirements
- **Instance Type:** t3.medium or larger
- **OS:** Ubuntu 22.04 LTS
- **Storage:** 30GB+ EBS
- **Security Group:** Ports 22, 80, 443, 3000, 3001, 8443

### Software Installation
\`\`\`bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y

# Install AWS CLI
sudo apt install awscli -y
\`\`\`

### Application Deployment
\`\`\`bash
# Clone repository
cd /home/ubuntu
git clone https://github.com/vtcsystems/vvg_$PROJECT_NAME.git
cd vvg_$PROJECT_NAME

# Checkout correct branch
git checkout $BRANCH

# Install dependencies
npm ci

# Copy environment file
cp $ENV_FILE.example $ENV_FILE
# Edit $ENV_FILE with your values

# Build application
npm run build

# Start with PM2
pm2 start ecosystem.config.js --env $ENVIRONMENT
pm2 save
pm2 startup
\`\`\`

---

## 🌐 Nginx Configuration

### SSL Certificate Setup
\`\`\`bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d $DOMAIN
\`\`\`

### Nginx Virtual Host
\`\`\`nginx
# /etc/nginx/sites-available/$PROJECT_NAME-$ENVIRONMENT
server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    location $BASE_PATH {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}

# HTTP redirect
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}
\`\`\`

### Enable Site
\`\`\`bash
sudo ln -s /etc/nginx/sites-available/$PROJECT_NAME-$ENVIRONMENT /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
\`\`\`

---

## 🚀 CI/CD Pipeline

### GitHub Actions Workflow
The repository includes automated deployment via GitHub Actions:

- **Staging:** Deploys automatically on push to \`$BRANCH\`
- **Production:** Deploys on tag creation (\`v*\`) or manual trigger

### Manual Deployment Script
\`\`\`bash
# On EC2 instance
cd /home/ubuntu/vvg_$PROJECT_NAME
./deploy.sh $ENVIRONMENT
\`\`\`

---

## 🔍 Health Monitoring

### Health Check Endpoints
- **Application Health:** [\`$FULL_URL/api/health\`]($FULL_URL/api/health)
- **Database Health:** [\`$FULL_URL/api/db-health\`]($FULL_URL/api/db-health)

### PM2 Monitoring
\`\`\`bash
# Check process status
pm2 status

# View logs
pm2 logs vvg-$PROJECT_NAME-$ENVIRONMENT

# Restart application
pm2 restart vvg-$PROJECT_NAME-$ENVIRONMENT
\`\`\`

### System Monitoring
\`\`\`bash
# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
top

# Check application port
sudo lsof -i :$PORT
\`\`\`

---

## 🧪 Testing & Validation

### Automated Testing
\`\`\`bash
# Run validation suite
./scripts/validate-deployment.sh $ENVIRONMENT $DOMAIN

# Test specific endpoints
curl -I $FULL_URL/api/health
curl -I $FULL_URL
\`\`\`

### Manual Testing Checklist
- [ ] Application loads at [\`$FULL_URL\`]($FULL_URL)
- [ ] Authentication flow works (Azure AD)
- [ ] File upload functionality
- [ ] Database operations
- [ ] API endpoints respond correctly
- [ ] SSL certificate is valid
- [ ] Performance is acceptable (< 3s load time)

---

## 🐛 Troubleshooting

### Common Issues

#### Application Won't Start
\`\`\`bash
# Check PM2 logs
pm2 logs vvg-$PROJECT_NAME-$ENVIRONMENT

# Check environment variables
cat $ENV_FILE

# Restart application
pm2 restart vvg-$PROJECT_NAME-$ENVIRONMENT
\`\`\`

#### Database Connection Issues
\`\`\`bash
# Test database connection
mysql -h \$MYSQL_HOST -u \$MYSQL_USER -p \$MYSQL_DATABASE

# Check security group rules
aws ec2 describe-security-groups --group-ids sg-xxxxxxxxx
\`\`\`

#### SSL/Domain Issues
\`\`\`bash
# Check nginx config
sudo nginx -t

# Check SSL certificate
sudo certbot certificates

# Renew SSL if needed
sudo certbot renew
\`\`\`

#### Performance Issues
\`\`\`bash
# Check server resources
htop
iotop
nethogs

# Check application memory
pm2 monit
\`\`\`

### Log Locations
- **Application Logs:** \`/home/ubuntu/vvg_$PROJECT_NAME/logs/\`
- **PM2 Logs:** \`~/.pm2/logs/\`
- **Nginx Logs:** \`/var/log/nginx/\`
- **System Logs:** \`/var/log/syslog\`

---

## 📞 Support Contacts

- **Technical Lead:** Jeff
- **DevOps:** VVG Infrastructure Team
- **Repository:** [GitHub Issues](https://github.com/vtcsystems/vvg_$PROJECT_NAME/issues)

---

## 📚 Additional Resources

- [VVG Deployment SOP](./SOP.md)
- [Next.js Documentation](https://nextjs.org/docs)
- [Azure AD Configuration](https://docs.microsoft.com/en-us/azure/active-directory/)
- [AWS Documentation](https://docs.aws.amazon.com/)

---

*Documentation auto-generated by VVG Template on $(date)*
EOF

# Generate environment-specific scripts
SCRIPTS_DIR="deployment-scripts-$ENVIRONMENT"
mkdir -p "$SCRIPTS_DIR"

# Create deployment script
cat > "$SCRIPTS_DIR/deploy.sh" << 'EOF'
#!/bin/bash
set -e

# VVG Auto-Generated Deployment Script
ENVIRONMENT=${1:-staging}
PROJECT_DIR="/home/ubuntu/vvg_PROJECT_NAME"

echo "🚀 Deploying to $ENVIRONMENT..."

cd $PROJECT_DIR

# Pull latest code
git pull origin BRANCH_NAME

# Install dependencies
npm ci

# Build application
npm run build

# Restart PM2 process
pm2 reload ecosystem.config.js --env $ENVIRONMENT

echo "✅ Deployment complete!"
EOF

# Customize the deployment script
sed -i "s/PROJECT_NAME/$PROJECT_NAME/g" "$SCRIPTS_DIR/deploy.sh"
sed -i "s/BRANCH_NAME/$BRANCH/g" "$SCRIPTS_DIR/deploy.sh"
chmod +x "$SCRIPTS_DIR/deploy.sh"

# Create monitoring script
cat > "$SCRIPTS_DIR/monitor.sh" << 'EOF'
#!/bin/bash

# VVG Auto-Generated Monitoring Script
PROJECT_NAME="PROJECT_NAME_PLACEHOLDER"
ENVIRONMENT="ENVIRONMENT_PLACEHOLDER"

echo "📊 VVG Application Monitor - $PROJECT_NAME ($ENVIRONMENT)"
echo "================================="

# PM2 Status
echo "🔧 PM2 Status:"
pm2 status | grep vvg-$PROJECT_NAME-$ENVIRONMENT || echo "Process not found"

# Port Check
echo -e "\n🔌 Port Status:"
sudo lsof -i :PORT_PLACEHOLDER | head -5

# Disk Space
echo -e "\n💾 Disk Usage:"
df -h | grep -E "(Filesystem|/dev/)"

# Memory Usage
echo -e "\n🧠 Memory Usage:"
free -h

# Recent Logs
echo -e "\n📝 Recent Logs (last 10 lines):"
pm2 logs vvg-$PROJECT_NAME-$ENVIRONMENT --lines 10 --nostream

# Health Check
echo -e "\n🏥 Health Check:"
curl -s FULL_URL_PLACEHOLDER/api/health | jq . 2>/dev/null || echo "Health check failed"
EOF

# Customize monitoring script
sed -i "s/PROJECT_NAME_PLACEHOLDER/$PROJECT_NAME/g" "$SCRIPTS_DIR/monitor.sh"
sed -i "s/ENVIRONMENT_PLACEHOLDER/$ENVIRONMENT/g" "$SCRIPTS_DIR/monitor.sh"
sed -i "s/PORT_PLACEHOLDER/$PORT/g" "$SCRIPTS_DIR/monitor.sh"
sed -i "s|FULL_URL_PLACEHOLDER|$FULL_URL|g" "$SCRIPTS_DIR/monitor.sh"
chmod +x "$SCRIPTS_DIR/monitor.sh"

# Create backup script
cat > "$SCRIPTS_DIR/backup.sh" << 'EOF'
#!/bin/bash
set -e

# VVG Auto-Generated Backup Script
PROJECT_NAME="PROJECT_NAME_PLACEHOLDER"
ENVIRONMENT="ENVIRONMENT_PLACEHOLDER"
BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d-%H%M%S)

echo "💾 Creating backup for $PROJECT_NAME ($ENVIRONMENT)..."

mkdir -p $BACKUP_DIR

# Backup environment file
cp /home/ubuntu/vvg_$PROJECT_NAME/.env.$ENVIRONMENT $BACKUP_DIR/.env.$ENVIRONMENT.$DATE

# Backup PM2 configuration
pm2 save
cp ~/.pm2/dump.pm2 $BACKUP_DIR/pm2-dump.$DATE.pm2

# Backup Nginx configuration
sudo cp /etc/nginx/sites-available/$PROJECT_NAME-$ENVIRONMENT $BACKUP_DIR/nginx-$PROJECT_NAME-$ENVIRONMENT.$DATE

# Create archive
tar -czf $BACKUP_DIR/backup-$PROJECT_NAME-$ENVIRONMENT-$DATE.tar.gz \
    $BACKUP_DIR/.env.$ENVIRONMENT.$DATE \
    $BACKUP_DIR/pm2-dump.$DATE.pm2 \
    $BACKUP_DIR/nginx-$PROJECT_NAME-$ENVIRONMENT.$DATE

echo "✅ Backup created: $BACKUP_DIR/backup-$PROJECT_NAME-$ENVIRONMENT-$DATE.tar.gz"

# Clean up individual files
rm $BACKUP_DIR/.env.$ENVIRONMENT.$DATE
rm $BACKUP_DIR/pm2-dump.$DATE.pm2  
rm $BACKUP_DIR/nginx-$PROJECT_NAME-$ENVIRONMENT.$DATE
EOF

# Customize backup script
sed -i "s/PROJECT_NAME_PLACEHOLDER/$PROJECT_NAME/g" "$SCRIPTS_DIR/backup.sh"
sed -i "s/ENVIRONMENT_PLACEHOLDER/$ENVIRONMENT/g" "$SCRIPTS_DIR/backup.sh"
chmod +x "$SCRIPTS_DIR/backup.sh"

# Generate quick reference card
cat > "$SCRIPTS_DIR/quick-reference.txt" << EOF
VVG Quick Reference - $PROJECT_NAME ($ENVIRONMENT)
================================================

🔗 URLs
Application: $FULL_URL
Health: $FULL_URL/api/health

📁 Paths  
Project: /home/ubuntu/vvg_$PROJECT_NAME
Logs: /home/ubuntu/vvg_$PROJECT_NAME/logs/
Backups: /home/ubuntu/backups/

🔧 Commands
Deploy: ./deploy.sh $ENVIRONMENT
Monitor: ./monitor.sh
Backup: ./backup.sh
Restart: pm2 restart vvg-$PROJECT_NAME-$ENVIRONMENT
Logs: pm2 logs vvg-$PROJECT_NAME-$ENVIRONMENT

🌐 Nginx
Config: /etc/nginx/sites-available/$PROJECT_NAME-$ENVIRONMENT
Test: sudo nginx -t
Reload: sudo systemctl reload nginx

🔍 Validation
./scripts/validate-deployment.sh $ENVIRONMENT
curl -I $FULL_URL/api/health

📞 Support
Repository: https://github.com/vtcsystems/vvg_$PROJECT_NAME
Issues: https://github.com/vtcsystems/vvg_$PROJECT_NAME/issues
EOF

echo -e "${GREEN}✅ Documentation generated successfully!${NC}"
echo -e "${BLUE}📄 Main documentation: $DOC_FILE${NC}"
echo -e "${BLUE}📁 Deployment scripts: $SCRIPTS_DIR/${NC}"
echo -e "${YELLOW}💡 Share these files with the deployment team${NC}"

# Create summary for user
echo -e "\n${BLUE}📋 Generated Files:${NC}"
echo "  📄 $DOC_FILE - Complete deployment instructions"
echo "  📁 $SCRIPTS_DIR/ - Deployment automation scripts"
echo "    ├── deploy.sh - Automated deployment"
echo "    ├── monitor.sh - System monitoring" 
echo "    ├── backup.sh - Backup automation"
echo "    └── quick-reference.txt - Command reference"