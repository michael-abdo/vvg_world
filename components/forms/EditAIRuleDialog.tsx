"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AIRule, UpdateAIRuleRequest } from "@/lib/types/data-pipeline"

interface EditAIRuleFormData {
  name: string
  triggerPrompt: string
  actionType: string
  actionTarget: string
  priority: string
  active: boolean
}

interface EditAIRuleDialogProps {
  rule: AIRule | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (updates: UpdateAIRuleRequest) => Promise<void>
  loading?: boolean
}

export function EditAIRuleDialog({
  rule,
  open,
  onOpenChange,
  onSubmit,
  loading = false
}: EditAIRuleDialogProps) {
  const [formData, setFormData] = React.useState<EditAIRuleFormData>({
    name: "",
    triggerPrompt: "",
    actionType: "",
    actionTarget: "",
    priority: "medium",
    active: true
  })

  // Update form data when rule changes
  React.useEffect(() => {
    if (rule) {
      setFormData({
        name: rule.name,
        triggerPrompt: rule.triggerPrompt,
        actionType: rule.actionType,
        actionTarget: rule.actionTarget,
        priority: rule.priority,
        active: rule.active
      })
    }
  }, [rule])

  const handleSubmit = async () => {
    if (!rule) return

    const updates: UpdateAIRuleRequest = {
      id: rule.id,
      name: formData.name,
      triggerPrompt: formData.triggerPrompt,
      actionType: formData.actionType as 'send_email' | 'add_tag',
      actionTarget: formData.actionTarget,
      priority: formData.priority as 'low' | 'medium' | 'high' | 'critical',
      active: formData.active
    }

    await onSubmit(updates)
  }

  const isFormValid = () => {
    return (
      formData.name.trim().length > 0 &&
      formData.triggerPrompt.trim().length > 10 && // Require at least 10 characters for meaningful prompt
      formData.actionType.trim().length > 0 &&
      formData.actionTarget.trim().length > 0
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit AI Rule</DialogTitle>
          <DialogDescription>
            Update AI rule configuration for "{rule?.name}"
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Rule Name */}
          <div>
            <Label htmlFor="edit-ai-rule-name">Rule Name</Label>
            <Input 
              id="edit-ai-rule-name" 
              placeholder="e.g., High Priority Alert Trigger" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              disabled={loading}
            />
          </div>

          {/* AI Classification Prompt */}
          <div>
            <Label htmlFor="edit-trigger-prompt">AI Classification Prompt</Label>
            <Textarea 
              id="edit-trigger-prompt" 
              placeholder="Describe when this rule should trigger. For example: 'Classify messages about safety concerns, accidents, or hazardous conditions' or 'Identify cost-saving suggestions or budget optimization ideas'"
              value={formData.triggerPrompt}
              onChange={(e) => setFormData({...formData, triggerPrompt: e.target.value})}
              disabled={loading}
              rows={3}
              className="min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Write a clear description of when this rule should trigger. The AI will use this to classify incoming messages.
            </p>
          </div>

          {/* Action Type */}
          <div>
            <Label htmlFor="edit-action-type">Action Type</Label>
            <Select 
              value={formData.actionType}
              onValueChange={(value) => setFormData({...formData, actionType: value})}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select action type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="send_email">Send Email</SelectItem>
                <SelectItem value="add_tag">Add Tag</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Target */}
          <div>
            <Label htmlFor="edit-action-target">
              {formData.actionType === 'add_tag' ? 'Tag Name' : 'Email Address'}
            </Label>
            <Input 
              id="edit-action-target" 
              placeholder={formData.actionType === 'add_tag' 
                ? "e.g., safety-urgent, cost-reduction" 
                : "e.g., admin@vvgtruck.com, safety@vvgtruck.com"
              }
              value={formData.actionTarget}
              onChange={(e) => setFormData({...formData, actionTarget: e.target.value})}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {formData.actionType === 'add_tag' 
                ? 'Enter the tag name to add to matching messages'
                : 'Enter the email address to notify when this rule triggers'
              }
            </p>
          </div>

          {/* Priority */}
          <div>
            <Label htmlFor="edit-ai-rule-priority">Priority</Label>
            <Select 
              value={formData.priority}
              onValueChange={(value) => setFormData({...formData, priority: value})}
              disabled={loading}
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

          {/* Active Toggle */}
          <div className="flex items-center space-x-2">
            <Switch 
              id="edit-ai-rule-active" 
              checked={formData.active}
              onCheckedChange={(checked) => setFormData({...formData, active: checked})}
              disabled={loading}
            />
            <Label htmlFor="edit-ai-rule-active">Enable rule</Label>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={loading || !isFormValid()}
            >
              {loading ? "Updating..." : "Update AI Rule"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// EditAIRuleDialog component completed successfully