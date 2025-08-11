#!/usr/bin/env tsx
// Test the complete safety email notification without database dependency

// Force enable email sending in development
process.env.ENABLE_EMAIL_IN_DEV = 'true';
process.env.SES_FROM_EMAIL = 'approvedinvoice@vvgtruck.com';

import { emailService } from '../lib/services/email-service';

async function testSafetyEmailNotification() {
  console.log('🧪 Testing Safety Critical Email Notification...\n');

  try {
    // Create mock pain point and rule data (as would come from database)
    const mockPainPoint = {
      id: 999,
      title: 'LIVE TEST: Critical Safety Equipment Malfunction',
      description: 'This is a LIVE TEST of the complete safety email notification system. A critical piece of safety equipment has malfunctioned and poses immediate risk to worker safety. This email should be delivered to michaelabdo@vvg.com with critical priority formatting.',
      category: 'Safety',
      submittedBy: 'michaelabdo@vvg.com',
      department: 'Operations',
      location: 'Production Floor - Equipment Station 3'
    };

    const mockRule = {
      id: 1,
      name: 'Safety Critical Issues',
      category: ['Safety'],
      department: ['All'],
      priority: 'critical',
      autoRoute: true,
      stakeholders: ['michaelabdo@vvg.com']
    };

    console.log('📧 Sending safety critical notification...');
    console.log('   To:', 'michaelabdo@vvg.com');
    console.log('   From:', 'approvedinvoice@vvgtruck.com'); 
    console.log('   Priority:', 'CRITICAL');
    console.log('   Rule:', mockRule.name);
    console.log();

    // Send the routing notification (this will send a real email!)
    await emailService.sendRoutingNotification({
      painPoint: mockPainPoint,
      rule: mockRule, 
      stakeholders: ['michaelabdo@vvg.com'],
      priority: 'critical'
    });

    console.log('✅ SUCCESS! Critical safety notification sent!');
    console.log('📧 Check your inbox at michaelabdo@vvg.com for the email');
    console.log();
    console.log('🎉 Complete Email Notification System is Working!');
    
  } catch (error) {
    console.error('❌ Error testing safety email notification:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testSafetyEmailNotification()
    .then(() => {
      console.log('\n✅ Safety email notification test completed successfully.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Safety email test failed:', error);
      process.exit(1);
    });
}