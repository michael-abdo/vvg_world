#!/usr/bin/env node

/**
 * API Response Content Validator
 * Tests that APIs return proper JSON, correct status codes, and valid content
 */

const http = require('http');

class ApiResponseValidator {
  constructor(baseUrl = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
    this.results = [];
  }

  async request(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      
      const req = http.request({
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'API-Validator/1.0',
          'X-Dev-Bypass': 'true',
          ...options.headers
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
      
      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  }

  async validateApiResponse(path, expectations = {}) {
    console.log(`🔍 Validating API: ${path}`);
    
    try {
      const response = await this.request(path);
      const result = {
        path,
        statusCode: response.statusCode,
        passed: [],
        failed: [],
        warnings: []
      };

      // Status Code Validation
      const expectedStatus = expectations.statusCode || 200;
      if (response.statusCode === expectedStatus) {
        result.passed.push(`Status code: ${response.statusCode}`);
      } else {
        result.failed.push(`Expected status ${expectedStatus}, got ${response.statusCode}`);
      }

      // Content-Type Validation
      const contentType = response.headers['content-type'];
      if (expectations.contentType) {
        if (contentType && contentType.includes(expectations.contentType)) {
          result.passed.push(`Content-Type: ${contentType}`);
        } else {
          result.failed.push(`Expected Content-Type ${expectations.contentType}, got ${contentType}`);
        }
      }

      // JSON Validation
      if (contentType && contentType.includes('application/json')) {
        try {
          const json = JSON.parse(response.body);
          result.passed.push('Valid JSON response');
          result.jsonData = json;

          // Schema Validation
          if (expectations.schema) {
            const schemaResult = this.validateSchema(json, expectations.schema);
            if (schemaResult.valid) {
              result.passed.push('Schema validation passed');
            } else {
              result.failed.push(`Schema validation failed: ${schemaResult.errors.join(', ')}`);
            }
          }

          // Content Validation
          if (expectations.contains) {
            for (const [key, value] of Object.entries(expectations.contains)) {
              if (json[key] === value) {
                result.passed.push(`Contains ${key}: ${value}`);
              } else {
                result.failed.push(`Expected ${key}: ${value}, got ${json[key]}`);
              }
            }
          }

        } catch (e) {
          result.failed.push('Invalid JSON response');
        }
      }

      // Response Time Validation
      if (expectations.maxResponseTime) {
        // This would need to be implemented with timing
        result.warnings.push('Response time validation not implemented');
      }

      // Headers Validation
      if (expectations.headers) {
        for (const [headerName, expectedValue] of Object.entries(expectations.headers)) {
          const actualValue = response.headers[headerName.toLowerCase()];
          if (actualValue === expectedValue) {
            result.passed.push(`Header ${headerName}: ${expectedValue}`);
          } else {
            result.failed.push(`Expected header ${headerName}: ${expectedValue}, got ${actualValue}`);
          }
        }
      }

      // Security Headers Check
      const securityHeaders = ['x-frame-options', 'x-content-type-options'];
      securityHeaders.forEach(header => {
        if (response.headers[header]) {
          result.passed.push(`Security header ${header} present`);
        } else {
          result.warnings.push(`Missing security header: ${header}`);
        }
      });

      this.results.push(result);
      
      const success = result.failed.length === 0;
      console.log(`${success ? '✅' : '❌'} ${path} - ${result.passed.length} passed, ${result.failed.length} failed`);
      
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

  validateSchema(data, schema) {
    const errors = [];
    
    for (const [key, type] of Object.entries(schema)) {
      if (!(key in data)) {
        errors.push(`Missing required field: ${key}`);
        continue;
      }

      const actualType = typeof data[key];
      if (actualType !== type) {
        errors.push(`Field ${key}: expected ${type}, got ${actualType}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  async runAllValidations() {
    console.log('🚀 Running API Response Validations\n');

    // Health Check APIs
    await this.validateApiResponse('/api/health', {
      statusCode: 200,
      contentType: 'application/json',
      schema: { ok: 'boolean' }
    });

    await this.validateApiResponse('/api/db-health', {
      statusCode: 503, // Degraded without DB config
      contentType: 'application/json'
    });

    await this.validateApiResponse('/api/storage-health', {
      statusCode: 503, // Degraded without S3 config
      contentType: 'application/json'
    });

    // Auth APIs
    await this.validateApiResponse('/api/auth/session', {
      statusCode: 200,
      contentType: 'application/json'
    });

    await this.validateApiResponse('/api/auth/providers', {
      statusCode: 200,
      contentType: 'application/json'
    });

    // Protected APIs (should return 401)
    await this.validateApiResponse('/api/documents', {
      statusCode: 401,
      contentType: 'application/json',
      schema: { error: 'string' }
    });

    await this.validateApiResponse('/api/dashboard/stats', {
      statusCode: 401,
      contentType: 'application/json'
    });

    // Non-existent APIs (should return 404)
    await this.validateApiResponse('/api/nonexistent', {
      statusCode: 404
    });

    // Test malformed requests
    await this.validateApiResponse('/api/documents/invalid-id', {
      statusCode: 401,  // Changed from 400 to 401 - auth required first
      contentType: 'application/json'
    });

    // POST-only endpoints (should return 405 on GET)
    await this.validateApiResponse('/api/upload', {
      statusCode: 405,
      contentType: 'application/json'
    });


    this.generateReport();
  }

  generateReport() {
    console.log('\n📊 API Response Validation Report');
    console.log('=' + '='.repeat(40));

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let warningCount = 0;

    this.results.forEach(result => {
      totalTests += result.passed.length + result.failed.length;
      passedTests += result.passed.length;
      failedTests += result.failed.length;
      warningCount += result.warnings.length;

      if (result.failed.length > 0) {
        console.log(`\n❌ ${result.path}`);
        result.failed.forEach(failure => console.log(`  • ${failure}`));
      } else {
        console.log(`\n✅ ${result.path} - All validations passed`);
      }

      if (result.warnings.length > 0) {
        console.log(`⚠️  Warnings:`);
        result.warnings.forEach(warning => console.log(`  • ${warning}`));
      }
    });

    console.log(`\n📈 Summary:`);
    console.log(`  Total Tests: ${totalTests}`);
    console.log(`  Passed: ${passedTests}`);
    console.log(`  Failed: ${failedTests}`);
    console.log(`  Warnings: ${warningCount}`);

    const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;
    console.log(`  Success Rate: ${successRate}%`);

    if (failedTests === 0) {
      console.log('\n🎉 All API responses are valid!');
      return 0;
    } else {
      console.log('\n⚠️  Some API responses need attention');
      return 1;
    }
  }
}

// Run if called directly
if (require.main === module) {
  const validator = new ApiResponseValidator();
  validator.runAllValidations()
    .then(exitCode => process.exit(exitCode || 0))
    .catch(error => {
      console.error('API validation failed:', error);
      process.exit(1);
    });
}

module.exports = ApiResponseValidator;