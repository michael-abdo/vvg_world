#!/usr/bin/env tsx
// Test complete pipeline: Update routing rule and create safety ticket

// Force enable email sending in development
process.env.ENABLE_EMAIL_IN_DEV = 'true';
process.env.SES_FROM_EMAIL = 'approvedinvoice@vvgtruck.com';

// Set production database credentials
process.env.MYSQL_HOST = 'vtcawsinnovationmysql01-cluster.cluster-c1hfshlb6czo.us-west-2.rds.amazonaws.com';
process.env.MYSQL_PORT = '3306';
process.env.MYSQL_USER = 'michael';
process.env.MYSQL_PASSWORD = 'Ei#qs9T!px@Wso';
process.env.MYSQL_DATABASE = 'vvg_world';

import { routingEngine } from '../lib/services/routing-engine';
import { executeQuery } from '../lib/db';

async function testCompletePipeline() {
  console.log('🧪 Testing Complete Safety Pipeline...\n');

  try {
    // Step 1: Update the routing rule to correct email
    console.log('🔄 Step 1: Updating Safety Critical Issues routing rule...');
    
    const updateQuery = `
      UPDATE routing_rules 
      SET stakeholders = ? 
      WHERE name = 'Safety Critical Issues'
    `;
    
    await executeQuery({ 
      query: updateQuery, 
      values: [JSON.stringify(['michaelabdo@vvgtruck.com'])] 
    });
    
    console.log('✅ Routing rule updated to send to michaelabdo@vvgtruck.com');

    // Step 2: Verify the update
    const verifyQuery = 'SELECT * FROM routing_rules WHERE name = "Safety Critical Issues"';
    const verifyResult = await executeQuery({ query: verifyQuery, values: [] });
    console.log('📋 Updated rule:', verifyResult);

    // Step 3: Create a new safety pain point
    console.log('\n🔄 Step 2: Creating safety critical pain point...');
    
    const insertPainPointQuery = `
      INSERT INTO pain_points (title, description, category, submitted_by, department, location, priority, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const [insertResult] = await executeQuery({ 
      query: insertPainPointQuery, 
      values: [
        'LIVE TEST: Critical Equipment Safety Failure',
        'This is a LIVE TEST of the complete safety pipeline. Critical safety equipment has failed inspection and poses immediate danger to workers. This should trigger email notification to michaelabdo@vvgtruck.com.',
        'Safety',
        'michaelabdo@vvgtruck.com',
        'Operations',
        'Production Floor - Safety Station 1',
        'critical',
        'open'
      ]
    });

    const painPointId = (insertResult as any).insertId;
    console.log('✅ Created pain point with ID:', painPointId);

    // Step 4: Get the created pain point for routing
    const getPainPointQuery = 'SELECT * FROM pain_points WHERE id = ?';
    const [painPointResult] = await executeQuery({ 
      query: getPainPointQuery, 
      values: [painPointId] 
    });
    
    const painPoint = Array.isArray(painPointResult) ? painPointResult[0] : painPointResult;

    // Step 5: Trigger the routing engine
    console.log('\n🔄 Step 3: Triggering routing engine for safety pain point...');
    
    const routingResult = await routingEngine.processNewPainPoint(painPoint);
    
    console.log('✅ Routing engine processed successfully');
    console.log('📧 Email notifications sent:', routingResult);

    console.log('\n🎉 Complete Pipeline Test Successful!');
    console.log('📧 Check your inbox at michaelabdo@vvgtruck.com for the safety critical email');
    
  } catch (error) {
    console.error('❌ Error in pipeline test:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testCompletePipeline()
    .then(() => {
      console.log('\n✅ Complete pipeline test completed successfully.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Pipeline test failed:', error);
      process.exit(1);
    });
}