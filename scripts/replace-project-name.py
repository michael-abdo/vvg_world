#!/usr/bin/env python3
"""
Script to replace all project-specific references with generic placeholders
This converts the template to be truly reusable for any project
"""

import os
import re
import sys
from pathlib import Path

# Files to skip
SKIP_PATTERNS = [
    'node_modules',
    '.git',
    '.next',
    'dist',
    'build',
    '*.original',
    'replace-project-name.py'
]

def should_skip(path):
    """Check if path should be skipped"""
    path_str = str(path)
    for pattern in SKIP_PATTERNS:
        if pattern in path_str:
            return True
    return False

def replace_in_file(file_path, replacements):
    """Replace text in a file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        for old, new in replacements.items():
            content = content.replace(old, new)
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"  ✓ Updated: {file_path}")
            return True
    except Exception as e:
        print(f"  ✗ Error updating {file_path}: {e}")
    return False

def create_env_template():
    """Create .env.template file"""
    env_template = """# Project Configuration
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
"""
    
    with open('.env.template', 'w') as f:
        f.write(env_template)
    print("✓ Created .env.template")

def update_config_ts():
    """Update lib/config.ts to use environment variables"""
    config_content = """export const config = {
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
"""
    
    config_path = Path('lib/config.ts')
    if config_path.exists():
        # Backup original
        backup_path = config_path.with_suffix('.ts.original')
        if not backup_path.exists():
            config_path.rename(backup_path)
            with open(config_path, 'w') as f:
                f.write(config_content)
            print("✓ Updated lib/config.ts")

def create_setup_script():
    """Create setup script for users"""
    setup_content = """#!/bin/bash

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
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|PROJECT_NAME=your-project-name|PROJECT_NAME=$PROJECT_NAME|g" .env
    sed -i '' "s|APP_BASE_PATH=/your-project-name|APP_BASE_PATH=/$PROJECT_NAME|g" .env
else
    # Linux
    sed -i "s|PROJECT_NAME=your-project-name|PROJECT_NAME=$PROJECT_NAME|g" .env
    sed -i "s|APP_BASE_PATH=/your-project-name|APP_BASE_PATH=/$PROJECT_NAME|g" .env
fi

# Update package.json name
if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|\\"name\\": \\"[^\"]*\\"|\"name\": \\"$PROJECT_NAME\\"|g" package.json
else
    sed -i "s|\\"name\\": \\"[^\"]*\\"|\"name\": \\"$PROJECT_NAME\\"|g" package.json
fi

echo ""
echo "Setup complete! Next steps:"
echo "1. Update the remaining values in .env"
echo "2. Run 'npm install' to install dependencies"
echo "3. Run 'npm run dev' to start development"
echo ""
echo "For production deployment:"
echo "- Update nginx configs with your domain"
echo "- Update deployment configs with your server details"
echo "- See DEPLOYMENT.md for full instructions"
"""
    
    with open('setup-project.sh', 'w') as f:
        f.write(setup_content)
    os.chmod('setup-project.sh', 0o755)
    print("✓ Created setup-project.sh")

def main():
    print("Making VVG template generic...")
    print("==============================")
    
    # Change to template directory
    template_dir = Path(__file__).parent.parent
    os.chdir(template_dir)
    
    # Create .env.template
    create_env_template()
    
    # Update lib/config.ts
    update_config_ts()
    
    # Define replacements
    replacements = {
        'nda-analyzer': '${PROJECT_NAME}',
        '/nda-analyzer': '/${PROJECT_NAME}',
        'nda-analyzer/': '${PROJECT_NAME}/',
        "'nda-analyzer'": "'${PROJECT_NAME}'",
        '"nda-analyzer"': '"${PROJECT_NAME}"',
        'NDA Analyzer': '${PROJECT_DISPLAY_NAME}',
        'nda_analyzer': '${PROJECT_NAME_UNDERSCORE}',
    }
    
    # Special handling for specific file types
    file_handlers = {
        '.ts': replacements,
        '.tsx': replacements,
        '.js': replacements,
        '.jsx': replacements,
        '.json': {
            '"nda-analyzer"': '"vvg-template"',  # For package.json
        },
        '.yml': replacements,
        '.yaml': replacements,
        '.sh': replacements,
        '.md': {
            'nda-analyzer': '{PROJECT_NAME}',
            'NDA Analyzer': '{PROJECT_DISPLAY_NAME}',
        },
        '.conf': replacements,
    }
    
    # Process all files
    print("\nProcessing files...")
    updated_count = 0
    
    for root, dirs, files in os.walk('.'):
        # Skip certain directories
        dirs[:] = [d for d in dirs if d not in ['node_modules', '.git', '.next', 'dist', 'build']]
        
        for file in files:
            file_path = Path(root) / file
            
            if should_skip(file_path):
                continue
            
            # Get file extension
            ext = file_path.suffix.lower()
            
            if ext in file_handlers:
                if replace_in_file(file_path, file_handlers[ext]):
                    updated_count += 1
    
    # Create setup script
    create_setup_script()
    
    print(f"\n✅ Template conversion complete!")
    print(f"   Updated {updated_count} files")
    print("\nThe template is now generic and can be used for any project.")
    print("Users should run './setup-project.sh' to configure it for their specific project.")

if __name__ == "__main__":
    main()