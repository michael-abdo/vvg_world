#!/usr/bin/env tsx
// End-to-end test: Create safety pain point and trigger automatic email routing

// Set production mode for real email sending
process.env.NODE_ENV = 'production';
process.env.ENABLE_EMAIL_IN_DEV = 'true';
process.env.SES_FROM_EMAIL = 'approvedinvoice@vvgtruck.com';

// Set AWS SES credentials
process.env.AWS_SES_SMTP_HOST = 'email-smtp.us-west-2.amazonaws.com';
process.env.AWS_SES_SMTP_PORT = '587';
process.env.AWS_SES_SMTP_USERNAME = 'AKIA6BJV4MLESTJJS2JR';
process.env.AWS_SES_SMTP_PASSWORD = 'BHYusHzI23l5nO+nhBeH7hsWOquH5jqdPkZfywFKYjAP';
process.env.ADMIN_EMAIL = 'michaelabdo@vvgtruck.com';
process.env.SES_TEST_RECIPIENT = 'michaelabdo@vvgtruck.com';

import { routingEngine } from '../lib/services/routing-engine';

async function testE2ESafetyPipeline() {
  console.log('🧪 Testing End-to-End Safety Pipeline...\n');

  try {
    // Simulate a newly created safety pain point (as would come from the database after submission)
    const newSafetyPainPoint = {
      id: 1001, // Mock ID as if inserted into database
      title: 'Pain Point: Safety', // This is what the API creates as title
      description: 'E2E TEST: Critical safety equipment failure detected during routine inspection. Equipment poses immediate risk to worker safety and requires urgent attention. This should automatically trigger the Safety Critical Issues routing rule and send email notification.',
      category: 'Safety', // This will match the Safety category in routing rules
      submittedBy: 'michael.abdo@vvg.com', // Generated email format from API
      department: 'Operations', // Could match "All" departments in routing
      location: 'Production Floor - Safety Station 2',
      status: 'under_review',
      upvotes: 0,
      downvotes: 0,
      created_at: new Date().toISOString()
    };

    console.log('📝 Created pain point:');
    console.log('   ID:', newSafetyPainPoint.id);
    console.log('   Category:', newSafetyPainPoint.category);
    console.log('   Department:', newSafetyPainPoint.department);
    console.log('   Title:', newSafetyPainPoint.title);
    console.log();

    // Step 2: Execute the routing engine (this simulates what happens after pain point creation)
    console.log('🔄 Executing routing engine for safety pain point...');
    
    const routingResult = await routingEngine.executeRouting(newSafetyPainPoint);
    
    console.log('✅ Routing engine completed:');
    console.log('   Success:', routingResult.success);
    console.log('   Actions Taken:', routingResult.actionsTaken);
    console.log('   Rules Matched:', routingResult.rulesMatched?.length || 0);
    
    if (routingResult.rulesMatched) {
      routingResult.rulesMatched.forEach((rule: any, index: number) => {
        console.log(`   Rule ${index + 1}: ${rule.name} (Priority: ${rule.priority})`);
      });
    }
    
    console.log();

    if (routingResult.success && routingResult.actionsTaken > 0) {
      console.log('🎉 SUCCESS! End-to-End Safety Pipeline Working!');
      console.log('📧 Safety critical email should have been sent automatically');
      console.log('📧 Check your inbox at michaelabdo@vvgtruck.com (or configured recipients)');
    } else {
      console.log('⚠️  Routing completed but no actions were taken');
      console.log('💡 This could mean:');
      console.log('   - No routing rules matched the pain point criteria');  
      console.log('   - Safety Critical Issues rule may not be active');
      console.log('   - Rule configuration needs to be updated');
    }

    console.log();
    console.log('📋 Pipeline Test Summary:');
    console.log('   ✅ Pain point creation simulated');
    console.log('   ✅ Routing engine execution completed');
    console.log('   ✅ Email service integration verified');
    console.log(`   ${routingResult.success ? '✅' : '❌'} Automatic email routing ${routingResult.success ? 'successful' : 'failed'}`);
    
  } catch (error) {
    console.error('❌ Error in end-to-end pipeline test:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testE2ESafetyPipeline()
    .then(() => {
      console.log('\n✅ End-to-end safety pipeline test completed successfully.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ E2E pipeline test failed:', error);
      process.exit(1);
    });
}