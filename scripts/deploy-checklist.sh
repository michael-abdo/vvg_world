#!/bin/bash
# Deployment Checklist for DRY Refactoring

echo "🚀 DRY Refactoring Deployment Checklist"
echo "======================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check status
check_item() {
    echo -e "${YELLOW}[ ]${NC} $1"
}

echo "Pre-deployment checks:"
echo ""

check_item "1. All tests passing"
check_item "2. Production build successful (npm run build)"
check_item "3. No console.log statements in production code"
check_item "4. Environment variables configured:"
echo "    - MYSQL_HOST"
echo "    - MYSQL_USER"
echo "    - MYSQL_DATABASE"
echo "    - MYSQL_PASSWORD"
echo "    - NEXTAUTH_SECRET"
echo "    - NEXTAUTH_URL"
echo "    - QUEUE_SYSTEM_TOKEN"
echo "    - OPENAI_API_KEY"
echo "    - AWS credentials (if using S3)"
check_item "5. Rate limiting tested and working"
check_item "6. Dev bypass disabled in production (NODE_ENV=production)"
check_item "7. Database migrations run"
check_item "8. Backup of previous deployment created"

echo ""
echo "Deployment steps:"
echo ""

check_item "1. Set NODE_ENV=production"
check_item "2. Install production dependencies: npm ci --production"
check_item "3. Build the application: npm run build"
check_item "4. Run database migrations if needed"
check_item "5. Start the application: npm start"
check_item "6. Verify health endpoints:"
echo "    - /api/db-health"
echo "    - /api/storage-health"
check_item "7. Test core functionality:"
echo "    - File upload"
echo "    - Document comparison"
echo "    - Authentication"
check_item "8. Monitor logs for any errors"
check_item "9. Verify rate limiting is working"
check_item "10. Check performance metrics"

echo ""
echo "Post-deployment verification:"
echo ""

check_item "1. All API endpoints responding correctly"
check_item "2. No errors in application logs"
check_item "3. Database connections stable"
check_item "4. Storage (S3/local) accessible"
check_item "5. Authentication working properly"
check_item "6. Rate limiting enforced"
check_item "7. Logger service capturing events"

echo ""
echo "Rollback plan:"
echo ""
echo "If issues are encountered:"
echo "1. Revert to previous deployment"
echo "2. Check error logs for root cause"
echo "3. Fix issues in development"
echo "4. Re-run verification script"
echo "5. Attempt deployment again"

echo ""
echo -e "${GREEN}✓${NC} DRY refactoring ready for deployment!"
echo ""
echo "Summary of changes:"
echo "- Centralized logging with Logger service"
echo "- Standardized error responses with ApiErrors"
echo "- Unified configuration in config.ts"
echo "- APP_CONSTANTS for all magic numbers"
echo "- Rate limiting on expensive operations"
echo "- Dev bypass for testing (disabled in prod)"
echo "- Removed duplicate test endpoints"
echo ""
echo "All changes documented in CLAUDE.md"