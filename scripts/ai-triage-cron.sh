#!/bin/bash

# AI Weekly Triage Cron Script
# This script is called by crontab to trigger the AI triage process
# Schedule: Every Monday at 9:00 AM

# Set script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
APP_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

# Log file location
LOG_DIR="/home/ubuntu/logs/vvg-app"
LOG_FILE="${LOG_DIR}/ai-triage-cron.log"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=========================================="
log "Starting AI Weekly Triage"
log "=========================================="

# Load environment variables
if [ -f "${APP_DIR}/.env.production" ]; then
    export $(cat "${APP_DIR}/.env.production" | grep -v '^#' | xargs)
    log "Loaded environment variables from .env.production"
else
    log "ERROR: .env.production not found at ${APP_DIR}/.env.production"
    exit 1
fi

# Verify required environment variables
if [ -z "$CRON_SECRET" ]; then
    log "ERROR: CRON_SECRET not set in environment"
    exit 1
fi

# Set the API URL (default to localhost:3000)
API_URL="${API_URL:-http://localhost:3000}"

# Trigger the AI triage endpoint
log "Triggering AI triage at ${API_URL}/api/cron/ai-triage"

# Make the API call
response=$(curl -s -w "\n%{http_code}" -X GET \
    "${API_URL}/api/cron/ai-triage" \
    -H "Authorization: Bearer ${CRON_SECRET}" \
    -H "Content-Type: application/json" \
    2>&1)

# Extract HTTP status code (last line)
http_code=$(echo "$response" | tail -n1)
# Extract response body (everything except last line)
body=$(echo "$response" | sed '$d')

# Log the results
log "HTTP Status Code: $http_code"

if [ "$http_code" -eq 200 ]; then
    log "SUCCESS: AI triage completed successfully"
    log "Response: $body"
    
    # Parse response for key metrics if possible
    if command -v jq &> /dev/null; then
        itemsProcessed=$(echo "$body" | jq -r '.result.itemsProcessed // 0')
        itemsRouted=$(echo "$body" | jq -r '.result.itemsRouted // 0')
        itemsFlagged=$(echo "$body" | jq -r '.result.itemsFlagged // 0')
        
        log "Items Processed: $itemsProcessed"
        log "Items Routed: $itemsRouted"
        log "Items Flagged: $itemsFlagged"
    fi
else
    log "ERROR: AI triage failed with status code $http_code"
    log "Response: $body"
    
    # Send alert (you can customize this to send email, Slack, etc.)
    # For now, just log the error prominently
    echo "AI TRIAGE CRON ERROR: Status $http_code" | tee -a "$LOG_FILE.errors"
fi

log "AI triage cron job completed"
log "=========================================="

# Keep only last 30 days of logs
find "$LOG_DIR" -name "ai-triage-cron.log.*" -mtime +30 -delete 2>/dev/null || true