#!/bin/bash
set -e

# VVG Template - Project Creation & Customization Script
# Replaces manual Phase 0 with automated project setup
# Usage: ./scripts/create-project.sh <project-name> [staging|production]

PROJECT_NAME=${1}
ENVIRONMENT=${2:-staging}

if [ -z "$PROJECT_NAME" ]; then
    echo "❌ Error: Project name required"
    echo "Usage: ./scripts/create-project.sh <project-name> [staging|production]"
    echo "Example: ./scripts/create-project.sh invoice-analyzer staging"
    exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 VVG Project Creation${NC}"
echo -e "${BLUE}Project: $PROJECT_NAME${NC}"
echo -e "${BLUE}Environment: $ENVIRONMENT${NC}"
echo "================================="

# Validate project name
if ! [[ "$PROJECT_NAME" =~ ^[a-z0-9-]+$ ]]; then
    echo -e "${RED}❌ Project name must be lowercase letters, numbers, and hyphens only${NC}"
    exit 1
fi

# Setup project variables
PROJECT_DIR="../vvg_${PROJECT_NAME}"
TEMPLATE_DIR=$(pwd)

# Create project directory
if [ -d "$PROJECT_DIR" ]; then
    echo -e "${YELLOW}⚠️ Project directory already exists: $PROJECT_DIR${NC}"
    read -p "Continue and overwrite? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    rm -rf "$PROJECT_DIR"
fi

echo -e "${BLUE}📁 Creating project directory...${NC}"
cp -r "$TEMPLATE_DIR" "$PROJECT_DIR"
cd "$PROJECT_DIR"

# =================================================================
# PROJECT CUSTOMIZATION
# =================================================================
echo -e "\n${BLUE}🔧 Customizing project files...${NC}"

# Update package.json
echo "📦 Updating package.json..."
if [ -f "package.json" ]; then
    # Create temporary file with updated values
    jq --arg name "vvg-$PROJECT_NAME" \
       --arg description "VVG $PROJECT_NAME application" \
       '.name = $name | .description = $description' package.json > package.json.tmp
    mv package.json.tmp package.json
fi

# Update next.config.mjs
echo "⚙️ Updating next.config.mjs..."
if [ -f "next.config.mjs" ]; then
    sed -i.bak "s/vvg-template/$PROJECT_NAME/g" next.config.mjs
    rm next.config.mjs.bak
fi

# Update ecosystem.config.js
echo "🔄 Updating ecosystem.config.js..."
if [ -f "ecosystem.config.js" ]; then
    sed -i.bak "s/vvg-template/$PROJECT_NAME/g" ecosystem.config.js
    sed -i.bak "s|/home/ubuntu/vvg-template|/home/ubuntu/vvg_$PROJECT_NAME|g" ecosystem.config.js
    rm ecosystem.config.js.bak
fi

# Update environment files
echo "🌍 Updating environment configuration..."

# Update .env.example
if [ -f ".env.example" ]; then
    sed -i.bak "s/vvg-template/$PROJECT_NAME/g" .env.example
    sed -i.bak "s/VVG Template/VVG ${PROJECT_NAME^}/g" .env.example
    rm .env.example.bak
fi

# Update .env.staging.example
if [ -f ".env.staging.example" ]; then
    sed -i.bak "s/vvg-template/$PROJECT_NAME/g" .env.staging.example
    sed -i.bak "s/VVG Template/VVG ${PROJECT_NAME^}/g" .env.staging.example
    rm .env.staging.example.bak
fi

# Update .env.production.example
if [ -f ".env.production.example" ]; then
    sed -i.bak "s/vvg-template/$PROJECT_NAME/g" .env.production.example
    sed -i.bak "s/VVG Template/VVG ${PROJECT_NAME^}/g" .env.production.example
    rm .env.production.example.bak
fi

# Update lib/config.ts
echo "📚 Updating configuration files..."
if [ -f "lib/config.ts" ]; then
    sed -i.bak "s/vvg-template/$PROJECT_NAME/g" lib/config.ts
    sed -i.bak "s/VVG Document Processing/VVG ${PROJECT_NAME^}/g" lib/config.ts
    rm lib/config.ts.bak
fi

# Update app metadata
echo "🏷️ Updating application metadata..."
if [ -f "app/layout.tsx" ]; then
    sed -i.bak "s/VVG Document Processing Template/VVG ${PROJECT_NAME^} Application/g" app/layout.tsx
    sed -i.bak "s/document processing template/${PROJECT_NAME} application/g" app/layout.tsx
    rm app/layout.tsx.bak
fi

# Update app homepage
if [ -f "app/page.tsx" ]; then
    sed -i.bak "s/Document Processing Template/${PROJECT_NAME^} Application/g" app/page.tsx
    sed -i.bak "s/document upload, processing, and comparison/${PROJECT_NAME} functionality/g" app/page.tsx
    rm app/page.tsx.bak
fi

# Update navbar
if [ -f "components/navbar.tsx" ]; then
    sed -i.bak "s/Template App/${PROJECT_NAME^} App/g" components/navbar.tsx
    rm components/navbar.tsx.bak
fi

# =================================================================
# GITHUB ACTIONS SETUP
# =================================================================
echo -e "\n${BLUE}🔄 Setting up CI/CD pipeline...${NC}"

# Create GitHub Actions workflow
mkdir -p .github/workflows

cat > .github/workflows/deploy.yml << EOF
name: VVG Deploy - $PROJECT_NAME

on:
  push:
    branches: [ main-staging ]
  release:
    types: [ created ]
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy'
        required: true
        default: 'staging'
        type: choice
        options:
        - staging
        - production

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run tests
      run: npm run test --if-present
      
    - name: Build application
      run: npm run build
      
    - name: Determine environment
      id: env
      run: |
        if [[ "\${{ github.event_name }}" == "release" ]] || [[ "\${{ github.event.inputs.environment }}" == "production" ]]; then
          echo "environment=production" >> \$GITHUB_OUTPUT
        else
          echo "environment=staging" >> \$GITHUB_OUTPUT
        fi
        
    - name: Deploy to server
      uses: appleboy/ssh-action@v0.1.7
      with:
        host: \${{ secrets.EC2_SSH_HOST }}
        username: \${{ secrets.EC2_SSH_USER }}
        key: \${{ secrets.EC2_SSH_KEY }}
        script: |
          cd /home/ubuntu/vvg_$PROJECT_NAME
          git pull origin \${{ github.ref_name }}
          npm ci
          npm run build
          pm2 reload ecosystem.config.js --env \${{ steps.env.outputs.environment }}
          
    - name: Validate deployment
      run: |
        sleep 30
        if [[ "\${{ steps.env.outputs.environment }}" == "production" ]]; then
          curl -f https://legal.vtc.systems/$PROJECT_NAME/api/health
        else
          curl -f https://staging.vtc.systems/$PROJECT_NAME-staging/api/health
        fi
EOF

# =================================================================
# DEPLOYMENT SCRIPTS
# =================================================================
echo -e "\n${BLUE}📜 Creating deployment scripts...${NC}"

# Create deploy.sh
cat > deploy.sh << 'EOF'
#!/bin/bash
set -e

# VVG Deployment Script
ENVIRONMENT=${1:-staging}
PROJECT_DIR="/home/ubuntu/vvg_PROJECT_NAME"

echo "🚀 Deploying PROJECT_NAME to $ENVIRONMENT..."

cd $PROJECT_DIR

# Pull latest code
if [ "$ENVIRONMENT" = "production" ]; then
    git pull origin main
else
    git pull origin main-staging
fi

# Install dependencies
npm ci

# Build application
npm run build

# Restart PM2 process
pm2 reload ecosystem.config.js --env $ENVIRONMENT

# Validate deployment
sleep 10
if ./scripts/validate-deployment.sh $ENVIRONMENT localhost; then
    echo "✅ Deployment successful!"
else
    echo "❌ Deployment validation failed!"
    exit 1
fi
EOF

# Customize deploy.sh
sed -i.bak "s/PROJECT_NAME/$PROJECT_NAME/g" deploy.sh
rm deploy.sh.bak
chmod +x deploy.sh

# =================================================================
# NGINX CONFIGURATION
# =================================================================
echo -e "\n${BLUE}🌐 Creating nginx configuration...${NC}"

mkdir -p nginx

# Staging nginx config
cat > "nginx/$PROJECT_NAME-staging.conf" << EOF
# Nginx configuration for $PROJECT_NAME (staging)
server {
    listen 8443 ssl http2;
    server_name staging.vtc.systems;
    
    ssl_certificate /etc/letsencrypt/live/staging.vtc.systems/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/staging.vtc.systems/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    
    location /$PROJECT_NAME-staging {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check endpoint
    location = /$PROJECT_NAME-staging/health {
        access_log off;
        proxy_pass http://localhost:3001;
    }
}
EOF

# Production nginx config
cat > "nginx/$PROJECT_NAME-production.conf" << EOF
# Nginx configuration for $PROJECT_NAME (production)
server {
    listen 443 ssl http2;
    server_name legal.vtc.systems;
    
    ssl_certificate /etc/letsencrypt/live/legal.vtc.systems/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/legal.vtc.systems/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    
    location /$PROJECT_NAME {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
    }
    
    # Health check endpoint
    location = /$PROJECT_NAME/health {
        access_log off;
        proxy_pass http://localhost:3000;
    }
}

# HTTP redirect
server {
    listen 80;
    server_name legal.vtc.systems;
    return 301 https://\$server_name\$request_uri;
}
EOF

# =================================================================
# README UPDATE
# =================================================================
echo -e "\n${BLUE}📖 Creating project README...${NC}"

cat > README.md << EOF
# VVG $PROJECT_NAME

A VVG application built with the standardized tech stack for ${PROJECT_NAME} functionality.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PM2 (for production)
- MySQL 8.0
- AWS S3 access

### Development
\`\`\`bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Run development server
npm run dev
\`\`\`

### Deployment

#### Automated (Recommended)
\`\`\`bash
# Run preflight checks
./scripts/preflight-check.sh $ENVIRONMENT

# Provision infrastructure (first time)
./scripts/provision-infrastructure.sh $PROJECT_NAME $ENVIRONMENT

# Deploy application
git push origin main-staging  # for staging
git tag v1.0.0 && git push --tags  # for production
\`\`\`

#### Manual
\`\`\`bash
# Deploy to staging
./deploy.sh staging

# Deploy to production  
./deploy.sh production
\`\`\`

## 🏗️ Architecture

- **Framework:** Next.js 15.2.4 with App Router
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS + shadcn/ui
- **Authentication:** NextAuth.js with Azure AD
- **Database:** MySQL 8.0
- **Storage:** AWS S3
- **AI/ML:** OpenAI API
- **Deployment:** PM2 + Nginx on AWS EC2

## 🔧 Configuration

Copy the appropriate environment template:
- \`.env.example\` → \`.env.local\` (development)
- \`.env.staging.example\` → \`.env.staging\` (staging)
- \`.env.production.example\` → \`.env.production\` (production)

## 📊 Monitoring

- **Health Check:** \`/api/health\`
- **PM2 Status:** \`pm2 status\`
- **Logs:** \`pm2 logs vvg-$PROJECT_NAME-\$ENVIRONMENT\`

## 🧪 Testing

\`\`\`bash
# Validate deployment
./scripts/validate-deployment.sh staging

# Run automated tests
npm test
\`\`\`

## 📚 Documentation

Auto-generated deployment instructions:
\`\`\`bash
./scripts/generate-docs.sh $PROJECT_NAME staging
\`\`\`

## 🐛 Troubleshooting

Common issues and solutions are documented in the auto-generated deployment guide.

## 📞 Support

- **Repository:** https://github.com/vtcsystems/vvg_$PROJECT_NAME
- **Issues:** https://github.com/vtcsystems/vvg_$PROJECT_NAME/issues
- **Team:** VVG Development Team
EOF

# =================================================================
# CLEAN UP TEMPLATE FILES
# =================================================================
echo -e "\n${BLUE}🧹 Cleaning up template files...${NC}"

# Remove template-specific files
rm -f README_TEMPLATE_READY.md
rm -f TESTING.md
rm -f TEST_RESULTS.md

# Remove unnecessary test scripts
rm -f scripts/template-ready-check.sh
rm -f scripts/validate-template.js
rm -f scripts/test-*.js

# Remove template git history and initialize fresh repo
if [ -d ".git" ]; then
    rm -rf .git
    git init
    git add .
    git commit -m "Initial commit: VVG $PROJECT_NAME application

Generated from VVG template with automated customization
Project: $PROJECT_NAME
Environment: $ENVIRONMENT
Created: $(date)"
fi

# =================================================================
# FINAL VALIDATION
# =================================================================
echo -e "\n${BLUE}✅ Running final validation...${NC}"

# Check if all required files exist
REQUIRED_FILES=(
    "package.json"
    "ecosystem.config.js"
    ".env.staging.example"
    ".env.production.example"
    "deploy.sh"
    ".github/workflows/deploy.yml"
    "nginx/$PROJECT_NAME-staging.conf"
    "nginx/$PROJECT_NAME-production.conf"
)

VALIDATION_PASSED=true
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file${NC}"
    else
        echo -e "${RED}❌ $file${NC}"
        VALIDATION_PASSED=false
    fi
done

# =================================================================
# COMPLETION SUMMARY
# =================================================================
echo -e "\n${BLUE}🎉 Project Creation Summary${NC}"
echo "================================="

if [ "$VALIDATION_PASSED" = true ]; then
    echo -e "${GREEN}✅ Project created successfully!${NC}"
    echo -e "${BLUE}Project: vvg_$PROJECT_NAME${NC}"
    echo -e "${BLUE}Location: $PROJECT_DIR${NC}"
    
    echo -e "\n${YELLOW}📋 Next Steps:${NC}"
    echo "1. 📝 Edit environment files (.env.staging.example → .env.staging)"
    echo "2. 🏗️ Run infrastructure provisioning: ./scripts/provision-infrastructure.sh $PROJECT_NAME staging"
    echo "3. 🚀 Deploy: git push origin main-staging"
    echo "4. 🔍 Validate: ./scripts/validate-deployment.sh staging"
    echo "5. 📚 Generate docs: ./scripts/generate-docs.sh $PROJECT_NAME staging"
    
    echo -e "\n${YELLOW}🔗 URLs:${NC}"
    echo "  Staging: https://staging.vtc.systems/$PROJECT_NAME-staging"
    echo "  Production: https://legal.vtc.systems/$PROJECT_NAME"
    
    echo -e "\n${GREEN}🎯 Ready for deployment!${NC}"
else
    echo -e "${RED}❌ Project creation had issues${NC}"
    echo -e "${YELLOW}Check missing files above${NC}"
fi