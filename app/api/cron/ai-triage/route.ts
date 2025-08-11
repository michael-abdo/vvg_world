/**
 * Cron endpoint for AI Weekly Triage
 * 
 * This endpoint is designed to be called by Linux Cron Jobs (EC2)
 * to trigger the AI triage process on a schedule.
 * 
 * Schedule: Every Monday at 9:00 AM (0 9 * * 1)
 * Authentication: Bearer token using CRON_SECRET environment variable
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

export const dynamic = "force-dynamic";

// Linux Cron Job handler (EC2 compatible)
export async function GET(request: NextRequest) {
  try {
    // Verify the request is from authorized cron job
    const authHeader = headers().get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
    
    if (authHeader !== expectedAuth) {
      // In development, allow requests without auth for testing
      if (process.env.NODE_ENV === 'production') {
        console.error('Unauthorized cron request:', { 
          provided: authHeader ? 'Bearer [REDACTED]' : 'none',
          expected: 'Bearer [REDACTED]'
        });
        return NextResponse.json(
          { error: 'Unauthorized - Invalid or missing CRON_SECRET' },
          { status: 401 }
        );
      } else {
        console.warn('Development mode: Allowing cron request without proper authentication');
      }
    }

    // Get the base URL - prefer API_URL for cron jobs, fallback to NEXTAUTH_URL or request host
    const baseUrl = process.env.API_URL || 
                   process.env.NEXTAUTH_URL || 
                   `http://localhost:${process.env.PORT || 3000}`;
    
    console.log('AI Triage cron triggered:', {
      baseUrl,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });

    // Call the AI triage trigger endpoint
    const triggerResponse = await fetch(`${baseUrl}/api/admin/ai-triage/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Pass internal auth token if needed
        'Authorization': `Bearer ${process.env.INTERNAL_API_SECRET || 'dev-secret'}`,
      },
      body: JSON.stringify({
        force: false,
        batchSize: 50, // Process 50 items per run
      }),
    });

    if (!triggerResponse.ok) {
      const errorData = await triggerResponse.json();
      console.error('AI Triage trigger failed:', errorData);
      
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to trigger AI triage',
          details: errorData 
        },
        { status: triggerResponse.status }
      );
    }

    const result = await triggerResponse.json();
    
    console.log('AI Triage cron job completed successfully:', {
      runId: result.data?.runId,
      itemsProcessed: result.data?.itemsProcessed,
      itemsRouted: result.data?.itemsRouted,
      itemsFlagged: result.data?.itemsFlagged,
      executionTime: result.data?.executionTime,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'AI Triage cron job executed successfully',
      result: {
        itemsProcessed: result.data?.itemsProcessed || 0,
        itemsRouted: result.data?.itemsRouted || 0,
        itemsFlagged: result.data?.itemsFlagged || 0,
        runId: result.data?.runId,
        executionTime: result.data?.executionTime
      },
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });

  } catch (error) {
    console.error('AI Triage cron job error:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error during cron execution',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Check server logs for details',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual testing
export async function POST(request: NextRequest) {
  return GET(request);
}