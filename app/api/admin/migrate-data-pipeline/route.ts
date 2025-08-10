export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { readFileSync } from 'fs';
import { join } from 'path';

// POST /api/admin/migrate-data-pipeline - Run data pipeline migration
export async function POST(request: NextRequest) {
  try {
    // Development-only endpoint
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    console.log('Running data pipeline migration...');
    
    // Read the migration file
    const migrationPath = join(process.cwd(), 'database', 'migrations', '003_create_data_pipeline_schema.sql');
    const sql = readFileSync(migrationPath, 'utf8');
    
    // Remove comments and split into statements
    const sqlWithoutComments = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');
    
    const statements = sqlWithoutComments
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`Found ${statements.length} SQL statements to execute`);

    const results = [];

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`Executing statement ${i + 1}/${statements.length}`);
        console.log(`SQL: ${statement.substring(0, 100)}...`);
        
        try {
          const result = await executeQuery({ query: statement });
          results.push({
            statement: i + 1,
            sql: statement.substring(0, 100) + '...',
            success: true,
            result: 'OK'
          });
          console.log(`✅ Statement ${i + 1} executed successfully`);
        } catch (error: any) {
          console.error(`❌ Statement ${i + 1} failed:`, error);
          results.push({
            statement: i + 1,
            sql: statement.substring(0, 100) + '...',
            success: false,
            error: error.message
          });
          
          // For certain errors, we might want to continue (like table already exists)
          if (!error.message.includes('already exists')) {
            break;
          }
        }
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      operation: 'data-pipeline.migrate',
      message: `Migration completed. ${successCount} statements succeeded, ${failureCount} failed.`,
      details: {
        totalStatements: statements.length,
        successCount,
        failureCount,
        results
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Migration failed:', error);
    
    return NextResponse.json({
      success: false,
      operation: 'data-pipeline.migrate',
      message: 'Migration failed',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}