export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { 
  AITriageConfig,
  AITriageConfigRow,
  UpdateAITriageConfigRequest,
  APIResponse 
} from '@/lib/types/data-pipeline';
import { z } from 'zod';

// Validation schema
const UpdateAITriageConfigSchema = z.object({
  enabled: z.boolean().optional(),
  scheduleCron: z.string().regex(/^(\*|[0-5]?\d) (\*|[01]?\d|2[0-3]) (\*|[12]?\d|3[01]) (\*|1[0-2]|\d) (\*|[0-6])$/, "Invalid cron expression").optional(),
  settings: z.object({
    batchSize: z.number().int().min(1).max(1000).optional(),
    notifyAdmins: z.boolean().optional(),
    adminEmails: z.array(z.string().email()).optional(),
    processingTimeoutMinutes: z.number().int().min(1).max(180).optional()
  }).optional()
});

// Helper function to convert database row to API format
function formatAITriageConfig(row: any): AITriageConfig {
  return {
    id: row.id,
    enabled: row.enabled,
    scheduleCron: row.schedule_cron,
    lastRunAt: row.last_run_at ? row.last_run_at.toISOString() : null,
    nextRunAt: row.next_run_at ? row.next_run_at.toISOString() : null,
    itemsProcessedLastRun: row.items_processed_last_run || 0,
    totalItemsProcessed: row.total_items_processed || 0, // Default to 0 if field doesn't exist
    settings: typeof row.settings === 'string' && row.settings ? JSON.parse(row.settings) : (row.settings || {}),
    createdAt: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? row.updated_at.toISOString() : new Date().toISOString()
  };
}

// Function to calculate next run time based on cron expression
function calculateNextRunTime(cronExpression: string): Date | null {
  try {
    // Simple implementation for Monday 9 AM
    if (cronExpression === '0 9 * * 1') {
      const now = new Date();
      const nextMonday = new Date(now);
      const daysUntilMonday = (1 + 7 - now.getDay()) % 7 || 7;
      nextMonday.setDate(now.getDate() + daysUntilMonday);
      nextMonday.setHours(9, 0, 0, 0);
      
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

// PUT /api/admin/ai-triage/settings - Update AI triage configuration
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validationResult = UpdateAITriageConfigSchema.safeParse(body);
    if (!validationResult.success) {
      const response: APIResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid AI triage configuration data',
          details: validationResult.error.issues
        },
        timestamp: new Date().toISOString()
      };
      return NextResponse.json(response, { status: 400 });
    }

    const updateData = validationResult.data;

    // Get current configuration
    const currentConfigResult = await executeQuery<any[]>({
      query: 'SELECT * FROM ai_triage_config ORDER BY id DESC LIMIT 1'
    });

    if (currentConfigResult.length === 0) {
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

    const currentConfig = currentConfigResult[0];
    const configId = currentConfig.id;

    // Build dynamic update query
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (updateData.enabled !== undefined) {
      updateFields.push('enabled = ?');
      updateValues.push(updateData.enabled);
    }

    if (updateData.scheduleCron !== undefined) {
      updateFields.push('schedule_cron = ?');
      updateValues.push(updateData.scheduleCron);
      
      // Calculate and set new next run time
      const nextRunTime = calculateNextRunTime(updateData.scheduleCron);
      if (nextRunTime) {
        updateFields.push('next_run_at = ?');
        updateValues.push(nextRunTime);
      }
    }

    if (updateData.settings !== undefined) {
      // Merge with existing settings
      const currentSettings = typeof currentConfig.settings === 'string' 
        ? JSON.parse(currentConfig.settings) 
        : currentConfig.settings || {};
      
      const newSettings = {
        ...currentSettings,
        ...updateData.settings
      };

      updateFields.push('settings = ?');
      updateValues.push(JSON.stringify(newSettings));
    }

    if (updateFields.length === 0) {
      const response: APIResponse = {
        success: false,
        error: {
          code: 'NO_UPDATES_PROVIDED',
          message: 'No valid update fields provided'
        },
        timestamp: new Date().toISOString()
      };
      return NextResponse.json(response, { status: 400 });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(configId);

    const updateQuery = `
      UPDATE ai_triage_config 
      SET ${updateFields.join(', ')} 
      WHERE id = ?
    `;

    await executeQuery({ query: updateQuery, values: updateValues });

    // Fetch the updated configuration
    const updatedConfigResult = await executeQuery<any[]>({
      query: 'SELECT * FROM ai_triage_config WHERE id = ?',
      values: [configId]
    });

    const response: APIResponse<AITriageConfig> = {
      success: true,
      data: formatAITriageConfig(updatedConfigResult[0]),
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error updating AI triage settings:', error);
    
    const response: APIResponse = {
      success: false,
      error: {
        code: 'UPDATE_AI_TRIAGE_SETTINGS_ERROR',
        message: 'Failed to update AI triage settings',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// GET /api/admin/ai-triage/settings - Get current AI triage configuration
export async function GET(request: NextRequest) {
  try {
    // Fetch AI triage configuration
    const configResult = await executeQuery<any[]>({
      query: 'SELECT * FROM ai_triage_config ORDER BY id DESC LIMIT 1'
    });

    if (configResult.length === 0) {
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

    // Debug: log the raw database result
    console.log('Raw AI triage config from DB:', JSON.stringify(configResult[0], null, 2));

    const config = formatAITriageConfig(configResult[0]);

    const response: APIResponse<AITriageConfig> = {
      success: true,
      data: config,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error fetching AI triage settings:', error);
    
    const response: APIResponse = {
      success: false,
      error: {
        code: 'FETCH_AI_TRIAGE_SETTINGS_ERROR',
        message: 'Failed to fetch AI triage settings',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response, { status: 500 });
  }
}