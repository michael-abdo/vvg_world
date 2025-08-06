#!/bin/bash

# Quick deployment script to push NextAuth basePath fix
# This script copies the fixed providers.tsx file to the EC2 instance

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Deploying NextAuth basePath fix...${NC}"

# Create a temporary script that will be executed on the remote server
cat > /tmp/nextauth-fix.sh << 'EOF'
#!/bin/bash
cd /home/ubuntu/${PROJECT_NAME:-vvg-app}

# Update app/providers.tsx with basePath configuration
cat > app/providers.tsx << 'PROVIDERS_EOF'
"use client";

import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider basePath="/${PROJECT_NAME:-vvg-app}/api/auth">
      {children}
    </SessionProvider>
  );
} 
PROVIDERS_EOF

echo "Updated app/providers.tsx with basePath configuration"

# Rebuild the application
echo "Building application..."
npm run build

# Restart PM2
echo "Restarting application..."
pm2 restart ${PROJECT_NAME:-vvg-app}

echo "NextAuth basePath fix deployed successfully!"
pm2 status
EOF

# Make the script executable
chmod +x /tmp/nextauth-fix.sh

# Execute the script on the remote server via SSM
echo "Connecting to EC2 instance and applying fix..."
aws ssm send-command \
    --instance-ids i-035db647b0a1eb2e7 \
    --document-name "AWS-RunShellScript" \
    --region us-west-2 \
    --profile vvg \
    --parameters '{"commands":["sudo -u ubuntu bash -s < /tmp/nextauth-fix.sh"]}' \
    --comment "Deploy NextAuth basePath fix"

echo -e "${GREEN}Fix deployment initiated. Check AWS SSM console for status.${NC}"