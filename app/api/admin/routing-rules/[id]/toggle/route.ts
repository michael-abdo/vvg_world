export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { 
  RoutingRule, 
  RoutingRuleRow, 
  APIResponse 
} from '@/lib/types/data-pipeline';
import { z } from 'zod';

// Validation schema
const ToggleRoutingRuleSchema = z.object({
  active: z.boolean()
});

// Helper function to convert database row to API format
function formatRoutingRule(row: RoutingRuleRow): RoutingRule {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    department: row.department,
    stakeholders: typeof row.stakeholders === 'string' ? JSON.parse(row.stakeholders) : row.stakeholders,
    priority: row.priority,
    autoRoute: row.auto_route,
    active: row.active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

// PATCH /api/admin/routing-rules/[id]/toggle - Toggle routing rule active state
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ruleId = parseInt(params.id);
    if (isNaN(ruleId)) {
      const response: APIResponse = {
        success: false,
        error: {
          code: 'INVALID_RULE_ID',
          message: 'Invalid routing rule ID'
        },
        timestamp: new Date().toISOString()
      };
      return NextResponse.json(response, { status: 400 });
    }

    const body = await request.json();
    
    // Validate request body
    const validationResult = ToggleRoutingRuleSchema.safeParse(body);
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

    // Check if routing rule exists
    const existingRule = await executeQuery<RoutingRuleRow[]>({
      query: 'SELECT id, active FROM routing_rules WHERE id = ?',
      values: [ruleId]
    });

    if (existingRule.length === 0) {
      const response: APIResponse = {
        success: false,
        error: {
          code: 'ROUTING_RULE_NOT_FOUND',
          message: 'Routing rule not found'
        },
        timestamp: new Date().toISOString()
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Check if the state is already what we want
    if (existingRule[0].active === active) {
      const response: APIResponse = {
        success: false,
        error: {
          code: 'NO_CHANGE_REQUIRED',
          message: `Routing rule is already ${active ? 'active' : 'inactive'}`
        },
        timestamp: new Date().toISOString()
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Update the active state
    await executeQuery({
      query: 'UPDATE routing_rules SET active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      values: [active, ruleId]
    });

    // Fetch the updated rule
    const updatedRule = await executeQuery<RoutingRuleRow[]>({
      query: `SELECT 
        id, name, category, department, stakeholders, priority, 
        auto_route, active, created_at, updated_at
      FROM routing_rules 
      WHERE id = ?`,
      values: [ruleId]
    });

    const response: APIResponse<RoutingRule> = {
      success: true,
      data: formatRoutingRule(updatedRule[0]),
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error toggling routing rule:', error);
    
    const response: APIResponse = {
      success: false,
      error: {
        code: 'TOGGLE_ROUTING_RULE_ERROR',
        message: 'Failed to toggle routing rule',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response, { status: 500 });
  }
}