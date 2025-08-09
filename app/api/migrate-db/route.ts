export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function POST() {
  // Development-only endpoint
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    // Read and execute migration file
    const migrationPath = path.join(process.cwd(), 'database/migrations/001_create_pain_points_schema.sql');
    
    if (!fs.existsSync(migrationPath)) {
      return NextResponse.json({ 
        success: false,
        error: 'Migration file not found',
        path: migrationPath
      }, { status: 404 });
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by semicolon and filter empty statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    const results = [];
    
    for (const statement of statements) {
      try {
        const result = await query(statement);
        results.push({
          statement: statement.substring(0, 50) + '...',
          success: true,
          result
        });
      } catch (error) {
        results.push({
          statement: statement.substring(0, 50) + '...',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      operation: 'db.migrate',
      message: 'Pain points database migration executed',
      statementsExecuted: statements.length,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}