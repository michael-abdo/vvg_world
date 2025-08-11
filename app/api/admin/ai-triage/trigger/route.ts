export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { APIResponse } from '@/lib/types/data-pipeline';
import { z } from 'zod';
import { OpenAIService, DocumentAnalysisResult } from '@/lib/services/openai-service';
import { EmailService } from '@/lib/services/email-service';

// Generate a simple unique ID using timestamp and random number
function generateRunId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `triage_${timestamp}_${random}`;
}

// Initialize services
const openAIService = new OpenAIService();
const emailService = new EmailService();

// Helper function to map sentiment to priority
function sentimentToPriority(sentiment: 'positive' | 'neutral' | 'negative', confidence: number): string {
  if (sentiment === 'negative' && confidence > 0.8) {
    return 'critical';
  } else if (sentiment === 'negative') {
    return 'high';
  } else if (sentiment === 'neutral') {
    return 'medium';
  } else {
    return 'low';
  }
}

// Validation schema
const TriggerAITriageSchema = z.object({
  force: z.boolean().default(false),
  batchSize: z.number().int().min(1).max(1000).optional()
});

// POST /api/admin/ai-triage/trigger - Manually trigger AI triage
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validationResult = TriggerAITriageSchema.safeParse(body);
    if (!validationResult.success) {
      const response: APIResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid trigger data',
          details: validationResult.error.issues
        },
        timestamp: new Date().toISOString()
      };
      return NextResponse.json(response, { status: 400 });
    }

    const { force, batchSize } = validationResult.data;

    // Get AI triage configuration
    const configResult = await executeQuery<any[]>(
      'SELECT * FROM ai_triage_config ORDER BY id DESC LIMIT 1'
    );

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

    const config = configResult[0];

    // Check if AI triage is enabled
    if (!config.enabled && !force) {
      const response: APIResponse = {
        success: false,
        error: {
          code: 'AI_TRIAGE_DISABLED',
          message: 'AI triage is disabled. Use force=true to override.'
        },
        timestamp: new Date().toISOString()
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Check if there's already a running triage
    const runningTriageResult = await executeQuery<any[]>(`
      SELECT id FROM ai_triage_logs 
      WHERE started_at IS NOT NULL 
      AND completed_at IS NULL 
      ORDER BY started_at DESC 
      LIMIT 1
    `);

    if (runningTriageResult.length > 0 && !force) {
      const response: APIResponse = {
        success: false,
        error: {
          code: 'AI_TRIAGE_ALREADY_RUNNING',
          message: 'AI triage is already running. Use force=true to start another instance.'
        },
        timestamp: new Date().toISOString()
      };
      return NextResponse.json(response, { status: 409 });
    }

    // Get settings or use defaults
    const settings = typeof config.settings === 'string' ? JSON.parse(config.settings) : config.settings;
    const effectiveBatchSize = batchSize || settings.batchSize || 50;

    // Get pending pain points (items not yet processed)
    const pendingItemsQuery = `
      SELECT p.* 
      FROM pain_points p
      WHERE NOT EXISTS (
        SELECT 1 FROM routing_rule_logs rrl 
        WHERE rrl.pain_point_id = p.id
      )
      AND p.created_at > COALESCE(?, '2024-01-01')
      ORDER BY p.created_at ASC
      LIMIT ?
    `;

    const pendingItems = await executeQuery<any[]>({
      query: pendingItemsQuery,
      values: [
        config.last_run_at || '2024-01-01',
        effectiveBatchSize
      ]
    });

    if (pendingItems.length === 0 && !force) {
      const response: APIResponse = {
        success: false,
        error: {
          code: 'NO_ITEMS_TO_PROCESS',
          message: 'No pending items found to process. Use force=true to run anyway.'
        },
        timestamp: new Date().toISOString()
      };
      return NextResponse.json(response, { status: 200 });
    }

    // Create a new triage run log
    const runId = generateRunId();
    const startedAt = new Date();

    await executeQuery({
      query: `INSERT INTO ai_triage_logs (
        run_id, started_at, items_processed, items_routed, items_flagged, success
      ) VALUES (?, ?, 0, 0, 0, true)`,
      values: [runId, startedAt]
    });

    // In a real implementation, this would trigger background AI processing
    // For now, we'll simulate the processing and immediately complete it
    const processedItems = pendingItems.length;
    let routedItems = 0;
    let flaggedItems = 0;

    // Process each item with AI analysis
    for (const item of pendingItems) {
      const itemStartTime = Date.now();
      try {
        // 1. Analyze the pain point content with AI
        const content = `Title: ${item.title}\nDescription: ${item.description}\nCategory: ${item.category || 'Uncategorized'}\nDepartment: ${item.department || 'Unknown'}\nLocation: ${item.location || 'Not specified'}`;
        
        let aiAnalysis: DocumentAnalysisResult;
        try {
          aiAnalysis = await openAIService.analyzeDocument(content, `pain_point_${item.id}`);
        } catch (aiError) {
          console.error(`AI analysis failed for item ${item.id}:`, aiError);
          // Fall back to basic processing if AI fails
          aiAnalysis = {
            summary: item.description.substring(0, 200),
            keyPoints: [],
            categories: [item.category || 'Other'],
            sentiment: 'neutral',
            confidence: 0.5
          };
        }

        // 2. Extract AI-suggested categories and priority
        const aiCategories = aiAnalysis.categories || [item.category || 'Other'];
        const aiPriority = sentimentToPriority(aiAnalysis.sentiment, aiAnalysis.confidence);

        // 3. Match against routing rules using AI-suggested categories
        // Convert single category to array format for new JSON columns
        const categoryConditions = aiCategories.map(() => 'JSON_CONTAINS(category, ?)').join(' OR ');
        const categoryValues = aiCategories.map(cat => JSON.stringify([cat]));
        
        const routingRulesQuery = `
          SELECT * FROM routing_rules 
          WHERE active = true 
          AND (${categoryConditions} OR JSON_CONTAINS(category, '["All"]'))
          ORDER BY priority DESC
          LIMIT 1
        `;

        const routingRules = await executeQuery<any[]>({
          query: routingRulesQuery,
          values: categoryValues
        });

        if (routingRules.length > 0) {
          // 4. Send notifications to stakeholders
          const rule = routingRules[0];
          const stakeholders = typeof rule.stakeholders === 'string' 
            ? JSON.parse(rule.stakeholders) 
            : rule.stakeholders;

          // Send email notifications with AI analysis
          try {
            await emailService.sendRoutingNotification({
              painPoint: item,
              rule: rule,
              stakeholders: stakeholders,
              priority: aiPriority,
              aiAnalysis: {
                summary: aiAnalysis.summary,
                sentiment: aiAnalysis.sentiment,
                confidence: aiAnalysis.confidence,
                suggestedCategories: aiAnalysis.categories
              }
            });
          } catch (emailError) {
            console.error(`Failed to send email for item ${item.id}:`, emailError);
          }

          // 5. Log the routing action with AI metadata
          const processingTime = Date.now() - itemStartTime;
          await executeQuery({
            query: `INSERT INTO routing_rule_logs (
              rule_id, pain_point_id, action_taken, stakeholders_notified, 
              priority_assigned, success, processing_time_ms, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            values: [
              rule.id,
              item.id,
              'ai_triage_email',
              JSON.stringify(stakeholders),
              aiPriority,
              true,
              processingTime,
              JSON.stringify({
                aiSummary: aiAnalysis.summary,
                aiCategories: aiAnalysis.categories,
                aiSentiment: aiAnalysis.sentiment,
                aiConfidence: aiAnalysis.confidence
              })
            ]
          });

          routedItems++;
        } else {
          // No matching rule, flag for manual review with AI insights
          const processingTime = Date.now() - itemStartTime;
          await executeQuery({
            query: `INSERT INTO routing_rule_logs (
              rule_id, pain_point_id, action_taken, stakeholders_notified, 
              priority_assigned, success, processing_time_ms, metadata
            ) VALUES (NULL, ?, ?, NULL, ?, ?, ?, ?)`,
            values: [
              item.id,
              'flagged_for_review',
              aiPriority,
              true,
              processingTime,
              JSON.stringify({
                reason: 'No matching routing rule',
                aiSummary: aiAnalysis.summary,
                aiCategories: aiAnalysis.categories,
                aiSentiment: aiAnalysis.sentiment,
                aiConfidence: aiAnalysis.confidence
              })
            ]
          });
          flaggedItems++;
        }
      } catch (itemError) {
        console.error(`Error processing item ${item.id}:`, itemError);
        flaggedItems++;
      }
    }

    const completedAt = new Date();
    const processingTimeMs = completedAt.getTime() - startedAt.getTime();

    // Update the triage log with completion details
    await executeQuery({
      query: `UPDATE ai_triage_logs 
      SET 
        completed_at = ?,
        items_processed = ?,
        items_routed = ?,
        items_flagged = ?,
        success = true,
        processing_summary = ?
      WHERE run_id = ?`,
      values: [
        completedAt,
        processedItems,
        routedItems,
        flaggedItems,
        JSON.stringify({
          totalSubmissions: processedItems,
          processingTimeMs,
          rulesTriggered: routedItems,
          averageProcessingTime: processedItems > 0 ? processingTimeMs / processedItems : 0
        }),
        runId
      ]
    });

    // Update the main config with last run info
    await executeQuery({
      query: `UPDATE ai_triage_config 
      SET 
        last_run_at = ?,
        items_processed_last_run = ?,
        total_items_processed = total_items_processed + ?
      WHERE id = ?`,
      values: [
        completedAt,
        processedItems,
        processedItems,
        config.id
      ]
    });

    const response: APIResponse = {
      success: true,
      data: {
        runId,
        itemsProcessed: processedItems,
        itemsRouted: routedItems,
        itemsFlagged: flaggedItems,
        processingTimeMs,
        message: `AI triage completed successfully. Processed ${processedItems} items, routed ${routedItems}, flagged ${flaggedItems}.`
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error triggering AI triage:', error);
    
    const response: APIResponse = {
      success: false,
      error: {
        code: 'TRIGGER_AI_TRIAGE_ERROR',
        message: 'Failed to trigger AI triage',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response, { status: 500 });
  }
}