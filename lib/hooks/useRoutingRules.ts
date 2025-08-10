// useRoutingRules Hook
// React hook for managing routing rules data and operations

import { useState, useEffect, useCallback } from 'react';
import { routingRulesAPI, handleAPIError } from '@/lib/api/data-pipeline';
import { 
  RoutingRule, 
  CreateRoutingRuleRequest, 
  UpdateRoutingRuleRequest 
} from '@/lib/types/data-pipeline';

interface UseRoutingRulesState {
  rules: RoutingRule[];
  loading: boolean;
  error: string | null;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
}

interface UseRoutingRulesFilters {
  active?: boolean;
  category?: string;
  department?: string;
}

interface UseRoutingRulesReturn extends UseRoutingRulesState {
  // Data operations
  refresh: () => Promise<void>;
  createRule: (rule: CreateRoutingRuleRequest) => Promise<RoutingRule | null>;
  updateRule: (id: number, updates: UpdateRoutingRuleRequest) => Promise<RoutingRule | null>;
  deleteRule: (id: number) => Promise<boolean>;
  toggleRule: (id: number, active: boolean) => Promise<RoutingRule | null>;
  
  // Utility functions
  clearError: () => void;
  getRuleById: (id: number) => RoutingRule | undefined;
  getRulesByCategory: (category: string) => RoutingRule[];
  getActiveRules: () => RoutingRule[];
}

export function useRoutingRules(filters?: UseRoutingRulesFilters): UseRoutingRulesReturn {
  const [state, setState] = useState<UseRoutingRulesState>({
    rules: [],
    loading: true,
    error: null,
    creating: false,
    updating: false,
    deleting: false,
  });

  // Fetch routing rules from API
  const fetchRules = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const rules = await routingRulesAPI.getAll(filters);
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

  // Create new routing rule
  const createRule = useCallback(async (rule: CreateRoutingRuleRequest): Promise<RoutingRule | null> => {
    try {
      setState(prev => ({ ...prev, creating: true, error: null }));
      
      const newRule = await routingRulesAPI.create(rule);
      
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

  // Update existing routing rule
  const updateRule = useCallback(async (
    id: number, 
    updates: UpdateRoutingRuleRequest
  ): Promise<RoutingRule | null> => {
    try {
      setState(prev => ({ ...prev, updating: true, error: null }));
      
      const updatedRule = await routingRulesAPI.update(id, updates);
      
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

  // Delete routing rule
  const deleteRule = useCallback(async (id: number): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, deleting: true, error: null }));
      
      await routingRulesAPI.delete(id);
      
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

  // Toggle routing rule active state
  const toggleRule = useCallback(async (
    id: number, 
    active: boolean
  ): Promise<RoutingRule | null> => {
    try {
      setState(prev => ({ ...prev, updating: true, error: null }));
      
      const updatedRule = await routingRulesAPI.toggle(id, active);
      
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
  const getRuleById = useCallback((id: number): RoutingRule | undefined => {
    return state.rules.find(rule => rule.id === id);
  }, [state.rules]);

  // Utility: Get rules by category
  const getRulesByCategory = useCallback((category: string): RoutingRule[] => {
    return state.rules.filter(rule => 
      rule.category.toLowerCase() === category.toLowerCase()
    );
  }, [state.rules]);

  // Utility: Get only active rules
  const getActiveRules = useCallback((): RoutingRule[] => {
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
    getRulesByCategory,
    getActiveRules,
  };
}

// Custom hook for managing a single routing rule (useful for edit forms)
export function useRoutingRule(id?: number) {
  const { rules, getRuleById, updateRule, deleteRule, toggleRule, updating, deleting } = useRoutingRules();
  
  const rule = id ? getRuleById(id) : undefined;
  
  const update = useCallback(async (updates: UpdateRoutingRuleRequest) => {
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