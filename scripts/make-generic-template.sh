#!/bin/bash

# Script to replace all project-specific references with generic placeholders
# This converts the template to be truly reusable for any project

echo "Making template generic by replacing project-specific references..."

# Define the project-specific term to replace
OLD_NAME="${PROJECT_NAME}"
PLACEHOLDER="{{PROJECT_NAME}}"

# Create a .env.template file if it doesn't exist
if [ ! -f ".env.template" ]; then
    echo "Creating .env.template file..."
    cat > .env.template << 'EOF'
# Project Configuration
PROJECT_NAME=your-project-name
APP_BASE_PATH=/your-project-name

# Database
DATABASE_URL=

# AWS S3 Configuration (if using S3 storage)
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=
S3_FOLDER_PREFIX=${PROJECT_NAME}/

# Authentication
NEXTAUTH_URL=https://your-domain.com/${PROJECT_NAME}
NEXTAUTH_SECRET=

# Azure AD (if using Azure authentication)
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
AZURE_AD_TENANT_ID=

# Google OAuth (if using Google authentication)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Storage Configuration
STORAGE_PROVIDER=local
LOCAL_UPLOAD_DIR=./uploads

# Other Configuration
NODE_ENV=production
PORT=3000
EOF
fi

# Files that need special handling (not simple replacement)
declare -A special_files=(
    ["lib/config.ts"]="config"
    ["middleware.ts"]="middleware"
    ["next.config.mjs"]="nextconfig"
)

# Backup original files
echo "Creating backups..."
for file in "${!special_files[@]}"; do
    if [ -f "$file" ]; then
        cp "$file" "$file.original"
    fi
done

# 1. Update lib/config.ts to use PROJECT_NAME env var (preserving DRY template structure)
echo "Updating lib/config.ts..."
cat > lib/config.ts << 'EOF'
export const config = {
  auth: {
    providers: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      },
      azure: {
        clientId: process.env.AZURE_AD_CLIENT_ID || '',
        clientSecret: process.env.AZURE_AD_CLIENT_SECRET || '',
        tenantId: process.env.AZURE_AD_TENANT_ID || '',
      }
    }
  },
  app: {
    name: process.env.PROJECT_NAME || 'vvg-app',
    basePath: process.env.APP_BASE_PATH || `/${process.env.PROJECT_NAME || 'vvg-app'}`,
  },
  
  // Template system integration for DRY consolidation
  template: {
    // Core project identity
    name: process.env.PROJECT_NAME || 'vvg-template',
    displayName: process.env.PROJECT_DISPLAY_NAME || 'Template App',
    
    // Path configurations
    basePath: process.env.APP_BASE_PATH || `/${process.env.PROJECT_NAME || 'vvg-template'}`,
    domain: process.env.APP_DOMAIN || 'localhost:3000',
    
    // Computed paths for consistency
    paths: {
      nextAuthUrl: process.env.NEXTAUTH_URL || `https://${process.env.APP_DOMAIN || 'localhost:3000'}/${process.env.PROJECT_NAME || 'vvg-template'}`,
      s3Prefix: `${process.env.PROJECT_NAME || 'vvg-template'}/`,
      nginxPath: `/${process.env.PROJECT_NAME || 'vvg-template'}`,
      
      // API paths for functional files
      api: {
        auth: `/${process.env.PROJECT_NAME || 'vvg-template'}/api/auth`,
        upload: `/${process.env.PROJECT_NAME || 'vvg-template'}/api/upload`,
        documents: `/${process.env.PROJECT_NAME || 'vvg-template'}/api/documents`,
        compare: `/${process.env.PROJECT_NAME || 'vvg-template'}/api/compare`,
        dashboard: `/${process.env.PROJECT_NAME || 'vvg-template'}/api/dashboard`,
      },
      
      // Page paths
      pages: {
        signIn: `/${process.env.PROJECT_NAME || 'vvg-template'}/sign-in`,
        dashboard: `/${process.env.PROJECT_NAME || 'vvg-template'}/dashboard`,
        documents: `/${process.env.PROJECT_NAME || 'vvg-template'}/documents`,
        compare: `/${process.env.PROJECT_NAME || 'vvg-template'}/compare`,
        upload: `/${process.env.PROJECT_NAME || 'vvg-template'}/upload`,
      }
    }
  },
  
  storage: {
    provider: process.env.STORAGE_PROVIDER as 'local' | 's3' || 'local',
    local: {
      uploadDir: process.env.LOCAL_UPLOAD_DIR || './uploads',
    },
    s3: {
      bucket: process.env.S3_BUCKET_NAME || '',
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      folderPrefix: process.env.S3_FOLDER_PREFIX || `${process.env.PROJECT_NAME || 'vvg-app'}/`,
    }
  },
  database: {
    url: process.env.DATABASE_URL || '',
  }
};

export const APP_CONSTANTS = {
  MESSAGES: {
    ERROR: {
      UNAUTHORIZED: 'Authentication required',
      SERVER_ERROR: 'Internal server error',
      NOT_FOUND: 'Resource not found',
      VALIDATION_FAILED: 'Validation failed'
    },
    SUCCESS: {
      UPLOAD_COMPLETE: 'File uploaded successfully',
      EXTRACTION_COMPLETE: 'Text extraction completed',
      COMPARISON_COMPLETE: 'Document comparison completed'
    }
  },
  FILE_LIMITS: {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
    ALLOWED_MIME_TYPES: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
    ALLOWED_EXTENSIONS: ['.pdf', '.docx', '.txt']
  },
  RATE_LIMITS: {
    COMPARE: {
      MAX_REQUESTS: 10,
      WINDOW_MINUTES: 1
    },
    UPLOAD: {
      MAX_REQUESTS: 20,
      WINDOW_MINUTES: 1
    }
  }
};

// Helper function to check if we're in development
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
EOF

# 2. Update middleware.ts to use dynamic base path
echo "Updating middleware.ts..."
sed -i '' "s|/${PROJECT_NAME}|/\${process.env.PROJECT_NAME || 'vvg-app'}|g" middleware.ts

# 3. Update next.config.mjs
echo "Updating next.config.mjs..."
sed -i '' "s|basePath: '/${PROJECT_NAME}'|basePath: process.env.APP_BASE_PATH || '/\${process.env.PROJECT_NAME || 'vvg-app'}'|g" next.config.mjs

# 4. Simple replacements in other files
echo "Updating deployment and config files..."

# Docker files
sed -i '' "s|container_name: ${PROJECT_NAME}|container_name: \${PROJECT_NAME:-vvg-app}|g" docker-compose.production.yml

# PM2 ecosystem file - needs special handling
echo "Updating ecosystem.config.js..."
cat > deployment/ecosystem.config.js << 'EOF'
// PM2 Configuration File
// This file configures how PM2 manages the application process

module.exports = {
  apps: [
    {
      // Application Configuration
      name: process.env.PROJECT_NAME || 'vvg-app',
      script: 'npm',
      args: 'start',
      cwd: `/home/ubuntu/${process.env.PROJECT_NAME || 'vvg-app'}`,
      
      // Process Management
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      
      // Environment Variables
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      
      // Merge with system environment variables
      env_production: {
        NODE_ENV: 'production',
      },
      
      // Logging Configuration
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      log_file: `/home/ubuntu/logs/${process.env.PROJECT_NAME || 'vvg-app'}/combined.log`,
      out_file: `/home/ubuntu/logs/${process.env.PROJECT_NAME || 'vvg-app'}/out.log`,
      error_file: `/home/ubuntu/logs/${process.env.PROJECT_NAME || 'vvg-app'}/error.log`,
      
      // Advanced PM2 Features
      min_uptime: '10s',
      listen_timeout: 3000,
    }
  ],

  // Deployment Configuration
  deploy: {
    production: {
      user: 'ubuntu',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'your-git-repo',
      path: `/home/ubuntu/${process.env.PROJECT_NAME || 'vvg-app'}`,
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
    }
  }
};
EOF

# 5. Update nginx configs
echo "Updating nginx configurations..."
for nginx_file in nginx-legal-vtc-systems.conf deployment/nginx-site.conf; do
    if [ -f "$nginx_file" ]; then
        sed -i '' "s|/${PROJECT_NAME}|/\${PROJECT_NAME}|g" "$nginx_file"
        sed -i '' "s|proxy_pass http://localhost:3000/${PROJECT_NAME}/|proxy_pass http://localhost:3000/\${PROJECT_NAME}/|g" "$nginx_file"
    fi
done

# 6. Update all shell scripts
echo "Updating shell scripts..."
find . -name "*.sh" -type f ! -path "./scripts/make-generic-template.sh" -exec sed -i '' "s|${PROJECT_NAME}|\${PROJECT_NAME:-vvg-app}|g" {} \;

# 7. Update markdown documentation
echo "Updating documentation..."
find . -name "*.md" -type f -exec sed -i '' "s|${PROJECT_NAME}|{PROJECT_NAME}|g" {} \;

# 8. Create a setup script for users
echo "Creating setup script..."
cat > setup-project.sh << 'EOF'
#!/bin/bash

# Setup script for new projects using this template

echo "VVG Template Setup"
echo "=================="

# Get project name from user
read -p "Enter your project name (lowercase, no spaces): " PROJECT_NAME

# Validate project name
if [[ ! "$PROJECT_NAME" =~ ^[a-z0-9-]+$ ]]; then
    echo "Error: Project name must be lowercase letters, numbers, and hyphens only"
    exit 1
fi

echo "Setting up project: $PROJECT_NAME"

# Copy .env.template to .env
cp .env.template .env

# Update .env with project name
sed -i '' "s|PROJECT_NAME=your-project-name|PROJECT_NAME=$PROJECT_NAME|g" .env
sed -i '' "s|APP_BASE_PATH=/your-project-name|APP_BASE_PATH=/$PROJECT_NAME|g" .env
sed -i '' "s|NEXTAUTH_URL=https://your-domain.com/\${PROJECT_NAME}|NEXTAUTH_URL=https://your-domain.com/$PROJECT_NAME|g" .env

# Update package.json
sed -i '' "s|\"name\": \".*\"|\"name\": \"$PROJECT_NAME\"|g" package.json

echo ""
echo "Setup complete! Next steps:"
echo "1. Update the remaining values in .env"
echo "2. Run 'npm install' to install dependencies"
echo "3. Run 'npm run dev' to start development"
echo ""
echo "For production deployment:"
echo "- Update nginx configs with your domain"
echo "- Update PM2 ecosystem.config.js with your server details"
echo "- See DEPLOYMENT.md for full instructions"
EOF

chmod +x setup-project.sh

echo ""
echo "Template conversion complete!"
echo ""
echo "The template is now generic and can be used for any project."
echo "Users should run './setup-project.sh' to configure it for their specific project."
echo ""
echo "Key changes made:"
echo "- Created .env.template with PROJECT_NAME variable"
echo "- Updated all configs to use PROJECT_NAME environment variable"
echo "- Created setup-project.sh for easy project initialization"
echo "- Replaced hardcoded '${PROJECT_NAME}' with configurable placeholders"