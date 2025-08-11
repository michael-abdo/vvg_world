// useAIRules Hook
// React hook for managing AI rules data and operations

import { useState, useEffect, useCallback } from 'react';
import { aiRulesAPI, handleAPIError } from '@/lib/api/data-pipeline';
import { 
  AIRule, 
  CreateAIRuleRequest, 
  UpdateAIRuleRequest 
} from '@/lib/types/data-pipeline';

interface UseAIRulesState {
  rules: AIRule[];
  loading: boolean;
  error: string | null;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
}

interface UseAIRulesFilters {
  active?: boolean;
  triggerType?: string;
  actionType?: string;
}

interface UseAIRulesReturn extends UseAIRulesState {
  // Data operations
  refresh: () => Promise<void>;
  createRule: (rule: CreateAIRuleRequest) => Promise<AIRule | null>;
  updateRule: (id: number, updates: UpdateAIRuleRequest) => Promise<AIRule | null>;
  deleteRule: (id: number) => Promise<boolean>;
  toggleRule: (id: number, active: boolean) => Promise<AIRule | null>;
  
  // Utility functions
  clearError: () => void;
  getRuleById: (id: number) => AIRule | undefined;
  getRulesByTriggerType: (triggerType: string) => AIRule[];
  getRulesByActionType: (actionType: string) => AIRule[];
  getActiveRules: () => AIRule[];
}

export function useAIRules(filters?: UseAIRulesFilters): UseAIRulesReturn {
  const [state, setState] = useState<UseAIRulesState>({
    rules: [],
    loading: true,
    error: null,
    creating: false,
    updating: false,
    deleting: false,
  });

  // Fetch AI rules from API
  const fetchRules = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const rules = await aiRulesAPI.getAll(filters);
      setState(prev => ({ ...prev, rules, loading: false }));
    } catch (error) {
      const apiError = handleAPIError(error);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: apiError.message 
      }));
    }
  }, [filters]);

  // Initial load
  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // Refresh data
  const refresh = useCallback(async () => {
    await fetchRules();
  }, [fetchRules]);

  // Create new AI rule
  const createRule = useCallback(async (rule: CreateAIRuleRequest): Promise<AIRule | null> => {
    try {
      setState(prev => ({ ...prev, creating: true, error: null }));
      
      const newRule = await aiRulesAPI.create(rule);
      
      // Add the new rule to the current list
      setState(prev => ({ 
        ...prev, 
        rules: [...prev.rules, newRule],
        creating: false 
      }));
      
      return newRule;
    } catch (error) {
      const apiError = handleAPIError(error);
      setState(prev => ({ 
        ...prev, 
        creating: false, 
        error: apiError.message 
      }));
      return null;
    }
  }, []);

  // Update existing AI rule
  const updateRule = useCallback(async (
    id: number, 
    updates: UpdateAIRuleRequest
  ): Promise<AIRule | null> => {
    try {
      setState(prev => ({ ...prev, updating: true, error: null }));
      
      const updatedRule = await aiRulesAPI.update(id, updates);
      
      // Update the rule in the current list
      setState(prev => ({ 
        ...prev, 
        rules: prev.rules.map(rule => 
          rule.id === id ? updatedRule : rule
        ),
        updating: false 
      }));
      
      return updatedRule;
    } catch (error) {
      const apiError = handleAPIError(error);
      setState(prev => ({ 
        ...prev, 
        updating: false, 
        error: apiError.message 
      }));
      return null;
    }
  }, []);

  // Delete AI rule
  const deleteRule = useCallback(async (id: number): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, deleting: true, error: null }));
      
      await aiRulesAPI.delete(id);
      
      // Remove the rule from the current list
      setState(prev => ({ 
        ...prev, 
        rules: prev.rules.filter(rule => rule.id !== id),
        deleting: false 
      }));
      
      return true;
    } catch (error) {
      const apiError = handleAPIError(error);
      setState(prev => ({ 
        ...prev, 
        deleting: false, 
        error: apiError.message 
      }));
      return false;
    }
  }, []);

  // Toggle AI rule active state
  const toggleRule = useCallback(async (
    id: number, 
    active: boolean
  ): Promise<AIRule | null> => {
    try {
      setState(prev => ({ ...prev, updating: true, error: null }));
      
      const updatedRule = await aiRulesAPI.toggle(id, active);
      
      // Update the rule in the current list
      setState(prev => ({ 
        ...prev, 
        rules: prev.rules.map(rule => 
          rule.id === id ? updatedRule : rule
        ),
        updating: false 
      }));
      
      return updatedRule;
    } catch (error) {
      const apiError = handleAPIError(error);
      setState(prev => ({ 
        ...prev, 
        updating: false, 
        error: apiError.message 
      }));
      return null;
    }
  }, []);

  // Clear error state
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Utility: Get rule by ID
  const getRuleById = useCallback((id: number): AIRule | undefined => {
    return state.rules.find(rule => rule.id === id);
  }, [state.rules]);

  // Utility: Get rules by trigger type
  const getRulesByTriggerType = useCallback((triggerType: string): AIRule[] => {
    return state.rules.filter(rule => 
      rule.triggerType.toLowerCase() === triggerType.toLowerCase()
    );
  }, [state.rules]);

  // Utility: Get rules by action type
  const getRulesByActionType = useCallback((actionType: string): AIRule[] => {
    return state.rules.filter(rule => 
      rule.actionType.toLowerCase() === actionType.toLowerCase()
    );
  }, [state.rules]);

  // Utility: Get only active rules
  const getActiveRules = useCallback((): AIRule[] => {
    return state.rules.filter(rule => rule.active);
  }, [state.rules]);

  return {
    // State
    ...state,
    
    // Operations
    refresh,
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
    
    // Utilities
    clearError,
    getRuleById,
    getRulesByTriggerType,
    getRulesByActionType,
    getActiveRules,
  };
}

// Custom hook for managing a single AI rule (useful for edit forms)
export function useAIRule(id?: number) {
  const { rules, getRuleById, updateRule, deleteRule, toggleRule, updating, deleting } = useAIRules();
  
  const rule = id ? getRuleById(id) : undefined;
  
  const update = useCallback(async (updates: UpdateAIRuleRequest) => {
    if (!id) return null;
    return await updateRule(id, updates);
  }, [id, updateRule]);
  
  const remove = useCallback(async () => {
    if (!id) return false;
    return await deleteRule(id);
  }, [id, deleteRule]);
  
  const toggle = useCallback(async (active: boolean) => {
    if (!id) return null;
    return await toggleRule(id, active);
  }, [id, toggleRule]);
  
  return {
    rule,
    update,
    remove,
    toggle,
    updating,
    deleting,
    isLoaded: !!rule,
  };
}