"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CategoryMultiSelect } from "@/components/forms/CategoryMultiSelect"
import { DepartmentMultiSelect } from "@/components/forms/DepartmentMultiSelect"
import { RoutingRule, UpdateRoutingRuleRequest } from "@/lib/types/data-pipeline"

interface EditRuleFormData {
  name: string
  category: string[]
  department: string[]
  stakeholders: string
  priority: string
  autoRoute: boolean
}

interface EditRoutingRuleDialogProps {
  rule: RoutingRule | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (updates: UpdateRoutingRuleRequest) => Promise<void>
  loading?: boolean
}

export function EditRoutingRuleDialog({
  rule,
  open,
  onOpenChange,
  onSubmit,
  loading = false
}: EditRoutingRuleDialogProps) {
  const [formData, setFormData] = React.useState<EditRuleFormData>({
    name: "",
    category: [],
    department: [],
    stakeholders: "",
    priority: "medium",
    autoRoute: true
  })

  // Update form data when rule changes
  React.useEffect(() => {
    if (rule) {
      setFormData({
        name: rule.name,
        category: rule.category,
        department: rule.department,
        stakeholders: rule.stakeholders.join(", "),
        priority: rule.priority,
        autoRoute: rule.autoRoute
      })
    }
  }, [rule])

  const handleSubmit = async () => {
    if (!rule) return

    // Parse stakeholders from comma-separated string
    const stakeholderEmails = formData.stakeholders
      .split(",")
      .map(email => email.trim())
      .filter(email => email.length > 0)

    const updates: UpdateRoutingRuleRequest = {
      id: rule.id,
      name: formData.name,
      category: formData.category,
      department: formData.department,
      stakeholders: stakeholderEmails,
      priority: formData.priority as 'low' | 'medium' | 'high' | 'critical',
      autoRoute: formData.autoRoute
    }

    await onSubmit(updates)
  }

  const isFormValid = () => {
    return (
      formData.name.trim().length > 0 &&
      formData.category.length > 0 &&
      formData.department.length > 0 &&
      formData.stakeholders.trim().length > 0
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Routing Rule</DialogTitle>
          <DialogDescription>
            Update automatic routing configuration for "{rule?.name}"
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Rule Name */}
          <div>
            <Label htmlFor="edit-rule-name">Rule Name</Label>
            <Input 
              id="edit-rule-name" 
              placeholder="e.g., Safety Critical Issues" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              disabled={loading}
            />
          </div>

          {/* Category and Department Multi-Select */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Categories</Label>
              <CategoryMultiSelect
                selected={formData.category}
                onChange={(selected) => setFormData({...formData, category: selected})}
                disabled={loading}
                placeholder="Select categories..."
              />
            </div>
            <div>
              <Label>Departments</Label>
              <DepartmentMultiSelect
                selected={formData.department}
                onChange={(selected) => setFormData({...formData, department: selected})}
                disabled={loading}
                placeholder="Select departments..."
              />
            </div>
          </div>

          {/* Stakeholder Emails */}
          <div>
            <Label htmlFor="edit-stakeholders">Stakeholder Emails (comma-separated)</Label>
            <Input 
              id="edit-stakeholders" 
              placeholder="safety@vvgtruck.com, compliance@vvgtruck.com" 
              value={formData.stakeholders}
              onChange={(e) => setFormData({...formData, stakeholders: e.target.value})}
              disabled={loading}
            />
          </div>

          {/* Priority */}
          <div>
            <Label htmlFor="edit-priority">Priority</Label>
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

          {/* Auto Route Toggle */}
          <div className="flex items-center space-x-2">
            <Switch 
              id="edit-auto-route" 
              checked={formData.autoRoute}
              onCheckedChange={(checked) => setFormData({...formData, autoRoute: checked})}
              disabled={loading}
            />
            <Label htmlFor="edit-auto-route">Enable automatic routing</Label>
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
              {loading ? "Updating..." : "Update Rule"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}