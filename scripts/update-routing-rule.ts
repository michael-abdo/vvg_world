#!/usr/bin/env tsx
// Update the Safety Critical Issues routing rule to send to correct email

import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function updateSafetyCriticalRule() {
  console.log('🔄 Updating Safety Critical Issues routing rule...\n');

  let connection;
  try {
    // Connect to database using production credentials from .env.local
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    });

    console.log('✅ Connected to database');

    // First, let's see the current rule
    const [currentRows] = await connection.execute(
      'SELECT * FROM routing_rules WHERE name LIKE "%Safety%" OR name LIKE "%Critical%"'
    );
    console.log('\n📋 Current Safety-related rules:');
    console.log(currentRows);

    // Update the Safety Critical Issues rule
    const [updateResult] = await connection.execute(
      `UPDATE routing_rules 
       SET stakeholders = ? 
       WHERE name = 'Safety Critical Issues'`,
      [JSON.stringify(['michaelabdo@vvgtruck.com'])]
    );

    console.log('\n🔄 Update result:', updateResult);

    // Verify the update
    const [updatedRows] = await connection.execute(
      'SELECT * FROM routing_rules WHERE name = "Safety Critical Issues"'
    );
    
    console.log('\n✅ Updated Safety Critical Issues rule:');
    console.log(updatedRows);

  } catch (error) {
    console.error('❌ Error updating routing rule:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the update
if (require.main === module) {
  updateSafetyCriticalRule()
    .then(() => {
      console.log('\n✅ Routing rule update completed successfully.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Routing rule update failed:', error);
      process.exit(1);
    });
}