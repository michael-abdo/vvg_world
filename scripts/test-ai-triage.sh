#!/bin/bash

# AI Triage Manual Test Script
# This script allows manual testing of the AI triage system
# Can be used both locally and on EC2

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
DEFAULT_API_URL="http://localhost:3000"
DEFAULT_ENV_FILE=".env.local"

# Configuration
API_URL="${API_URL:-$DEFAULT_API_URL}"
ENV_FILE="${1:-$DEFAULT_ENV_FILE}"

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
APP_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

# Helper functions
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Print usage
usage() {
    echo "Usage: $0 [env_file]"
    echo ""
    echo "Test the AI Triage system manually"
    echo ""
    echo "Arguments:"
    echo "  env_file    Environment file to use (default: .env.local)"
    echo ""
    echo "Environment Variables:"
    echo "  API_URL     Base URL for API calls (default: http://localhost:3000)"
    echo ""
    echo "Examples:"
    echo "  $0                          # Test with .env.local"
    echo "  $0 .env.production          # Test with production config"
    echo "  API_URL=http://localhost:3001 $0  # Test staging environment"
    echo ""
}

# Load environment variables
load_env() {
    if [ -f "$APP_DIR/$ENV_FILE" ]; then
        log "Loading environment variables from $ENV_FILE"
        # Export variables from env file
        set -a
        source "$APP_DIR/$ENV_FILE"
        set +a
        info "Environment loaded: NODE_ENV=${NODE_ENV:-development}"
    else
        error "Environment file not found: $APP_DIR/$ENV_FILE"
        echo "Available env files:"
        ls -la "$APP_DIR"/.env* || true
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if curl is available
    if ! command -v curl &> /dev/null; then
        error "curl is required but not installed"
        exit 1
    fi
    
    # Check if jq is available (optional)
    if ! command -v jq &> /dev/null; then
        warn "jq is not installed - JSON responses will not be formatted"
        warn "Install with: sudo apt-get install jq (Ubuntu) or brew install jq (macOS)"
    fi
    
    # Check required environment variables
    if [ -z "$CRON_SECRET" ]; then
        error "CRON_SECRET not set in $ENV_FILE"
        exit 1
    fi
    
    if [ -z "$OPENAI_API_KEY" ]; then
        warn "OPENAI_API_KEY not set - AI analysis will fail"
    fi
    
    log "Prerequisites check completed"
}

# Test health endpoint
test_health() {
    log "Testing application health..."
    
    local response
    local http_code
    
    response=$(curl -s -w "\n%{http_code}" "${API_URL}/api/health" 2>&1 || true)
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        log "✅ Health check passed"
        if command -v jq &> /dev/null; then
            echo "$body" | jq '.' 2>/dev/null || echo "$body"
        else
            echo "$body"
        fi
    else
        error "❌ Health check failed (HTTP $http_code)"
        echo "$body"
        return 1
    fi
}

# Test AI triage status endpoint
test_status() {
    log "Testing AI triage status..."
    
    local response
    local http_code
    
    response=$(curl -s -w "\n%{http_code}" "${API_URL}/api/data-pipeline/ai-triage/status" 2>&1 || true)
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        log "✅ Status check passed"
        if command -v jq &> /dev/null; then
            echo "$body" | jq '.' 2>/dev/null || echo "$body"
        else
            echo "$body"
        fi
    else
        error "❌ Status check failed (HTTP $http_code)"
        echo "$body"
        return 1
    fi
}

# Test cron endpoint
test_cron() {
    log "Testing AI triage cron endpoint..."
    
    local response
    local http_code
    
    response=$(curl -s -w "\n%{http_code}" -X GET \
        "${API_URL}/api/cron/ai-triage" \
        -H "Authorization: Bearer ${CRON_SECRET}" \
        -H "Content-Type: application/json" \
        2>&1 || true)
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    info "HTTP Status Code: $http_code"
    
    if [ "$http_code" = "200" ]; then
        log "✅ Cron endpoint test passed"
        
        # Parse response for metrics if jq is available
        if command -v jq &> /dev/null; then
            echo "$body" | jq '.'
            
            # Extract key metrics
            itemsProcessed=$(echo "$body" | jq -r '.result.itemsProcessed // 0')
            itemsRouted=$(echo "$body" | jq -r '.result.itemsRouted // 0')
            itemsFlagged=$(echo "$body" | jq -r '.result.itemsFlagged // 0')
            
            info "Items Processed: $itemsProcessed"
            info "Items Routed: $itemsRouted"
            info "Items Flagged: $itemsFlagged"
        else
            echo "$body"
        fi
    else
        error "❌ Cron endpoint test failed (HTTP $http_code)"
        echo "$body"
        return 1
    fi
}

# Test manual trigger endpoint
test_manual_trigger() {
    log "Testing manual AI triage trigger..."
    
    local response
    local http_code
    
    response=$(curl -s -w "\n%{http_code}" -X POST \
        "${API_URL}/api/admin/ai-triage/trigger" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${INTERNAL_API_SECRET:-dev-secret}" \
        -d '{"force":false,"batchSize":10}' \
        2>&1 || true)
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    info "HTTP Status Code: $http_code"
    
    if [ "$http_code" = "200" ]; then
        log "✅ Manual trigger test passed"
        if command -v jq &> /dev/null; then
            echo "$body" | jq '.'
        else
            echo "$body"
        fi
    else
        error "❌ Manual trigger test failed (HTTP $http_code)"
        echo "$body"
        return 1
    fi
}

# Main test function
run_tests() {
    log "Starting AI Triage Test Suite"
    log "=================================="
    info "API URL: $API_URL"
    info "Environment: $ENV_FILE"
    log "=================================="
    
    local failed_tests=0
    
    # Test 1: Health check
    if ! test_health; then
        ((failed_tests++))
    fi
    echo ""
    
    # Test 2: Status endpoint
    if ! test_status; then
        ((failed_tests++))
    fi
    echo ""
    
    # Test 3: Cron endpoint
    if ! test_cron; then
        ((failed_tests++))
    fi
    echo ""
    
    # Test 4: Manual trigger (optional)
    read -p "Run manual trigger test? This will actually process submissions (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if ! test_manual_trigger; then
            ((failed_tests++))
        fi
        echo ""
    else
        info "Skipping manual trigger test"
    fi
    
    # Summary
    log "Test Summary"
    log "============"
    if [ $failed_tests -eq 0 ]; then
        log "🎉 All tests passed!"
    else
        error "❌ $failed_tests test(s) failed"
        exit 1
    fi
}

# Parse command line arguments
case "${1:-}" in
    -h|--help)
        usage
        exit 0
        ;;
    -*)
        error "Unknown option: $1"
        usage
        exit 1
        ;;
esac

# Main execution
main() {
    load_env
    check_prerequisites
    run_tests
}

# Run if called directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi