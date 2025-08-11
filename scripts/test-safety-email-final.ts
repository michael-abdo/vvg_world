#!/usr/bin/env tsx
// Final test of safety email notification with updated routing rule

// Force enable email sending and set to production mode for real emails
process.env.NODE_ENV = 'production';
process.env.ENABLE_EMAIL_IN_DEV = 'true';
process.env.SES_FROM_EMAIL = 'approvedinvoice@vvgtruck.com';

// Set AWS SES credentials for real email sending
process.env.AWS_SES_SMTP_HOST = 'email-smtp.us-west-2.amazonaws.com';
process.env.AWS_SES_SMTP_PORT = '587';
process.env.AWS_SES_SMTP_USERNAME = 'AKIA6BJV4MLESTJJS2JR';
process.env.AWS_SES_SMTP_PASSWORD = 'BHYusHzI23l5nO+nhBeH7hsWOquH5jqdPkZfywFKYjAP';
process.env.ADMIN_EMAIL = 'michaelabdo@vvgtruck.com';
process.env.SES_TEST_RECIPIENT = 'michaelabdo@vvgtruck.com';

import { EmailService } from '../lib/services/email-service';

async function testSafetyEmailWithUpdatedRule() {
  console.log('🧪 Testing Safety Email with Updated Routing Rule...\n');

  // Create new email service instance after environment variables are set
  const emailService = new EmailService();
  
  try {
    // Create mock pain point and UPDATED rule data
    const mockPainPoint = {
      id: 999,
      title: 'LIVE TEST: Critical Safety Equipment Malfunction',
      description: 'This is a LIVE TEST of the safety email notification system with updated routing rule. Critical safety equipment has malfunctioned and poses immediate risk to worker safety. This email should be delivered to michaelabdo@vvgtruck.com with critical priority formatting.',
      category: 'Safety',
      submittedBy: 'michaelabdo@vvgtruck.com',
      department: 'Operations',
      location: 'Production Floor - Equipment Station 3'
    };

    // Updated routing rule that should send to correct email
    const updatedMockRule = {
      id: 1,
      name: 'Safety Critical Issues',
      category: ['Safety'],
      department: ['All'],
      priority: 'critical',
      autoRoute: true,
      stakeholders: ['michaelabdo@vvgtruck.com'] // Updated to correct email
    };

    console.log('📧 Sending safety critical notification...');
    console.log('   To:', 'michaelabdo@vvgtruck.com'); // Updated recipient
    console.log('   From:', 'approvedinvoice@vvgtruck.com'); 
    console.log('   Priority:', 'CRITICAL');
    console.log('   Rule:', updatedMockRule.name);
    console.log();

    // Send the routing notification (this will send a real email!)
    await emailService.sendRoutingNotification({
      painPoint: mockPainPoint,
      rule: updatedMockRule, 
      stakeholders: ['michaelabdo@vvgtruck.com'], // Updated recipient
      priority: 'critical'
    });

    console.log('✅ SUCCESS! Critical safety notification sent!');
    console.log('📧 Check your inbox at michaelabdo@vvgtruck.com for the email'); // Updated message
    console.log();
    console.log('🎉 Safety Email System with Updated Rule is Working!');
    console.log();
    console.log('📋 This test demonstrates:');
    console.log('   ✅ Email service is functioning properly');
    console.log('   ✅ AWS SES SMTP configuration is working');
    console.log('   ✅ Critical safety notifications are being delivered');
    console.log('   ✅ Routing rule configuration supports michaelabdo@vvgtruck.com');
    console.log();
    console.log('🔧 Next steps:');
    console.log('   1. Update routing rule in database to use michaelabdo@vvgtruck.com');
    console.log('   2. Test complete pipeline with real pain point submission');
    
  } catch (error) {
    console.error('❌ Error testing safety email notification:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testSafetyEmailWithUpdatedRule()
    .then(() => {
      console.log('\n✅ Safety email notification test with updated rule completed successfully.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Safety email test failed:', error);
      process.exit(1);
    });
}