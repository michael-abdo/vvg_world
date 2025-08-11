'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Users, Mail, Shield, Settings2, GitBranch, Bot, ArrowRight, Zap } from 'lucide-react';
import { useRoutingRules } from '@/lib/hooks/useRoutingRules';
import { useAIRules } from '@/lib/hooks/useAIRules';
import { useAITriage } from '@/lib/hooks/useAITriage';
import { useToast } from '@/components/ui/use-toast';
import { EditRoutingRuleDialog } from '@/components/forms/EditRoutingRuleDialog';
import { CategoryMultiSelect } from '@/components/forms/CategoryMultiSelect';
import { DepartmentMultiSelect } from '@/components/forms/DepartmentMultiSelect';
import { MultiSelectPills } from '@/components/ui/multi-select-pills';
import { RoutingRule, UpdateRoutingRuleRequest } from '@/lib/types/data-pipeline';

// Mock data
const departments = [
  { id: '1', name: 'Engineering', parent: null, members: 24, active: true },
  { id: '2', name: 'Frontend', parent: 'Engineering', members: 8, active: true },
  { id: '3', name: 'Backend', parent: 'Engineering', members: 12, active: true },
  { id: '4', name: 'DevOps', parent: 'Engineering', members: 4, active: true },
  { id: '5', name: 'Product', parent: null, members: 15, active: true },
  { id: '6', name: 'Design', parent: 'Product', members: 6, active: true },
  { id: '7', name: 'Product Management', parent: 'Product', members: 9, active: true },
  { id: '8', name: 'Marketing', parent: null, members: 12, active: true },
  { id: '9', name: 'Sales', parent: null, members: 18, active: true },
  { id: '10', name: 'HR', parent: null, members: 8, active: true }
];

const categories = [
  { id: '1', name: 'Product', color: '#3b82f6', description: 'Product features and improvements', count: 45 },
  { id: '2', name: 'Process', color: '#8b5cf6', description: 'Workflow and process improvements', count: 38 },
  { id: '3', name: 'Culture', color: '#06b6d4', description: 'Company culture and environment', count: 29 },
  { id: '4', name: 'Tech', color: '#10b981', description: 'Technical infrastructure and tools', count: 32 },
  { id: '5', name: 'Safety', color: '#f59e0b', description: 'Safety and compliance improvements', count: 18 },
  { id: '6', name: 'Other', color: '#6b7280', description: 'Miscellaneous improvements', count: 12 }
];

const users = [
  { id: '1', name: 'John Smith', email: 'john.smith@vvgtruck.com', role: 'admin', department: 'Engineering', active: true },
  { id: '2', name: 'Sarah Johnson', email: 'sarah.johnson@vvgtruck.com', role: 'moderator', department: 'Product', active: true },
  { id: '3', name: 'Mike Rodriguez', email: 'mike.rodriguez@vvgtruck.com', role: 'moderator', department: 'Engineering', active: true },
  { id: '4', name: 'Emily Davis', email: 'emily.davis@vvgtruck.com', role: 'user', department: 'HR', active: true },
  { id: '5', name: 'David Wilson', email: 'david.wilson@vvgtruck.com', role: 'user', department: 'Marketing', active: false }
];

const notifications = [
  { id: '1', name: 'New Idea Submitted', enabled: true, frequency: 'immediate', recipients: 'admins' },
  { id: '2', name: 'Idea Approved', enabled: true, frequency: 'immediate', recipients: 'submitter' },
  { id: '3', name: 'Idea Rejected', enabled: true, frequency: 'immediate', recipients: 'submitter' },
  { id: '4', name: 'Weekly Summary', enabled: true, frequency: 'weekly', recipients: 'all' },
  { id: '5', name: 'Monthly Report', enabled: false, frequency: 'monthly', recipients: 'admins' }
];


// AI Rule trigger type display mappings
const triggerTypeDisplay = {
  keywords: 'Contains keywords',
  similarity: 'Similar to existing ideas',
  sentiment: 'Negative sentiment',
  length: 'Content length',
  custom: 'Custom AI analysis'
};

// Action type display mappings
const actionTypeDisplay = {
  escalate: 'Escalate to email',
  tag: 'Add tag',
  flag: 'Flag for review', 
  hold: 'Hold for clarification',
  ignore: 'Ignore/archive',
  route: 'Route to department'
};

export default function SettingsPage() {
  const [selectedTab, setSelectedTab] = useState('routing');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createAIRuleDialogOpen, setCreateAIRuleDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null);
  const { toast } = useToast();
  
  // Form state for creating new routing rule
  const [newRule, setNewRule] = useState({
    name: '',
    category: [] as string[],
    department: [] as string[],
    stakeholders: '',
    priority: 'medium',
    autoRoute: true
  });
  
  // Form state for creating new AI rule
  const [newAIRule, setNewAIRule] = useState({
    name: '',
    triggerType: 'keywords' as const,
    triggerDetails: '',
    actionType: 'escalate' as const,
    actionTarget: '',
    priority: 'medium' as const,
    active: true
  });
  
  // Data Pipeline hooks
  const { 
    rules: routingRules, 
    loading: routingRulesLoading, 
    error: routingRulesError,
    toggleRule,
    deleteRule,
    createRule,
    updateRule,
    creating: creatingRule,
    updating: updatingRule,
    deleting: deletingRule
  } = useRoutingRules();
  
  const { 
    status: aiTriageStatus, 
    loading: aiTriageLoading, 
    error: aiTriageError,
    triggerTriage,
    triggering: triggeringTriage
  } = useAITriage();
  
  // AI Rules hooks
  const {
    rules: aiRules,
    loading: aiRulesLoading,
    error: aiRulesError,
    createRule: createAIRule,
    toggleRule: toggleAIRule,
    deleteRule: deleteAIRule,
    creating: creatingAIRule,
    updating: updatingAIRule,
    deleting: deletingAIRule
  } = useAIRules();
  
  // Handle form submission
  const handleCreateRule = async () => {
    // Validate form
    if (!newRule.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a rule name",
        variant: "destructive",
      });
      return;
    }
    
    if (newRule.category.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one category",
        variant: "destructive",
      });
      return;
    }
    
    if (newRule.department.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one department",
        variant: "destructive",
      });
      return;
    }
    
    if (!newRule.stakeholders.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter at least one stakeholder email",
        variant: "destructive",
      });
      return;
    }
    
    // Parse stakeholders
    const stakeholderEmails = newRule.stakeholders
      .split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0);
    
    // Validate emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of stakeholderEmails) {
      if (!emailRegex.test(email)) {
        toast({
          title: "Validation Error",
          description: `Invalid email: ${email}`,
          variant: "destructive",
        });
        return;
      }
    }
    
    try {
      const result = await createRule({
        name: newRule.name,
        category: newRule.category,
        department: newRule.department,
        stakeholders: stakeholderEmails,
        priority: newRule.priority as 'low' | 'medium' | 'high' | 'critical',
        autoRoute: newRule.autoRoute
      });
      
      if (result) {
        // Show success toast
        toast({
          title: "Success",
          description: `Routing rule "${result.name}" created successfully.`,
        });
        
        // Reset form and close dialog
        setNewRule({
          name: '',
          category: [],
          department: [],
          stakeholders: '',
          priority: 'medium',
          autoRoute: true
        });
        setCreateDialogOpen(false);
      } else {
        // Show error toast
        toast({
          title: "Error",
          description: "Failed to create routing rule. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Show error toast
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      console.error('Failed to create routing rule:', error);
    }
  };

  // Handle AI rule creation
  const handleCreateAIRule = async () => {
    // Validate form
    if (!newAIRule.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a rule name",
        variant: "destructive",
      });
      return;
    }
    
    if (!newAIRule.triggerDetails.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter trigger details",
        variant: "destructive",
      });
      return;
    }
    
    if (!newAIRule.actionTarget.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter an action target",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const result = await createAIRule({
        name: newAIRule.name,
        triggerType: newAIRule.triggerType,
        triggerDetails: newAIRule.triggerDetails,
        actionType: newAIRule.actionType,
        actionTarget: newAIRule.actionTarget,
        priority: newAIRule.priority,
        active: newAIRule.active
      });
      
      if (result) {
        // Show success toast
        toast({
          title: "Success",
          description: `AI rule "${result.name}" created successfully.`,
        });
        
        // Reset form and close dialog
        setNewAIRule({
          name: '',
          triggerType: 'keywords',
          triggerDetails: '',
          actionType: 'escalate',
          actionTarget: '',
          priority: 'medium',
          active: true
        });
        setCreateAIRuleDialogOpen(false);
      } else {
        // Show error toast
        toast({
          title: "Error",
          description: "Failed to create AI rule. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Show error toast
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      console.error('Failed to create AI rule:', error);
    }
  };

  // Handle edit routing rule
  const handleEditRule = async (updates: UpdateRoutingRuleRequest) => {
    try {
      const result = await updateRule(updates.id, updates);
      
      if (result) {
        // Show success toast
        toast({
          title: "Success",
          description: `Routing rule "${result.name}" updated successfully.`,
        });
        
        // Close dialog and clear editing state
        setEditDialogOpen(false);
        setEditingRule(null);
      } else {
        // Show error toast
        toast({
          title: "Error",
          description: "Failed to update routing rule. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Show error toast
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      console.error('Failed to update routing rule:', error);
    }
  };

  // Handle edit button click
  const handleEditButtonClick = (rule: RoutingRule) => {
    setEditingRule(rule);
    setEditDialogOpen(true);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-gray-600">Manage system configuration and permissions</p>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="routing">Data Pipeline</TabsTrigger>
          <TabsTrigger value="ai-rules">AI Rules</TabsTrigger>
        </TabsList>

        {/* Data Pipeline Tab */}
        <TabsContent value="routing" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Data Pipeline & Routing Rules</CardTitle>
                <CardDescription>Configure automatic routing to stakeholders based on categories and departments</CardDescription>
              </div>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Routing Rule
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Routing Rule</DialogTitle>
                    <DialogDescription>Set up automatic routing for specific categories or departments</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="rule-name">Rule Name</Label>
                      <Input 
                        id="rule-name" 
                        placeholder="e.g., Safety Critical Issues" 
                        value={newRule.name}
                        onChange={(e) => setNewRule({...newRule, name: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Categories</Label>
                        <CategoryMultiSelect
                          selected={newRule.category}
                          onChange={(selected) => setNewRule({...newRule, category: selected})}
                          disabled={creatingRule}
                          placeholder="Select categories..."
                        />
                      </div>
                      <div>
                        <Label>Departments</Label>
                        <DepartmentMultiSelect
                          selected={newRule.department}
                          onChange={(selected) => setNewRule({...newRule, department: selected})}
                          disabled={creatingRule}
                          placeholder="Select departments..."
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="stakeholders">Stakeholder Emails (comma-separated)</Label>
                      <Input 
                        id="stakeholders" 
                        placeholder="safety@vvgtruck.com, compliance@vvgtruck.com" 
                        value={newRule.stakeholders}
                        onChange={(e) => setNewRule({...newRule, stakeholders: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select 
                        value={newRule.priority}
                        onValueChange={(value) => setNewRule({...newRule, priority: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="auto-route" 
                        checked={newRule.autoRoute}
                        onCheckedChange={(checked) => setNewRule({...newRule, autoRoute: checked})}
                      />
                      <Label htmlFor="auto-route">Enable automatic routing</Label>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => setCreateDialogOpen(false)}
                        disabled={creatingRule}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleCreateRule}
                        disabled={creatingRule}
                      >
                        {creatingRule ? 'Creating...' : 'Create Rule'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {routingRulesLoading && (
                  <div className="flex items-center justify-center p-8">
                    <div className="text-sm text-gray-500">Loading routing rules...</div>
                  </div>
                )}
                
                {routingRulesError && (
                  <div className="flex items-center justify-center p-8">
                    <div className="text-sm text-red-500">Error: {routingRulesError}</div>
                  </div>
                )}
                
                {!routingRulesLoading && !routingRulesError && routingRules.map((rule) => (
                  <div key={rule.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{rule.name}</h3>
                          <Badge variant={rule.priority === 'critical' ? 'destructive' : rule.priority === 'high' ? 'default' : 'secondary'}>
                            {rule.priority}
                          </Badge>
                          {rule.active && (
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          )}
                        </div>
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <GitBranch className="h-4 w-4" />
                            <span>Categories:</span>
                            <MultiSelectPills
                              items={rule.category.map(cat => ({ value: cat, label: cat }))}
                              onRemove={() => {}} // Read-only display
                              className="gap-1"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <GitBranch className="h-4 w-4" />
                            <span>Departments:</span>
                            <MultiSelectPills
                              items={rule.department.map(dept => ({ value: dept, label: dept }))}
                              onRemove={() => {}} // Read-only display
                              className="gap-1"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            <span>Routes to: {rule.stakeholders.join(', ')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={rule.active} 
                          onCheckedChange={async (active) => {
                            const result = await toggleRule(rule.id, active);
                            if (result) {
                              toast({
                                title: "Success",
                                description: `Routing rule "${rule.name}" ${active ? 'enabled' : 'disabled'}.`,
                              });
                            } else {
                              toast({
                                title: "Error",
                                description: "Failed to update routing rule.",
                                variant: "destructive",
                              });
                            }
                          }}
                          disabled={updatingRule}
                        />
                        <Button 
                          size="sm" 
                          variant="outline" 
                          disabled={updatingRule}
                          onClick={() => handleEditButtonClick(rule)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          disabled={deletingRule}
                          onClick={async () => {
                            if (confirm(`Are you sure you want to delete "${rule.name}"?`)) {
                              const success = await deleteRule(rule.id);
                              if (success) {
                                toast({
                                  title: "Success",
                                  description: `Routing rule "${rule.name}" deleted successfully.`,
                                });
                              } else {
                                toast({
                                  title: "Error",
                                  description: "Failed to delete routing rule.",
                                  variant: "destructive",
                                });
                              }
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {!routingRulesLoading && !routingRulesError && routingRules.length === 0 && (
                  <div className="flex items-center justify-center p-8">
                    <div className="text-sm text-gray-500">No routing rules configured</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Rules Tab */}
        <TabsContent value="ai-rules" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>AI-Powered Rules Engine</CardTitle>
                <CardDescription>Configure AI to automatically detect patterns and route or flag submissions</CardDescription>
              </div>
              <Dialog open={createAIRuleDialogOpen} onOpenChange={setCreateAIRuleDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add AI Rule
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create AI Rule</DialogTitle>
                    <DialogDescription>Define triggers and actions for automatic processing</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="ai-rule-name">Rule Name</Label>
                      <Input 
                        id="ai-rule-name" 
                        placeholder="e.g., Safety Keyword Detection" 
                        value={newAIRule.name}
                        onChange={(e) => setNewAIRule({...newAIRule, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="trigger">Trigger Condition</Label>
                      <Select 
                        value={newAIRule.triggerType} 
                        onValueChange={(value: any) => setNewAIRule({...newAIRule, triggerType: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select trigger type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="keywords">Contains Keywords</SelectItem>
                          <SelectItem value="similarity">Similar to Existing</SelectItem>
                          <SelectItem value="sentiment">Negative Sentiment</SelectItem>
                          <SelectItem value="length">Content Length</SelectItem>
                          <SelectItem value="custom">Custom AI Analysis</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="trigger-details">Trigger Details</Label>
                      <Input 
                        id="trigger-details" 
                        placeholder="e.g., safety, hazard, danger, accident" 
                        value={newAIRule.triggerDetails}
                        onChange={(e) => setNewAIRule({...newAIRule, triggerDetails: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="action">Action</Label>
                        <Select 
                          value={newAIRule.actionType} 
                          onValueChange={(value: any) => setNewAIRule({...newAIRule, actionType: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select action" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="escalate">Escalate to Email</SelectItem>
                            <SelectItem value="tag">Add Tag</SelectItem>
                            <SelectItem value="flag">Flag for Review</SelectItem>
                            <SelectItem value="hold">Hold for Clarification</SelectItem>
                            <SelectItem value="ignore">Ignore/Archive</SelectItem>
                            <SelectItem value="route">Route to Department</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="target">Target</Label>
                        <Input 
                          id="target" 
                          placeholder="Email or tag name" 
                          value={newAIRule.actionTarget}
                          onChange={(e) => setNewAIRule({...newAIRule, actionTarget: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="ai-priority">Priority</Label>
                      <Select 
                        value={newAIRule.priority} 
                        onValueChange={(value: any) => setNewAIRule({...newAIRule, priority: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => setCreateAIRuleDialogOpen(false)}
                        disabled={creatingAIRule}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleCreateAIRule}
                        disabled={creatingAIRule}
                      >
                        {creatingAIRule ? 'Creating...' : 'Create Rule'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {aiRulesLoading && (
                  <div className="flex items-center justify-center p-8">
                    <div className="text-sm text-gray-500">Loading AI rules...</div>
                  </div>
                )}
                
                {aiRulesError && (
                  <div className="flex items-center justify-center p-8">
                    <div className="text-sm text-red-500">Error: {aiRulesError}</div>
                  </div>
                )}
                
                {!aiRulesLoading && !aiRulesError && aiRules.map((rule) => (
                  <div key={rule.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Bot className="h-4 w-4 text-blue-600" />
                          <h3 className="font-semibold">{rule.name}</h3>
                          <Badge variant={
                            rule.priority === 'critical' ? 'destructive' : 
                            rule.priority === 'high' ? 'default' : 
                            rule.priority === 'medium' ? 'secondary' : 'outline'
                          }>
                            {rule.priority}
                          </Badge>
                          {rule.active && (
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          )}
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Zap className="h-4 w-4" />
                            <span className="font-medium">Trigger:</span>
                            <span>{triggerTypeDisplay[rule.triggerType]}: {rule.triggerDetails}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <ArrowRight className="h-4 w-4" />
                            <span className="font-medium">Action:</span>
                            <span className="capitalize">{actionTypeDisplay[rule.actionType]} → {rule.actionTarget}</span>
                          </div>
                          <div className="text-gray-500">
                            Last triggered: {rule.lastTriggeredAt ? new Date(rule.lastTriggeredAt).toLocaleDateString() : 'Never'}
                          </div>
                          <div className="text-gray-500">
                            Triggered {rule.triggerCount} times
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={rule.active} 
                          onCheckedChange={async (active) => {
                            const result = await toggleAIRule(rule.id, active);
                            if (result) {
                              toast({
                                title: "Success",
                                description: `AI rule "${rule.name}" ${active ? 'enabled' : 'disabled'}.`,
                              });
                            } else {
                              toast({
                                title: "Error",
                                description: "Failed to update AI rule.",
                                variant: "destructive",
                              });
                            }
                          }}
                          disabled={updatingAIRule}
                        />
                        <Button size="sm" variant="outline" disabled={updatingAIRule}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          disabled={deletingAIRule}
                          onClick={async () => {
                            if (confirm(`Are you sure you want to delete "${rule.name}"?`)) {
                              const success = await deleteAIRule(rule.id);
                              if (success) {
                                toast({
                                  title: "Success",
                                  description: `AI rule "${rule.name}" deleted successfully.`,
                                });
                              } else {
                                toast({
                                  title: "Error",
                                  description: "Failed to delete AI rule.",
                                  variant: "destructive",
                                });
                              }
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {!aiRulesLoading && !aiRulesError && aiRules.length === 0 && (
                  <div className="flex items-center justify-center p-8">
                    <div className="text-sm text-gray-500">No AI rules configured</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Weekly Triage</CardTitle>
              <CardDescription>Configure the AI bot that automatically triages submissions every week</CardDescription>
            </CardHeader>
            <CardContent>
              {aiTriageLoading && (
                <div className="flex items-center justify-center p-8">
                  <div className="text-sm text-gray-500">Loading AI triage status...</div>
                </div>
              )}
              
              {aiTriageError && (
                <div className="flex items-center justify-center p-8">
                  <div className="text-sm text-red-500">Error: {aiTriageError}</div>
                </div>
              )}
              
              {!aiTriageLoading && !aiTriageError && aiTriageStatus && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">Weekly AI Triage</h3>
                      <p className="text-sm text-gray-500">
                        {aiTriageStatus.config.scheduleCron === '0 9 * * 1' 
                          ? 'Runs every Monday at 9:00 AM' 
                          : `Schedule: ${aiTriageStatus.config.scheduleCron}`}
                      </p>
                      {aiTriageStatus.isRunning && (
                        <p className="text-sm text-blue-600 font-medium">Currently running...</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className="bg-blue-100 text-blue-800">
                        <Bot className="h-3 w-3 mr-1" />
                        AI Powered
                      </Badge>
                      <Switch 
                        checked={aiTriageStatus.config.enabled} 
                        disabled={true}
                      />
                      <Button 
                        size="sm" 
                        onClick={async () => {
                          const result = await triggerTriage();
                          if (result) {
                            toast({
                              title: "AI Triage Started",
                              description: "The AI triage process has been triggered and is now running.",
                            });
                          } else {
                            toast({
                              title: "Error",
                              description: "Failed to trigger AI triage. Please try again.",
                              variant: "destructive",
                            });
                          }
                        }}
                        disabled={triggeringTriage || aiTriageStatus.isRunning}
                      >
                        {triggeringTriage ? 'Triggering...' : 'Trigger Now'}
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium mb-1">Last Run</div>
                      <div className="text-gray-600">
                        {aiTriageStatus.lastRun?.completedAt 
                          ? new Date(aiTriageStatus.lastRun.completedAt).toLocaleString()
                          : 'Never run'
                        }
                      </div>
                      <div className="text-gray-500">
                        Processed {aiTriageStatus.lastRun?.itemsProcessed || 0} ideas
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium mb-1">Next Run</div>
                      <div className="text-gray-600">
                        {aiTriageStatus.nextRun.scheduledAt 
                          ? new Date(aiTriageStatus.nextRun.scheduledAt).toLocaleString()
                          : 'Not scheduled'
                        }
                      </div>
                      <div className="text-gray-500">
                        {aiTriageStatus.nextRun.pendingItems} ideas pending
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Performance</CardTitle>
              <CardDescription>Monitor how AI rules are performing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">847</div>
                  <div className="text-gray-600">Rules Triggered</div>
                  <div className="text-gray-500">Last 30 days</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">92%</div>
                  <div className="text-gray-600">Accuracy Rate</div>
                  <div className="text-gray-500">Based on feedback</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">3.2h</div>
                  <div className="text-gray-600">Time Saved</div>
                  <div className="text-gray-500">Per week average</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Edit Routing Rule Dialog */}
      <EditRoutingRuleDialog
        rule={editingRule}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSubmit={handleEditRule}
        loading={updatingRule}
      />
    </div>
  );
}