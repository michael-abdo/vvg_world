// useAITriage Hook
// React hook for managing AI triage status, configuration, and operations

import { useState, useEffect, useCallback } from 'react';
import { aiTriageAPI, handleAPIError } from '@/lib/api/data-pipeline';
import { 
  AITriageStatus, 
  AITriageConfig,
  UpdateAITriageConfigRequest 
} from '@/lib/types/data-pipeline';

interface UseAITriageState {
  status: AITriageStatus | null;
  config: AITriageConfig | null;
  loading: boolean;
  error: string | null;
  triggering: boolean;
  updatingConfig: boolean;
}

interface UseAITriageReturn extends UseAITriageState {
  // Data operations
  refreshStatus: () => Promise<void>;
  refreshConfig: () => Promise<void>;
  triggerTriage: (options?: { force?: boolean; batchSize?: number }) => Promise<boolean>;
  updateConfig: (updates: UpdateAITriageConfigRequest) => Promise<boolean>;
  
  // Utility functions
  clearError: () => void;
  isTriageEnabled: () => boolean;
  getNextRunTime: () => Date | null;
  getPendingItems: () => number;
  getLastRunSummary: () => { completedAt: string | null; itemsProcessed: number; success: boolean } | null;
}

export function useAITriage(): UseAITriageReturn {
  const [state, setState] = useState<UseAITriageState>({
    status: null,
    config: null,
    loading: true,
    error: null,
    triggering: false,
    updatingConfig: false,
  });

  // Fetch AI triage status
  const fetchStatus = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const status = await aiTriageAPI.getStatus();
      setState(prev => ({ ...prev, status, loading: false }));
    } catch (error) {
      const apiError = handleAPIError(error);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: apiError.message 
      }));
    }
  }, []);

  // Fetch AI triage configuration
  const fetchConfig = useCallback(async () => {
    try {
      const config = await aiTriageAPI.getConfig();
      setState(prev => ({ ...prev, config }));
    } catch (error) {
      const apiError = handleAPIError(error);
      setState(prev => ({ ...prev, error: apiError.message }));
    }
  }, []);

  // Initial load - fetch both status and config
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchStatus(), fetchConfig()]);
    };
    loadData();
  }, [fetchStatus, fetchConfig]);

  // Refresh status only
  const refreshStatus = useCallback(async () => {
    await fetchStatus();
  }, [fetchStatus]);

  // Refresh config only
  const refreshConfig = useCallback(async () => {
    await fetchConfig();
  }, [fetchConfig]);

  // Manually trigger AI triage
  const triggerTriage = useCallback(async (
    options?: { force?: boolean; batchSize?: number }
  ): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, triggering: true, error: null }));
      
      const result = await aiTriageAPI.trigger(options);
      
      console.log('AI triage triggered successfully:', result);
      
      // Refresh status after triggering
      await fetchStatus();
      
      setState(prev => ({ ...prev, triggering: false }));
      return true;
    } catch (error) {
      const apiError = handleAPIError(error);
      setState(prev => ({ 
        ...prev, 
        triggering: false, 
        error: apiError.message 
      }));
      return false;
    }
  }, [fetchStatus]);

  // Update AI triage configuration
  const updateConfig = useCallback(async (
    updates: UpdateAITriageConfigRequest
  ): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, updatingConfig: true, error: null }));
      
      const updatedConfig = await aiTriageAPI.updateConfig(updates);
      
      setState(prev => ({ 
        ...prev, 
        config: updatedConfig,
        updatingConfig: false 
      }));
      
      // Also refresh status to get updated next run time
      await fetchStatus();
      
      return true;
    } catch (error) {
      const apiError = handleAPIError(error);
      setState(prev => ({ 
        ...prev, 
        updatingConfig: false, 
        error: apiError.message 
      }));
      return false;
    }
  }, [fetchStatus]);

  // Clear error state
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Utility: Check if AI triage is enabled
  const isTriageEnabled = useCallback((): boolean => {
    return state.config?.enabled ?? false;
  }, [state.config]);

  // Utility: Get next run time as Date object
  const getNextRunTime = useCallback((): Date | null => {
    if (!state.status?.nextRun.scheduledAt) return null;
    return new Date(state.status.nextRun.scheduledAt);
  }, [state.status]);

  // Utility: Get number of pending items
  const getPendingItems = useCallback((): number => {
    return state.status?.nextRun.pendingItems ?? 0;
  }, [state.status]);

  // Utility: Get last run summary
  const getLastRunSummary = useCallback(() => {
    return state.status?.lastRun ?? null;
  }, [state.status]);

  return {
    // State
    ...state,
    
    // Operations
    refreshStatus,
    refreshConfig,
    triggerTriage,
    updateConfig,
    
    // Utilities
    clearError,
    isTriageEnabled,
    getNextRunTime,
    getPendingItems,
    getLastRunSummary,
  };
}

// Custom hook for just AI triage configuration (useful for settings forms)
export function useAITriageConfig() {
  const { 
    config, 
    updateConfig, 
    updatingConfig, 
    error, 
    clearError,
    refreshConfig 
  } = useAITriage();
  
  // Helper to update specific config sections
  const updateSchedule = useCallback(async (scheduleCron: string) => {
    return await updateConfig({ scheduleCron });
  }, [updateConfig]);
  
  const toggleEnabled = useCallback(async (enabled: boolean) => {
    return await updateConfig({ enabled });
  }, [updateConfig]);
  
  const updateSettings = useCallback(async (settings: {
    batchSize?: number;
    notifyAdmins?: boolean;
    adminEmails?: string[];
    processingTimeoutMinutes?: number;
  }) => {
    return await updateConfig({ settings });
  }, [updateConfig]);
  
  return {
    config,
    updating: updatingConfig,
    error,
    clearError,
    refresh: refreshConfig,
    updateSchedule,
    toggleEnabled,
    updateSettings,
  };
}

// Custom hook for AI triage status monitoring (useful for dashboards)
export function useAITriageStatus() {
  const { 
    status, 
    refreshStatus, 
    loading, 
    error,
    clearError,
    isTriageEnabled,
    getNextRunTime,
    getPendingItems,
    getLastRunSummary 
  } = useAITriage();
  
  // Auto-refresh status every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshStatus();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [refreshStatus]);
  
  return {
    status,
    loading,
    error,
    clearError,
    refresh: refreshStatus,
    isEnabled: isTriageEnabled(),
    nextRunTime: getNextRunTime(),
    pendingItems: getPendingItems(),
    lastRunSummary: getLastRunSummary(),
    isRunning: status?.isRunning ?? false,
  };
}