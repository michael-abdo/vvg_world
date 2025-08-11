"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AIRule, UpdateAIRuleRequest } from "@/lib/types/data-pipeline"

interface EditAIRuleFormData {
  name: string
  triggerType: string
  triggerDetails: string
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
    triggerType: "",
    triggerDetails: "",
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
        triggerType: rule.triggerType,
        triggerDetails: rule.triggerDetails,
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
      triggerType: formData.triggerType,
      triggerDetails: formData.triggerDetails,
      actionType: formData.actionType,
      actionTarget: formData.actionTarget,
      priority: formData.priority as 'low' | 'medium' | 'high' | 'critical',
      active: formData.active
    }

    await onSubmit(updates)
  }

  const isFormValid = () => {
    return (
      formData.name.trim().length > 0 &&
      formData.triggerType.trim().length > 0 &&
      formData.triggerDetails.trim().length > 0 &&
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

          {/* Trigger Type and Action Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-trigger-type">Trigger Type</Label>
              <Select 
                value={formData.triggerType}
                onValueChange={(value) => setFormData({...formData, triggerType: value})}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select trigger type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keyword_match">Keyword Match</SelectItem>
                  <SelectItem value="category_match">Category Match</SelectItem>
                  <SelectItem value="severity_threshold">Severity Threshold</SelectItem>
                  <SelectItem value="time_based">Time Based</SelectItem>
                  <SelectItem value="pattern_match">Pattern Match</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                  <SelectItem value="send_alert">Send Alert</SelectItem>
                  <SelectItem value="send_email">Send Email</SelectItem>
                  <SelectItem value="create_ticket">Create Ticket</SelectItem>
                  <SelectItem value="escalate">Escalate</SelectItem>
                  <SelectItem value="log_event">Log Event</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Trigger Details */}
          <div>
            <Label htmlFor="edit-trigger-details">Trigger Details</Label>
            <Input 
              id="edit-trigger-details" 
              placeholder="e.g., safety,urgent,critical" 
              value={formData.triggerDetails}
              onChange={(e) => setFormData({...formData, triggerDetails: e.target.value})}
              disabled={loading}
            />
          </div>

          {/* Action Target */}
          <div>
            <Label htmlFor="edit-action-target">Action Target</Label>
            <Input 
              id="edit-action-target" 
              placeholder="e.g., admin@vvgtruck.com" 
              value={formData.actionTarget}
              onChange={(e) => setFormData({...formData, actionTarget: e.target.value})}
              disabled={loading}
            />
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