#!/usr/bin/env node

/**
 * Complete Integration Test Runner
 * Runs all validation tests in sequence with proper server management
 */

const { spawn } = require('child_process');
const FunctionalTester = require('./test-functional');
const ApiResponseValidator = require('./test-api-responses');
const PageContentValidator = require('./test-page-content');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

class CompleteTestRunner {
  constructor() {
    this.serverProcess = null;
    this.baseUrl = 'http://localhost:3001';
    this.results = {
      build: null,
      server: null,
      functional: null,
      api: null,
      content: null,
      overall: null
    };
  }

  async runBuildTest() {
    log('\n🏗️  Phase 1: Build Validation', colors.bold + colors.blue);
    log('=' + '='.repeat(30), colors.blue);
    
    try {
      log('Building application...', colors.cyan);
      
      const buildResult = await this.execCommand('npm run build');
      
      if (buildResult.success) {
        log('✅ Build successful', colors.green);
        this.results.build = { success: true, output: buildResult.output };
      } else {
        log('❌ Build failed', colors.red);
        log(buildResult.error, colors.red);
        this.results.build = { success: false, error: buildResult.error };
        return false;
      }
    } catch (error) {
      log(`❌ Build test failed: ${error.message}`, colors.red);
      this.results.build = { success: false, error: error.message };
      return false;
    }
    
    return true;
  }

  async runTypeScriptCheck() {
    log('\n📝 TypeScript Validation', colors.cyan);
    
    try {
      const typeCheckResult = await this.execCommand('npx tsc --noEmit --skipLibCheck');
      
      if (typeCheckResult.success) {
        log('✅ TypeScript compilation successful', colors.green);
      } else {
        log('❌ TypeScript errors found', colors.red);
        log(typeCheckResult.error, colors.red);
        return false;
      }
    } catch (error) {
      log(`❌ TypeScript check failed: ${error.message}`, colors.red);
      return false;
    }
    
    return true;
  }

  async startServer() {
    log('\n🚀 Phase 2: Server Startup', colors.bold + colors.blue);
    log('=' + '='.repeat(30), colors.blue);
    
    return new Promise((resolve, reject) => {
      log('Starting development server...', colors.cyan);
      
      this.serverProcess = spawn('npm', ['run', 'dev'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { 
          ...process.env, 
          NODE_ENV: 'development',
          NEXTAUTH_SECRET: 'test-secret-for-development'
        }
      });

      let serverReady = false;
      let output = '';
      
      this.serverProcess.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        
        if ((text.includes('Ready in') || text.includes('Local:')) && !serverReady) {
          serverReady = true;
          log('✅ Server started successfully', colors.green);
          this.results.server = { success: true, output };
          setTimeout(resolve, 2000); // Wait for full initialization
        }
      });

      this.serverProcess.stderr.on('data', (data) => {
        const error = data.toString();
        if (error.includes('Error:') || error.includes('Failed')) {
          if (!serverReady) {
            log(`❌ Server startup failed: ${error}`, colors.red);
            this.results.server = { success: false, error };
            reject(new Error(error));
          }
        }
      });

      // Timeout after 60 seconds
      setTimeout(() => {
        if (!serverReady) {
          log('❌ Server startup timeout', colors.red);
          this.results.server = { success: false, error: 'Startup timeout' };
          reject(new Error('Server startup timeout'));
        }
      }, 60000);
    });
  }

  async stopServer() {
    if (this.serverProcess) {
      this.serverProcess.kill();
      log('🛑 Server stopped', colors.yellow);
    }
  }

  async runFunctionalTests() {
    log('\n🧪 Phase 3: Functional Testing', colors.bold + colors.blue);
    log('=' + '='.repeat(30), colors.blue);
    
    try {
      const tester = new FunctionalTester();
      // Skip server start/stop since we manage it here
      tester.serverProcess = this.serverProcess;
      
      log('Running comprehensive functional tests...', colors.cyan);
      
      // Test basePaths
      await tester.testBasePaths();
      
      // Test API endpoints
      await tester.testApiEndpoints();
      
      // Test error handling
      await tester.testErrorPages();
      
      // Test security headers
      await tester.testSecurityHeaders();
      
      const functionalSuccess = tester.results.errors.length === 0;
      this.results.functional = {
        success: functionalSuccess,
        details: tester.results
      };
      
      if (functionalSuccess) {
        log('✅ All functional tests passed', colors.green);
      } else {
        log(`❌ ${tester.results.errors.length} functional test(s) failed`, colors.red);
      }
      
      return functionalSuccess;
      
    } catch (error) {
      log(`❌ Functional testing failed: ${error.message}`, colors.red);
      this.results.functional = { success: false, error: error.message };
      return false;
    }
  }

  async runApiTests() {
    log('\n🔌 Phase 4: API Response Validation', colors.bold + colors.blue);
    log('=' + '='.repeat(30), colors.blue);
    
    try {
      const validator = new ApiResponseValidator(this.baseUrl);
      
      log('Validating API responses...', colors.cyan);
      
      // Health APIs
      await validator.validateApiResponse('/api/health', {
        statusCode: 200,
        contentType: 'application/json',
        schema: { ok: 'boolean' }
      });
      
      await validator.validateApiResponse('/api/db-health', {
        statusCode: 200,
        contentType: 'application/json'
      });
      
      await validator.validateApiResponse('/api/storage-health', {
        statusCode: 200,
        contentType: 'application/json'
      });
      
      // Auth APIs
      await validator.validateApiResponse('/api/auth/session', {
        statusCode: 200,
        contentType: 'application/json'
      });
      
      // Protected APIs (should return 401)
      await validator.validateApiResponse('/api/documents', {
        statusCode: 401,
        contentType: 'application/json'
      });
      
      // 404 APIs
      await validator.validateApiResponse('/api/nonexistent', {
        statusCode: 404
      });
      
      const apiSuccess = validator.results.every(r => r.failed.length === 0);
      this.results.api = {
        success: apiSuccess,
        details: validator.results
      };
      
      if (apiSuccess) {
        log('✅ All API validations passed', colors.green);
      } else {
        const failedCount = validator.results.filter(r => r.failed.length > 0).length;
        log(`❌ ${failedCount} API validation(s) failed`, colors.red);
      }
      
      return apiSuccess;
      
    } catch (error) {
      log(`❌ API testing failed: ${error.message}`, colors.red);
      this.results.api = { success: false, error: error.message };
      return false;
    }
  }

  async runContentTests() {
    log('\n📄 Phase 5: Page Content Validation', colors.bold + colors.blue);
    log('=' + '='.repeat(30), colors.blue);
    
    try {
      const validator = new PageContentValidator(this.baseUrl);
      
      log('Validating page content...', colors.cyan);
      
      // Main pages
      await validator.validatePage('/', {
        mustContain: ['<html', '<body'],
        mustNotContain: ['Error:', '404', '500']
      });
      
      await validator.validatePage('/sign-in', {
        mustNotContain: ['Error:', '500']
      });
      
      await validator.validatePage('/dashboard', {
        statusCode: 200,
        mustNotContain: ['Error:', '500']
      });
      
      await validator.validatePage('/upload', {
        statusCode: 200,
        mustNotContain: ['Error:', '500']
      });
      
      await validator.validatePage('/documents', {
        statusCode: 200,
        mustNotContain: ['Error:', '500']
      });
      
      await validator.validatePage('/compare', {
        statusCode: 200,
        mustNotContain: ['Error:', '500']
      });
      
      // Error pages
      await validator.validatePage('/nonexistent-page', {
        statusCode: 404
      });
      
      const contentSuccess = validator.results.every(r => r.failed.length === 0);
      this.results.content = {
        success: contentSuccess,
        details: validator.results
      };
      
      if (contentSuccess) {
        log('✅ All content validations passed', colors.green);
      } else {
        const failedCount = validator.results.filter(r => r.failed.length > 0).length;
        log(`❌ ${failedCount} content validation(s) failed`, colors.red);
      }
      
      return contentSuccess;
      
    } catch (error) {
      log(`❌ Content testing failed: ${error.message}`, colors.red);
      this.results.content = { success: false, error: error.message };
      return false;
    }
  }

  async execCommand(command) {
    return new Promise((resolve) => {
      const [cmd, ...args] = command.split(' ');
      const process = spawn(cmd, args, { stdio: 'pipe' });
      
      let output = '';
      let error = '';
      
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      process.on('close', (code) => {
        resolve({
          success: code === 0,
          output,
          error
        });
      });
    });
  }

  generateFinalReport() {
    log('\n📊 Complete Test Results', colors.bold + colors.magenta);
    log('=' + '='.repeat(50), colors.magenta);
    
    const phases = [
      { name: 'Build', result: this.results.build },
      { name: 'Server Startup', result: this.results.server },
      { name: 'Functional Tests', result: this.results.functional },
      { name: 'API Validation', result: this.results.api },
      { name: 'Content Validation', result: this.results.content }
    ];
    
    let allPassed = true;
    
    phases.forEach(phase => {
      const status = phase.result?.success ? '✅' : '❌';
      const color = phase.result?.success ? colors.green : colors.red;
      log(`${status} ${phase.name}`, color);
      
      if (!phase.result?.success) {
        allPassed = false;
        if (phase.result?.error) {
          log(`  Error: ${phase.result.error}`, colors.red);
        }
      }
    });
    
    log('\n🎯 Overall Assessment:', colors.bold);
    
    if (allPassed) {
      log('🎉 ALL TESTS PASSED - Template is fully functional!', colors.bold + colors.green);
      log('✨ Ready for production deployment', colors.green);
      return 0;
    } else {
      log('⚠️  Some tests failed - Template needs fixes', colors.bold + colors.red);
      log('🔧 Review the errors above and fix before deployment', colors.yellow);
      return 1;
    }
  }

  async runAllTests() {
    const startTime = Date.now();
    
    try {
      log('🚀 VVG Template - Complete Integration Test Suite', colors.bold + colors.cyan);
      log('=' + '='.repeat(60), colors.cyan);
      
      // Phase 1: Build validation
      const buildSuccess = await this.runBuildTest();
      if (!buildSuccess) {
        log('\n❌ Build failed - aborting further tests', colors.red);
        return this.generateFinalReport();
      }
      
      // TypeScript check
      const tsSuccess = await this.runTypeScriptCheck();
      if (!tsSuccess) {
        log('\n⚠️  TypeScript issues found - continuing with runtime tests', colors.yellow);
      }
      
      // Phase 2: Start server
      await this.startServer();
      
      // Phase 3-5: Runtime tests
      await this.runFunctionalTests();
      await this.runApiTests();
      await this.runContentTests();
      
    } catch (error) {
      log(`❌ Test suite failed: ${error.message}`, colors.red);
      this.results.overall = { success: false, error: error.message };
    } finally {
      await this.stopServer();
    }
    
    const duration = Date.now() - startTime;
    log(`\n⏱️  Total test duration: ${Math.round(duration / 1000)}s`, colors.cyan);
    
    return this.generateFinalReport();
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new CompleteTestRunner();
  runner.runAllTests()
    .then(exitCode => process.exit(exitCode))
    .catch(error => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = CompleteTestRunner;