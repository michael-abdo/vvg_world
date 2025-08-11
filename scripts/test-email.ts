#!/usr/bin/env tsx
// Email Testing Script
// Run with: npx tsx scripts/test-email.ts [recipient@email.com]

import { emailService } from '../lib/services/email-service';
import { config } from '../lib/config';

async function testEmailService() {
  console.log('🧪 Starting Email Service Tests...\n');
  
  // Get test recipient from command line or use default
  const testRecipient = process.argv[2] || config.email.testRecipient;
  console.log(`📧 Test recipient: ${testRecipient}\n`);

  try {
    // Test 1: Connection Verification
    console.log('1️⃣ Testing SMTP Connection...');
    const connectionResult = await emailService.verifyConnection();
    console.log(`   ${connectionResult ? '✅' : '❌'} Connection: ${connectionResult ? 'SUCCESS' : 'FAILED'}\n`);

    // Test 2: Simple Text Email
    console.log('2️⃣ Testing Simple Text Email...');
    const textResult = await emailService.sendNotification(
      testRecipient,
      'Test: Simple Text Email',
      'This is a simple text email test from the VVG Pain Points platform.\n\nIf you received this, the email system is working correctly!',
      false
    );
    console.log(`   ${textResult.success ? '✅' : '❌'} Text Email: ${textResult.success ? 'SENT' : 'FAILED'}`);
    if (textResult.messageId) console.log(`   📧 Message ID: ${textResult.messageId}`);
    if (textResult.error) console.log(`   ❌ Error: ${textResult.error}`);
    console.log();

    // Test 3: HTML Email
    console.log('3️⃣ Testing HTML Email...');
    const htmlContent = `
    <h1>HTML Email Test</h1>
    <p>This is an <strong>HTML email test</strong> from the VVG Pain Points platform.</p>
    <ul>
      <li>✅ HTML formatting is working</li>
      <li>🎨 Styles are being applied</li>
      <li>📧 Email service is functional</li>
    </ul>
    <p style="color: #3b82f6; font-weight: bold;">If you can see this styled text, HTML emails are working!</p>
    `;
    
    const htmlResult = await emailService.sendNotification(
      testRecipient,
      'Test: HTML Email',
      htmlContent,
      true
    );
    console.log(`   ${htmlResult.success ? '✅' : '❌'} HTML Email: ${htmlResult.success ? 'SENT' : 'FAILED'}`);
    if (htmlResult.messageId) console.log(`   📧 Message ID: ${htmlResult.messageId}`);
    if (htmlResult.error) console.log(`   ❌ Error: ${htmlResult.error}`);
    console.log();

    // Test 4: System Alert (Low Priority)
    console.log('4️⃣ Testing System Alert...');
    const alertResult = await emailService.sendSystemAlert(
      'Email System Test',
      'This is a test system alert to verify the email functionality. The system is working correctly!',
      'low'
    );
    console.log(`   ${alertResult.success ? '✅' : '❌'} System Alert: ${alertResult.success ? 'SENT' : 'FAILED'}`);
    if (alertResult.messageId) console.log(`   📧 Message ID: ${alertResult.messageId}`);
    if (alertResult.error) console.log(`   ❌ Error: ${alertResult.error}`);
    console.log();

    // Test 5: Critical System Alert
    console.log('5️⃣ Testing Critical System Alert...');
    const criticalResult = await emailService.sendSystemAlert(
      'Critical Test Alert',
      'This is a critical priority test alert. In production, this would indicate a serious system issue.',
      'critical'
    );
    console.log(`   ${criticalResult.success ? '✅' : '❌'} Critical Alert: ${criticalResult.success ? 'SENT' : 'FAILED'}`);
    if (criticalResult.messageId) console.log(`   📧 Message ID: ${criticalResult.messageId}`);
    if (criticalResult.error) console.log(`   ❌ Error: ${criticalResult.error}`);
    console.log();

    // Summary
    const results = [connectionResult, textResult.success, htmlResult.success, alertResult.success, criticalResult.success];
    const successCount = results.filter(Boolean).length;
    
    console.log('📊 TEST SUMMARY');
    console.log(`   Total Tests: ${results.length}`);
    console.log(`   Passed: ${successCount}`);
    console.log(`   Failed: ${results.length - successCount}`);
    console.log(`   Success Rate: ${Math.round((successCount / results.length) * 100)}%`);
    
    if (successCount === results.length) {
      console.log('\n🎉 All email tests passed! The email system is fully functional.');
    } else {
      console.log('\n⚠️  Some email tests failed. Check the errors above and verify your SMTP configuration.');
    }

  } catch (error) {
    console.error('❌ Email testing failed with error:', error);
    process.exit(1);
  }
}

// Run tests if script is executed directly
if (require.main === module) {
  testEmailService()
    .then(() => {
      console.log('\n✅ Email testing completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Email testing failed:', error);
      process.exit(1);
    });
}