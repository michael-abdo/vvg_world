export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { 
  RoutingRule, 
  RoutingRuleRow, 
  UpdateRoutingRuleRequest,
  APIResponse 
} from '@/lib/types/data-pipeline';
import { z } from 'zod';

// Validation schema
const UpdateRoutingRuleSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  category: z.string().min(1).max(100).optional(),
  department: z.string().min(1).max(100).optional(),
  stakeholders: z.array(z.string().email()).min(1).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  autoRoute: z.boolean().optional(),
  active: z.boolean().optional()
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

// PUT /api/admin/routing-rules/[id] - Update routing rule
export async function PUT(
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
    const validationResult = UpdateRoutingRuleSchema.safeParse(body);
    if (!validationResult.success) {
      const response: APIResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid routing rule data',
          details: validationResult.error.issues
        },
        timestamp: new Date().toISOString()
      };
      return NextResponse.json(response, { status: 400 });
    }

    const data = validationResult.data;

    // Check if routing rule exists
    const existingRule = await executeQuery<RoutingRuleRow[]>({
      query: 'SELECT id FROM routing_rules WHERE id = ?',
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

    // Check for duplicate name if name is being updated
    if (data.name) {
      const duplicateCheck = await executeQuery<RoutingRuleRow[]>({
        query: 'SELECT id FROM routing_rules WHERE name = ? AND id != ?',
        values: [data.name, ruleId]
      });

      if (duplicateCheck.length > 0) {
        const response: APIResponse = {
          success: false,
          error: {
            code: 'DUPLICATE_RULE_NAME',
            message: 'A routing rule with this name already exists'
          },
          timestamp: new Date().toISOString()
        };
        return NextResponse.json(response, { status: 409 });
      }
    }

    // Build dynamic update query
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        switch (key) {
          case 'autoRoute':
            updateFields.push('auto_route = ?');
            updateValues.push(value);
            break;
          case 'stakeholders':
            updateFields.push('stakeholders = ?');
            updateValues.push(JSON.stringify(value));
            break;
          default:
            updateFields.push(`${key} = ?`);
            updateValues.push(value);
        }
      }
    });

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

    updateValues.push(ruleId);

    const updateQuery = `
      UPDATE routing_rules 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;

    await executeQuery({ query: updateQuery, values: updateValues });

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
    console.error('Error updating routing rule:', error);
    
    const response: APIResponse = {
      success: false,
      error: {
        code: 'UPDATE_ROUTING_RULE_ERROR',
        message: 'Failed to update routing rule',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// DELETE /api/admin/routing-rules/[id] - Delete routing rule
export async function DELETE(
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

    // Check if routing rule exists
    const existingRule = await executeQuery<RoutingRuleRow[]>({
      query: 'SELECT id, name FROM routing_rules WHERE id = ?',
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

    // Delete the routing rule (logs will be cascade deleted)
    await executeQuery({ query: 'DELETE FROM routing_rules WHERE id = ?', values: [ruleId] });

    const response: APIResponse = {
      success: true,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error deleting routing rule:', error);
    
    const response: APIResponse = {
      success: false,
      error: {
        code: 'DELETE_ROUTING_RULE_ERROR',
        message: 'Failed to delete routing rule',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response, { status: 500 });
  }
}