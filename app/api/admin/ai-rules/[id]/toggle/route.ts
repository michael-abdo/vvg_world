export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { 
  AIRule, 
  AIRuleRow, 
  APIResponse 
} from '@/lib/types/data-pipeline';
import { z } from 'zod';

// Validation schema
const ToggleAIRuleSchema = z.object({
  active: z.boolean()
});

// Helper function to convert database row to API format
function formatAIRule(row: AIRuleRow): AIRule {
  return {
    id: row.id,
    name: row.name,
    triggerType: row.trigger_type,
    triggerDetails: row.trigger_details,
    actionType: row.action_type,
    actionTarget: row.action_target,
    priority: row.priority,
    active: row.active,
    lastTriggeredAt: row.last_triggered_at ? row.last_triggered_at.toISOString() : null,
    triggerCount: row.trigger_count,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

// PATCH /api/admin/ai-rules/[id]/toggle - Toggle AI rule active state
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      const response: APIResponse = {
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid AI rule ID'
        },
        timestamp: new Date().toISOString()
      };
      return NextResponse.json(response, { status: 400 });
    }

    const body = await request.json();
    
    // Validate request body
    const validationResult = ToggleAIRuleSchema.safeParse(body);
    if (!validationResult.success) {
      const response: APIResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid toggle data',
          details: validationResult.error.issues
        },
        timestamp: new Date().toISOString()
      };
      return NextResponse.json(response, { status: 400 });
    }

    const { active } = validationResult.data;

    // Check if rule exists
    const existingRule = await executeQuery<AIRuleRow[]>({
      query: 'SELECT id FROM ai_rules WHERE id = ?',
      values: [id]
    });

    if (existingRule.length === 0) {
      const response: APIResponse = {
        success: false,
        error: {
          code: 'AI_RULE_NOT_FOUND',
          message: 'AI rule not found'
        },
        timestamp: new Date().toISOString()
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Update the active state
    await executeQuery({
      query: 'UPDATE ai_rules SET active = ? WHERE id = ?',
      values: [active, id]
    });

    // Fetch the updated rule
    const updatedRule = await executeQuery<AIRuleRow[]>({
      query: `SELECT 
        id, name, trigger_type, trigger_details, action_type, action_target, 
        priority, active, last_triggered_at, trigger_count, created_at, updated_at
      FROM ai_rules 
      WHERE id = ?`,
      values: [id]
    });

    const response: APIResponse<AIRule> = {
      success: true,
      data: formatAIRule(updatedRule[0]),
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error toggling AI rule:', error);
    
    const response: APIResponse = {
      success: false,
      error: {
        code: 'TOGGLE_AI_RULE_ERROR',
        message: 'Failed to toggle AI rule',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response, { status: 500 });
  }
}