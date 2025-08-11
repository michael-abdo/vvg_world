#!/bin/bash

# Template Ready Check Script
# Ensures the template works "out of the box"

set -e

echo "🚀 VVG Template Ready Check"
echo "=========================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    if [ $2 -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1${NC}"
    fi
}

# Function to run check
run_check() {
    echo -e "${BLUE}🔍 $1...${NC}"
    if eval "$2" > /dev/null 2>&1; then
        print_status "$1" 0
        return 0
    else
        print_status "$1" 1
        return 1
    fi
}

# Main checks
FAILED=0

# 1. Dependencies installed
run_check "Dependencies installed" "test -d node_modules" || FAILED=1

# 2. TypeScript compilation
run_check "TypeScript compilation" "npx tsc --noEmit --skipLibCheck" || FAILED=1

# 3. No duplicate exports
echo -e "${BLUE}🔍 Checking for duplicate exports...${NC}"
DUPLICATES=$(find lib -name "*.ts" -exec grep -l "export.*ErrorUtils\|export.*RequestParser" {} \; | wc -l)
if [ $DUPLICATES -le 1 ]; then
    print_status "No duplicate exports" 0
else
    print_status "Duplicate exports found" 1
    FAILED=1
fi

# 4. Build succeeds
run_check "Production build" "npm run build" || FAILED=1

# 5. Dev server starts (quick test)
echo -e "${BLUE}🔍 Testing dev server startup...${NC}"
timeout 10 npm run dev > /dev/null 2>&1 &
DEV_PID=$!
sleep 5
if kill -0 $DEV_PID 2>/dev/null; then
    print_status "Dev server starts" 0
    kill $DEV_PID
else
    print_status "Dev server starts" 1
    FAILED=1
fi

# 6. API health check
if [ $FAILED -eq 0 ]; then
    echo -e "${BLUE}🔍 Testing API endpoints...${NC}"
    npm run start > /dev/null 2>&1 &
    SERVER_PID=$!
    sleep 3
    
    if curl -s http://localhost:3000/api/health > /dev/null; then
        print_status "API health endpoint" 0
    else
        print_status "API health endpoint" 1
        FAILED=1
    fi
    
    kill $SERVER_PID 2>/dev/null || true
fi

# Summary
echo ""
echo "📊 Summary"
echo "=========="

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 Template is ready for use!${NC}"
    echo "You can now:"
    echo "  • npm run dev    (start development)"
    echo "  • npm run build  (build for production)"
    echo "  • Deploy to production"
    exit 0
else
    echo -e "${RED}⚠️  Template needs fixes${NC}"
    echo "Run these commands to fix:"
    echo "  • npm run typecheck    (check TypeScript)"
    echo "  • npm run lint         (check code quality)"
    echo "  • npm run validate     (full validation)"
    exit 1
fi