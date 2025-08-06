#!/usr/bin/env node

/**
 * Clean Development Start
 * 
 * Kills any existing processes on port 3000 before starting
 */

const { exec, spawn } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function killPort3000() {
  return new Promise((resolve) => {
    console.log(`${colors.yellow}🔪 Killing any processes on port 3000...${colors.reset}`);
    
    // Kill any process on port 3000
    exec('lsof -ti:3000 | xargs kill -9 2>/dev/null', (error) => {
      if (error) {
        console.log(`${colors.green}✅ Port 3000 is already free${colors.reset}`);
      } else {
        console.log(`${colors.green}✅ Killed existing processes on port 3000${colors.reset}`);
      }
      
      // Also kill any node processes for good measure
      exec('pkill -f "next dev" 2>/dev/null', () => {
        setTimeout(resolve, 1000); // Wait a second for ports to free up
      });
    });
  });
}

async function startCleanDev() {
  console.log(`\n${colors.bright}🧹 Clean Development Start${colors.reset}`);
  console.log('==========================\n');
  
  // Step 1: Kill existing processes
  await killPort3000();
  
  // Step 2: Clear Next.js cache
  console.log(`${colors.yellow}🗑️  Clearing Next.js cache...${colors.reset}`);
  exec('rm -rf .next', (error) => {
    if (!error) {
      console.log(`${colors.green}✅ Cache cleared${colors.reset}`);
    }
  });
  
  // Step 3: Start development server
  console.log(`\n${colors.blue}🚀 Starting fresh development server on port 3000${colors.reset}\n`);
  
  const dev = spawn('next', ['dev'], {
    stdio: 'inherit',
    shell: true
  });
  
  // Handle shutdown
  process.on('SIGINT', () => {
    console.log(`\n${colors.yellow}Shutting down...${colors.reset}`);
    dev.kill('SIGINT');
    process.exit(0);
  });
}

// Run
startCleanDev().catch(error => {
  console.error(`${colors.red}Error:${colors.reset}`, error);
  process.exit(1);
});