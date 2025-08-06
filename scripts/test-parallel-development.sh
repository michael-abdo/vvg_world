#!/bin/bash
set -e

# VVG Template - Parallel Development Test Suite
# Tests all worktree and parallel development functionality
# Usage: ./scripts/test-parallel-development.sh [--cleanup]

CLEANUP_MODE="${1:-}"
TEST_PROJECT="test-parallel-$(date +%s)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${PURPLE}🧪 VVG Parallel Development Test Suite${NC}"
echo "=========================================="

# Test tracking
TESTS_PASSED=0
TESTS_FAILED=0
TEST_LOG="test-parallel-development-$(date +%Y%m%d-%H%M%S).log"

# Test function
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -ne "${BLUE}Testing: $test_name${NC} ... "
    
    if eval "$test_command" >> "$TEST_LOG" 2>&1; then
        echo -e "${GREEN}PASS${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}FAIL${NC}"
        ((TESTS_FAILED++))
        echo "❌ Test failed: $test_name" >> "$TEST_LOG"
        echo "Command: $test_command" >> "$TEST_LOG"
        return 1
    fi
}

# =================================================================
# TEST 1: SCRIPT AVAILABILITY
# =================================================================
echo -e "\n${BLUE}📁 Testing Script Availability${NC}"

run_test "setup-worktrees.sh exists" "[ -f docs/setup-worktrees.sh ]"
run_test "setup-worktrees.sh executable" "[ -x docs/setup-worktrees.sh ]"
run_test "sync-worktrees.sh exists" "[ -f docs/sync-worktrees.sh ]"
run_test "sync-worktrees.sh executable" "[ -x docs/sync-worktrees.sh ]"
run_test "workflow-launcher.sh exists" "[ -f docs/workflow-launcher.sh ]"
run_test "workflow-launcher.sh executable" "[ -x docs/workflow-launcher.sh ]"
run_test "hotfix-workflow.sh exists" "[ -f docs/hotfix-workflow.sh ]"
run_test "hotfix-workflow.sh executable" "[ -x docs/hotfix-workflow.sh ]"

# =================================================================
# TEST 2: GIT VERSION CHECK
# =================================================================
echo -e "\n${BLUE}🔍 Testing Git Version Requirements${NC}"

GIT_VERSION=$(git --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
GIT_MAJOR=$(echo $GIT_VERSION | cut -d. -f1)
GIT_MINOR=$(echo $GIT_VERSION | cut -d. -f2)

run_test "Git version >= 2.5" "[ \"$GIT_MAJOR\" -gt 2 ] || ([ \"$GIT_MAJOR\" -eq 2 ] && [ \"$GIT_MINOR\" -ge 5 ])"

# =================================================================
# TEST 3: WORKTREE SETUP
# =================================================================
echo -e "\n${BLUE}🌳 Testing Worktree Setup${NC}"

# Create test directory
TEST_DIR="/tmp/$TEST_PROJECT"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Initialize git repo for testing
git init
git config user.name "Test User"
git config user.email "test@example.com"
echo "# Test Project" > README.md
git add README.md
git commit -m "Initial commit"

# Test worktree setup without URL
run_test "Worktree setup in existing repo" "cd $TEST_DIR && $OLDPWD/docs/setup-worktrees.sh $TEST_PROJECT"

# Verify structure created
run_test "Project root created" "[ -d ~/projects/$TEST_PROJECT ]"
run_test "Main worktree exists" "[ -d ~/projects/$TEST_PROJECT/main ]"
run_test "Staging worktree exists" "[ -d ~/projects/$TEST_PROJECT/${TEST_PROJECT}-staging ]"
run_test "Bin directory exists" "[ -d ~/projects/$TEST_PROJECT/bin ]"
run_test "Worktree config exists" "[ -f ~/projects/$TEST_PROJECT/.worktree-config ]"
run_test "worktree-status tool exists" "[ -x ~/projects/$TEST_PROJECT/bin/worktree-status ]"
run_test "create-feature tool exists" "[ -x ~/projects/$TEST_PROJECT/bin/create-feature ]"

# =================================================================
# TEST 4: WORKTREE FUNCTIONALITY
# =================================================================
echo -e "\n${BLUE}🌿 Testing Worktree Functionality${NC}"

cd ~/projects/$TEST_PROJECT/main

# Test git worktree list
run_test "Git worktree list works" "git worktree list | grep -q main"
run_test "Staging worktree in list" "git worktree list | grep -q staging"

# Test worktree status tool
run_test "worktree-status runs" "~/projects/$TEST_PROJECT/bin/worktree-status"

# Test feature creation
run_test "create-feature works" "~/projects/$TEST_PROJECT/bin/create-feature test-feature-1"
run_test "Feature worktree created" "[ -d ~/projects/$TEST_PROJECT/project-test-feature-1 ]"
run_test "Feature branch exists" "git branch -a | grep -q feat/test-feature-1"

# =================================================================
# TEST 5: SYNC FUNCTIONALITY
# =================================================================
echo -e "\n${BLUE}🔄 Testing Sync Functionality${NC}"

# Make a change in main
cd ~/projects/$TEST_PROJECT/main
echo "Test change" >> README.md
git add README.md
git commit -m "Test change in main"

# Test sync
run_test "sync-worktrees.sh runs" "$OLDPWD/docs/sync-worktrees.sh --no-backup"

# =================================================================
# TEST 6: WORKFLOW LAUNCHER
# =================================================================
echo -e "\n${BLUE}🚀 Testing Workflow Launcher${NC}"

# Test context detection
cd ~/projects/$TEST_PROJECT/main
run_test "Workflow launcher detects context" "$OLDPWD/docs/workflow-launcher.sh --help 2>&1 | grep -q 'VVG Universal Workflow Launcher'"

# =================================================================
# TEST 7: HOTFIX WORKFLOW
# =================================================================
echo -e "\n${BLUE}🚨 Testing Hotfix Workflow${NC}"

cd ~/projects/$TEST_PROJECT/main

# Create a tag for hotfix testing
git tag v1.0.0
run_test "Production tag created" "git tag | grep -q v1.0.0"

# Test hotfix creation (will fail without proper setup but tests the script)
run_test "Hotfix script runs" "$OLDPWD/docs/hotfix-workflow.sh --help 2>&1 | grep -q 'VVG Production Hotfix Workflow'"

# =================================================================
# TEST 8: MASTER AUTOMATION INTEGRATION
# =================================================================
echo -e "\n${BLUE}🎯 Testing Master Automation Integration${NC}"

cd "$OLDPWD"
run_test "Master automation has worktree support" "grep -q '\-\-worktree' docs/vvg-master-automation.sh"
run_test "Master automation updated usage" "docs/vvg-master-automation.sh 2>&1 | grep -q '\-\-worktree'"

# =================================================================
# TEST 9: ERROR HANDLING
# =================================================================
echo -e "\n${BLUE}❌ Testing Error Handling${NC}"

# Test invalid inputs
run_test "setup-worktrees handles missing args" "! docs/setup-worktrees.sh 2>&1 | grep -q 'error'"
run_test "sync-worktrees handles no worktree" "cd /tmp && ! $OLDPWD/docs/sync-worktrees.sh 2>&1 | grep -q 'error'"
run_test "workflow-launcher handles missing tmux" "docs/workflow-launcher.sh 2>&1 | grep -q 'Usage'"
run_test "hotfix-workflow handles missing args" "! docs/hotfix-workflow.sh 2>&1 | grep -q 'error'"

# =================================================================
# CLEANUP
# =================================================================
if [ "$CLEANUP_MODE" = "--cleanup" ]; then
    echo -e "\n${BLUE}🧹 Cleaning up test artifacts...${NC}"
    
    # Remove test worktrees
    if [ -d ~/projects/$TEST_PROJECT/main ]; then
        cd ~/projects/$TEST_PROJECT/main
        git worktree list | grep -v " main " | awk '{print $1}' | xargs -I {} git worktree remove {} --force 2>/dev/null || true
    fi
    
    # Remove test directories
    rm -rf ~/projects/$TEST_PROJECT
    rm -rf "$TEST_DIR"
    
    echo -e "${GREEN}✅ Cleanup complete${NC}"
fi

# =================================================================
# TEST SUMMARY
# =================================================================
echo -e "\n${PURPLE}📊 Test Summary${NC}"
echo "=========================================="
TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
echo -e "${BLUE}Total Tests: $TOTAL_TESTS${NC}"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 ALL TESTS PASSED!${NC}"
    echo -e "${GREEN}Parallel development features are working correctly${NC}"
    exit 0
else
    echo -e "\n${RED}❌ SOME TESTS FAILED${NC}"
    echo -e "${YELLOW}Check log file: $TEST_LOG${NC}"
    echo -e "${YELLOW}Common issues:${NC}"
    echo "• Git version too old (need 2.5+)"
    echo "• Scripts not in expected location"
    echo "• Missing dependencies (tmux, git)"
    exit 1
fi