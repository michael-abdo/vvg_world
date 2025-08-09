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

const routingRules = [
  { 
    id: '1', 
    name: 'Safety Critical Issues',
    category: 'Safety',
    department: 'All',
    stakeholders: ['safety@vvgtruck.com', 'compliance@vvgtruck.com'],
    priority: 'high',
    autoRoute: true,
    active: true
  },
  { 
    id: '2', 
    name: 'Engineering Features',
    category: 'Tech',
    department: 'Engineering',
    stakeholders: ['engineering-leads@vvgtruck.com', 'john.smith@vvgtruck.com'],
    priority: 'medium',
    autoRoute: true,
    active: true
  },
  { 
    id: '3', 
    name: 'HR Culture Initiatives',
    category: 'Culture',
    department: 'HR',
    stakeholders: ['hr-team@vvgtruck.com', 'emily.davis@vvgtruck.com'],
    priority: 'medium',
    autoRoute: true,
    active: true
  },
  { 
    id: '4', 
    name: 'Product Improvements',
    category: 'Product',
    department: 'Product',
    stakeholders: ['product@vvgtruck.com', 'sarah.johnson@vvgtruck.com'],
    priority: 'high',
    autoRoute: true,
    active: true
  }
];

const aiRules = [
  {
    id: '1',
    name: 'Safety Keyword Detection',
    trigger: 'Contains keywords: hazard, danger, safety, accident, injury',
    action: 'escalate',
    target: 'safety@vvgtruck.com',
    priority: 'critical',
    active: true,
    lastTriggered: '2024-08-05'
  },
  {
    id: '2',
    name: 'Cost Reduction Ideas',
    trigger: 'Contains keywords: save money, reduce cost, efficiency, optimize',
    action: 'tag',
    target: 'cost-reduction',
    priority: 'high',
    active: true,
    lastTriggered: '2024-08-04'
  },
  {
    id: '3',
    name: 'Duplicate Detection',
    trigger: 'Similar to existing ideas (>80% similarity)',
    action: 'flag',
    target: 'duplicate-review',
    priority: 'medium',
    active: true,
    lastTriggered: '2024-08-06'
  },
  {
    id: '4',
    name: 'Low Quality Filter',
    trigger: 'Less than 50 characters OR no clear description',
    action: 'hold',
    target: 'needs-clarification',
    priority: 'low',
    active: false,
    lastTriggered: '2024-08-01'
  }
];

export default function SettingsPage() {
  const [selectedTab, setSelectedTab] = useState('departments');

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
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="routing">Data Pipeline</TabsTrigger>
          <TabsTrigger value="ai-rules">AI Rules</TabsTrigger>
          <TabsTrigger value="users">Users & Roles</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* Departments Tab */}
        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Department Management</CardTitle>
                <CardDescription>Organize your company structure and hierarchy</CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Department
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Department</DialogTitle>
                    <DialogDescription>Create a new department in your organization</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="dept-name">Department Name</Label>
                      <Input id="dept-name" placeholder="Enter department name" />
                    </div>
                    <div>
                      <Label htmlFor="parent-dept">Parent Department (Optional)</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select parent department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.filter(d => !d.parent).map(dept => (
                            <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline">Cancel</Button>
                      <Button>Create Department</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map((dept) => (
                    <TableRow key={dept.id}>
                      <TableCell className="font-medium">{dept.name}</TableCell>
                      <TableCell>{dept.parent || '-'}</TableCell>
                      <TableCell>{dept.members}</TableCell>
                      <TableCell>
                        <Badge variant={dept.active ? 'default' : 'secondary'}>
                          {dept.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Category Configuration</CardTitle>
                <CardDescription>Manage idea categories and their properties</CardDescription>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {categories.map((category) => (
                  <Card key={category.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: category.color }}
                          />
                          <h3 className="font-semibold">{category.name}</h3>
                        </div>
                        <Badge variant="outline">{category.count} ideas</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">{category.description}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Pipeline Tab */}
        <TabsContent value="routing" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Data Pipeline & Routing Rules</CardTitle>
                <CardDescription>Configure automatic routing to stakeholders based on categories and departments</CardDescription>
              </div>
              <Dialog>
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
                      <Input id="rule-name" placeholder="e.g., Safety Critical Issues" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="category">Category</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(cat => (
                              <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="department">Department</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Departments</SelectItem>
                            {departments.filter(d => !d.parent).map(dept => (
                              <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="stakeholders">Stakeholder Emails (comma-separated)</Label>
                      <Input id="stakeholders" placeholder="safety@vvgtruck.com, compliance@vvgtruck.com" />
                    </div>
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select>
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
                      <Switch id="auto-route" />
                      <Label htmlFor="auto-route">Enable automatic routing</Label>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline">Cancel</Button>
                      <Button>Create Rule</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {routingRules.map((rule) => (
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
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <GitBranch className="h-4 w-4" />
                            <span>Category: {rule.category} • Department: {rule.department}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            <span>Routes to: {rule.stakeholders.join(', ')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={rule.active} />
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Weekly Triage</CardTitle>
              <CardDescription>Configure the AI bot that automatically triages submissions every week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Weekly AI Triage</h3>
                    <p className="text-sm text-gray-500">Runs every Monday at 9:00 AM</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge className="bg-blue-100 text-blue-800">
                      <Bot className="h-3 w-3 mr-1" />
                      AI Powered
                    </Badge>
                    <Switch checked={true} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium mb-1">Last Run</div>
                    <div className="text-gray-600">Aug 5, 2024 - 9:00 AM</div>
                    <div className="text-gray-500">Processed 47 ideas</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium mb-1">Next Run</div>
                    <div className="text-gray-600">Aug 12, 2024 - 9:00 AM</div>
                    <div className="text-gray-500">23 ideas pending</div>
                  </div>
                </div>
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
              <Dialog>
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
                      <Input id="ai-rule-name" placeholder="e.g., Safety Keyword Detection" />
                    </div>
                    <div>
                      <Label htmlFor="trigger">Trigger Condition</Label>
                      <Select>
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
                      <Input id="trigger-details" placeholder="e.g., safety, hazard, danger, accident" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="action">Action</Label>
                        <Select>
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
                        <Input id="target" placeholder="Email or tag name" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="ai-priority">Priority</Label>
                      <Select>
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
                      <Button variant="outline">Cancel</Button>
                      <Button>Create Rule</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {aiRules.map((rule) => (
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
                            <span>{rule.trigger}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <ArrowRight className="h-4 w-4" />
                            <span className="font-medium">Action:</span>
                            <span className="capitalize">{rule.action} → {rule.target}</span>
                          </div>
                          <div className="text-gray-500">
                            Last triggered: {rule.lastTriggered}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={rule.active} />
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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

        {/* Users & Roles Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage user accounts and role assignments</CardDescription>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{user.department}</TableCell>
                      <TableCell>
                        <Badge variant={
                          user.role === 'admin' ? 'default' :
                          user.role === 'moderator' ? 'secondary' : 'outline'
                        }>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.active ? 'default' : 'secondary'}>
                          {user.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Shield className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Notification Settings</CardTitle>
              <CardDescription>Configure when and how notifications are sent</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {notifications.map((notification) => (
                  <div key={notification.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium">{notification.name}</h3>
                      <p className="text-sm text-gray-500">
                        Frequency: {notification.frequency} • Recipients: {notification.recipients}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Switch checked={notification.enabled} />
                      <Button size="sm" variant="outline">
                        <Settings2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>Customize email notification templates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <Button variant="outline" className="h-20 flex flex-col">
                  <Mail className="h-6 w-6 mb-2" />
                  New Idea Template
                </Button>
                <Button variant="outline" className="h-20 flex flex-col">
                  <Mail className="h-6 w-6 mb-2" />
                  Status Update Template
                </Button>
                <Button variant="outline" className="h-20 flex flex-col">
                  <Mail className="h-6 w-6 mb-2" />
                  Weekly Summary Template
                </Button>
                <Button variant="outline" className="h-20 flex flex-col">
                  <Mail className="h-6 w-6 mb-2" />
                  Monthly Report Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}