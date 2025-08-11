export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { 
  AIRule, 
  AIRuleRow, 
  CreateAIRuleRequest,
  APIResponse,
  ActionType,
  PriorityLevel 
} from '@/lib/types/data-pipeline';
import { z } from 'zod';

// Validation schemas
const CreateAIRuleSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  triggerPrompt: z.string().min(10, "Trigger prompt must be at least 10 characters").max(1000, "Trigger prompt too long"),
  actionType: z.enum(['send_email', 'add_tag']),
  actionTarget: z.string().min(1, "Action target is required").max(255),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  active: z.boolean().default(true)
});

// Helper function to convert database row to API format
function formatAIRule(row: AIRuleRow): AIRule {
  return {
    id: row.id,
    name: row.name,
    triggerPrompt: row.trigger_prompt,
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

// GET /api/admin/ai-rules - Fetch all AI rules
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');
    const actionType = searchParams.get('actionType');

    let query = `
      SELECT 
        id, name, trigger_prompt, action_type, action_target, 
        priority, active, last_triggered_at, trigger_count, created_at, updated_at
      FROM ai_rules
      WHERE 1=1
    `;
    const params: any[] = [];

    // Add filters
    if (active !== null) {
      query += ' AND active = ?';
      params.push(active === 'true');
    }

    if (actionType) {
      query += ' AND action_type = ?';
      params.push(actionType);
    }

    query += ' ORDER BY created_at DESC';

    const rows = await executeQuery<AIRuleRow[]>({ query, values: params });
    const aiRules = rows.map(formatAIRule);

    const response: APIResponse<AIRule[]> = {
      success: true,
      data: aiRules,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error fetching AI rules:', error);
    
    const response: APIResponse = {
      success: false,
      error: {
        code: 'FETCH_AI_RULES_ERROR',
        message: 'Failed to fetch AI rules',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// POST /api/admin/ai-rules - Create new AI rule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validationResult = CreateAIRuleSchema.safeParse(body);
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

    const data: CreateAIRuleRequest = validationResult.data;

    // Check for duplicate rule names
    const existingRule = await executeQuery<AIRuleRow[]>({
      query: 'SELECT id FROM ai_rules WHERE name = ?',
      values: [data.name]
    });

    if (existingRule.length > 0) {
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

    // Insert new AI rule
    const insertQuery = `
      INSERT INTO ai_rules (
        name, trigger_prompt, action_type, action_target, priority, active
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    const result = await executeQuery({ query: insertQuery, values: [
      data.name,
      data.triggerPrompt,
      data.actionType,
      data.actionTarget,
      data.priority,
      data.active
    ] });

    // Fetch the created rule
    const createdRule = await executeQuery<AIRuleRow[]>({
      query: `SELECT 
        id, name, trigger_prompt, action_type, action_target, 
        priority, active, last_triggered_at, trigger_count, created_at, updated_at
      FROM ai_rules 
      WHERE id = ?`,
      values: [(result as any).insertId]
    });

    const response: APIResponse<AIRule> = {
      success: true,
      data: formatAIRule(createdRule[0]),
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error: any) {
    console.error('Error creating AI rule:', error);
    
    const response: APIResponse = {
      success: false,
      error: {
        code: 'CREATE_AI_RULE_ERROR',
        message: 'Failed to create AI rule',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response, { status: 500 });
  }
}