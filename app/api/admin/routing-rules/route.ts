export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { 
  RoutingRule, 
  RoutingRuleRow, 
  CreateRoutingRuleRequest,
  APIResponse 
} from '@/lib/types/data-pipeline';
import { z } from 'zod';

// Validation schemas
const CreateRoutingRuleSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  category: z.string().min(1, "Category is required").max(100),
  department: z.string().min(1, "Department is required").max(100),
  stakeholders: z.array(z.string().email("Invalid email format")).min(1, "At least one stakeholder email is required"),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  autoRoute: z.boolean().default(true),
  active: z.boolean().default(true)
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

// GET /api/admin/routing-rules - Fetch all routing rules
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');
    const category = searchParams.get('category');
    const department = searchParams.get('department');

    let query = `
      SELECT 
        id, name, category, department, stakeholders, priority, 
        auto_route, active, created_at, updated_at
      FROM routing_rules
      WHERE 1=1
    `;
    const params: any[] = [];

    // Add filters
    if (active !== null) {
      query += ' AND active = ?';
      params.push(active === 'true');
    }

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (department) {
      query += ' AND department = ?';
      params.push(department);
    }

    query += ' ORDER BY created_at DESC';

    const rows = await executeQuery<RoutingRuleRow[]>({ query, values: params });
    const routingRules = rows.map(formatRoutingRule);

    const response: APIResponse<RoutingRule[]> = {
      success: true,
      data: routingRules,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error fetching routing rules:', error);
    
    const response: APIResponse = {
      success: false,
      error: {
        code: 'FETCH_ROUTING_RULES_ERROR',
        message: 'Failed to fetch routing rules',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// POST /api/admin/routing-rules - Create new routing rule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validationResult = CreateRoutingRuleSchema.safeParse(body);
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

    const data: CreateRoutingRuleRequest = validationResult.data;

    // Check for duplicate rule names
    const existingRule = await executeQuery<RoutingRuleRow[]>({
      query: 'SELECT id FROM routing_rules WHERE name = ?',
      values: [data.name]
    });

    if (existingRule.length > 0) {
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

    // Insert new routing rule
    const insertQuery = `
      INSERT INTO routing_rules (
        name, category, department, stakeholders, priority, auto_route, active
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await executeQuery({ query: insertQuery, values: [
      data.name,
      data.category,
      data.department,
      JSON.stringify(data.stakeholders),
      data.priority,
      data.autoRoute,
      data.active
    ] });

    // Fetch the created rule
    const createdRule = await executeQuery<RoutingRuleRow[]>({
      query: `SELECT 
        id, name, category, department, stakeholders, priority, 
        auto_route, active, created_at, updated_at
      FROM routing_rules 
      WHERE id = ?`,
      values: [(result as any).insertId]
    });

    const response: APIResponse<RoutingRule> = {
      success: true,
      data: formatRoutingRule(createdRule[0]),
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error: any) {
    console.error('Error creating routing rule:', error);
    
    const response: APIResponse = {
      success: false,
      error: {
        code: 'CREATE_ROUTING_RULE_ERROR',
        message: 'Failed to create routing rule',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response, { status: 500 });
  }
}