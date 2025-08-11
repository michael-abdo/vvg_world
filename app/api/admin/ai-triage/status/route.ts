export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { 
  AITriageConfig,
  AITriageConfigRow,
  AITriageStatus,
  AITriageLog,
  APIResponse 
} from '@/lib/types/data-pipeline';

// Helper function to convert database row to API format
function formatAITriageConfig(row: AITriageConfigRow): AITriageConfig {
  return {
    id: row.id,
    enabled: row.enabled,
    scheduleCron: row.schedule_cron,
    lastRunAt: row.last_run_at ? row.last_run_at.toISOString() : null,
    nextRunAt: row.next_run_at ? row.next_run_at.toISOString() : null,
    itemsProcessedLastRun: row.items_processed_last_run,
    totalItemsProcessed: row.total_items_processed,
    settings: typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

// Function to calculate next run time based on cron expression
function calculateNextRunTime(cronExpression: string): Date | null {
  try {
    // For now, we'll implement simple Monday 9 AM logic
    // This could be enhanced with a proper cron parser library
    if (cronExpression === '0 9 * * 1') { // Monday 9 AM
      const now = new Date();
      const nextMonday = new Date(now);
      const daysUntilMonday = (1 + 7 - now.getDay()) % 7 || 7;
      nextMonday.setDate(now.getDate() + daysUntilMonday);
      nextMonday.setHours(9, 0, 0, 0);
      
      // If today is Monday and it's before 9 AM, use today
      if (now.getDay() === 1 && now.getHours() < 9) {
        nextMonday.setDate(now.getDate());
      }
      
      return nextMonday;
    }
    return null;
  } catch (error) {
    console.error('Error calculating next run time:', error);
    return null;
  }
}

// GET /api/admin/ai-triage/status - Get AI triage status and metrics
export async function GET(request: NextRequest) {
  try {
    // Fetch AI triage configuration
    const configRows = await executeQuery<AITriageConfigRow[]>({
      query: 'SELECT * FROM ai_triage_config ORDER BY id DESC LIMIT 1'
    });

    if (configRows.length === 0) {
      const response: APIResponse = {
        success: false,
        error: {
          code: 'AI_TRIAGE_CONFIG_NOT_FOUND',
          message: 'AI triage configuration not found'
        },
        timestamp: new Date().toISOString()
      };
      return NextResponse.json(response, { status: 404 });
    }

    const config = formatAITriageConfig(configRows[0]);

    // Calculate next run time if not set
    let nextRunAt = config.nextRunAt;
    if (!nextRunAt) {
      const nextRun = calculateNextRunTime(config.scheduleCron);
      if (nextRun) {
        nextRunAt = nextRun.toISOString();
        
        // Update the database with calculated next run time
        await executeQuery({
          query: 'UPDATE ai_triage_config SET next_run_at = ? WHERE id = ?',
          values: [nextRun, config.id]
        });
      }
    }

    // Fetch recent AI triage logs
    const recentLogs = await executeQuery<any[]>({
      query: `SELECT 
        id, run_id, started_at, completed_at, items_processed,
        items_routed, items_flagged, success, error_message,
        processing_summary, created_at
      FROM ai_triage_logs 
      ORDER BY created_at DESC 
      LIMIT 5`
    });

    // Get count of pending pain points (not yet processed by AI)
    const pendingItemsResult = await executeQuery<{count: number}[]>({
      query: `SELECT COUNT(*) as count 
      FROM pain_points p
      WHERE NOT EXISTS (
        SELECT 1 FROM routing_rule_logs rrl 
        WHERE rrl.pain_point_id = p.id
      )
      AND p.created_at > COALESCE(
        (SELECT last_run_at FROM ai_triage_config ORDER BY id DESC LIMIT 1),
        '2024-01-01'
      )`
    });

    const pendingItems = pendingItemsResult[0]?.count || 0;

    // Check if a triage is currently running (last log started but not completed)
    const runningTriageResult = await executeQuery<any[]>({
      query: `SELECT id FROM ai_triage_logs 
      WHERE started_at IS NOT NULL 
      AND completed_at IS NULL 
      ORDER BY started_at DESC 
      LIMIT 1`
    });

    const isRunning = runningTriageResult.length > 0;

    // Prepare last run information
    let lastRun = null;
    if (recentLogs.length > 0 && recentLogs[0].completed_at) {
      lastRun = {
        completedAt: recentLogs[0].completed_at.toISOString(),
        itemsProcessed: recentLogs[0].items_processed,
        success: recentLogs[0].success
      };
    }

    // Prepare response
    const aiTriageStatus: AITriageStatus = {
      config: {
        ...config,
        nextRunAt
      },
      isRunning,
      lastRun,
      nextRun: {
        scheduledAt: nextRunAt,
        pendingItems
      },
      recentLogs: recentLogs.map(log => ({
        id: log.id,
        runId: log.run_id,
        startedAt: log.started_at.toISOString(),
        completedAt: log.completed_at ? log.completed_at.toISOString() : null,
        itemsProcessed: log.items_processed,
        itemsRouted: log.items_routed,
        itemsFlagged: log.items_flagged,
        success: log.success,
        errorMessage: log.error_message,
        processingSummary: log.processing_summary ? 
          (typeof log.processing_summary === 'string' ? JSON.parse(log.processing_summary) : log.processing_summary) : null,
        createdAt: log.created_at.toISOString()
      }))
    };

    const response: APIResponse<AITriageStatus> = {
      success: true,
      data: aiTriageStatus,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error fetching AI triage status:', error);
    
    const response: APIResponse = {
      success: false,
      error: {
        code: 'FETCH_AI_TRIAGE_STATUS_ERROR',
        message: 'Failed to fetch AI triage status',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response, { status: 500 });
  }
}