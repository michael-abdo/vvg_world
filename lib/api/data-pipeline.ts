// Data Pipeline API Client
// Centralized API calls for routing rules and AI triage functionality

import { 
  RoutingRule, 
  CreateRoutingRuleRequest, 
  UpdateRoutingRuleRequest,
  AIRule,
  CreateAIRuleRequest,
  UpdateAIRuleRequest,
  AITriageStatus,
  AITriageConfig,
  UpdateAITriageConfigRequest,
  APIResponse 
} from '@/lib/types/data-pipeline';

// Base API configuration
const API_BASE = '/api/admin';

// Generic API call helper with error handling
async function apiCall<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<APIResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return data;
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    throw error;
  }
}

// Routing Rules API Functions
export const routingRulesAPI = {
  // Get all routing rules with optional filtering
  async getAll(filters?: {
    active?: boolean;
    category?: string;
    department?: string;
  }): Promise<RoutingRule[]> {
    const params = new URLSearchParams();
    
    if (filters?.active !== undefined) {
      params.append('active', String(filters.active));
    }
    if (filters?.category) {
      params.append('category', filters.category);
    }
    if (filters?.department) {
      params.append('department', filters.department);
    }

    const queryString = params.toString();
    const endpoint = `/routing-rules${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiCall<RoutingRule[]>(endpoint);
    return response.data || [];
  },

  // Create a new routing rule
  async create(rule: CreateRoutingRuleRequest): Promise<RoutingRule> {
    const response = await apiCall<RoutingRule>('/routing-rules', {
      method: 'POST',
      body: JSON.stringify(rule),
    });
    
    if (!response.data) {
      throw new Error('Failed to create routing rule');
    }
    
    return response.data;
  },

  // Update an existing routing rule
  async update(id: number, updates: UpdateRoutingRuleRequest): Promise<RoutingRule> {
    const response = await apiCall<RoutingRule>(`/routing-rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    
    if (!response.data) {
      throw new Error('Failed to update routing rule');
    }
    
    return response.data;
  },

  // Delete a routing rule
  async delete(id: number): Promise<void> {
    await apiCall(`/routing-rules/${id}`, {
      method: 'DELETE',
    });
  },

  // Toggle routing rule active state
  async toggle(id: number, active: boolean): Promise<RoutingRule> {
    const response = await apiCall<RoutingRule>(`/routing-rules/${id}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    });
    
    if (!response.data) {
      throw new Error('Failed to toggle routing rule');
    }
    
    return response.data;
  },
};

// AI Rules API Functions
export const aiRulesAPI = {
  // Get all AI rules with optional filtering
  async getAll(filters?: {
    active?: boolean;
    triggerType?: string;
    actionType?: string;
  }): Promise<AIRule[]> {
    const params = new URLSearchParams();
    
    if (filters?.active !== undefined) {
      params.append('active', String(filters.active));
    }
    if (filters?.triggerType) {
      params.append('triggerType', filters.triggerType);
    }
    if (filters?.actionType) {
      params.append('actionType', filters.actionType);
    }

    const queryString = params.toString();
    const endpoint = `/ai-rules${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiCall<AIRule[]>(endpoint);
    return response.data || [];
  },

  // Get a specific AI rule by ID
  async getById(id: number): Promise<AIRule> {
    const response = await apiCall<AIRule>(`/ai-rules/${id}`);
    
    if (!response.data) {
      throw new Error('AI rule not found');
    }
    
    return response.data;
  },

  // Create a new AI rule
  async create(rule: CreateAIRuleRequest): Promise<AIRule> {
    const response = await apiCall<AIRule>('/ai-rules', {
      method: 'POST',
      body: JSON.stringify(rule),
    });
    
    if (!response.data) {
      throw new Error('Failed to create AI rule');
    }
    
    return response.data;
  },

  // Update an existing AI rule
  async update(id: number, updates: UpdateAIRuleRequest): Promise<AIRule> {
    const response = await apiCall<AIRule>(`/ai-rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    
    if (!response.data) {
      throw new Error('Failed to update AI rule');
    }
    
    return response.data;
  },

  // Delete an AI rule
  async delete(id: number): Promise<void> {
    await apiCall(`/ai-rules/${id}`, {
      method: 'DELETE',
    });
  },

  // Toggle AI rule active state
  async toggle(id: number, active: boolean): Promise<AIRule> {
    const response = await apiCall<AIRule>(`/ai-rules/${id}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    });
    
    if (!response.data) {
      throw new Error('Failed to toggle AI rule');
    }
    
    return response.data;
  },
};

// AI Triage API Functions
export const aiTriageAPI = {
  // Get AI triage status and metrics
  async getStatus(): Promise<AITriageStatus> {
    const response = await apiCall<AITriageStatus>('/ai-triage/status');
    
    if (!response.data) {
      throw new Error('Failed to fetch AI triage status');
    }
    
    return response.data;
  },

  // Manually trigger AI triage
  async trigger(options?: { 
    force?: boolean; 
    batchSize?: number; 
  }): Promise<{
    runId: string;
    itemsProcessed: number;
    itemsRouted: number;
    itemsFlagged: number;
    processingTimeMs: number;
    message: string;
  }> {
    const response = await apiCall<any>('/ai-triage/trigger', {
      method: 'POST',
      body: JSON.stringify(options || {}),
    });
    
    if (!response.data) {
      throw new Error('Failed to trigger AI triage');
    }
    
    return response.data;
  },

  // Get AI triage configuration
  async getConfig(): Promise<AITriageConfig> {
    const response = await apiCall<AITriageConfig>('/ai-triage/settings');
    
    if (!response.data) {
      throw new Error('Failed to fetch AI triage configuration');
    }
    
    return response.data;
  },

  // Update AI triage configuration
  async updateConfig(updates: UpdateAITriageConfigRequest): Promise<AITriageConfig> {
    const response = await apiCall<AITriageConfig>('/ai-triage/settings', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    
    if (!response.data) {
      throw new Error('Failed to update AI triage configuration');
    }
    
    return response.data;
  },
};

// Categories and Departments API (for dropdowns)
export const systemAPI = {
  // Get available categories from routing rules
  async getCategories(): Promise<string[]> {
    const rules = await routingRulesAPI.getAll();
    const categories = [...new Set(rules.map(rule => rule.category))];
    return categories.sort();
  },

  // Get available departments from routing rules
  async getDepartments(): Promise<string[]> {
    const rules = await routingRulesAPI.getAll();
    const departments = [...new Set(rules.map(rule => rule.department))];
    return departments.sort();
  },
};

// Error types for better error handling
export class DataPipelineError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'DataPipelineError';
  }
}

// Helper function to handle API errors consistently
export function handleAPIError(error: unknown): DataPipelineError {
  if (error instanceof DataPipelineError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new DataPipelineError(error.message);
  }
  
  return new DataPipelineError('An unexpected error occurred');
}