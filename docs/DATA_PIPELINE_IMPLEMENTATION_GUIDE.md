# Data Pipeline Implementation Guide
## Risk-Minimized, UI-Testable Implementation Plan

This guide breaks down the data pipeline routing system into atomic, testable chunks that allow UI verification at every step.

---

## Overview

**Total Implementation Time**: ~66 hours  
**Recommended Pace**: 2-3 hours/day over 4-5 weeks  
**Risk Level**: Progressively increases from Zero to High  
**Rollback Strategy**: Available at every phase  

---

## Phase 0: Read-Only UI (Zero Risk) ⭐
**Time**: 2 hours  
**Risk**: None  
**Value**: Immediate UI visibility without backend  

### Atomic Steps:

1. **Keep existing mock data in settings page**
   - Open `/app/admin/settings/page.tsx`
   - Verify mock `routingRules` array exists (lines 55-96)
   - Do NOT modify or remove

2. **Add visual save indicators**
   - In Data Pipeline tab, add to each rule card:
   ```typescript
   const [saving, setSaving] = useState(false);
   const [saved, setSaved] = useState(false);
   ```
   - Add save button that shows spinner for 1 second
   - Show checkmark after "save"

3. **Add rule matching preview**
   - Create new component `RuleMatchPreview.tsx`
   - Input: category, department, keywords
   - Output: highlight which rules would match
   - Use mock data only

4. **Test Plan**
   - Click "Save" on any rule
   - See spinner → checkmark
   - Enter test data in preview
   - See matching rules highlight

---

## Phase 1: Database Tables Only (Low Risk) ✅
**Time**: 4 hours  
**Risk**: Low - New tables only  
**Value**: Database foundation  

### Atomic Steps:

1. **Create migration file**
   ```bash
   touch /database/migrations/002_routing_rules_foundation.sql
   ```

2. **Write minimal schema**
   ```sql
   -- Only the core table first
   CREATE TABLE IF NOT EXISTS routing_rules (
     id INT AUTO_INCREMENT PRIMARY KEY,
     name VARCHAR(100) NOT NULL,
     category_match VARCHAR(50),
     department_match VARCHAR(100),
     is_active BOOLEAN DEFAULT TRUE,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
   );
   
   -- Insert test data
   INSERT INTO routing_rules (name, category_match) VALUES
   ('Safety Router', 'Safety'),
   ('Efficiency Router', 'Efficiency');
   ```

3. **Run migration**
   ```bash
   # Use existing migration endpoint
   curl -X POST http://localhost:3002/api/migrate-db
   ```

4. **Create debug UI page**
   - Create `/app/admin/debug/page.tsx`
   ```typescript
   'use client';
   import { useEffect, useState } from 'react';
   
   export default function DebugPage() {
     const [dbStatus, setDbStatus] = useState({
       tablesExist: false,
       ruleCount: 0,
       lastCheck: null
     });
     
     // Fetch status on mount
     useEffect(() => {
       fetch('/api/admin/debug/db-status')
         .then(res => res.json())
         .then(setDbStatus);
     }, []);
     
     return (
       <div className="p-6">
         <h1>Database Status</h1>
         <div>
           ✓ routing_rules exists: {dbStatus.tablesExist ? 'Yes' : 'No'}
           ✓ Rules in database: {dbStatus.ruleCount}
           ✓ Last checked: {dbStatus.lastCheck}
         </div>
       </div>
     );
   }
   ```

5. **Create status check API**
   - Create `/app/api/admin/debug/db-status/route.ts`
   ```typescript
   export async function GET() {
     try {
       const result = await executeQuery({
         query: 'SELECT COUNT(*) as count FROM routing_rules'
       });
       
       return NextResponse.json({
         tablesExist: true,
         ruleCount: result[0].count,
         lastCheck: new Date().toISOString()
       });
     } catch (error) {
       return NextResponse.json({
         tablesExist: false,
         ruleCount: 0,
         error: error.message
       });
     }
   }
   ```

6. **Test Plan**
   - Navigate to `/admin/debug`
   - Verify shows "routing_rules exists: Yes"
   - Verify shows "Rules in database: 2"
   - No errors in console

---

## Phase 2: Read API + Real Data (Low Risk) 📖
**Time**: 4 hours  
**Risk**: Low - Read-only operations  
**Value**: Real data in UI  

### Atomic Steps:

1. **Create routing database interface**
   - Create `/lib/routing-db.ts`
   ```typescript
   import { executeQuery } from './db';
   
   export interface RoutingRule {
     id: number;
     name: string;
     category_match: string | null;
     department_match: string | null;
     is_active: boolean;
     created_at: string;
     updated_at: string;
   }
   
   export const routingDb = {
     async getAllRules(): Promise<RoutingRule[]> {
       const result = await executeQuery<RoutingRule[]>({
         query: 'SELECT * FROM routing_rules ORDER BY created_at DESC'
       });
       return result;
     }
   };
   ```

2. **Create read API endpoint**
   - Create `/app/api/admin/routing/rules/route.ts`
   ```typescript
   import { NextRequest, NextResponse } from 'next/server';
   import { routingDb } from '@/lib/routing-db';
   import { verifySession } from '@/lib/dal';
   
   export async function GET(request: NextRequest) {
     try {
       // Check auth
       await verifySession();
       
       // Get rules
       const rules = await routingDb.getAllRules();
       
       return NextResponse.json({
         success: true,
         data: rules
       });
     } catch (error) {
       return NextResponse.json({
         success: false,
         error: error.message
       }, { status: 500 });
     }
   }
   ```

3. **Update settings page to fetch real data**
   - Modify `/app/admin/settings/page.tsx`
   ```typescript
   // Add to imports
   import { useEffect, useState } from 'react';
   
   // Replace mock data with state
   const [routingRules, setRoutingRules] = useState([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);
   
   // Add data fetching
   useEffect(() => {
     fetchRules();
   }, []);
   
   const fetchRules = async () => {
     try {
       setLoading(true);
       const response = await fetch('/api/admin/routing/rules');
       const result = await response.json();
       
       if (result.success) {
         setRoutingRules(result.data);
       } else {
         setError(result.error);
       }
     } catch (err) {
       setError(err.message);
     } finally {
       setLoading(false);
     }
   };
   ```

4. **Add loading states**
   ```typescript
   if (loading) {
     return <div className="p-6">Loading routing rules...</div>;
   }
   
   if (error) {
     return <div className="p-6 text-red-600">Error: {error}</div>;
   }
   
   if (routingRules.length === 0) {
     return (
       <div className="p-6">
         <p>No routing rules configured</p>
         <Button>Create First Rule</Button>
       </div>
     );
   }
   ```

5. **Map database fields to UI**
   ```typescript
   // Update rule display to use real fields
   {routingRules.map((rule) => (
     <div key={rule.id}>
       <h3>{rule.name}</h3>
       <p>Category: {rule.category_match || 'Any'}</p>
       <p>Department: {rule.department_match || 'Any'}</p>
       <Badge>{rule.is_active ? 'Active' : 'Inactive'}</Badge>
     </div>
   ))}
   ```

6. **Test Plan**
   - Navigate to Settings → Data Pipeline
   - Should see loading state briefly
   - Should see 2 rules from database
   - Verify no console errors
   - Refresh page - data persists

---

## Phase 3: Create Rules UI (Low Risk) ➕
**Time**: 6 hours  
**Risk**: Low - Adding new data  
**Value**: Full rule creation  

### Atomic Steps:

1. **Extend database interface**
   ```typescript
   // Add to routingDb in routing-db.ts
   async createRule(data: {
     name: string;
     category_match?: string;
     department_match?: string;
   }): Promise<RoutingRule> {
     const result = await executeQuery<{insertId: number}>({
       query: `
         INSERT INTO routing_rules (name, category_match, department_match)
         VALUES (?, ?, ?)
       `,
       values: [data.name, data.category_match || null, data.department_match || null]
     });
     
     // Return the created rule
     return this.getRuleById(result.insertId);
   },
   
   async getRuleById(id: number): Promise<RoutingRule> {
     const result = await executeQuery<RoutingRule[]>({
       query: 'SELECT * FROM routing_rules WHERE id = ?',
       values: [id]
     });
     return result[0];
   }
   ```

2. **Create POST endpoint**
   ```typescript
   // Add to /app/api/admin/routing/rules/route.ts
   export async function POST(request: NextRequest) {
     try {
       await verifySession();
       
       const body = await request.json();
       
       // Validate input
       if (!body.name) {
         return NextResponse.json({
           success: false,
           error: 'Rule name is required'
         }, { status: 400 });
       }
       
       // Create rule
       const rule = await routingDb.createRule({
         name: body.name,
         category_match: body.category_match,
         department_match: body.department_match
       });
       
       return NextResponse.json({
         success: true,
         data: rule
       }, { status: 201 });
     } catch (error) {
       return NextResponse.json({
         success: false,
         error: error.message
       }, { status: 500 });
     }
   }
   ```

3. **Create rule form component**
   - Create `/components/routing/create-rule-form.tsx`
   ```typescript
   import { useState } from 'react';
   import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
   import { Button } from '@/components/ui/button';
   import { Input } from '@/components/ui/input';
   import { Label } from '@/components/ui/label';
   import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
   import { toast } from '@/components/ui/use-toast';
   
   export function CreateRuleDialog({ open, onClose, onSuccess }) {
     const [formData, setFormData] = useState({
       name: '',
       category_match: '',
       department_match: ''
     });
     const [saving, setSaving] = useState(false);
     
     const handleSubmit = async (e) => {
       e.preventDefault();
       setSaving(true);
       
       try {
         const response = await fetch('/api/admin/routing/rules', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(formData)
         });
         
         const result = await response.json();
         
         if (result.success) {
           toast({
             title: 'Success',
             description: 'Routing rule created successfully'
           });
           onSuccess(result.data);
           onClose();
           setFormData({ name: '', category_match: '', department_match: '' });
         } else {
           toast({
             title: 'Error',
             description: result.error,
             variant: 'destructive'
           });
         }
       } catch (error) {
         toast({
           title: 'Error',
           description: 'Failed to create rule',
           variant: 'destructive'
         });
       } finally {
         setSaving(false);
       }
     };
     
     return (
       <Dialog open={open} onOpenChange={onClose}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Create Routing Rule</DialogTitle>
           </DialogHeader>
           <form onSubmit={handleSubmit} className="space-y-4">
             <div>
               <Label htmlFor="name">Rule Name</Label>
               <Input
                 id="name"
                 value={formData.name}
                 onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                 placeholder="e.g., Safety Critical Issues"
                 required
               />
             </div>
             
             <div>
               <Label htmlFor="category">Category</Label>
               <Select
                 value={formData.category_match}
                 onValueChange={(value) => setFormData({ ...formData, category_match: value })}
               >
                 <SelectTrigger>
                   <SelectValue placeholder="Select category (optional)" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="">Any Category</SelectItem>
                   <SelectItem value="Safety">Safety</SelectItem>
                   <SelectItem value="Efficiency">Efficiency</SelectItem>
                   <SelectItem value="Cost Savings">Cost Savings</SelectItem>
                   <SelectItem value="Quality">Quality</SelectItem>
                   <SelectItem value="Other">Other</SelectItem>
                 </SelectContent>
               </Select>
             </div>
             
             <div>
               <Label htmlFor="department">Department</Label>
               <Input
                 id="department"
                 value={formData.department_match}
                 onChange={(e) => setFormData({ ...formData, department_match: e.target.value })}
                 placeholder="e.g., Engineering (optional)"
               />
             </div>
             
             <div className="flex justify-end gap-2">
               <Button type="button" variant="outline" onClick={onClose}>
                 Cancel
               </Button>
               <Button type="submit" disabled={saving}>
                 {saving ? 'Creating...' : 'Create Rule'}
               </Button>
             </div>
           </form>
         </DialogContent>
       </Dialog>
     );
   }
   ```

4. **Add create button to settings page**
   ```typescript
   // Add state for dialog
   const [createDialogOpen, setCreateDialogOpen] = useState(false);
   
   // Add button in header
   <Button onClick={() => setCreateDialogOpen(true)}>
     <Plus className="h-4 w-4 mr-2" />
     Add Routing Rule
   </Button>
   
   // Add dialog component
   <CreateRuleDialog
     open={createDialogOpen}
     onClose={() => setCreateDialogOpen(false)}
     onSuccess={(newRule) => {
       setRoutingRules([newRule, ...routingRules]);
       setCreateDialogOpen(false);
     }}
   />
   ```

5. **Add optimistic updates**
   ```typescript
   // In onSuccess callback
   onSuccess={(newRule) => {
     // Immediately add to UI
     setRoutingRules(prev => [newRule, ...prev]);
     
     // Optionally refetch to ensure sync
     fetchRules();
   }}
   ```

6. **Test Plan**
   - Click "Add Routing Rule"
   - Fill form with test data
   - Submit and see success toast
   - New rule appears at top of list
   - Refresh page - rule persists
   - Try empty name - see validation error

---

## Phase 4: Edit/Delete Rules (Low Risk) ✏️
**Time**: 4 hours  
**Risk**: Low - Modifying own data  
**Value**: Complete CRUD operations  

### Atomic Steps:

1. **Add update/delete to database interface**
   ```typescript
   // Add to routingDb
   async updateRule(id: number, data: Partial<RoutingRule>): Promise<RoutingRule> {
     const fields = [];
     const values = [];
     
     if (data.name !== undefined) {
       fields.push('name = ?');
       values.push(data.name);
     }
     if (data.category_match !== undefined) {
       fields.push('category_match = ?');
       values.push(data.category_match);
     }
     if (data.department_match !== undefined) {
       fields.push('department_match = ?');
       values.push(data.department_match);
     }
     if (data.is_active !== undefined) {
       fields.push('is_active = ?');
       values.push(data.is_active);
     }
     
     values.push(id);
     
     await executeQuery({
       query: `UPDATE routing_rules SET ${fields.join(', ')} WHERE id = ?`,
       values
     });
     
     return this.getRuleById(id);
   },
   
   async deleteRule(id: number): Promise<void> {
     await executeQuery({
       query: 'DELETE FROM routing_rules WHERE id = ?',
       values: [id]
     });
   }
   ```

2. **Create individual rule API**
   - Create `/app/api/admin/routing/rules/[id]/route.ts`
   ```typescript
   export async function PUT(request: NextRequest, { params }) {
     try {
       await verifySession();
       
       const id = parseInt(params.id);
       const body = await request.json();
       
       const updatedRule = await routingDb.updateRule(id, body);
       
       return NextResponse.json({
         success: true,
         data: updatedRule
       });
     } catch (error) {
       return NextResponse.json({
         success: false,
         error: error.message
       }, { status: 500 });
     }
   }
   
   export async function DELETE(request: NextRequest, { params }) {
     try {
       await verifySession();
       
       const id = parseInt(params.id);
       await routingDb.deleteRule(id);
       
       return NextResponse.json({
         success: true,
         message: 'Rule deleted successfully'
       });
     } catch (error) {
       return NextResponse.json({
         success: false,
         error: error.message
       }, { status: 500 });
     }
   }
   ```

3. **Create edit dialog component**
   ```typescript
   // Similar to create dialog but pre-filled
   export function EditRuleDialog({ rule, open, onClose, onSuccess }) {
     const [formData, setFormData] = useState({
       name: rule?.name || '',
       category_match: rule?.category_match || '',
       department_match: rule?.department_match || ''
     });
     
     useEffect(() => {
       if (rule) {
         setFormData({
           name: rule.name,
           category_match: rule.category_match || '',
           department_match: rule.department_match || ''
         });
       }
     }, [rule]);
     
     const handleSubmit = async (e) => {
       e.preventDefault();
       
       const response = await fetch(`/api/admin/routing/rules/${rule.id}`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(formData)
       });
       
       // ... rest similar to create
     };
   }
   ```

4. **Add delete confirmation**
   ```typescript
   export function DeleteConfirmDialog({ rule, open, onClose, onSuccess }) {
     const [deleting, setDeleting] = useState(false);
     
     const handleDelete = async () => {
       setDeleting(true);
       
       try {
         const response = await fetch(`/api/admin/routing/rules/${rule.id}`, {
           method: 'DELETE'
         });
         
         const result = await response.json();
         
         if (result.success) {
           toast({
             title: 'Success',
             description: 'Rule deleted successfully'
           });
           onSuccess(rule.id);
         }
       } catch (error) {
         toast({
           title: 'Error',
           description: 'Failed to delete rule',
           variant: 'destructive'
         });
       } finally {
         setDeleting(false);
         onClose();
       }
     };
     
     return (
       <AlertDialog open={open} onOpenChange={onClose}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Delete Routing Rule</AlertDialogTitle>
             <AlertDialogDescription>
               Are you sure you want to delete "{rule?.name}"? This action cannot be undone.
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel>Cancel</AlertDialogCancel>
             <AlertDialogAction onClick={handleDelete} disabled={deleting}>
               {deleting ? 'Deleting...' : 'Delete'}
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
     );
   }
   ```

5. **Add action buttons to each rule**
   ```typescript
   // Add state for selected rule
   const [editingRule, setEditingRule] = useState(null);
   const [deletingRule, setDeletingRule] = useState(null);
   
   // In rule display
   <div className="flex gap-2">
     <Button 
       size="sm" 
       variant="outline"
       onClick={() => setEditingRule(rule)}
     >
       <Edit className="h-4 w-4" />
     </Button>
     <Button 
       size="sm" 
       variant="outline"
       onClick={() => setDeletingRule(rule)}
     >
       <Trash2 className="h-4 w-4" />
     </Button>
   </div>
   
   // Add dialogs
   <EditRuleDialog
     rule={editingRule}
     open={!!editingRule}
     onClose={() => setEditingRule(null)}
     onSuccess={(updatedRule) => {
       setRoutingRules(prev => 
         prev.map(r => r.id === updatedRule.id ? updatedRule : r)
       );
       setEditingRule(null);
     }}
   />
   
   <DeleteConfirmDialog
     rule={deletingRule}
     open={!!deletingRule}
     onClose={() => setDeletingRule(null)}
     onSuccess={(deletedId) => {
       setRoutingRules(prev => prev.filter(r => r.id !== deletedId));
       setDeletingRule(null);
     }}
   />
   ```

6. **Test Plan**
   - Click edit on any rule
   - Change name and save
   - See success toast and updated list
   - Click delete on a rule
   - Confirm deletion
   - Rule disappears from list
   - Refresh - changes persist

---

## Phase 5: Rule Testing UI (Medium Risk) 🧪
**Time**: 8 hours  
**Risk**: Medium - Complex logic  
**Value**: Preview without side effects  

### Atomic Steps:

1. **Create rule matching logic**
   ```typescript
   // Add to routing-db.ts
   async testRules(testData: {
     category: string;
     department: string;
     title: string;
     description: string;
   }): Promise<{
     matchedRules: RoutingRule[];
     reasoning: string[];
   }> {
     // Get all active rules
     const rules = await this.getAllRules();
     const activeRules = rules.filter(r => r.is_active);
     
     const matchedRules = [];
     const reasoning = [];
     
     for (const rule of activeRules) {
       let matches = true;
       const reasons = [];
       
       // Check category match
       if (rule.category_match) {
         if (testData.category === rule.category_match) {
           reasons.push(`✓ Category matches: ${rule.category_match}`);
         } else {
           matches = false;
           reasons.push(`✗ Category doesn't match: expected ${rule.category_match}, got ${testData.category}`);
         }
       }
       
       // Check department match
       if (rule.department_match) {
         if (testData.department.toLowerCase().includes(rule.department_match.toLowerCase())) {
           reasons.push(`✓ Department matches: ${rule.department_match}`);
         } else {
           matches = false;
           reasons.push(`✗ Department doesn't match: expected ${rule.department_match}, got ${testData.department}`);
         }
       }
       
       if (matches) {
         matchedRules.push(rule);
         reasoning.push(`Rule "${rule.name}" matched: ${reasons.join(', ')}`);
       } else {
         reasoning.push(`Rule "${rule.name}" didn't match: ${reasons.join(', ')}`);
       }
     }
     
     return { matchedRules, reasoning };
   }
   ```

2. **Create test API endpoint**
   ```typescript
   // Create /app/api/admin/routing/test/route.ts
   export async function POST(request: NextRequest) {
     try {
       await verifySession();
       
       const body = await request.json();
       
       // Validate input
       if (!body.category || !body.title) {
         return NextResponse.json({
           success: false,
           error: 'Category and title are required'
         }, { status: 400 });
       }
       
       // Test rules
       const result = await routingDb.testRules({
         category: body.category,
         department: body.department || '',
         title: body.title,
         description: body.description || ''
       });
       
       return NextResponse.json({
         success: true,
         data: result
       });
     } catch (error) {
       return NextResponse.json({
         success: false,
         error: error.message
       }, { status: 500 });
     }
   }
   ```

3. **Create test UI component**
   ```typescript
   // Create /components/routing/rule-tester.tsx
   export function RuleTester() {
     const [testData, setTestData] = useState({
       category: '',
       department: '',
       title: '',
       description: ''
     });
     const [testing, setTesting] = useState(false);
     const [results, setResults] = useState(null);
     
     const handleTest = async () => {
       setTesting(true);
       setResults(null);
       
       try {
         const response = await fetch('/api/admin/routing/test', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(testData)
         });
         
         const result = await response.json();
         
         if (result.success) {
           setResults(result.data);
         } else {
           toast({
             title: 'Error',
             description: result.error,
             variant: 'destructive'
           });
         }
       } catch (error) {
         toast({
           title: 'Error',
           description: 'Failed to test rules',
           variant: 'destructive'
         });
       } finally {
         setTesting(false);
       }
     };
     
     return (
       <Card>
         <CardHeader>
           <CardTitle>Test Routing Rules</CardTitle>
           <CardDescription>
             Enter pain point details to see which rules would trigger
           </CardDescription>
         </CardHeader>
         <CardContent className="space-y-4">
           <div>
             <Label>Category</Label>
             <Select
               value={testData.category}
               onValueChange={(value) => setTestData({ ...testData, category: value })}
             >
               <SelectTrigger>
                 <SelectValue placeholder="Select category" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="Safety">Safety</SelectItem>
                 <SelectItem value="Efficiency">Efficiency</SelectItem>
                 <SelectItem value="Cost Savings">Cost Savings</SelectItem>
                 <SelectItem value="Quality">Quality</SelectItem>
                 <SelectItem value="Other">Other</SelectItem>
               </SelectContent>
             </Select>
           </div>
           
           <div>
             <Label>Department</Label>
             <Input
               value={testData.department}
               onChange={(e) => setTestData({ ...testData, department: e.target.value })}
               placeholder="e.g., Engineering"
             />
           </div>
           
           <div>
             <Label>Title</Label>
             <Input
               value={testData.title}
               onChange={(e) => setTestData({ ...testData, title: e.target.value })}
               placeholder="Pain point title"
             />
           </div>
           
           <div>
             <Label>Description</Label>
             <Textarea
               value={testData.description}
               onChange={(e) => setTestData({ ...testData, description: e.target.value })}
               placeholder="Pain point description"
               rows={3}
             />
           </div>
           
           <Button onClick={handleTest} disabled={testing || !testData.category || !testData.title}>
             {testing ? 'Testing...' : 'Test Rules'}
           </Button>
           
           {results && (
             <div className="mt-4 space-y-4">
               <div>
                 <h4 className="font-semibold">Matched Rules ({results.matchedRules.length})</h4>
                 {results.matchedRules.length === 0 ? (
                   <p className="text-gray-500">No rules matched</p>
                 ) : (
                   <ul className="space-y-2">
                     {results.matchedRules.map(rule => (
                       <li key={rule.id} className="flex items-center gap-2">
                         <Badge className="bg-green-100 text-green-800">Match</Badge>
                         <span>{rule.name}</span>
                       </li>
                     ))}
                   </ul>
                 )}
               </div>
               
               <div>
                 <h4 className="font-semibold">Reasoning</h4>
                 <div className="text-sm space-y-1 font-mono bg-gray-50 p-3 rounded">
                   {results.reasoning.map((reason, i) => (
                     <div key={i}>{reason}</div>
                   ))}
                 </div>
               </div>
             </div>
           )}
         </CardContent>
       </Card>
     );
   }
   ```

4. **Add test tab to settings**
   ```typescript
   // Add to TabsList
   <TabsTrigger value="test">Test Rules</TabsTrigger>
   
   // Add TabsContent
   <TabsContent value="test" className="space-y-4">
     <RuleTester />
   </TabsContent>
   ```

5. **Add mock email preview**
   ```typescript
   // Add to results display
   {results.matchedRules.length > 0 && (
     <div className="mt-4">
       <h4 className="font-semibold">Email Preview</h4>
       <div className="border rounded p-4 bg-gray-50 space-y-2">
         <div>
           <span className="font-semibold">To:</span> 
           <span className="ml-2">stakeholder@company.com</span>
         </div>
         <div>
           <span className="font-semibold">Subject:</span> 
           <span className="ml-2">New {testData.category} Pain Point: {testData.title}</span>
         </div>
         <div className="border-t pt-2">
           <div>A new pain point has been submitted:</div>
           <div className="mt-2">
             <strong>Title:</strong> {testData.title}<br />
             <strong>Category:</strong> {testData.category}<br />
             <strong>Department:</strong> {testData.department || 'Not specified'}<br />
             <strong>Description:</strong> {testData.description || 'No description'}
           </div>
           <div className="mt-4">
             <a href="#" className="text-blue-600 underline">View Pain Point</a>
           </div>
         </div>
       </div>
     </div>
   )}
   ```

6. **Test Plan**
   - Navigate to Settings → Test Rules
   - Enter test data:
     - Category: Safety
     - Department: Engineering
     - Title: Test pain point
   - Click "Test Rules"
   - See matched rules list
   - See reasoning explanation
   - See email preview
   - Change category to "Other"
   - Test again - different results

---

## Phase 6: Manual Routing Trigger (Medium Risk) 🎯
**Time**: 6 hours  
**Risk**: Medium - Affects existing data  
**Value**: Controlled routing execution  

### Atomic Steps:

1. **Add routing assignments table**
   ```sql
   -- Add to migration
   CREATE TABLE IF NOT EXISTS routing_assignments (
     id INT AUTO_INCREMENT PRIMARY KEY,
     routing_rule_id INT NOT NULL,
     assignee_email VARCHAR(255) NOT NULL,
     assignee_name VARCHAR(255),
     is_active BOOLEAN DEFAULT TRUE,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     
     FOREIGN KEY (routing_rule_id) REFERENCES routing_rules(id) ON DELETE CASCADE,
     INDEX idx_routing_rule_id (routing_rule_id)
   );
   
   -- Add default assignments
   INSERT INTO routing_assignments (routing_rule_id, assignee_email, assignee_name)
   SELECT id, 'admin@vvg.com', 'Admin User' FROM routing_rules;
   ```

2. **Create routing history table**
   ```sql
   CREATE TABLE IF NOT EXISTS routing_history (
     id INT AUTO_INCREMENT PRIMARY KEY,
     pain_point_id INT NOT NULL,
     routing_rule_id INT NOT NULL,
     assignee_email VARCHAR(255) NOT NULL,
     action ENUM('tested', 'routed', 'notified') NOT NULL,
     status ENUM('success', 'failed', 'pending') DEFAULT 'pending',
     details JSON,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     
     FOREIGN KEY (pain_point_id) REFERENCES pain_points(id) ON DELETE CASCADE,
     FOREIGN KEY (routing_rule_id) REFERENCES routing_rules(id),
     INDEX idx_pain_point_id (pain_point_id),
     INDEX idx_created_at (created_at)
   );
   ```

3. **Add routing methods to pain-points-db**
   ```typescript
   // Add to pain-points-db.ts
   async applyRoutingRules(painPointId: number): Promise<{
     applied: boolean;
     rules: any[];
     errors: string[];
   }> {
     const errors = [];
     const appliedRules = [];
     
     try {
       // Get pain point details
       const painPoint = await this.getPainPointById(painPointId);
       if (!painPoint) {
         throw new Error('Pain point not found');
       }
       
       // Get matching rules
       const { matchedRules } = await routingDb.testRules({
         category: painPoint.category,
         department: painPoint.department || '',
         title: painPoint.title,
         description: painPoint.description
       });
       
       // For each matched rule, create history entry
       for (const rule of matchedRules) {
         // Get assignments for this rule
         const assignments = await routingDb.getAssignments(rule.id);
         
         for (const assignment of assignments) {
           if (assignment.is_active) {
             // Create history entry
             await executeQuery({
               query: `
                 INSERT INTO routing_history 
                 (pain_point_id, routing_rule_id, assignee_email, action, status, details)
                 VALUES (?, ?, ?, 'routed', 'success', ?)
               `,
               values: [
                 painPointId,
                 rule.id,
                 assignment.assignee_email,
                 JSON.stringify({
                   rule_name: rule.name,
                   assignee_name: assignment.assignee_name,
                   routed_at: new Date().toISOString()
                 })
               ]
             });
             
             appliedRules.push({
               rule: rule.name,
               assignee: assignment.assignee_email
             });
           }
         }
       }
       
       return {
         applied: appliedRules.length > 0,
         rules: appliedRules,
         errors
       };
     } catch (error) {
       errors.push(error.message);
       return {
         applied: false,
         rules: [],
         errors
       };
     }
   }
   ```

4. **Create routing trigger API**
   ```typescript
   // Create /app/api/admin/routing/apply/route.ts
   export async function POST(request: NextRequest) {
     try {
       await verifySession();
       
       const body = await request.json();
       
       if (!body.painPointId) {
         return NextResponse.json({
           success: false,
           error: 'Pain point ID is required'
         }, { status: 400 });
       }
       
       const result = await painPointsDb.applyRoutingRules(body.painPointId);
       
       return NextResponse.json({
         success: true,
         data: result
       });
     } catch (error) {
       return NextResponse.json({
         success: false,
         error: error.message
       }, { status: 500 });
     }
   }
   ```

5. **Add routing button to pain point detail**
   ```typescript
   // Modify /app/pain-points/[id]/page.tsx
   const [routingResult, setRoutingResult] = useState(null);
   const [applyingRouting, setApplyingRouting] = useState(false);
   
   const handleApplyRouting = async () => {
     setApplyingRouting(true);
     
     try {
       const response = await fetch('/api/admin/routing/apply', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ painPointId: painPoint.id })
       });
       
       const result = await response.json();
       
       if (result.success) {
         setRoutingResult(result.data);
         toast({
           title: 'Routing Applied',
           description: `Applied ${result.data.rules.length} routing rules`
         });
       }
     } catch (error) {
       toast({
         title: 'Error',
         description: 'Failed to apply routing rules',
         variant: 'destructive'
       });
     } finally {
       setApplyingRouting(false);
     }
   };
   
   // Add button in UI
   <Button 
     onClick={handleApplyRouting}
     disabled={applyingRouting}
     variant="outline"
   >
     {applyingRouting ? 'Applying...' : 'Apply Routing Rules'}
   </Button>
   
   // Show results
   {routingResult && (
     <Card className="mt-4">
       <CardHeader>
         <CardTitle>Routing Results</CardTitle>
       </CardHeader>
       <CardContent>
         {routingResult.applied ? (
           <div>
             <p className="text-green-600 mb-2">
               Successfully applied {routingResult.rules.length} routing rules
             </p>
             <ul className="space-y-1">
               {routingResult.rules.map((rule, i) => (
                 <li key={i}>
                   • {rule.rule} → {rule.assignee}
                 </li>
               ))}
             </ul>
           </div>
         ) : (
           <p className="text-gray-500">No routing rules matched this pain point</p>
         )}
       </CardContent>
     </Card>
   )}
   ```

6. **Add routing history display**
   ```typescript
   // Add to pain point detail page
   const [routingHistory, setRoutingHistory] = useState([]);
   
   useEffect(() => {
     fetchRoutingHistory();
   }, [painPoint.id]);
   
   const fetchRoutingHistory = async () => {
     const response = await fetch(`/api/admin/routing/history?painPointId=${painPoint.id}`);
     const result = await response.json();
     if (result.success) {
       setRoutingHistory(result.data);
     }
   };
   
   // Display history
   {routingHistory.length > 0 && (
     <Card className="mt-4">
       <CardHeader>
         <CardTitle>Routing History</CardTitle>
       </CardHeader>
       <CardContent>
         <div className="space-y-2">
           {routingHistory.map(entry => (
             <div key={entry.id} className="text-sm">
               <span className="text-gray-500">
                 {new Date(entry.created_at).toLocaleString()}
               </span>
               <span className="ml-2">
                 Routed to {entry.assignee_email} via "{entry.details.rule_name}"
               </span>
             </div>
           ))}
         </div>
       </CardContent>
     </Card>
   )}
   ```

7. **Test Plan**
   - Navigate to any pain point detail
   - Click "Apply Routing Rules"
   - See loading state
   - See success message with rule count
   - See routing results card
   - Check routing history below
   - Navigate to different pain point
   - Apply routing - may see different results
   - No actual emails sent yet

---

## Phase 7: Email Preview System (Medium Risk) 📧
**Time**: 8 hours  
**Risk**: Medium - External dependency  
**Value**: Safe email testing  

### Atomic Steps:

1. **Create email templates table**
   ```sql
   CREATE TABLE IF NOT EXISTS email_templates (
     id INT AUTO_INCREMENT PRIMARY KEY,
     template_key VARCHAR(50) UNIQUE NOT NULL,
     name VARCHAR(100) NOT NULL,
     subject_template VARCHAR(255) NOT NULL,
     body_template TEXT NOT NULL,
     variables JSON COMMENT 'Available variables',
     is_active BOOLEAN DEFAULT TRUE,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
   );
   
   -- Insert default template
   INSERT INTO email_templates (template_key, name, subject_template, body_template, variables)
   VALUES (
     'new_pain_point_routing',
     'New Pain Point Routing',
     'New {{category}} Pain Point: {{title}}',
     'Hello {{assignee_name}},\n\nA new pain point has been routed to you:\n\n**Title:** {{title}}\n**Category:** {{category}}\n**Department:** {{department}}\n**Submitted by:** {{submitted_by}}\n\n**Description:**\n{{description}}\n\n[View Pain Point]({{view_url}})\n\nBest regards,\nVVG Pain Points System',
     '["assignee_name", "title", "category", "department", "submitted_by", "description", "view_url"]'
   );
   ```

2. **Create email service**
   ```typescript
   // Create /lib/services/email-service.ts
   export class EmailService {
     async renderTemplate(
       templateKey: string, 
       variables: Record<string, any>
     ): Promise<{
       subject: string;
       body: string;
       html: string;
     }> {
       // Get template from database
       const result = await executeQuery<any[]>({
         query: 'SELECT * FROM email_templates WHERE template_key = ? AND is_active = 1',
         values: [templateKey]
       });
       
       const template = result[0];
       if (!template) {
         throw new Error(`Template ${templateKey} not found`);
       }
       
       // Replace variables in subject and body
       let subject = template.subject_template;
       let body = template.body_template;
       
       for (const [key, value] of Object.entries(variables)) {
         const regex = new RegExp(`{{${key}}}`, 'g');
         subject = subject.replace(regex, value || '');
         body = body.replace(regex, value || '');
       }
       
       // Convert markdown to HTML
       const html = this.markdownToHtml(body);
       
       return { subject, body, html };
     }
     
     private markdownToHtml(markdown: string): string {
       return markdown
         .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
         .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
         .replace(/\n/g, '<br>');
     }
     
     async previewEmail(
       templateKey: string,
       painPoint: any,
       assignee: any
     ): Promise<{
       to: string;
       subject: string;
       body: string;
       html: string;
     }> {
       const variables = {
         assignee_name: assignee.assignee_name || 'Team Member',
         title: painPoint.title,
         category: painPoint.category,
         department: painPoint.department || 'Not specified',
         submitted_by: painPoint.submitted_by,
         description: painPoint.description,
         view_url: `${process.env.NEXTAUTH_URL}/pain-points/${painPoint.id}`
       };
       
       const rendered = await this.renderTemplate(templateKey, variables);
       
       return {
         to: assignee.assignee_email,
         ...rendered
       };
     }
   }
   
   export const emailService = new EmailService();
   ```

3. **Create email preview API**
   ```typescript
   // Create /app/api/admin/email/preview/route.ts
   export async function POST(request: NextRequest) {
     try {
       await verifySession();
       
       const body = await request.json();
       
       if (!body.painPointId || !body.assigneeEmail) {
         return NextResponse.json({
           success: false,
           error: 'Pain point ID and assignee email are required'
         }, { status: 400 });
       }
       
       // Get pain point
       const painPoint = await painPointsDb.getPainPointById(body.painPointId);
       
       // Get assignee info
       const assignee = {
         assignee_email: body.assigneeEmail,
         assignee_name: body.assigneeName || 'Team Member'
       };
       
       // Generate preview
       const preview = await emailService.previewEmail(
         'new_pain_point_routing',
         painPoint,
         assignee
       );
       
       return NextResponse.json({
         success: true,
         data: preview
       });
     } catch (error) {
       return NextResponse.json({
         success: false,
         error: error.message
       }, { status: 500 });
     }
   }
   ```

4. **Create email preview component**
   ```typescript
   // Create /components/routing/email-preview.tsx
   export function EmailPreview({ painPointId, assignments }) {
     const [previews, setPreviews] = useState([]);
     const [loading, setLoading] = useState(false);
     const [selectedPreview, setSelectedPreview] = useState(null);
     
     const loadPreviews = async () => {
       setLoading(true);
       const previewPromises = assignments.map(async (assignment) => {
         const response = await fetch('/api/admin/email/preview', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             painPointId,
             assigneeEmail: assignment.assignee_email,
             assigneeName: assignment.assignee_name
           })
         });
         
         const result = await response.json();
         return result.success ? result.data : null;
       });
       
       const results = await Promise.all(previewPromises);
       setPreviews(results.filter(Boolean));
       setLoading(false);
     };
     
     useEffect(() => {
       if (assignments.length > 0) {
         loadPreviews();
       }
     }, [assignments]);
     
     return (
       <div className="space-y-4">
         <h3 className="font-semibold">Email Previews</h3>
         
         {loading ? (
           <div>Loading email previews...</div>
         ) : (
           <div className="space-y-2">
             {previews.map((preview, i) => (
               <Button
                 key={i}
                 variant="outline"
                 className="w-full justify-start"
                 onClick={() => setSelectedPreview(preview)}
               >
                 <Mail className="h-4 w-4 mr-2" />
                 To: {preview.to}
               </Button>
             ))}
           </div>
         )}
         
         <Dialog open={!!selectedPreview} onOpenChange={() => setSelectedPreview(null)}>
           <DialogContent className="max-w-2xl">
             <DialogHeader>
               <DialogTitle>Email Preview</DialogTitle>
             </DialogHeader>
             {selectedPreview && (
               <div className="space-y-4">
                 <div>
                   <Label>To</Label>
                   <Input value={selectedPreview.to} readOnly />
                 </div>
                 <div>
                   <Label>Subject</Label>
                   <Input value={selectedPreview.subject} readOnly />
                 </div>
                 <div>
                   <Label>Body</Label>
                   <div className="border rounded p-4 bg-gray-50 max-h-96 overflow-y-auto">
                     <div dangerouslySetInnerHTML={{ __html: selectedPreview.html }} />
                   </div>
                 </div>
                 <div className="flex justify-end gap-2">
                   <Button variant="outline" onClick={() => setSelectedPreview(null)}>
                     Close
                   </Button>
                   <Button disabled>
                     Send Test Email (Coming Soon)
                   </Button>
                 </div>
               </div>
             )}
           </DialogContent>
         </Dialog>
       </div>
     );
   }
   ```

5. **Add preview to routing results**
   ```typescript
   // Update routing results display
   {routingResult && routingResult.applied && (
     <EmailPreview 
       painPointId={painPoint.id}
       assignments={routingResult.rules}
     />
   )}
   ```

6. **Add test email functionality**
   ```typescript
   // Create /app/api/admin/email/test/route.ts
   export async function POST(request: NextRequest) {
     try {
       const session = await verifySession();
       const userEmail = session.user?.email;
       
       const body = await request.json();
       
       // For safety, only send test emails to the logged-in user
       if (body.to !== userEmail) {
         return NextResponse.json({
           success: false,
           error: 'Test emails can only be sent to your own email address'
         }, { status: 400 });
       }
       
       // Here you would integrate with your email service
       // For now, just log it
       console.log('Would send email:', {
         to: body.to,
         subject: body.subject,
         body: body.body
       });
       
       return NextResponse.json({
         success: true,
         message: 'Test email logged (not actually sent yet)'
       });
     } catch (error) {
       return NextResponse.json({
         success: false,
         error: error.message
       }, { status: 500 });
     }
   }
   ```

7. **Test Plan**
   - Apply routing rules to a pain point
   - See "Email Previews" section
   - Click on any preview
   - See full email with:
     - Correct recipient
     - Filled subject line
     - Formatted body with all variables replaced
     - Working markdown formatting
   - Close preview
   - Try different pain point - different content
   - "Send Test Email" button disabled (safe)

---

## Phase 8: Routing History UI (Low Risk) 📊
**Time**: 6 hours  
**Risk**: Low - Read-only data  
**Value**: Full audit trail  

### Atomic Steps:

1. **Create history API endpoint**
   ```typescript
   // Create /app/api/admin/routing/history/route.ts
   export async function GET(request: NextRequest) {
     try {
       await verifySession();
       
       const { searchParams } = new URL(request.url);
       const painPointId = searchParams.get('painPointId');
       const limit = parseInt(searchParams.get('limit') || '50');
       const offset = parseInt(searchParams.get('offset') || '0');
       
       let query = `
         SELECT 
           h.*,
           pp.title as pain_point_title,
           rr.name as rule_name
         FROM routing_history h
         JOIN pain_points pp ON h.pain_point_id = pp.id
         JOIN routing_rules rr ON h.routing_rule_id = rr.id
       `;
       
       const values = [];
       
       if (painPointId) {
         query += ' WHERE h.pain_point_id = ?';
         values.push(painPointId);
       }
       
       query += ' ORDER BY h.created_at DESC LIMIT ? OFFSET ?';
       values.push(limit, offset);
       
       const history = await executeQuery({ query, values });
       
       // Get total count
       let countQuery = 'SELECT COUNT(*) as total FROM routing_history';
       const countValues = [];
       
       if (painPointId) {
         countQuery += ' WHERE pain_point_id = ?';
         countValues.push(painPointId);
       }
       
       const countResult = await executeQuery({ 
         query: countQuery, 
         values: countValues 
       });
       
       return NextResponse.json({
         success: true,
         data: {
           history,
           total: countResult[0].total,
           limit,
           offset
         }
       });
     } catch (error) {
       return NextResponse.json({
         success: false,
         error: error.message
       }, { status: 500 });
     }
   }
   ```

2. **Create history page**
   ```typescript
   // Create /app/admin/routing-history/page.tsx
   'use client';
   
   export default function RoutingHistoryPage() {
     const [history, setHistory] = useState([]);
     const [loading, setLoading] = useState(true);
     const [pagination, setPagination] = useState({
       total: 0,
       limit: 50,
       offset: 0
     });
     const [filters, setFilters] = useState({
       painPointId: '',
       dateFrom: '',
       dateTo: ''
     });
     
     const fetchHistory = async () => {
       setLoading(true);
       
       const params = new URLSearchParams({
         limit: pagination.limit.toString(),
         offset: pagination.offset.toString()
       });
       
       if (filters.painPointId) {
         params.append('painPointId', filters.painPointId);
       }
       
       const response = await fetch(`/api/admin/routing/history?${params}`);
       const result = await response.json();
       
       if (result.success) {
         setHistory(result.data.history);
         setPagination({
           ...pagination,
           total: result.data.total
         });
       }
       
       setLoading(false);
     };
     
     useEffect(() => {
       fetchHistory();
     }, [pagination.offset, filters]);
     
     return (
       <div className="p-6 space-y-6">
         <div className="flex justify-between items-center">
           <div>
             <h1 className="text-3xl font-bold">Routing History</h1>
             <p className="text-gray-600">View all routing decisions and actions</p>
           </div>
           <Button onClick={fetchHistory} variant="outline">
             <RefreshCw className="h-4 w-4 mr-2" />
             Refresh
           </Button>
         </div>
         
         <Card>
           <CardHeader>
             <CardTitle>Filters</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="grid grid-cols-3 gap-4">
               <div>
                 <Label>Pain Point ID</Label>
                 <Input
                   value={filters.painPointId}
                   onChange={(e) => setFilters({ ...filters, painPointId: e.target.value })}
                   placeholder="Filter by pain point"
                 />
               </div>
               <div>
                 <Label>Date From</Label>
                 <Input
                   type="date"
                   value={filters.dateFrom}
                   onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                 />
               </div>
               <div>
                 <Label>Date To</Label>
                 <Input
                   type="date"
                   value={filters.dateTo}
                   onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                 />
               </div>
             </div>
           </CardContent>
         </Card>
         
         <Card>
           <CardHeader>
             <CardTitle>History ({pagination.total} total)</CardTitle>
           </CardHeader>
           <CardContent>
             {loading ? (
               <div>Loading history...</div>
             ) : (
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead>Date/Time</TableHead>
                     <TableHead>Pain Point</TableHead>
                     <TableHead>Rule</TableHead>
                     <TableHead>Assignee</TableHead>
                     <TableHead>Action</TableHead>
                     <TableHead>Status</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {history.map((entry) => (
                     <TableRow key={entry.id}>
                       <TableCell>
                         {new Date(entry.created_at).toLocaleString()}
                       </TableCell>
                       <TableCell>
                         <Link 
                           href={`/pain-points/${entry.pain_point_id}`}
                           className="text-blue-600 hover:underline"
                         >
                           {entry.pain_point_title}
                         </Link>
                       </TableCell>
                       <TableCell>{entry.rule_name}</TableCell>
                       <TableCell>{entry.assignee_email}</TableCell>
                       <TableCell>
                         <Badge variant="outline">
                           {entry.action}
                         </Badge>
                       </TableCell>
                       <TableCell>
                         <Badge variant={
                           entry.status === 'success' ? 'default' :
                           entry.status === 'failed' ? 'destructive' :
                           'secondary'
                         }>
                           {entry.status}
                         </Badge>
                       </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
             )}
             
             {pagination.total > pagination.limit && (
               <div className="flex justify-center gap-2 mt-4">
                 <Button
                   variant="outline"
                   disabled={pagination.offset === 0}
                   onClick={() => setPagination({
                     ...pagination,
                     offset: Math.max(0, pagination.offset - pagination.limit)
                   })}
                 >
                   Previous
                 </Button>
                 <span className="flex items-center px-4">
                   Page {Math.floor(pagination.offset / pagination.limit) + 1} of{' '}
                   {Math.ceil(pagination.total / pagination.limit)}
                 </span>
                 <Button
                   variant="outline"
                   disabled={pagination.offset + pagination.limit >= pagination.total}
                   onClick={() => setPagination({
                     ...pagination,
                     offset: pagination.offset + pagination.limit
                   })}
                 >
                   Next
                 </Button>
               </div>
             )}
           </CardContent>
         </Card>
       </div>
     );
   }
   ```

3. **Add history link to navigation**
   ```typescript
   // Add to admin navigation
   <Link href="/admin/routing-history">
     <Button variant="ghost">
       <Clock className="h-4 w-4 mr-2" />
       Routing History
     </Button>
   </Link>
   ```

4. **Create activity timeline component**
   ```typescript
   // Create /components/routing/activity-timeline.tsx
   export function ActivityTimeline({ painPointId }) {
     const [activities, setActivities] = useState([]);
     
     useEffect(() => {
       fetch(`/api/admin/routing/history?painPointId=${painPointId}`)
         .then(res => res.json())
         .then(result => {
           if (result.success) {
             setActivities(result.data.history);
           }
         });
     }, [painPointId]);
     
     return (
       <div className="space-y-4">
         <h3 className="font-semibold">Routing Activity</h3>
         <div className="space-y-2">
           {activities.map((activity, i) => (
             <div key={activity.id} className="flex gap-4">
               <div className="flex flex-col items-center">
                 <div className={`w-3 h-3 rounded-full ${
                   activity.status === 'success' ? 'bg-green-500' :
                   activity.status === 'failed' ? 'bg-red-500' :
                   'bg-gray-500'
                 }`} />
                 {i < activities.length - 1 && (
                   <div className="w-0.5 h-16 bg-gray-300" />
                 )}
               </div>
               <div className="flex-1 pb-8">
                 <div className="text-sm text-gray-500">
                   {new Date(activity.created_at).toLocaleString()}
                 </div>
                 <div className="font-medium">
                   {activity.action === 'routed' && 'Routed to '}
                   {activity.assignee_email}
                 </div>
                 <div className="text-sm text-gray-600">
                   via rule "{activity.rule_name}"
                 </div>
               </div>
             </div>
           ))}
         </div>
       </div>
     );
   }
   ```

5. **Add export functionality**
   ```typescript
   const exportHistory = () => {
     const csv = [
       ['Date', 'Pain Point', 'Rule', 'Assignee', 'Action', 'Status'],
       ...history.map(h => [
         new Date(h.created_at).toLocaleString(),
         h.pain_point_title,
         h.rule_name,
         h.assignee_email,
         h.action,
         h.status
       ])
     ].map(row => row.join(',')).join('\n');
     
     const blob = new Blob([csv], { type: 'text/csv' });
     const url = window.URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `routing-history-${new Date().toISOString()}.csv`;
     a.click();
   };
   
   // Add export button
   <Button onClick={exportHistory} variant="outline">
     <Download className="h-4 w-4 mr-2" />
     Export CSV
   </Button>
   ```

6. **Test Plan**
   - Navigate to /admin/routing-history
   - See list of all routing actions
   - Click on pain point link - navigates correctly
   - Filter by pain point ID
   - See filtered results
   - Test pagination if > 50 records
   - Export CSV and verify contents
   - Check activity timeline on pain point detail

---

## Phase 9: Real Email Integration (High Risk) 📮
**Time**: 8 hours  
**Risk**: High - External service  
**Value**: Actual notifications  

### Atomic Steps:

1. **Add email configuration to .env.local**
   ```bash
   # Email Configuration (use your SMTP settings)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-app-specific-password
   EMAIL_FROM="VVG Pain Points <noreply@vvg.com>"
   
   # Email Safety
   EMAIL_ENABLED=false
   EMAIL_TEST_MODE=true
   EMAIL_ALLOWED_DOMAINS=vvg.com,test.com
   EMAIL_MAX_PER_HOUR=50
   ```

2. **Install email dependencies**
   ```bash
   npm install nodemailer @types/nodemailer
   ```

3. **Create email configuration**
   ```typescript
   // Update /lib/config.ts
   export const emailConfig = {
     enabled: process.env.EMAIL_ENABLED === 'true',
     testMode: process.env.EMAIL_TEST_MODE === 'true',
     smtp: {
       host: process.env.SMTP_HOST || 'smtp.gmail.com',
       port: parseInt(process.env.SMTP_PORT || '587'),
       secure: process.env.SMTP_SECURE === 'true',
       auth: {
         user: process.env.SMTP_USER || '',
         pass: process.env.SMTP_PASSWORD || ''
       }
     },
     from: process.env.EMAIL_FROM || 'noreply@example.com',
     allowedDomains: (process.env.EMAIL_ALLOWED_DOMAINS || '').split(',').filter(Boolean),
     maxPerHour: parseInt(process.env.EMAIL_MAX_PER_HOUR || '50')
   };
   ```

4. **Implement email sending**
   ```typescript
   // Update /lib/services/email-service.ts
   import nodemailer from 'nodemailer';
   import { emailConfig } from '@/lib/config';
   
   export class EmailService {
     private transporter: nodemailer.Transporter | null = null;
     
     constructor() {
       if (emailConfig.enabled) {
         this.transporter = nodemailer.createTransport(emailConfig.smtp);
       }
     }
     
     async sendEmail(options: {
       to: string;
       subject: string;
       body: string;
       html: string;
     }): Promise<{
       success: boolean;
       messageId?: string;
       error?: string;
     }> {
       try {
         // Safety checks
         if (!emailConfig.enabled) {
           console.log('Email disabled - would send:', options);
           return { success: true, messageId: 'test-mode' };
         }
         
         if (emailConfig.testMode) {
           // In test mode, only send to allowed domains
           const domain = options.to.split('@')[1];
           if (!emailConfig.allowedDomains.includes(domain)) {
             console.log('Test mode - blocked email to:', options.to);
             return { 
               success: false, 
               error: `Test mode: Email to ${domain} blocked` 
             };
           }
         }
         
         // Check rate limit
         const recentCount = await this.getRecentEmailCount();
         if (recentCount >= emailConfig.maxPerHour) {
           return { 
             success: false, 
             error: 'Rate limit exceeded' 
           };
         }
         
         // Send email
         const info = await this.transporter.sendMail({
           from: emailConfig.from,
           to: options.to,
           subject: options.subject,
           text: options.body,
           html: options.html
         });
         
         // Log delivery
         await this.logEmailDelivery({
           to: options.to,
           subject: options.subject,
           messageId: info.messageId,
           status: 'sent'
         });
         
         return { 
           success: true, 
           messageId: info.messageId 
         };
       } catch (error) {
         console.error('Email send error:', error);
         
         await this.logEmailDelivery({
           to: options.to,
           subject: options.subject,
           status: 'failed',
           error: error.message
         });
         
         return { 
           success: false, 
           error: error.message 
         };
       }
     }
     
     private async getRecentEmailCount(): Promise<number> {
       const result = await executeQuery<{count: number}[]>({
         query: `
           SELECT COUNT(*) as count 
           FROM email_deliveries 
           WHERE created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
           AND status = 'sent'
         `
       });
       return result[0]?.count || 0;
     }
     
     private async logEmailDelivery(data: any): Promise<void> {
       await executeQuery({
         query: `
           INSERT INTO email_deliveries 
           (to_email, subject, message_id, status, error_message, created_at)
           VALUES (?, ?, ?, ?, ?, NOW())
         `,
         values: [
           data.to,
           data.subject,
           data.messageId || null,
           data.status,
           data.error || null
         ]
       });
     }
   }
   ```

5. **Create email deliveries table**
   ```sql
   CREATE TABLE IF NOT EXISTS email_deliveries (
     id INT AUTO_INCREMENT PRIMARY KEY,
     to_email VARCHAR(255) NOT NULL,
     subject VARCHAR(255),
     message_id VARCHAR(255),
     status ENUM('sent', 'failed', 'blocked') NOT NULL,
     error_message TEXT,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     
     INDEX idx_created_at (created_at),
     INDEX idx_status (status),
     INDEX idx_to_email (to_email)
   );
   ```

6. **Add send email API**
   ```typescript
   // Create /app/api/admin/email/send/route.ts
   export async function POST(request: NextRequest) {
     try {
       const session = await verifySession();
       const userEmail = session.user?.email;
       
       const body = await request.json();
       
       // Safety: In test mode, only send to current user
       if (emailConfig.testMode && body.to !== userEmail) {
         return NextResponse.json({
           success: false,
           error: 'Test mode: Can only send emails to yourself'
         }, { status: 400 });
       }
       
       // Send email
       const result = await emailService.sendEmail({
         to: body.to,
         subject: body.subject,
         body: body.body,
         html: body.html
       });
       
       return NextResponse.json(result);
     } catch (error) {
       return NextResponse.json({
         success: false,
         error: error.message
       }, { status: 500 });
     }
   }
   ```

7. **Add email settings UI**
   ```typescript
   // Add to settings page
   <TabsContent value="email" className="space-y-4">
     <Card>
       <CardHeader>
         <CardTitle>Email Configuration</CardTitle>
         <CardDescription>
           Configure email settings and test delivery
         </CardDescription>
       </CardHeader>
       <CardContent className="space-y-4">
         <div className="space-y-2">
           <div className="flex items-center justify-between">
             <span>Email Enabled</span>
             <Badge variant={emailConfig.enabled ? 'default' : 'secondary'}>
               {emailConfig.enabled ? 'Yes' : 'No'}
             </Badge>
           </div>
           <div className="flex items-center justify-between">
             <span>Test Mode</span>
             <Badge variant={emailConfig.testMode ? 'default' : 'secondary'}>
               {emailConfig.testMode ? 'Yes' : 'No'}
             </Badge>
           </div>
           <div className="flex items-center justify-between">
             <span>Allowed Domains</span>
             <span className="text-sm text-gray-600">
               {emailConfig.allowedDomains.join(', ')}
             </span>
           </div>
           <div className="flex items-center justify-between">
             <span>Rate Limit</span>
             <span className="text-sm text-gray-600">
               {emailConfig.maxPerHour} per hour
             </span>
           </div>
         </div>
         
         <Separator />
         
         <div className="space-y-4">
           <h4 className="font-medium">Test Email Delivery</h4>
           <div>
             <Label>Send test email to</Label>
             <Input 
               value={session?.user?.email} 
               readOnly 
               className="bg-gray-50"
             />
           </div>
           <Button onClick={sendTestEmail}>
             Send Test Email
           </Button>
         </div>
       </CardContent>
     </Card>
   </TabsContent>
   ```

8. **Test Plan**
   - Set EMAIL_ENABLED=false initially
   - Apply routing rules
   - Check console logs for "would send" messages
   - Set EMAIL_ENABLED=true, EMAIL_TEST_MODE=true
   - Send test email to yourself
   - Verify email received
   - Check email_deliveries table
   - Try sending to external email - should be blocked
   - Monitor rate limiting

---

## Phase 10: Automatic Routing (Highest Risk) 🤖
**Time**: 6 hours  
**Risk**: Highest - Affects all new submissions  
**Value**: Full automation  

### Atomic Steps:

1. **Add auto-routing flag to rules**
   ```sql
   ALTER TABLE routing_rules 
   ADD COLUMN auto_route BOOLEAN DEFAULT FALSE COMMENT 'Apply automatically on creation';
   ```

2. **Create feature flags**
   ```typescript
   // Add to /lib/config.ts
   export const routingFeatures = {
     enabled: process.env.ROUTING_ENABLED === 'true',
     autoRoute: process.env.AUTO_ROUTING_ENABLED === 'true',
     aiTriage: process.env.AI_TRIAGE_ENABLED === 'true',
     dryRun: process.env.ROUTING_DRY_RUN === 'true'
   };
   ```

3. **Modify pain point creation**
   ```typescript
   // Update POST in /app/api/pain-points/route.ts
   export async function POST(request: NextRequest) {
     try {
       // ... existing creation logic ...
       
       const painPoint = await painPointsDb.createPainPoint(validatedData);
       
       // Auto-routing check
       if (routingFeatures.enabled && routingFeatures.autoRoute) {
         try {
           const routingResult = await processAutoRouting(painPoint.id);
           
           // Add routing info to response
           return NextResponse.json({
             success: true,
             data: {
               ...painPoint,
               routing: routingResult
             }
           }, { status: 201 });
         } catch (routingError) {
           // Log error but don't fail the creation
           console.error('Auto-routing error:', routingError);
           
           // Still return success for pain point creation
           return NextResponse.json({
             success: true,
             data: painPoint,
             warning: 'Pain point created but routing failed'
           }, { status: 201 });
         }
       }
       
       // Normal response without routing
       return NextResponse.json({
         success: true,
         data: painPoint
       }, { status: 201 });
     } catch (error) {
       // ... error handling ...
     }
   }
   
   async function processAutoRouting(painPointId: number) {
     // Get pain point details
     const painPoint = await painPointsDb.getPainPointById(painPointId);
     
     // Get auto-route enabled rules
     const autoRules = await routingDb.getAutoRouteRules();
     
     if (autoRules.length === 0) {
       return { autoRouted: false, reason: 'No auto-route rules configured' };
     }
     
     // Test which rules match
     const { matchedRules } = await routingDb.testRules({
       category: painPoint.category,
       department: painPoint.department || '',
       title: painPoint.title,
       description: painPoint.description
     });
     
     // Filter for auto-route enabled
     const autoMatches = matchedRules.filter(r => 
       autoRules.some(ar => ar.id === r.id)
     );
     
     if (autoMatches.length === 0) {
       return { autoRouted: false, reason: 'No auto-route rules matched' };
     }
     
     // Apply routing in dry-run or real mode
     if (routingFeatures.dryRun) {
       console.log('DRY RUN: Would route to:', autoMatches);
       return { 
         autoRouted: true, 
         dryRun: true, 
         wouldRoute: autoMatches 
       };
     }
     
     // Real routing
     const result = await painPointsDb.applyRoutingRules(painPointId);
     
     // Send emails if enabled
     if (emailConfig.enabled && result.applied) {
       for (const rule of result.rules) {
         await emailService.sendRoutingNotification(
           painPoint,
           rule
         );
       }
     }
     
     return { 
       autoRouted: true, 
       rulesApplied: result.rules.length,
       rules: result.rules
     };
   }
   ```

4. **Add auto-route toggle to rules**
   ```typescript
   // Update rule display in settings
   <div className="flex items-center gap-2">
     <Switch
       checked={rule.auto_route}
       onCheckedChange={async (checked) => {
         const response = await fetch(`/api/admin/routing/rules/${rule.id}`, {
           method: 'PUT',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ auto_route: checked })
         });
         
         if (response.ok) {
           toast({
             title: checked ? 'Auto-routing enabled' : 'Auto-routing disabled',
             description: `For rule "${rule.name}"`
           });
           
           // Update local state
           setRoutingRules(prev =>
             prev.map(r => r.id === rule.id ? { ...r, auto_route: checked } : r)
           );
         }
       }}
     />
     <Label>Auto-route new submissions</Label>
   </div>
   ```

5. **Create emergency stop**
   ```typescript
   // Create /app/api/admin/routing/emergency-stop/route.ts
   export async function POST(request: NextRequest) {
     try {
       await verifySession();
       
       // Disable all auto-routing
       await executeQuery({
         query: 'UPDATE routing_rules SET auto_route = FALSE'
       });
       
       // Update environment variable if possible
       // This depends on your deployment method
       
       return NextResponse.json({
         success: true,
         message: 'All auto-routing disabled'
       });
     } catch (error) {
       return NextResponse.json({
         success: false,
         error: error.message
       }, { status: 500 });
     }
   }
   ```

6. **Add monitoring dashboard**
   ```typescript
   // Add to admin dashboard
   <Card>
     <CardHeader>
       <CardTitle>Routing System Status</CardTitle>
     </CardHeader>
     <CardContent>
       <div className="space-y-4">
         <div className="flex items-center justify-between">
           <span>Routing Enabled</span>
           <Badge variant={routingFeatures.enabled ? 'default' : 'secondary'}>
             {routingFeatures.enabled ? 'Yes' : 'No'}
           </Badge>
         </div>
         <div className="flex items-center justify-between">
           <span>Auto-Routing</span>
           <Badge variant={routingFeatures.autoRoute ? 'default' : 'secondary'}>
             {routingFeatures.autoRoute ? 'Active' : 'Inactive'}
           </Badge>
         </div>
         <div className="flex items-center justify-between">
           <span>Dry Run Mode</span>
           <Badge variant={routingFeatures.dryRun ? 'default' : 'secondary'}>
             {routingFeatures.dryRun ? 'Yes' : 'No'}
           </Badge>
         </div>
         
         <Separator />
         
         <div className="space-y-2">
           <h4 className="font-medium">Today's Activity</h4>
           <div className="grid grid-cols-3 gap-4 text-sm">
             <div>
               <div className="text-2xl font-bold">{stats.routedToday}</div>
               <div className="text-gray-600">Routed</div>
             </div>
             <div>
               <div className="text-2xl font-bold">{stats.emailsSent}</div>
               <div className="text-gray-600">Emails Sent</div>
             </div>
             <div>
               <div className="text-2xl font-bold">{stats.failures}</div>
               <div className="text-gray-600">Failures</div>
             </div>
           </div>
         </div>
         
         <Separator />
         
         <Button 
           variant="destructive" 
           className="w-full"
           onClick={emergencyStop}
         >
           Emergency Stop - Disable All Routing
         </Button>
       </div>
     </CardContent>
   </Card>
   ```

7. **Test Plan**
   - Set ROUTING_ENABLED=true, AUTO_ROUTING_ENABLED=false
   - Create new pain point - no routing
   - Enable auto-route on ONE rule (Safety)
   - Set AUTO_ROUTING_ENABLED=true, ROUTING_DRY_RUN=true
   - Create Safety pain point
   - Check response includes dry run routing info
   - Check console logs for "DRY RUN" message
   - Set ROUTING_DRY_RUN=false
   - Create another Safety pain point
   - Check routing history - should have entry
   - Test emergency stop button
   - Verify all rules show auto_route=false

---

## Risk Mitigation Summary

### Environment Variables for Safety
```bash
# Master switches
ROUTING_ENABLED=false              # Enable routing system
AUTO_ROUTING_ENABLED=false         # Enable automatic routing
ROUTING_DRY_RUN=true              # Log actions without executing

# Email safety
EMAIL_ENABLED=false               # Enable email sending
EMAIL_TEST_MODE=true              # Restrict to allowed domains
EMAIL_ALLOWED_DOMAINS=vvg.com     # Comma-separated list

# Rate limits
EMAIL_MAX_PER_HOUR=50             # Prevent email storms
ROUTING_MAX_PER_MINUTE=10         # Prevent routing loops
```

### Progressive Enablement Strategy
1. **Week 1-2**: UI only, no side effects
2. **Week 3**: Manual triggers only
3. **Week 4**: Dry run mode for 1 week
4. **Week 5**: Enable for single category
5. **Week 6**: Enable for all categories
6. **Week 7**: Enable email notifications
7. **Week 8**: Full automation

### Monitoring Checklist
- [ ] Routing success/failure rates
- [ ] Email delivery rates
- [ ] Average processing time
- [ ] Error frequency and types
- [ ] User feedback on routing accuracy
- [ ] System resource usage

### Rollback Procedures
```sql
-- Quick disable all routing
UPDATE routing_rules SET is_active = FALSE, auto_route = FALSE;

-- Clear routing history (keep pain points)
TRUNCATE TABLE routing_history;

-- Disable specific rule
UPDATE routing_rules SET is_active = FALSE WHERE id = ?;

-- Mark all as unprocessed
UPDATE pain_points SET routing_processed = FALSE;
```

---

## Success Metrics

### Phase Completion Criteria
- **Phase 0-2**: Settings page loads with real data
- **Phase 3-4**: Can create/edit/delete rules
- **Phase 5**: Can preview rule matches
- **Phase 6**: Manual routing creates history
- **Phase 7**: Email previews render correctly
- **Phase 8**: History page shows all actions
- **Phase 9**: Test emails deliver successfully
- **Phase 10**: Auto-routing processes 95%+ successfully

### Final Acceptance Tests
1. Create pain point → Auto-routed → Email sent → History recorded
2. Emergency stop → All routing halted immediately
3. 100 concurrent submissions → No failures
4. Email service down → Pain points still created
5. Database rollback → System remains functional

---

This implementation guide provides a safe, incremental path from zero functionality to full automation, with UI visibility and rollback capability at every step.