#!/usr/bin/env node
/**
 * Deployment Validation Script
 * Checks if the application is ready for production deployment
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

let errors = 0;
let warnings = 0;

function success(message) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function error(message) {
  errors++;
  console.log(`${colors.red}✗${colors.reset} ${message}`);
}

function warning(message) {
  warnings++;
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
}

function info(message) {
  console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}

console.log('\n🔍 Deployment Validation Check\n');

// 1. Check Node.js version
console.log('1. Checking Node.js version...');
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
if (majorVersion >= 18) {
  success(`Node.js ${nodeVersion} (18.x or higher required)`);
} else {
  error(`Node.js ${nodeVersion} is too old. Version 18.x or higher required`);
}

// 2. Check package.json scripts
console.log('\n2. Checking package.json scripts...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredScripts = ['build', 'start', 'db:migrate'];
  
  requiredScripts.forEach(script => {
    if (packageJson.scripts && packageJson.scripts[script]) {
      success(`Script '${script}' exists`);
    } else {
      error(`Missing required script: ${script}`);
    }
  });
} catch (e) {
  error('Could not read package.json');
}

// 3. Check for production environment file
console.log('\n3. Checking environment files...');
if (fs.existsSync('.env.production')) {
  success('Production environment file exists');
} else if (fs.existsSync('.env.production.example')) {
  warning('No .env.production file found, but example exists');
  info('Copy .env.production.example to .env.production and configure');
} else {
  error('No production environment configuration found');
}

// 4. Check for critical files
console.log('\n4. Checking critical files...');
const criticalFiles = [
  'next.config.js',
  'lib/config.ts',
  'middleware.ts',
  'lib/db.ts',
  'lib/storage/index.ts'
];

criticalFiles.forEach(file => {
  if (fs.existsSync(file)) {
    success(`Found: ${file}`);
  } else {
    error(`Missing: ${file}`);
  }
});

// 5. Check for deployment scripts
console.log('\n5. Checking deployment utilities...');
const deploymentFiles = [
  'scripts/deploy-production.sh',
  'ecosystem.config.js',
  'DEPLOYMENT.md'
];

deploymentFiles.forEach(file => {
  if (fs.existsSync(file)) {
    success(`Found: ${file}`);
  } else {
    warning(`Optional but recommended: ${file}`);
  }
});

// 6. Check for sensitive files that shouldn't be deployed
console.log('\n6. Checking for sensitive files...');
const sensitiveFiles = [
  '.env.local',
  '.env.development',
  'scripts/dev',
  'documents/vvg',
  'documents/third-party'
];

sensitiveFiles.forEach(file => {
  if (fs.existsSync(file)) {
    warning(`Found development file: ${file} (should not be deployed)`);
  }
});

// 7. Check TypeScript compilation
console.log('\n7. Checking TypeScript configuration...');
if (fs.existsSync('tsconfig.json')) {
  success('TypeScript configuration found');
  
  // Check if we can compile
  const { execSync } = require('child_process');
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    success('TypeScript compilation check passed');
  } catch (e) {
    if (e.stdout) {
      error('TypeScript compilation errors found');
      console.log(e.stdout.toString());
    }
  }
} else {
  error('No tsconfig.json found');
}

// 8. Check for logs directory
console.log('\n8. Checking logging setup...');
if (!fs.existsSync('logs')) {
  info('Creating logs directory...');
  fs.mkdirSync('logs');
  success('Logs directory created');
} else {
  success('Logs directory exists');
}

// 9. Security checks
console.log('\n9. Running security checks...');

// Check for hardcoded secrets
const sourceFiles = [];
function findSourceFiles(dir) {
  if (dir.includes('node_modules') || dir.includes('.next')) return;
  
  try {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        findSourceFiles(fullPath);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
        sourceFiles.push(fullPath);
      }
    });
  } catch (e) {
    // Ignore permission errors
  }
}

findSourceFiles('.');

let secretsFound = false;
const secretPatterns = [
  /OPENAI_API_KEY\s*=\s*["']sk-[^"']+["']/,
  /AWS_SECRET_ACCESS_KEY\s*=\s*["'][^"']+["']/,
  /NEXTAUTH_SECRET\s*=\s*["'][^"']+["']/,
  /password\s*=\s*["'][^"']+["']/i
];

sourceFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  secretPatterns.forEach(pattern => {
    if (pattern.test(content)) {
      error(`Possible hardcoded secret in: ${file}`);
      secretsFound = true;
    }
  });
});

if (!secretsFound) {
  success('No hardcoded secrets detected');
}

// Summary
console.log('\n📊 Validation Summary:');
console.log('---------------------');

if (errors === 0 && warnings === 0) {
  console.log(`${colors.green}✅ All checks passed! Ready for deployment.${colors.reset}`);
} else {
  if (errors > 0) {
    console.log(`${colors.red}❌ Found ${errors} error(s) that must be fixed${colors.reset}`);
  }
  if (warnings > 0) {
    console.log(`${colors.yellow}⚠️  Found ${warnings} warning(s) to review${colors.reset}`);
  }
}

console.log('\n📋 Next Steps:');
if (errors === 0) {
  console.log('1. Configure .env.production with your values');
  console.log('2. Run: NODE_ENV=production ./scripts/deploy-production.sh');
  console.log('3. Start the application with PM2 or your process manager');
  console.log('4. Configure reverse proxy (nginx/Apache)');
  console.log('5. Set up SSL certificates');
} else {
  console.log('1. Fix the errors listed above');
  console.log('2. Run this validation again');
}

process.exit(errors > 0 ? 1 : 0);