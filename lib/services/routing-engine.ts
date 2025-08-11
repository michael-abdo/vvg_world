// Routing Engine Service
// Handles matching pain points to routing rules and triggering actions

import { executeQuery } from '@/lib/db';
import { 
  RoutingRule, 
  RoutingRuleRow, 
  RoutingEngineResult, 
  RoutingAction,
  PriorityLevel 
} from '@/lib/types/data-pipeline';

// Helper function to convert database row to API format
function formatRoutingRule(row: RoutingRuleRow): RoutingRule {
  return {
    id: row.id,
    name: row.name,
    category: typeof row.category === 'string' ? JSON.parse(row.category) : row.category,
    department: typeof row.department === 'string' ? JSON.parse(row.department) : row.department,
    stakeholders: typeof row.stakeholders === 'string' ? JSON.parse(row.stakeholders) : row.stakeholders,
    priority: row.priority,
    autoRoute: row.auto_route,
    active: row.active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

// Interface for pain point data
interface PainPointData {
  id: number;
  title: string;
  description: string;
  category: string;
  submittedBy: string;
  department?: string;
  location?: string;
}

// Core routing engine class
export class RoutingEngine {
  
  // Find all active routing rules that match a pain point
  async findMatchingRules(painPoint: PainPointData): Promise<RoutingRule[]> {
    try {
      // Get all active routing rules
      const rulesQuery = `
        SELECT 
          id, name, category, department, stakeholders, priority, 
          auto_route, active, created_at, updated_at
        FROM routing_rules 
        WHERE active = true 
        ORDER BY priority DESC, created_at ASC
      `;

      const ruleRows = await executeQuery<RoutingRuleRow[]>({ query: rulesQuery, values: [] });
      const allRules = ruleRows.map(formatRoutingRule);

      // Filter rules that match the pain point
      const matchingRules = allRules.filter(rule => this.doesRuleMatch(rule, painPoint));

      return matchingRules;

    } catch (error) {
      console.error('Error finding matching rules:', error);
      throw new Error(`Failed to find matching routing rules: ${error}`);
    }
  }

  // Check if a specific rule matches a pain point
  private doesRuleMatch(rule: RoutingRule, painPoint: PainPointData): boolean {
    // Handle category matching - rule.category is now an array
    const categories = Array.isArray(rule.category) ? rule.category : [rule.category];
    const categoryMatches = 
      categories.some(cat => cat.toLowerCase() === 'all') || 
      categories.some(cat => cat.toLowerCase() === painPoint.category.toLowerCase());

    // Handle department matching - rule.department is now an array
    const departments = Array.isArray(rule.department) ? rule.department : [rule.department];
    let departmentMatches = true;
    if (!departments.some(dept => dept.toLowerCase() === 'all') && painPoint.department) {
      departmentMatches = departments.some(dept => dept.toLowerCase() === painPoint.department.toLowerCase());
    }

    return categoryMatches && departmentMatches;
  }

  // Process a pain point through the routing engine
  async processRouting(painPoint: PainPointData): Promise<RoutingEngineResult> {
    const startTime = Date.now();

    try {
      // Find matching rules
      const matchedRules = await this.findMatchingRules(painPoint);

      // Generate actions for each matching rule
      const actionsToTake: RoutingAction[] = [];

      for (const rule of matchedRules) {
        if (rule.autoRoute && rule.stakeholders.length > 0) {
          actionsToTake.push({
            ruleId: rule.id,
            actionType: 'email',
            target: rule.stakeholders,
            priority: rule.priority,
            metadata: {
              ruleName: rule.name,
              category: rule.category,
              department: rule.department,
              fullRule: rule  // Add the full rule object for email service
            }
          });
        }
      }

      const processingTimeMs = Date.now() - startTime;

      const result: RoutingEngineResult = {
        painPointId: painPoint.id,
        matchedRules,
        actionsToTake,
        processingTimeMs
      };

      return result;

    } catch (error) {
      console.error('Error processing routing:', error);
      throw new Error(`Failed to process routing for pain point ${painPoint.id}: ${error}`);
    }
  }

  // Execute routing actions and log the results
  async executeRouting(painPoint: PainPointData): Promise<{success: boolean, actionsTaken: number}> {
    try {
      const routingResult = await this.processRouting(painPoint);

      let actionsTaken = 0;

      // Execute each action
      for (const action of routingResult.actionsToTake) {
        try {
          await this.executeAction(action, painPoint);
          
          // Log successful routing
          await this.logRoutingAction(
            action.ruleId,
            painPoint.id,
            action.actionType,
            action.target,
            action.priority,
            true,
            null,
            routingResult.processingTimeMs
          );

          actionsTaken++;

        } catch (actionError) {
          console.error(`Failed to execute action for rule ${action.ruleId}:`, actionError);
          
          // Log failed routing
          await this.logRoutingAction(
            action.ruleId,
            painPoint.id,
            action.actionType,
            action.target,
            action.priority,
            false,
            actionError instanceof Error ? actionError.message : 'Unknown error',
            routingResult.processingTimeMs
          );
        }
      }

      return { success: true, actionsTaken };

    } catch (error) {
      console.error('Error executing routing:', error);
      return { success: false, actionsTaken: 0 };
    }
  }

  // Execute a specific routing action
  private async executeAction(action: RoutingAction, painPoint: PainPointData): Promise<void> {
    switch (action.actionType) {
      case 'email':
        // Import and use email service
        const { EmailService } = await import('./email-service');
        const emailService = new EmailService();
        
        const emails = Array.isArray(action.target) ? action.target : [action.target];
        await emailService.sendRoutingNotification({
          painPoint: painPoint,
          rule: action.metadata.fullRule,
          stakeholders: emails,
          priority: action.metadata.fullRule.priority
        });
        break;

      case 'flag':
        // Could implement flagging logic here
        console.log(`Flagging pain point ${painPoint.id} for review`);
        break;

      case 'escalate':
        // Could implement escalation logic here
        console.log(`Escalating pain point ${painPoint.id} to ${action.target}`);
        break;

      default:
        console.log(`Unknown action type: ${action.actionType}`);
    }
  }

  // Log a routing action to the database
  private async logRoutingAction(
    ruleId: number,
    painPointId: number,
    actionTaken: string,
    target: string | string[],
    priority: PriorityLevel,
    success: boolean,
    errorMessage: string | null,
    processingTimeMs: number | null
  ): Promise<void> {
    try {
      const stakeholdersNotified = Array.isArray(target) ? target : [target];

      await executeQuery({
        query: `
          INSERT INTO routing_rule_logs (
            rule_id, pain_point_id, action_taken, stakeholders_notified, 
            priority_assigned, success, error_message, processing_time_ms
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        values: [
          ruleId,
          painPointId,
          actionTaken,
          JSON.stringify(stakeholdersNotified),
          priority,
          success,
          errorMessage,
          processingTimeMs
        ]
      });

    } catch (error) {
      console.error('Failed to log routing action:', error);
      // Don't throw here as it would prevent the main routing from completing
    }
  }

  // Get routing statistics for a specific time period
  async getRoutingStats(days: number = 30): Promise<{
    totalRulesTriggered: number;
    successfulActions: number;
    failedActions: number;
    averageProcessingTime: number;
    topCategories: Array<{category: string, count: number}>;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // Get total stats
      const statsResult = await executeQuery<any[]>(`
        SELECT 
          COUNT(*) as total_rules_triggered,
          SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as successful_actions,
          SUM(CASE WHEN success = false THEN 1 ELSE 0 END) as failed_actions,
          AVG(processing_time_ms) as avg_processing_time
        FROM routing_rule_logs 
        WHERE created_at >= ?
      `, [cutoffDate]);

      // Get top categories
      const categoriesResult = await executeQuery<any[]>(`
        SELECT 
          rr.category,
          COUNT(*) as count
        FROM routing_rule_logs rrl
        JOIN routing_rules rr ON rrl.rule_id = rr.id
        WHERE rrl.created_at >= ?
        GROUP BY rr.category
        ORDER BY count DESC
        LIMIT 5
      `, [cutoffDate]);

      const stats = statsResult[0] || {};

      return {
        totalRulesTriggered: stats.total_rules_triggered || 0,
        successfulActions: stats.successful_actions || 0,
        failedActions: stats.failed_actions || 0,
        averageProcessingTime: Math.round(stats.avg_processing_time || 0),
        topCategories: categoriesResult.map(row => ({
          category: row.category,
          count: row.count
        }))
      };

    } catch (error) {
      console.error('Error getting routing stats:', error);
      throw new Error(`Failed to get routing statistics: ${error}`);
    }
  }
}

// Export a singleton instance
export const routingEngine = new RoutingEngine();