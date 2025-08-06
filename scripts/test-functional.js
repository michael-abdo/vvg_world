#!/usr/bin/env node

/**
 * Comprehensive Functional Test Suite
 * Tests actual functionality, not just builds
 */

const { spawn, exec } = require('child_process');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

class FunctionalTester {
  constructor() {
    this.serverProcess = null;
    this.baseUrl = 'http://localhost:3001';
    this.results = {
      pages: {},
      apis: {},
      errors: [],
      warnings: []
    };
  }

  async startServer() {
    log('🚀 Starting development server...', colors.blue);
    
    return new Promise((resolve, reject) => {
      this.serverProcess = spawn('npm', ['run', 'dev'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { 
          ...process.env, 
          NODE_ENV: 'development',
          NEXTAUTH_SECRET: 'test-secret-for-development'
        }
      });

      let serverReady = false;
      
      this.serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Ready in') || output.includes('Local:')) {
          if (!serverReady) {
            serverReady = true;
            log('✅ Server started successfully', colors.green);
            // Wait a bit more for full initialization
            setTimeout(resolve, 2000);
          }
        }
      });

      this.serverProcess.stderr.on('data', (data) => {
        const error = data.toString();
        if (error.includes('Error:') || error.includes('Failed')) {
          reject(new Error(`Server failed to start: ${error}`));
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!serverReady) {
          reject(new Error('Server failed to start within 30 seconds'));
        }
      }, 30000);
    });
  }

  async stopServer() {
    if (this.serverProcess) {
      this.serverProcess.kill();
      log('🛑 Server stopped', colors.yellow);
    }
  }

  async httpRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
      const urlObj = new URL(fullUrl);
      
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'VVG-Template-Tester/1.0',
          'X-Dev-Bypass': 'true',
          ...options.headers
        },
        timeout: options.timeout || 10000
      };

      const client = urlObj.protocol === 'https:' ? https : http;
      
      const req = client.request(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            url: fullUrl
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timeout: ${fullUrl}`));
      });

      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  }

  async testApiEndpoint(path, expectedStatus = 200, options = {}) {
    try {
      log(`🔍 Testing API: ${path}`, colors.cyan);
      
      const response = await this.httpRequest(path, options);
      const success = response.statusCode === expectedStatus;
      
      this.results.apis[path] = {
        status: response.statusCode,
        expected: expectedStatus,
        success,
        responseTime: Date.now(),
        headers: response.headers,
        bodyLength: response.body.length
      };

      // Additional validations
      if (success) {
        // Check for JSON responses
        if (response.headers['content-type']?.includes('application/json')) {
          try {
            const json = JSON.parse(response.body);
            this.results.apis[path].jsonValid = true;
            this.results.apis[path].responseData = json;
          } catch (e) {
            this.results.apis[path].jsonValid = false;
            this.results.errors.push(`Invalid JSON response from ${path}`);
          }
        }

        // Check for proper headers
        if (response.headers['content-type']) {
          this.results.apis[path].hasContentType = true;
        }

        log(`✅ API ${path} - ${response.statusCode}`, colors.green);
      } else {
        log(`❌ API ${path} - Expected ${expectedStatus}, got ${response.statusCode}`, colors.red);
        this.results.errors.push(`API ${path} returned ${response.statusCode} instead of ${expectedStatus}`);
      }

      return response;
    } catch (error) {
      log(`❌ API ${path} - Error: ${error.message}`, colors.red);
      this.results.apis[path] = {
        success: false,
        error: error.message
      };
      this.results.errors.push(`API ${path} failed: ${error.message}`);
      return null;
    }
  }

  async testPageLoad(path, expectedElements = [], expectedStatus = 200) {
    try {
      log(`🔍 Testing Page: ${path}`, colors.cyan);
      
      const response = await this.httpRequest(path);
      const success = response.statusCode === expectedStatus;
      
      this.results.pages[path] = {
        status: response.statusCode,
        success,
        bodyLength: response.body.length,
        hasContent: response.body.length > 0
      };

      if (success) {
        // Check for HTML structure
        const hasHtml = response.body.includes('<html') || response.body.includes('<!DOCTYPE');
        const hasTitle = response.body.includes('<title>');
        const hasBody = response.body.includes('<body');
        
        this.results.pages[path].hasHtml = hasHtml;
        this.results.pages[path].hasTitle = hasTitle;
        this.results.pages[path].hasBody = hasBody;

        // Check for expected elements
        const foundElements = [];
        for (const element of expectedElements) {
          if (response.body.includes(element)) {
            foundElements.push(element);
          }
        }
        this.results.pages[path].expectedElements = foundElements;

        // Check for common errors in HTML (only for actual error indicators)
        const hasJsErrors = response.body.includes('TypeError:') || 
                          response.body.includes('ReferenceError:') ||
                          response.body.includes('SyntaxError:');
        
        if (hasJsErrors) {
          this.results.warnings.push(`Page ${path} may have JavaScript errors`);
        }

        log(`✅ Page ${path} - Loaded (${response.body.length} bytes)`, colors.green);
      } else {
        log(`❌ Page ${path} - Expected ${expectedStatus}, got ${response.statusCode}`, colors.red);
        this.results.errors.push(`Page ${path} returned ${response.statusCode} instead of ${expectedStatus}`);
      }

      return response;
    } catch (error) {
      log(`❌ Page ${path} - Error: ${error.message}`, colors.red);
      this.results.pages[path] = {
        success: false,
        error: error.message
      };
      this.results.errors.push(`Page ${path} failed: ${error.message}`);
      return null;
    }
  }

  async testBasePaths() {
    log('🔍 Testing basePath routing...', colors.blue);
    
    // Test both with and without basePath
    const testPaths = [
      '/',
      '/sign-in',
      '/dashboard',
      '/upload',
      '/documents',
      '/compare'
    ];

    for (const path of testPaths) {
      // Test direct path
      await this.testPageLoad(path);
      
      // Test with potential basePath (if configured)
      const projectName = process.env.PROJECT_NAME || 'vvg-world';
      if (projectName !== 'vvg-world') {
        await this.testPageLoad(`/${projectName}${path}`);
      }
    }
  }

  async testApiEndpoints() {
    log('🔍 Testing API endpoints...', colors.blue);
    
    const apiTests = [
      // Health checks
      { path: '/api/health', expectedStatus: 200 },
      { path: '/api/db-health', expectedStatus: 503 }, // Degraded without DB config
      { path: '/api/storage-health', expectedStatus: 503 }, // Degraded without S3 config
      
      // Dashboard
      { path: '/api/dashboard/stats', expectedStatus: 401 }, // Should require auth
      
      // Auth endpoints
      { path: '/api/auth/session', expectedStatus: 200 },
      
      // Protected endpoints (should return 401 without auth)
      { path: '/api/documents', expectedStatus: 401 },
      { path: '/api/upload', expectedStatus: 405 }, // POST-only endpoint
      
      // Non-existent endpoints (should return 404)
      { path: '/api/nonexistent', expectedStatus: 404 },
      { path: '/api/fake-endpoint', expectedStatus: 404 }
    ];

    for (const test of apiTests) {
      await this.testApiEndpoint(test.path, test.expectedStatus, test.options);
    }
  }

  async testErrorPages() {
    log('🔍 Testing error handling...', colors.blue);
    
    // Test 404 pages (expecting 404 status)
    await this.testPageLoad('/nonexistent-page', [], 404);
    await this.testPageLoad('/fake/path/that/does/not/exist', [], 404);
    
    // Test malformed URLs (expecting 401 for protected API)
    await this.testPageLoad('/api/documents/invalid-id', [], 401);
  }

  async testSecurityHeaders() {
    log('🔍 Testing security headers...', colors.blue);
    
    const response = await this.httpRequest('/');
    const headers = response?.headers || {};
    
    const securityChecks = {
      'X-Frame-Options': headers['x-frame-options'],
      'X-Content-Type-Options': headers['x-content-type-options'],
      'Content-Security-Policy': headers['content-security-policy']
    };

    this.results.security = securityChecks;
  }

  async runAllTests() {
    const startTime = Date.now();
    
    try {
      await this.startServer();
      
      log('\n🧪 Running Comprehensive Functional Tests\n', colors.bold + colors.blue);
      
      // Test sequence
      await this.testBasePaths();
      await this.testApiEndpoints();
      await this.testErrorPages();
      await this.testSecurityHeaders();
      
      // Additional specific tests
      await this.testSpecificFunctionality();
      
    } catch (error) {
      log(`❌ Test suite failed: ${error.message}`, colors.red);
      this.results.errors.push(`Test suite error: ${error.message}`);
    } finally {
      await this.stopServer();
    }

    const duration = Date.now() - startTime;
    this.generateReport(duration);
  }

  async testSpecificFunctionality() {
    log('🔍 Testing specific functionality...', colors.blue);
    
    // Test NextAuth endpoint
    await this.testApiEndpoint('/api/auth/providers', 200);
    
    // Test CORS headers
    const corsResponse = await this.httpRequest('/api/health', {
      method: 'OPTIONS',
      headers: { 'Origin': 'http://localhost:3000' }
    });
    
    if (corsResponse) {
      this.results.cors = {
        supported: corsResponse.statusCode === 200 || corsResponse.statusCode === 204,
        headers: corsResponse.headers
      };
    }
  }

  generateReport(duration) {
    log('\n📊 Functional Test Report', colors.bold + colors.blue);
    log('=' * 50, colors.blue);
    
    const totalPages = Object.keys(this.results.pages).length;
    const successfulPages = Object.values(this.results.pages).filter(p => p.success).length;
    
    const totalApis = Object.keys(this.results.apis).length;
    const successfulApis = Object.values(this.results.apis).filter(a => a.success).length;
    
    log(`\n📄 Pages Tested: ${successfulPages}/${totalPages}`, 
        successfulPages === totalPages ? colors.green : colors.red);
    
    log(`🔌 APIs Tested: ${successfulApis}/${totalApis}`, 
        successfulApis === totalApis ? colors.green : colors.red);
    
    log(`⚠️  Warnings: ${this.results.warnings.length}`, 
        this.results.warnings.length === 0 ? colors.green : colors.yellow);
    
    log(`❌ Errors: ${this.results.errors.length}`, 
        this.results.errors.length === 0 ? colors.green : colors.red);
    
    log(`⏱️  Duration: ${duration}ms`, colors.cyan);

    // Detailed results
    if (this.results.errors.length > 0) {
      log('\n❌ Errors Found:', colors.red);
      this.results.errors.forEach(error => log(`  • ${error}`, colors.red));
    }

    if (this.results.warnings.length > 0) {
      log('\n⚠️  Warnings:', colors.yellow);
      this.results.warnings.forEach(warning => log(`  • ${warning}`, colors.yellow));
    }

    // Success breakdown
    log('\n✅ Successful Tests:', colors.green);
    Object.entries(this.results.pages).forEach(([path, result]) => {
      if (result.success) {
        log(`  📄 ${path} (${result.bodyLength} bytes)`, colors.green);
      }
    });

    Object.entries(this.results.apis).forEach(([path, result]) => {
      if (result.success) {
        log(`  🔌 ${path} (${result.status})`, colors.green);
      }
    });

    // Overall assessment
    const allPagesWork = successfulPages === totalPages;
    const allApisWork = successfulApis === totalApis;
    const noErrors = this.results.errors.length === 0;
    
    log('\n🎯 Overall Assessment:', colors.bold);
    
    if (allPagesWork && allApisWork && noErrors) {
      log('🎉 ALL TESTS PASSED - Template is fully functional!', colors.bold + colors.green);
      return 0;
    } else {
      log('⚠️  Some tests failed - Template needs attention', colors.bold + colors.yellow);
      return 1;
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new FunctionalTester();
  tester.runAllTests()
    .then(exitCode => process.exit(exitCode || 0))
    .catch(error => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = FunctionalTester;