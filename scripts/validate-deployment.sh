#!/bin/bash
set -e

# VVG Template - Comprehensive Deployment Validation
# Consolidates all validation steps into single script
# Usage: ./scripts/validate-deployment.sh [staging|production] [host]

ENVIRONMENT=${1:-staging}
HOST=${2:-localhost}

# Determine ports and URLs based on environment
if [ "$ENVIRONMENT" = "production" ]; then
    PORT=3000
    BASE_PATH="/vvg-world"
    if [ "$HOST" = "localhost" ]; then
        BASE_URL="http://localhost:3000"
    else
        BASE_URL="https://legal.vtc.systems/vvg-world"
    fi
else
    PORT=3001
    BASE_PATH="/vvg-world-staging"
    if [ "$HOST" = "localhost" ]; then
        BASE_URL="http://localhost:3001"
    else
        BASE_URL="https://staging.vtc.systems/vvg-world-staging"
    fi
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 VVG Deployment Validation${NC}"
echo -e "${BLUE}Environment: $ENVIRONMENT${NC}"
echo -e "${BLUE}Host: $HOST${NC}"
echo -e "${BLUE}Base URL: $BASE_URL${NC}"
echo "================================="

# Track results
CHECKS_PASSED=0
CHECKS_TOTAL=0

check_status() {
    ((CHECKS_TOTAL++))
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
        ((CHECKS_PASSED++))
    else
        echo -e "${RED}❌ $2${NC}"
        if [ ! -z "$3" ]; then
            echo -e "${YELLOW}   Details: $3${NC}"
        fi
    fi
}

# Function to test HTTP endpoint
test_endpoint() {
    local url=$1
    local expected_status=${2:-200}
    local description=$3
    
    if command -v curl >/dev/null 2>&1; then
        local response=$(curl -s -w "HTTPSTATUS:%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "HTTPSTATUS:000")
        local status=$(echo "$response" | grep -o "HTTPSTATUS:.*" | cut -d: -f2)
        
        if [ "$status" = "$expected_status" ]; then
            check_status 0 "$description ($url)" ""
            return 0
        else
            check_status 1 "$description ($url)" "Got status $status, expected $expected_status"
            return 1
        fi
    else
        check_status 1 "$description" "curl not available"
        return 1
    fi
}

# Function to test JSON endpoint
test_json_endpoint() {
    local url=$1
    local expected_key=$2
    local description=$3
    
    if command -v curl >/dev/null 2>&1 && command -v jq >/dev/null 2>&1; then
        local response=$(curl -s --max-time 10 "$url" 2>/dev/null)
        if echo "$response" | jq -e ".$expected_key" >/dev/null 2>&1; then
            check_status 0 "$description ($url)" ""
            return 0
        else
            check_status 1 "$description ($url)" "Missing key: $expected_key"
            return 1
        fi
    else
        check_status 1 "$description" "curl or jq not available"
        return 1
    fi
}

# =================================================================
# INFRASTRUCTURE CHECKS
# =================================================================
echo -e "\n${BLUE}🖥️ Infrastructure${NC}"

# Check if host is reachable
if [ "$HOST" != "localhost" ]; then
    if ping -c 1 -W 5 "$HOST" >/dev/null 2>&1; then
        check_status 0 "Host reachable ($HOST)" ""
    else
        check_status 1 "Host unreachable ($HOST)" "Check DNS/network"
    fi
fi

# Check if port is open
if command -v nc >/dev/null 2>&1; then
    if nc -z -w5 "$HOST" "$PORT" 2>/dev/null; then
        check_status 0 "Port $PORT open on $HOST" ""
    else
        check_status 1 "Port $PORT closed on $HOST" "Check if app is running"
    fi
else
    echo -e "${YELLOW}⚠️ netcat not available, skipping port check${NC}"
fi

# =================================================================
# APPLICATION HEALTH CHECKS
# =================================================================
echo -e "\n${BLUE}🚀 Application Health${NC}"

# Health endpoint
test_json_endpoint "$BASE_URL/api/health" "ok" "Health endpoint"

# Test main page
test_endpoint "$BASE_URL/" "200" "Main page loads"

# Test auth configuration (should redirect to sign-in)
if [ "$HOST" = "localhost" ]; then
    test_endpoint "$BASE_URL/dashboard" "307" "Protected route redirects"
else
    # On production, might redirect to OAuth
    test_endpoint "$BASE_URL/dashboard" "302,307" "Protected route handles auth"
fi

# =================================================================
# API ENDPOINT TESTS
# =================================================================
echo -e "\n${BLUE}🔌 API Endpoints${NC}"

# Test API routes that should be accessible
API_ENDPOINTS=(
    "/api/health:200:Health API"
    "/api/validate-url:307:Validate URL API (auth protected)"
    "/api/upload:307:Upload API (auth protected)"
    "/api/dashboard/stats:307:Dashboard stats API (auth protected)"
)

for endpoint_def in "${API_ENDPOINTS[@]}"; do
    IFS=':' read -r endpoint expected_status description <<< "$endpoint_def"
    test_endpoint "$BASE_URL$endpoint" "$expected_status" "$description"
done

# =================================================================
# STATIC ASSET CHECKS
# =================================================================
echo -e "\n${BLUE}📁 Static Assets${NC}"

# Test that static assets load
STATIC_ASSETS=(
    "/_next/static/css/app/layout.css:200:CSS assets"
    "/favicon.ico:200:Favicon"
)

for asset_def in "${STATIC_ASSETS[@]}"; do
    IFS=':' read -r asset expected_status description <<< "$asset_def"
    test_endpoint "$BASE_URL$asset" "$expected_status" "$description"
done

# =================================================================
# DATABASE CONNECTIVITY (if accessible)
# =================================================================
echo -e "\n${BLUE}🗄️ Database Connectivity${NC}"

# Test database through API (health endpoint should include DB status)
DB_HEALTH_URL="$BASE_URL/api/db-health"
if test_endpoint "$DB_HEALTH_URL" "200" "Database health check" 2>/dev/null; then
    # Additional DB checks if endpoint exists
    test_json_endpoint "$DB_HEALTH_URL" "connected" "Database connection status"
else
    echo -e "${YELLOW}⚠️ Database health endpoint not available${NC}"
fi

# =================================================================
# AUTHENTICATION FLOW VALIDATION
# =================================================================
echo -e "\n${BLUE}🔐 Authentication${NC}"

# Test auth endpoints
AUTH_ENDPOINTS=(
    "/api/auth/signin:200:Sign-in page"
    "/api/auth/session:200:Session endpoint"
    "/api/auth/providers:200:Auth providers"
)

for endpoint_def in "${AUTH_ENDPOINTS[@]}"; do
    IFS=':' read -r endpoint expected_status description <<< "$endpoint_def"
    test_endpoint "$BASE_URL$endpoint" "$expected_status" "$description"
done

# =================================================================
# PERFORMANCE CHECKS
# =================================================================
echo -e "\n${BLUE}⚡ Performance${NC}"

# Response time check for main page
if command -v curl >/dev/null 2>&1; then
    RESPONSE_TIME=$(curl -o /dev/null -s -w "%{time_total}" --max-time 30 "$BASE_URL/" 2>/dev/null || echo "30.0")
    RESPONSE_TIME_MS=$(echo "$RESPONSE_TIME * 1000" | bc 2>/dev/null || echo "30000")
    
    if (( $(echo "$RESPONSE_TIME < 5.0" | bc -l 2>/dev/null || echo "0") )); then
        check_status 0 "Response time acceptable (${RESPONSE_TIME}s)" ""
    else
        check_status 1 "Response time slow (${RESPONSE_TIME}s)" "Consider performance optimization"
    fi
else
    echo -e "${YELLOW}⚠️ Performance check skipped (curl not available)${NC}"
fi

# =================================================================
# SSL/TLS VALIDATION (for remote hosts)
# =================================================================
if [ "$HOST" != "localhost" ]; then
    echo -e "\n${BLUE}🔒 SSL/TLS${NC}"
    
    # Check SSL certificate
    if command -v openssl >/dev/null 2>&1; then
        if echo | openssl s_client -servername "$HOST" -connect "$HOST:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null; then
            check_status 0 "SSL certificate valid" ""
        else
            check_status 1 "SSL certificate issues" "Check certificate installation"
        fi
    else
        echo -e "${YELLOW}⚠️ SSL check skipped (openssl not available)${NC}"
    fi
    
    # Check HTTPS redirect
    if command -v curl >/dev/null 2>&1; then
        HTTP_URL="http://$HOST$BASE_PATH"
        REDIRECT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$HTTP_URL" 2>/dev/null || echo "000")
        if [ "$REDIRECT_STATUS" = "301" ] || [ "$REDIRECT_STATUS" = "302" ]; then
            check_status 0 "HTTP to HTTPS redirect" ""
        else
            check_status 1 "HTTP to HTTPS redirect" "Got status $REDIRECT_STATUS"
        fi
    fi
fi

# =================================================================
# ENVIRONMENT-SPECIFIC CHECKS
# =================================================================
echo -e "\n${BLUE}🌍 Environment-Specific${NC}"

if [ "$ENVIRONMENT" = "production" ]; then
    # Production-specific checks
    test_endpoint "$BASE_URL/robots.txt" "200" "Robots.txt available"
    
    # Check for development headers (should not be present)
    if command -v curl >/dev/null 2>&1; then
        DEV_HEADERS=$(curl -s -I "$BASE_URL/" 2>/dev/null | grep -i "x-dev\|x-debug" || echo "")
        if [ -z "$DEV_HEADERS" ]; then
            check_status 0 "No development headers in production" ""
        else
            check_status 1 "Development headers found in production" "$DEV_HEADERS"
        fi
    fi
else
    # Staging-specific checks
    echo -e "${YELLOW}ℹ️ Staging environment - some checks relaxed${NC}"
fi

# =================================================================
# PROCESS AND SERVICE CHECKS (for localhost)
# =================================================================
if [ "$HOST" = "localhost" ]; then
    echo -e "\n${BLUE}⚙️ Process Status${NC}"
    
    # Check if PM2 is managing the process
    if command -v pm2 >/dev/null 2>&1; then
        PM2_STATUS=$(pm2 jlist 2>/dev/null | jq -r ".[] | select(.name | contains(\"vvg-world-$ENVIRONMENT\")) | .pm2_env.status" 2>/dev/null || echo "")
        if [ "$PM2_STATUS" = "online" ]; then
            check_status 0 "PM2 process online" ""
        else
            check_status 1 "PM2 process not online" "Status: $PM2_STATUS"
        fi
    else
        echo -e "${YELLOW}⚠️ PM2 not available for process check${NC}"
    fi
    
    # Check if process is listening on correct port
    if command -v lsof >/dev/null 2>&1; then
        PORT_PROCESS=$(lsof -ti:$PORT 2>/dev/null || echo "")
        if [ ! -z "$PORT_PROCESS" ]; then
            check_status 0 "Process listening on port $PORT" ""
        else
            check_status 1 "No process listening on port $PORT" "Check if app is running"
        fi
    fi
fi

# =================================================================
# RESULTS SUMMARY
# =================================================================
echo -e "\n${BLUE}📊 Validation Summary${NC}"
echo "================================="

if [ $CHECKS_PASSED -eq $CHECKS_TOTAL ]; then
    echo -e "${GREEN}🎉 ALL VALIDATIONS PASSED ($CHECKS_PASSED/$CHECKS_TOTAL)${NC}"
    echo -e "${GREEN}✅ $ENVIRONMENT deployment is healthy${NC}"
    
    # Generate success report
    REPORT_FILE="validation-report-$ENVIRONMENT-$(date +%Y%m%d-%H%M%S).txt"
    cat > $REPORT_FILE << EOF
VVG Deployment Validation Report
================================
Environment: $ENVIRONMENT
Host: $HOST
Base URL: $BASE_URL
Validation Time: $(date)
Status: ALL CHECKS PASSED ($CHECKS_PASSED/$CHECKS_TOTAL)

✅ Infrastructure accessible
✅ Application responding
✅ API endpoints functional
✅ Authentication configured
✅ Static assets loading
✅ Performance acceptable
$([ "$HOST" != "localhost" ] && echo "✅ SSL/TLS configured")

Deployment is ready for use.
EOF
    
    echo -e "${YELLOW}📄 Report saved to: $REPORT_FILE${NC}"
    exit 0
else
    FAILED=$((CHECKS_TOTAL - CHECKS_PASSED))
    echo -e "${RED}❌ $FAILED/$CHECKS_TOTAL VALIDATIONS FAILED${NC}"
    echo -e "${RED}🚫 $ENVIRONMENT deployment has issues${NC}"
    echo -e "\n${YELLOW}💡 Fix the issues above and run validation again${NC}"
    exit 1
fi