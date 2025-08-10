export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { 
  AIRule, 
  AIRuleRow, 
  UpdateAIRuleRequest,
  APIResponse 
} from '@/lib/types/data-pipeline';
import { z } from 'zod';

// Validation schemas
const UpdateAIRuleSchema = z.object({
  name: z.string().min(1, "Name is required").max(255).optional(),
  triggerType: z.enum(['keywords', 'similarity', 'sentiment', 'length', 'custom']).optional(),
  triggerDetails: z.string().min(1, "Trigger details are required").optional(),
  actionType: z.enum(['escalate', 'tag', 'flag', 'hold', 'ignore', 'route']).optional(),
  actionTarget: z.string().min(1, "Action target is required").max(255).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  active: z.boolean().optional()
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

// GET /api/admin/ai-rules/[id] - Fetch specific AI rule
export async function GET(
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

    const rows = await executeQuery<AIRuleRow[]>({
      query: `SELECT 
        id, name, trigger_type, trigger_details, action_type, action_target, 
        priority, active, last_triggered_at, trigger_count, created_at, updated_at
      FROM ai_rules 
      WHERE id = ?`,
      values: [id]
    });

    if (rows.length === 0) {
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

    const response: APIResponse<AIRule> = {
      success: true,
      data: formatAIRule(rows[0]),
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error fetching AI rule:', error);
    
    const response: APIResponse = {
      success: false,
      error: {
        code: 'FETCH_AI_RULE_ERROR',
        message: 'Failed to fetch AI rule',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// PUT /api/admin/ai-rules/[id] - Update AI rule
export async function PUT(
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
    const validationResult = UpdateAIRuleSchema.safeParse(body);
    if (!validationResult.success) {
      const response: APIResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid AI rule data',
          details: validationResult.error.issues
        },
        timestamp: new Date().toISOString()
      };
      return NextResponse.json(response, { status: 400 });
    }

    const data = validationResult.data;

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

    // Check for duplicate names (excluding current rule)
    if (data.name) {
      const duplicateCheck = await executeQuery<AIRuleRow[]>({
        query: 'SELECT id FROM ai_rules WHERE name = ? AND id != ?',
        values: [data.name, id]
      });

      if (duplicateCheck.length > 0) {
        const response: APIResponse = {
          success: false,
          error: {
            code: 'DUPLICATE_RULE_NAME',
            message: 'An AI rule with this name already exists'
          },
          timestamp: new Date().toISOString()
        };
        return NextResponse.json(response, { status: 409 });
      }
    }

    // Build update query dynamically
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (data.name) {
      updateFields.push('name = ?');
      updateValues.push(data.name);
    }
    if (data.triggerType) {
      updateFields.push('trigger_type = ?');
      updateValues.push(data.triggerType);
    }
    if (data.triggerDetails) {
      updateFields.push('trigger_details = ?');
      updateValues.push(data.triggerDetails);
    }
    if (data.actionType) {
      updateFields.push('action_type = ?');
      updateValues.push(data.actionType);
    }
    if (data.actionTarget) {
      updateFields.push('action_target = ?');
      updateValues.push(data.actionTarget);
    }
    if (data.priority) {
      updateFields.push('priority = ?');
      updateValues.push(data.priority);
    }
    if (data.active !== undefined) {
      updateFields.push('active = ?');
      updateValues.push(data.active);
    }

    if (updateFields.length === 0) {
      const response: APIResponse = {
        success: false,
        error: {
          code: 'NO_UPDATE_DATA',
          message: 'No valid fields provided for update'
        },
        timestamp: new Date().toISOString()
      };
      return NextResponse.json(response, { status: 400 });
    }

    updateValues.push(id); // Add ID for WHERE clause

    const updateQuery = `
      UPDATE ai_rules 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    await executeQuery({ query: updateQuery, values: updateValues });

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
    console.error('Error updating AI rule:', error);
    
    const response: APIResponse = {
      success: false,
      error: {
        code: 'UPDATE_AI_RULE_ERROR',
        message: 'Failed to update AI rule',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// DELETE /api/admin/ai-rules/[id] - Delete AI rule
export async function DELETE(
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

    // Delete the rule
    await executeQuery({
      query: 'DELETE FROM ai_rules WHERE id = ?',
      values: [id]
    });

    const response: APIResponse = {
      success: true,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error deleting AI rule:', error);
    
    const response: APIResponse = {
      success: false,
      error: {
        code: 'DELETE_AI_RULE_ERROR',
        message: 'Failed to delete AI rule',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response, { status: 500 });
  }
}