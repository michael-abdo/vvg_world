// Data Pipeline Type Definitions

export type PriorityLevel = 'low' | 'medium' | 'high' | 'critical';
export type TriggerType = 'keywords' | 'similarity' | 'sentiment' | 'length' | 'custom';
export type ActionType = 'escalate' | 'tag' | 'flag' | 'hold' | 'ignore' | 'route';

export interface RoutingRule {
  id: number;
  name: string;
  category: string;
  department: string;
  stakeholders: string[];
  priority: PriorityLevel;
  autoRoute: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoutingRuleRequest {
  name: string;
  category: string;
  department: string;
  stakeholders: string[];
  priority: PriorityLevel;
  autoRoute?: boolean;
  active?: boolean;
}

export interface UpdateRoutingRuleRequest extends Partial<CreateRoutingRuleRequest> {
  id: number;
}

export interface AIRule {
  id: number;
  name: string;
  triggerType: TriggerType;
  triggerDetails: string;
  actionType: ActionType;
  actionTarget: string;
  priority: PriorityLevel;
  active: boolean;
  lastTriggeredAt: string | null;
  triggerCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAIRuleRequest {
  name: string;
  triggerType: TriggerType;
  triggerDetails: string;
  actionType: ActionType;
  actionTarget: string;
  priority?: PriorityLevel;
  active?: boolean;
}

export interface UpdateAIRuleRequest extends Partial<CreateAIRuleRequest> {
  id: number;
}

export interface AITriageConfig {
  id: number;
  enabled: boolean;
  scheduleCron: string;
  lastRunAt: string | null;
  nextRunAt: string | null;
  itemsProcessedLastRun: number;
  totalItemsProcessed: number;
  settings: AITriageSettings;
  createdAt: string;
  updatedAt: string;
}

export interface AITriageSettings {
  batchSize: number;
  notifyAdmins: boolean;
  adminEmails: string[];
  processingTimeoutMinutes: number;
}

export interface UpdateAITriageConfigRequest {
  enabled?: boolean;
  scheduleCron?: string;
  settings?: Partial<AITriageSettings>;
}

export interface RoutingRuleLog {
  id: number;
  ruleId: number;
  painPointId: number;
  actionTaken: string;
  stakeholdersNotified: string[];
  priorityAssigned: PriorityLevel | null;
  success: boolean;
  errorMessage: string | null;
  processingTimeMs: number | null;
  createdAt: string;
}

export interface AITriageLog {
  id: number;
  runId: string;
  startedAt: string;
  completedAt: string | null;
  itemsProcessed: number;
  itemsRouted: number;
  itemsFlagged: number;
  success: boolean;
  errorMessage: string | null;
  processingSummary: AITriageProcessingSummary | null;
  createdAt: string;
}

export interface AITriageProcessingSummary {
  totalSubmissions: number;
  categoriesProcessed: Record<string, number>;
  prioritiesAssigned: Record<PriorityLevel, number>;
  rulesTriggered: number;
  averageProcessingTime: number;
}

export interface AITriageStatus {
  config: AITriageConfig;
  isRunning: boolean;
  lastRun: {
    completedAt: string | null;
    itemsProcessed: number;
    success: boolean;
  } | null;
  nextRun: {
    scheduledAt: string | null;
    pendingItems: number;
  };
  recentLogs: AITriageLog[];
}

export interface RoutingEngineResult {
  painPointId: number;
  matchedRules: RoutingRule[];
  actionsToTake: RoutingAction[];
  processingTimeMs: number;
}

export interface RoutingAction {
  ruleId: number;
  actionType: 'email' | 'flag' | 'escalate' | 'tag';
  target: string | string[];
  priority: PriorityLevel;
  metadata?: Record<string, any>;
}

export interface EmailNotificationData {
  to: string[];
  subject: string;
  painPoint: {
    id: number;
    title: string;
    description: string;
    category: string;
    submittedBy: string;
    priority: PriorityLevel;
  };
  rule: RoutingRule;
  actionUrl?: string;
}

// API Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Request validation schemas (for use with Zod)
export interface CreateRoutingRuleValidation {
  name: string;
  category: string;
  department: string;
  stakeholders: string[];
  priority: PriorityLevel;
  autoRoute?: boolean;
  active?: boolean;
}

export interface UpdateRoutingRuleValidation extends Partial<CreateRoutingRuleValidation> {}

export interface ToggleRoutingRuleValidation {
  active: boolean;
}

export interface TriggerAITriageValidation {
  force?: boolean;
  batchSize?: number;
}

// Category and Department types (matching existing schema)
export type CategoryType = 'Safety' | 'Efficiency' | 'Cost Savings' | 'Quality' | 'Product' | 'Process' | 'Culture' | 'Tech' | 'Other';

export type DepartmentType = 'All' | 'Engineering' | 'Product' | 'Marketing' | 'Sales' | 'HR' | 'Operations' | 'Finance';

// Database row types (for internal use)
export interface RoutingRuleRow {
  id: number;
  name: string;
  category: string;
  department: string;
  stakeholders: string; // JSON string
  priority: PriorityLevel;
  auto_route: boolean;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AITriageConfigRow {
  id: number;
  enabled: boolean;
  schedule_cron: string;
  last_run_at: Date | null;
  next_run_at: Date | null;
  items_processed_last_run: number;
  total_items_processed: number;
  settings: string; // JSON string
  created_at: Date;
  updated_at: Date;
}

export interface AIRuleRow {
  id: number;
  name: string;
  trigger_type: TriggerType;
  trigger_details: string;
  action_type: ActionType;
  action_target: string;
  priority: PriorityLevel;
  active: boolean;
  last_triggered_at: Date | null;
  trigger_count: number;
  created_at: Date;
  updated_at: Date;
}