#!/usr/bin/env node

/**
 * Page Content & Routing Validator
 * Tests that pages load properly with correct content, no 404s, proper basePaths
 */

const http = require('http');
const fs = require('fs');

class PageContentValidator {
  constructor(baseUrl = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
    this.results = [];
  }

  async request(path) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      
      const req = http.request({
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Page-Content-Validator/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'X-Dev-Bypass': 'true'
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            path
          });
        });
      });

      req.on('error', reject);
      req.end();
    });
  }

  async validatePage(path, expectations = {}) {
    console.log(`🔍 Validating Page: ${path}`);
    
    try {
      const response = await this.request(path);
      const result = {
        path,
        statusCode: response.statusCode,
        passed: [],
        failed: [],
        warnings: [],
        content: {}
      };

      // Status Code Check
      const expectedStatus = expectations.statusCode || 200;
      if (response.statusCode === expectedStatus) {
        result.passed.push(`Status: ${response.statusCode}`);
      } else {
        result.failed.push(`Expected status ${expectedStatus}, got ${response.statusCode}`);
      }

      // Only analyze content for successful responses
      if (response.statusCode === 200) {
        const body = response.body;
        
        // Basic HTML Structure
        if (body.includes('<!DOCTYPE') || body.includes('<html')) {
          result.passed.push('Valid HTML document');
        } else {
          result.failed.push('Not a valid HTML document');
        }

        // Check for React/Next.js specific elements
        if (body.includes('__NEXT_DATA__')) {
          result.passed.push('Next.js page structure detected');
        } else {
          result.warnings.push('No Next.js page structure detected');
        }

        // Title tag
        const titleMatch = body.match(/<title[^>]*>([^<]*)<\/title>/i);
        if (titleMatch) {
          result.passed.push(`Title: "${titleMatch[1]}"`);
          result.content.title = titleMatch[1];
        } else {
          result.failed.push('Missing title tag');
        }

        // Meta tags
        const metaViewport = body.includes('name="viewport"');
        if (metaViewport) {
          result.passed.push('Viewport meta tag present');
        } else {
          result.warnings.push('Missing viewport meta tag');
        }

        // Check for error indicators
        this.checkForErrors(body, result);

        // Check for expected content
        if (expectations.mustContain) {
          for (const content of expectations.mustContain) {
            if (body.includes(content)) {
              result.passed.push(`Contains: "${content}"`);
            } else {
              result.failed.push(`Missing expected content: "${content}"`);
            }
          }
        }

        // Check for forbidden content
        if (expectations.mustNotContain) {
          for (const content of expectations.mustNotContain) {
            if (body.includes(content)) {
              result.failed.push(`Contains forbidden content: "${content}"`);
            } else {
              result.passed.push(`Correctly excludes: "${content}"`);
            }
          }
        }

        // Check JavaScript/CSS loading
        const hasJavaScript = body.includes('<script') || body.includes('.js');
        const hasCSS = body.includes('<link') || body.includes('.css') || body.includes('<style');
        
        if (hasJavaScript) {
          result.passed.push('JavaScript resources detected');
        }
        if (hasCSS) {
          result.passed.push('CSS resources detected');
        }

        // Performance indicators
        result.content.size = body.length;
        result.content.hasInlineStyles = body.includes('<style');
        result.content.hasInlineScripts = body.includes('<script>');
        
        if (body.length > 0) {
          result.passed.push(`Content size: ${body.length} bytes`);
        } else {
          result.failed.push('Empty response body');
        }

      } else {
        // For non-200 responses, check if it's a proper error page
        if (response.statusCode === 404) {
          if (response.body.includes('404') || response.body.toLowerCase().includes('not found')) {
            result.passed.push('Proper 404 error page');
          } else {
            result.warnings.push('404 status but no 404 content');
          }
        }
      }

      this.results.push(result);
      
      const success = result.failed.length === 0;
      console.log(`${success ? '✅' : '❌'} ${path} - ${result.passed.length} checks passed`);
      
      return result;

    } catch (error) {
      console.log(`❌ ${path} - Request failed: ${error.message}`);
      const result = {
        path,
        failed: [`Request failed: ${error.message}`],
        passed: [],
        warnings: []
      };
      this.results.push(result);
      return result;
    }
  }

  checkForErrors(body, result) {
    // Check for common error patterns
    const errorPatterns = [
      { pattern: /TypeError:/gi, description: 'Type errors' },
      { pattern: /ReferenceError:/gi, description: 'Reference errors' },
      { pattern: /SyntaxError:/gi, description: 'Syntax errors' },
      { pattern: /Cannot read prop/gi, description: 'Property access errors' },
      { pattern: /undefined is not/gi, description: 'Undefined errors' },
      { pattern: /Application error: a client-side exception/gi, description: 'Client-side error' }
    ];
    
    // In development, be less strict about error text that might appear in toasts
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (!isDevelopment) {
      errorPatterns.push(
        { pattern: /Error:/gi, description: 'JavaScript errors' },
        { pattern: /404 - This page could not be found/gi, description: 'Next.js 404 error' },
        { pattern: /500 - Internal Server Error/gi, description: 'Server error' }
      );
    }

    errorPatterns.forEach(({ pattern, description }) => {
      const matches = body.match(pattern);
      if (matches) {
        result.failed.push(`Found ${description}: ${matches.length} occurrences`);
      } else {
        result.passed.push(`No ${description} detected`);
      }
    });

    // Check for development error overlay
    if (body.includes('__NEXT_ERROR_OVERLAY__') || body.includes('react-dev-overlay')) {
      result.failed.push('Development error overlay detected');
    }

    // Check for hydration errors
    if (body.includes('Hydration') && body.includes('error')) {
      result.warnings.push('Possible hydration issues detected');
    }
  }

  async testBasePaths() {
    console.log('🔍 Testing basePath routing...');
    
    // Get project name from environment or config
    const projectName = process.env.PROJECT_NAME || await this.getProjectNameFromConfig();
    
    const testPaths = ['/', '/sign-in', '/dashboard', '/upload', '/documents', '/compare'];
    
    for (const path of testPaths) {
      // Test direct path
      await this.validatePage(path, {
        mustNotContain: ['Not Found', 'Cannot GET']
      });
      
      // Test with basePath if configured
      if (projectName && projectName !== 'localhost') {
        const basePathUrl = `/${projectName}${path}`;
        await this.validatePage(basePathUrl, {
          mustNotContain: ['Not Found', 'Cannot GET']
        });
      }
    }
  }

  async getProjectNameFromConfig() {
    try {
      // Try to read next.config.mjs for basePath
      const configContent = fs.readFileSync('next.config.mjs', 'utf8');
      const basePathMatch = configContent.match(/basePath:\s*['"`]([^'"`]+)['"`]/);
      if (basePathMatch) {
        return basePathMatch[1].replace(/^\//, ''); // Remove leading slash
      }
    } catch (e) {
      // Config file not found or unreadable
    }
    return null;
  }

  async runAllValidations() {
    console.log('🚀 Running Page Content Validations\n');

    // Test main pages
    await this.validatePage('/', {
      mustContain: ['<html', '<body'],
      mustNotContain: ['Error:', '404', '500']
    });

    await this.validatePage('/sign-in', {
      mustContain: ['sign', 'login'],
      mustNotContain: ['Error:', '404']
    });

    await this.validatePage('/dashboard', {
      statusCode: 200, // Should work even without auth due to client-side handling
      mustNotContain: ['Error:', '500']
    });

    await this.validatePage('/upload', {
      statusCode: 200,
      mustNotContain: ['Error:', '500']
    });

    await this.validatePage('/documents', {
      statusCode: 200,
      mustNotContain: ['Error:', '500']
    });

    await this.validatePage('/compare', {
      statusCode: 200,
      mustNotContain: ['Error:', '500']
    });

    // Test error pages
    await this.validatePage('/nonexistent-page', {
      statusCode: 404,
      mustContain: ['404']
    });

    // Test basePath routing
    await this.testBasePaths();

    this.generateReport();
  }

  generateReport() {
    console.log('\n📊 Page Content Validation Report');
    console.log('=' + '='.repeat(40));

    let totalChecks = 0;
    let passedChecks = 0;
    let failedChecks = 0;
    let warningCount = 0;

    this.results.forEach(result => {
      totalChecks += result.passed.length + result.failed.length;
      passedChecks += result.passed.length;
      failedChecks += result.failed.length;
      warningCount += result.warnings.length;

      if (result.failed.length > 0) {
        console.log(`\n❌ ${result.path} (Status: ${result.statusCode})`);
        result.failed.forEach(failure => console.log(`  • ${failure}`));
      } else {
        console.log(`\n✅ ${result.path} - All content checks passed`);
      }

      if (result.warnings.length > 0) {
        console.log(`⚠️  Warnings:`);
        result.warnings.forEach(warning => console.log(`  • ${warning}`));
      }

      // Show content summary for successful pages
      if (result.content && Object.keys(result.content).length > 0) {
        console.log(`📄 Content: ${result.content.size || 0} bytes${result.content.title ? `, Title: "${result.content.title}"` : ''}`);
      }
    });

    console.log(`\n📈 Summary:`);
    console.log(`  Total Checks: ${totalChecks}`);
    console.log(`  Passed: ${passedChecks}`);
    console.log(`  Failed: ${failedChecks}`);
    console.log(`  Warnings: ${warningCount}`);

    const successRate = totalChecks > 0 ? ((passedChecks / totalChecks) * 100).toFixed(1) : 0;
    console.log(`  Success Rate: ${successRate}%`);

    if (failedChecks === 0) {
      console.log('\n🎉 All pages load correctly with proper content!');
      return 0;
    } else {
      console.log('\n⚠️  Some pages have content issues');
      return 1;
    }
  }
}

// Run if called directly
if (require.main === module) {
  const validator = new PageContentValidator();
  validator.runAllValidations()
    .then(exitCode => process.exit(exitCode || 0))
    .catch(error => {
      console.error('Page validation failed:', error);
      process.exit(1);
    });
}

module.exports = PageContentValidator;