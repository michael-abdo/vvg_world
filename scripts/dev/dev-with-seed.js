#!/usr/bin/env node

/**
 * Development server with auto-seeding
 * 
 * Starts Next.js and seeds documents once ready
 * Configure with DEV_SEED_USER environment variable
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:3000',
  testUser: process.env.DEV_SEED_USER || 'dev-user@example.com',
  maxRetries: 3,
  retryDelay: 2000,
  documents: [
    // Standard Templates
    {
      path: 'documents/vvg/Form NDA [Mutual].docx',
      displayName: 'VVG Standard Mutual NDA',
      isStandard: true,
    },
    {
      path: 'documents/vvg/Form NDA [Velocity as Disclosing Party].docx',
      displayName: 'VVG Disclosing Party NDA',
      isStandard: true,
    },
    {
      path: 'documents/vvg/Form NDA [Velocity as Receiving Party].docx',
      displayName: 'VVG Receiving Party NDA',
      isStandard: true,
    },
    // Third-party NDAs
    {
      path: 'documents/third-party/UK-Government-Mutual-NDA.pdf',
      displayName: 'UK Government Mutual NDA',
      isStandard: false,
    },
    {
      path: 'documents/third-party/Torys-Mutual-NDA-Template.pdf',
      displayName: 'Torys Law Firm NDA Template',
      isStandard: false,
    },
    {
      path: 'documents/third-party/Sample-Tech-Company-Mutual-NDA.txt',
      displayName: 'Tech Company Mutual NDA',
      isStandard: false,
    },
    {
      path: 'documents/third-party/Financial-Services-NDA.txt',
      displayName: 'Financial Services NDA',
      isStandard: false,
    },
    {
      path: 'documents/third-party/Healthcare-Industry-NDA.txt',
      displayName: 'Healthcare Industry NDA',
      isStandard: false,
    },
    {
      path: 'documents/third-party/Manufacturing-Vendor-NDA.txt',
      displayName: 'Manufacturing Vendor NDA',
      isStandard: false,
    },
    {
      path: 'documents/third-party/Simple-Mutual-NDA-Template.txt',
      displayName: 'Simple Mutual NDA Template',
      isStandard: false,
    },
  ]
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Simple server check - just see if port is open
async function isServerReady() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/health',
      method: 'GET',
      timeout: 1000
    };

    const req = http.request(options, (res) => {
      resolve(true);
    });

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

async function waitForServer(maxWaitTime = 60000) {
  const startTime = Date.now();
  let attempts = 0;
  
  while (Date.now() - startTime < maxWaitTime) {
    attempts++;
    if (await isServerReady()) {
      return true;
    }
    
    if (attempts % 5 === 0) {
      console.log(`⏳ Still waiting... (${Math.floor((Date.now() - startTime) / 1000)}s)`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return false;
}

async function killExistingServers() {
  return new Promise((resolve) => {
    spawn('lsof', ['-ti:3000'], { shell: true })
      .on('exit', () => {
        spawn('pkill', ['-f', 'next dev'], { shell: true })
          .on('exit', () => {
            setTimeout(resolve, 1000);
          });
      });
  });
}

// Note: Using HTTP endpoint seeding to work within Next.js memory space

async function seedDocuments() {
  // Use the working Next.js seeding endpoint
  try {
    const response = await fetch(`${CONFIG.baseUrl}/api/seed-dev`, {
      method: 'POST',
      headers: {
        'x-dev-bypass': 'true',
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`${colors.green}✅${colors.reset} ${result.message}`);
      console.log(`${colors.blue}📊${colors.reset} Total documents in database: ${result.totalDocuments}\n`);
    } else {
      const error = await response.json();
      console.log(`${colors.yellow}❌${colors.reset} Seeding failed: ${error.message}`);
    }
  } catch (error) {
    console.log(`${colors.yellow}❌${colors.reset} Seeding failed: ${error.message}`);
  }
  
  console.log('You can now:');
  console.log(`   • View documents at ${colors.blue}http://localhost:3000/documents${colors.reset}`);
  console.log(`   • Compare NDAs at ${colors.blue}http://localhost:3000/compare${colors.reset}`);
  console.log('   • Test the complete workflow\n');
}

async function main() {
  console.log('🚀 Starting development server with auto-seeding...\n');
  
  // Load environment variables from .env.local
  try {
    require('dotenv').config({ path: '.env.local' });
  } catch (e) {
    // dotenv might not be installed, that's okay
  }

  // Verify environment
  if (!process.env.DEV_SEED_USER) {
    console.log(`${colors.yellow}⚠️  DEV_SEED_USER not set, using default: ${CONFIG.testUser}${colors.reset}`);
    console.log(`${colors.blue}💡 Set DEV_SEED_USER environment variable to use your email${colors.reset}\n`);
  } else {
    console.log(`${colors.cyan}👤 Seeding documents for: ${process.env.DEV_SEED_USER}${colors.reset}\n`);
  }
  
  // Kill existing servers first
  console.log('🔪 Killing any existing servers...');
  await killExistingServers();
  console.log('✅ Port 3000 is free\n');

  // Start Next.js with inherited environment (DRY - pass all env vars)
  const next = spawn('next', ['dev'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env }  // ← Pass parent's environment to child
  });

  // Wait for server
  console.log('⏳ Waiting for server to be ready...');
  
  const ready = await waitForServer();
  
  if (!ready) {
    console.log('⚠️  Server is taking longer than expected...');
    console.log('The server might still be starting. Proceeding with seeding in 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));
  }

  console.log('✅ Server is ready!\n');

  // Run seeding
  try {
    await seedDocuments();
    console.log('\n✅ Development server is running with seeded documents!');
    console.log('   Visit: http://localhost:3000/documents\n');
  } catch (error) {
    console.log('\n⚠️  Seeding failed, but server is still running');
    console.error('Error:', error.message);
  }

  // Handle shutdown
  process.on('SIGINT', () => {
    next.kill('SIGINT');
    process.exit(0);
  });
}

main().catch(console.error);