#!/bin/bash
# Test DRY refactoring changes

echo "🧪 Testing DRY Refactoring - Document Operations"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Test seed-dev endpoint
echo "1. Testing seed-dev endpoint (DocumentService.processDocument)..."
response=$(curl -s -X POST http://localhost:3000/api/seed-dev \
  -H "x-dev-bypass: true" \
  -H "Content-Type: application/json")

if echo "$response" | grep -q '"success":true'; then
  echo -e "${GREEN}✓${NC} Seed-dev endpoint working"
  echo "$response" | jq '.uploadResults[0]' 2>/dev/null || echo "Response received"
else
  echo -e "${RED}✗${NC} Seed-dev endpoint failed"
  echo "$response" | head -20
fi

echo ""
echo "2. Testing upload endpoint (DocumentService.processDocument)..."

# Create a test file
echo "This is a test NDA document for DRY refactoring." > /tmp/test-nda.txt

# Test upload
response=$(curl -s -X POST http://localhost:3000/api/upload \
  -H "x-dev-bypass: true" \
  -F "file=@/tmp/test-nda.txt" \
  -F "docType=THIRD_PARTY" \
  -F "isStandard=false")

if echo "$response" | grep -q '"id"'; then
  echo -e "${GREEN}✓${NC} Upload endpoint working"
  doc_id=$(echo "$response" | jq -r '.data.id' 2>/dev/null || echo "unknown")
  echo "Document ID: $doc_id"
else
  echo -e "${RED}✗${NC} Upload endpoint failed"
  echo "$response" | head -20
fi

echo ""
echo "3. Testing document list endpoint..."
response=$(curl -s http://localhost:3000/api/documents \
  -H "x-dev-bypass: true")

if echo "$response" | grep -q '"success":true'; then
  echo -e "${GREEN}✓${NC} Documents endpoint working"
  doc_count=$(echo "$response" | jq '.count' 2>/dev/null || echo "0")
  echo "Total documents: $doc_count"
else
  echo -e "${RED}✗${NC} Documents endpoint failed"
fi

echo ""
echo "4. Testing process queue..."
response=$(curl -s -X POST http://localhost:3000/api/process-queue \
  -H "Authorization: Bearer dev-system-token" \
  -H "Content-Type: application/json")

if echo "$response" | grep -q '"processed"'; then
  echo -e "${GREEN}✓${NC} Queue processing working"
else
  echo -e "${RED}✗${NC} Queue processing might have issues"
fi

# Clean up
rm -f /tmp/test-nda.txt

echo ""
echo "✅ DRY refactoring tests completed!"
echo ""
echo "Summary:"
echo "- DocumentService.processDocument consolidates upload logic"
echo "- Both upload and seed-dev routes use the same processing"
echo "- Logging is centralized through DocumentService"