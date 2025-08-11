"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AITriageConfig, UpdateAITriageConfigRequest } from "@/lib/types/data-pipeline"

interface EditAITriageConfigFormData {
  enabled: boolean
  scheduleCron: string
  batchSize: number
  notifyAdmins: boolean
  adminEmails: string
  processingTimeoutMinutes: number
}

interface EditAITriageConfigDialogProps {
  rule: AITriageConfig | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (updates: UpdateAITriageConfigRequest) => Promise<void>
  loading?: boolean
}

export function EditAITriageConfigDialog({
  rule,
  open,
  onOpenChange,
  onSubmit,
  loading = false
}: EditAITriageConfigDialogProps) {
  const [formData, setFormData] = React.useState<EditAITriageConfigFormData>({
    enabled: true,
    scheduleCron: "0 9 * * 1",
    batchSize: 50,
    notifyAdmins: true,
    adminEmails: "",
    processingTimeoutMinutes: 30
  })

  // Update form data when rule changes
  React.useEffect(() => {
    if (rule) {
      setFormData({
        enabled: rule.enabled,
        scheduleCron: rule.scheduleCron,
        batchSize: rule.settings?.batchSize || 50,
        notifyAdmins: rule.settings?.notifyAdmins || true,
        adminEmails: rule.settings?.adminEmails?.join(", ") || "",
        processingTimeoutMinutes: rule.settings?.processingTimeoutMinutes || 30
      })
    }
  }, [rule])

  const handleSubmit = async () => {
    if (!rule) return

    // Parse admin emails from comma-separated string
    const adminEmailsArray = formData.adminEmails
      .split(",")
      .map(email => email.trim())
      .filter(email => email.length > 0)

    const updates: UpdateAITriageConfigRequest = {
      enabled: formData.enabled,
      scheduleCron: formData.scheduleCron,
      settings: {
        batchSize: formData.batchSize,
        notifyAdmins: formData.notifyAdmins,
        adminEmails: adminEmailsArray,
        processingTimeoutMinutes: formData.processingTimeoutMinutes
      }
    }

    await onSubmit(updates)
  }

  const isFormValid = () => {
    return (
      formData.scheduleCron.trim().length > 0 &&
      formData.batchSize > 0 &&
      formData.processingTimeoutMinutes > 0 &&
      formData.adminEmails.trim().length > 0
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit AI Triage Configuration</DialogTitle>
          <DialogDescription>
            Update AI triage settings and scheduling
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Enabled Toggle */}
          <div className="flex items-center space-x-2">
            <Switch 
              id="edit-enabled" 
              checked={formData.enabled}
              onCheckedChange={(checked) => setFormData({...formData, enabled: checked})}
              disabled={loading}
            />
            <Label htmlFor="edit-enabled">Enable AI Triage</Label>
          </div>

          {/* Schedule Cron Expression */}
          <div>
            <Label htmlFor="edit-schedule-cron">Schedule (Cron Expression)</Label>
            <Input 
              id="edit-schedule-cron" 
              placeholder="e.g., 0 9 * * 1 (Every Monday at 9 AM)" 
              value={formData.scheduleCron}
              onChange={(e) => setFormData({...formData, scheduleCron: e.target.value})}
              disabled={loading}
            />
          </div>

          {/* Batch Size and Timeout */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-batch-size">Batch Size</Label>
              <Input 
                id="edit-batch-size" 
                type="number"
                placeholder="50" 
                value={formData.batchSize}
                onChange={(e) => setFormData({...formData, batchSize: parseInt(e.target.value) || 50})}
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="edit-timeout">Processing Timeout (minutes)</Label>
              <Input 
                id="edit-timeout" 
                type="number"
                placeholder="30" 
                value={formData.processingTimeoutMinutes}
                onChange={(e) => setFormData({...formData, processingTimeoutMinutes: parseInt(e.target.value) || 30})}
                disabled={loading}
              />
            </div>
          </div>

          {/* Admin Emails */}
          <div>
            <Label htmlFor="edit-admin-emails">Admin Emails (comma-separated)</Label>
            <Input 
              id="edit-admin-emails" 
              placeholder="admin@vvgtruck.com, alerts@vvgtruck.com" 
              value={formData.adminEmails}
              onChange={(e) => setFormData({...formData, adminEmails: e.target.value})}
              disabled={loading}
            />
          </div>

          {/* Notify Admins Toggle */}
          <div className="flex items-center space-x-2">
            <Switch 
              id="edit-notify-admins" 
              checked={formData.notifyAdmins}
              onCheckedChange={(checked) => setFormData({...formData, notifyAdmins: checked})}
              disabled={loading}
            />
            <Label htmlFor="edit-notify-admins">Notify admins of triage results</Label>
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
              {loading ? "Updating..." : "Update Configuration"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}