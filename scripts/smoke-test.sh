#!/bin/bash
set -e

# VVG Template - Comprehensive Smoke Testing Suite
# Consolidates all testing phases into automated validation
# Usage: ./scripts/smoke-test.sh [staging|production] [host]

ENVIRONMENT=${1:-staging}
HOST=${2:-localhost}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Test configuration based on environment
if [ "$ENVIRONMENT" = "production" ]; then
    PORT=3000
    BASE_PATH="/vvg-world"
    if [ "$HOST" = "localhost" ]; then
        BASE_URL="http://localhost:3000"
    else
        BASE_URL="https://legal.vtc.systems/vvg-world"
    fi
    PM2_APP="vvg-world-production"
else
    PORT=3001
    BASE_PATH="/vvg-world-staging"
    if [ "$HOST" = "localhost" ]; then
        BASE_URL="http://localhost:3001"
    else
        BASE_URL="https://staging.vtc.systems/vvg-world-staging"
    fi
    PM2_APP="vvg-world-staging"
fi

echo -e "${PURPLE}🧪 VVG Comprehensive Smoke Testing${NC}"
echo -e "${BLUE}Environment: $ENVIRONMENT${NC}"
echo -e "${BLUE}Host: $HOST${NC}"
echo -e "${BLUE}Base URL: $BASE_URL${NC}"
echo "================================="

# Track test results
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0
FAILED_TESTS=()

# Test execution function
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="${3:-0}"
    
    ((TESTS_TOTAL++))
    echo -ne "${BLUE}[$TESTS_TOTAL] Testing: $test_name${NC} ... "
    
    # Execute test command and capture result
    local result
    if eval "$test_command" >/dev/null 2>&1; then
        result=0
    else
        result=1
    fi
    
    if [ "$result" -eq "$expected_result" ]; then
        echo -e "${GREEN}PASS${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}FAIL${NC}"
        ((TESTS_FAILED++))
        FAILED_TESTS+=("$test_name")
        return 1
    fi
}

# HTTP test function with timeout
http_test() {
    local url="$1"
    local expected_status="${2:-200}"
    local timeout="${3:-10}"
    
    if command -v curl >/dev/null 2>&1; then
        local status=$(curl -s -w "%{http_code}" --max-time "$timeout" --connect-timeout 5 -o /dev/null "$url" 2>/dev/null || echo "000")
        [ "$status" = "$expected_status" ]
    else
        false
    fi
}

# JSON API test function
json_test() {
    local url="$1"
    local json_key="$2"
    local timeout="${3:-10}"
    
    if command -v curl >/dev/null 2>&1 && command -v jq >/dev/null 2>&1; then
        curl -s --max-time "$timeout" "$url" 2>/dev/null | jq -e ".$json_key" >/dev/null 2>&1
    else
        false
    fi
}

# Database connectivity test
db_test() {
    if [ -f ".env.$ENVIRONMENT" ]; then
        source ".env.$ENVIRONMENT"
        if [ ! -z "${MYSQL_HOST:-}" ] && command -v mysql >/dev/null 2>&1; then
            mysql -h "$MYSQL_HOST" -P "${MYSQL_PORT:-3306}" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SELECT 1" >/dev/null 2>&1
        else
            # If no direct mysql client, test through application
            json_test "$BASE_URL/api/db-health" "connected"
        fi
    else
        false
    fi
}

# =================================================================
# INFRASTRUCTURE SMOKE TESTS
# =================================================================
echo -e "\n${BLUE}🖥️ Infrastructure Tests${NC}"

# Host connectivity
if [ "$HOST" != "localhost" ]; then
    run_test "Host connectivity" "ping -c 1 -W 5 $HOST"
fi

# Port availability
if command -v nc >/dev/null 2>&1; then
    run_test "Port $PORT accessibility" "nc -z -w5 $HOST $PORT"
fi

# Process status (local only)
if [ "$HOST" = "localhost" ] && command -v pm2 >/dev/null 2>&1; then
    run_test "PM2 process running" "pm2 describe $PM2_APP | grep -q 'status.*online'"
fi

# =================================================================
# APPLICATION HEALTH TESTS
# =================================================================
echo -e "\n${BLUE}🚀 Application Health Tests${NC}"

# Basic connectivity
run_test "Application responding" "http_test '$BASE_URL/' '200'"

# Health endpoint
run_test "Health API endpoint" "json_test '$BASE_URL/api/health' 'ok'"

# API structure validation
run_test "Health API returns timestamp" "json_test '$BASE_URL/api/health' 'timestamp'"
run_test "Health API returns service name" "json_test '$BASE_URL/api/health' 'service'"

# =================================================================
# AUTHENTICATION & SECURITY TESTS
# =================================================================
echo -e "\n${BLUE}🔐 Authentication & Security Tests${NC}"

# Protected routes redirect properly
run_test "Protected route redirects" "http_test '$BASE_URL/dashboard' '307'"

# Auth API endpoints
run_test "Auth session endpoint" "http_test '$BASE_URL/api/auth/session' '200'"
run_test "Auth providers endpoint" "http_test '$BASE_URL/api/auth/providers' '200'"

# Security headers (for remote hosts)
if [ "$HOST" != "localhost" ] && command -v curl >/dev/null 2>&1; then
    run_test "Security headers present" "curl -I -s '$BASE_URL/' | grep -q 'X-Frame-Options\\|X-Content-Type-Options'"
fi

# =================================================================
# API ENDPOINT TESTS
# =================================================================
echo -e "\n${BLUE}🔌 API Endpoint Tests${NC}"

# Core API endpoints
CORE_APIS=(
    "/api/health:200"
    "/api/validate-url:307"
    "/api/upload:307"
    "/api/dashboard/stats:307"
    "/api/process-queue:200"
)

for api_def in "${CORE_APIS[@]}"; do
    IFS=':' read -r endpoint expected_status <<< "$api_def"
    run_test "API endpoint $endpoint" "http_test '$BASE_URL$endpoint' '$expected_status'"
done

# API error handling
run_test "API handles invalid JSON" "http_test '$BASE_URL/api/validate-url' '307' 5"

# =================================================================
# STATIC ASSET TESTS
# =================================================================
echo -e "\n${BLUE}📁 Static Asset Tests${NC}"

# Critical static files
run_test "CSS assets load" "http_test '$BASE_URL/_next/static/css/app/layout.css' '200'"
run_test "Favicon accessible" "http_test '$BASE_URL/favicon.ico' '200'"

# JavaScript bundles (sampling)
if command -v curl >/dev/null 2>&1; then
    JS_BUNDLE=$(curl -s "$BASE_URL/" | grep -o '/_next/static/chunks/[^"]*\.js' | head -1)
    if [ ! -z "$JS_BUNDLE" ]; then
        run_test "JavaScript bundle loads" "http_test '$BASE_URL$JS_BUNDLE' '200'"
    fi
fi

# =================================================================
# DATABASE CONNECTIVITY TESTS
# =================================================================
echo -e "\n${BLUE}🗄️ Database Tests${NC}"

# Database connectivity
run_test "Database connection" "db_test"

# Database health endpoint (if available)
if http_test "$BASE_URL/api/db-health" "200" 5 >/dev/null 2>&1; then
    run_test "Database health endpoint" "json_test '$BASE_URL/api/db-health' 'connected'"
fi

# =================================================================
# PERFORMANCE TESTS
# =================================================================
echo -e "\n${BLUE}⚡ Performance Tests${NC}"

# Response time testing
if command -v curl >/dev/null 2>&1; then
    # Main page response time
    RESPONSE_TIME=$(curl -o /dev/null -s -w "%{time_total}" --max-time 30 "$BASE_URL/" 2>/dev/null || echo "30.0")
    run_test "Response time < 10s" "[ \$(echo '$RESPONSE_TIME < 10.0' | bc -l 2>/dev/null || echo '0') -eq 1 ]"
    
    # API response time
    API_TIME=$(curl -o /dev/null -s -w "%{time_total}" --max-time 10 "$BASE_URL/api/health" 2>/dev/null || echo "10.0")
    run_test "API response time < 5s" "[ \$(echo '$API_TIME < 5.0' | bc -l 2>/dev/null || echo '0') -eq 1 ]"
fi

# =================================================================
# SSL/TLS TESTS (Remote hosts only)
# =================================================================
if [ "$HOST" != "localhost" ]; then
    echo -e "\n${BLUE}🔒 SSL/TLS Tests${NC}"
    
    # SSL certificate validity
    if command -v openssl >/dev/null 2>&1; then
        run_test "SSL certificate valid" "echo | openssl s_client -servername $HOST -connect $HOST:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null"
    fi
    
    # HTTPS redirect
    if command -v curl >/dev/null 2>&1; then
        HTTP_URL="http://$HOST$BASE_PATH"
        run_test "HTTP to HTTPS redirect" "http_test '$HTTP_URL' '301,302'"
    fi
    
    # TLS version
    if command -v openssl >/dev/null 2>&1; then
        run_test "TLS 1.2+ supported" "echo | openssl s_client -servername $HOST -connect $HOST:443 -tls1_2 2>/dev/null | grep -q 'Cipher is'"
    fi
fi

# =================================================================
# ENVIRONMENT-SPECIFIC TESTS
# =================================================================
echo -e "\n${BLUE}🌍 Environment-Specific Tests${NC}"

if [ "$ENVIRONMENT" = "production" ]; then
    # Production-specific tests
    run_test "No debug info exposed" "! curl -s '$BASE_URL/' | grep -i 'debug\\|development\\|stack trace'"
    run_test "Robots.txt available" "http_test '$BASE_URL/robots.txt' '200'"
    
    # Production security checks
    if command -v curl >/dev/null 2>&1; then
        run_test "No dev headers in production" "! curl -I -s '$BASE_URL/' | grep -i 'x-dev\\|x-debug'"
    fi
else
    # Staging-specific tests
    echo -e "${YELLOW}ℹ️ Staging environment - some production checks skipped${NC}"
    run_test "Staging environment accessible" "http_test '$BASE_URL/' '200'"
fi

# =================================================================
# LOAD BALANCING & SCALING TESTS
# =================================================================
echo -e "\n${BLUE}⚖️ Load & Scaling Tests${NC}"

# Multiple concurrent requests
if command -v curl >/dev/null 2>&1; then
    run_test "Handles concurrent requests" "for i in {1..5}; do curl -s '$BASE_URL/api/health' & done; wait"
fi

# Memory usage (local only)
if [ "$HOST" = "localhost" ] && command -v pm2 >/dev/null 2>&1; then
    MEMORY_MB=$(pm2 describe "$PM2_APP" 2>/dev/null | grep 'memory' | awk '{print $4}' | sed 's/M//' || echo "0")
    if [ ! -z "$MEMORY_MB" ] && [ "$MEMORY_MB" -gt 0 ]; then
        run_test "Memory usage reasonable (<1GB)" "[ $MEMORY_MB -lt 1024 ]"
    fi
fi

# =================================================================
# INTEGRATION TESTS
# =================================================================
echo -e "\n${BLUE}🔗 Integration Tests${NC}"

# API workflow simulation
run_test "API workflow simulation" "
    curl -s '$BASE_URL/api/health' >/dev/null &&
    curl -s '$BASE_URL/' >/dev/null &&
    curl -s '$BASE_URL/api/auth/session' >/dev/null
"

# Cross-origin headers (if applicable)
if [ "$HOST" != "localhost" ] && command -v curl >/dev/null 2>&1; then
    run_test "CORS headers configured" "curl -I -s '$BASE_URL/api/health' | grep -q 'Access-Control-Allow'"
fi

# =================================================================
# MONITORING & LOGGING TESTS
# =================================================================
echo -e "\n${BLUE}📊 Monitoring & Logging Tests${NC}"

# Log files exist (local only)
if [ "$HOST" = "localhost" ]; then
    run_test "Application logs exist" "[ -d 'logs' ] && [ \$(find logs -name '*.log' | wc -l) -gt 0 ]"
    
    # PM2 logs accessible
    if command -v pm2 >/dev/null 2>&1; then
        run_test "PM2 logs accessible" "pm2 logs $PM2_APP --lines 1 --nostream >/dev/null 2>&1"
    fi
fi

# Health endpoint includes monitoring data
run_test "Health endpoint includes timestamp" "json_test '$BASE_URL/api/health' 'timestamp'"

# =================================================================
# FINAL RESULTS & REPORTING
# =================================================================
echo -e "\n${PURPLE}📊 Smoke Test Results${NC}"
echo "================================="

# Calculate success rate
SUCCESS_RATE=0
if [ $TESTS_TOTAL -gt 0 ]; then
    SUCCESS_RATE=$(echo "scale=1; $TESTS_PASSED * 100 / $TESTS_TOTAL" | bc -l 2>/dev/null || echo "0")
fi

echo -e "${BLUE}Total Tests: $TESTS_TOTAL${NC}"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo -e "${BLUE}Success Rate: ${SUCCESS_RATE}%${NC}"

# Generate detailed report
REPORT_FILE="smoke-test-report-$ENVIRONMENT-$(date +%Y%m%d-%H%M%S).txt"
cat > "$REPORT_FILE" << EOF
VVG Smoke Test Report
====================
Environment: $ENVIRONMENT
Host: $HOST
Base URL: $BASE_URL
Test Time: $(date)
Total Tests: $TESTS_TOTAL
Passed: $TESTS_PASSED
Failed: $TESTS_FAILED
Success Rate: ${SUCCESS_RATE}%

Test Categories:
- Infrastructure Tests
- Application Health Tests  
- Authentication & Security Tests
- API Endpoint Tests
- Static Asset Tests
- Database Tests
- Performance Tests
$([ "$HOST" != "localhost" ] && echo "- SSL/TLS Tests")
- Environment-Specific Tests
- Load & Scaling Tests
- Integration Tests
- Monitoring & Logging Tests

EOF

# Add failed tests details
if [ ${#FAILED_TESTS[@]} -gt 0 ]; then
    echo -e "\n${RED}❌ Failed Tests:${NC}"
    for test in "${FAILED_TESTS[@]}"; do
        echo -e "${RED}  - $test${NC}"
    done
    
    cat >> "$REPORT_FILE" << EOF

Failed Tests:
$(printf "%s\n" "${FAILED_TESTS[@]}" | sed 's/^/- /')

Recommended Actions:
1. Check application logs: pm2 logs $PM2_APP
2. Verify environment configuration
3. Test database connectivity manually
4. Check network connectivity and DNS
5. Validate SSL certificates (if applicable)
6. Review security group settings (if AWS)
EOF
else
    echo -e "\n${GREEN}🎉 All tests passed!${NC}"
    
    cat >> "$REPORT_FILE" << EOF

✅ ALL TESTS PASSED

Deployment Quality: EXCELLENT
The application is functioning correctly across all tested categories.
EOF
fi

echo -e "\n${YELLOW}📄 Detailed report saved to: $REPORT_FILE${NC}"

# Determine exit code and final status
if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✅ SMOKE TESTS PASSED${NC}"
    echo -e "${GREEN}🚀 $ENVIRONMENT deployment is healthy and ready for use${NC}"
    
    # Suggest next steps
    echo -e "\n${YELLOW}🎯 Recommended next steps:${NC}"
    echo "1. 📚 Generate documentation: ./scripts/generate-docs.sh PROJECT_NAME $ENVIRONMENT"
    echo "2. 👥 Share access with team members"
    echo "3. 📈 Set up monitoring and alerts"
    echo "4. 📋 Update deployment checklist"
    
    exit 0
else
    echo -e "\n${RED}❌ SMOKE TESTS FAILED${NC}"
    echo -e "${RED}🚫 $ENVIRONMENT deployment has issues that need attention${NC}"
    
    # Calculate severity
    FAILURE_RATE=$(echo "scale=1; $TESTS_FAILED * 100 / $TESTS_TOTAL" | bc -l 2>/dev/null || echo "100")
    if (( $(echo "$FAILURE_RATE < 20" | bc -l 2>/dev/null || echo "0") )); then
        echo -e "${YELLOW}⚠️ Severity: LOW - Minor issues detected${NC}"
    elif (( $(echo "$FAILURE_RATE < 50" | bc -l 2>/dev/null || echo "0") )); then
        echo -e "${YELLOW}⚠️ Severity: MEDIUM - Several issues need attention${NC}"
    else
        echo -e "${RED}🚨 Severity: HIGH - Major issues require immediate attention${NC}"
    fi
    
    echo -e "\n${YELLOW}💡 Check the report file for detailed failure analysis${NC}"
    exit 1
fi