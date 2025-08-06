#!/bin/bash
# Development seeding script

echo "🌱 Seeding development database..."
echo ""

# Use dev bypass header to seed without authentication
response=$(curl -s -X POST http://localhost:3000/api/seed-dev \
  -H "x-dev-bypass: true" \
  -H "Content-Type: application/json")

# Check if response contains error
if echo "$response" | grep -q '"error"'; then
  echo "❌ Seeding failed:"
  echo "$response" | jq '.' 2>/dev/null || echo "$response"
  exit 1
else
  echo "✅ Seeding successful!"
  echo "$response" | jq '.' 2>/dev/null || echo "$response"
  echo ""
  echo "You can now:"
  echo "  • View documents at http://localhost:3000/documents"
  echo "  • Compare NDAs at http://localhost:3000/compare"
  echo "  • Upload new documents at http://localhost:3000/upload"
fi