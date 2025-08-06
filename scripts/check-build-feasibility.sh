#\!/bin/bash

echo "=== Build Feasibility Check ==="
echo "Current time: $(date)"
echo ""

# Get system resources
TOTAL_MEM=$(free -m  < /dev/null |  awk '/^Mem:/{print $2}')
AVAILABLE_MEM=$(free -m | awk '/^Mem:/{print $7}')
USED_MEM=$(free -m | awk '/^Mem:/{print $3}')
SWAP_TOTAL=$(free -m | awk '/^Swap:/{print $2}')

# Check Docker daemon memory
DOCKER_MEM=$(ps aux | grep dockerd | grep -v grep | awk '{print $6}' | head -1)
DOCKER_MEM_MB=$((DOCKER_MEM / 1024))

# Check running containers memory
CONTAINER_MEM=$(docker stats --no-stream --format "table {{.MemUsage}}" 2>/dev/null | tail -n +2 | awk '{print $1}' | sed 's/MiB//g' | awk '{sum+=$1} END {print sum}')
CONTAINER_MEM=${CONTAINER_MEM:-0}

# Estimate build requirements
BUILD_ESTIMATE=2500  # 2.5GB realistic for Next.js build with TypeScript
SAFETY_BUFFER=800   # 800MB safety margin for spikes and OS needs

echo "📊 SYSTEM RESOURCES:"
echo "   Total Memory: ${TOTAL_MEM}MB"
echo "   Used Memory: ${USED_MEM}MB"
echo "   Available Memory: ${AVAILABLE_MEM}MB"
echo "   Swap Space: ${SWAP_TOTAL}MB"
echo ""

echo "🐳 CURRENT USAGE:"
echo "   Docker Daemon: ~${DOCKER_MEM_MB}MB"
echo "   Running Containers: ~${CONTAINER_MEM}MB"
echo "   Other Processes: ~$((USED_MEM - DOCKER_MEM_MB - ${CONTAINER_MEM%.*}))MB"
echo ""

echo "🔨 BUILD REQUIREMENTS:"
echo "   Estimated Build Memory: ${BUILD_ESTIMATE}MB"
echo "   Safety Buffer: ${SAFETY_BUFFER}MB"
echo "   Total Needed: $((BUILD_ESTIMATE + SAFETY_BUFFER))MB"
echo ""

# Calculate if build is safe
NEEDED=$((BUILD_ESTIMATE + SAFETY_BUFFER))
if [ $AVAILABLE_MEM -lt $NEEDED ]; then
    echo "❌ BUILD NOT SAFE\!"
    echo "   Available: ${AVAILABLE_MEM}MB < Needed: ${NEEDED}MB"
    echo ""
    echo "🚨 RECOMMENDATIONS:"
    echo "   1. Stop the production container first:"
    echo "      docker stop nda-analyzer"
    echo "   2. Or add swap space:"
    echo "      sudo fallocate -l 4G /swapfile"
    echo "      sudo chmod 600 /swapfile"
    echo "      sudo mkswap /swapfile"
    echo "      sudo swapon /swapfile"
    echo "   3. Or use GitHub Actions to build"
    exit 1
else
    echo "✅ BUILD APPEARS SAFE"
    echo "   Available: ${AVAILABLE_MEM}MB > Needed: ${NEEDED}MB"
    echo "   Proceed with caution and monitor with:"
    echo "   watch -n 1 'free -m'"
fi
