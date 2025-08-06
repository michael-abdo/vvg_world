# Admin Frontend Demo Implementation Guide

This document provides a comprehensive plan for creating a **frontend-only** admin demo with mock data. No backend implementation is required - this is purely for UI/UX demonstration.

## Overview

The admin demo will showcase a fully interactive admin interface using React, Next.js, and mock data. All features will work on the client-side with simulated API responses and local state management.

## 1. Admin Dashboard (/admin/dashboard)

### 1.1 Display Overview Stats

#### 1.1.1 Total Ideas Card
1. Create mock data array with 50+ idea objects
2. Create `TotalIdeasCard` component
3. Calculate total count from mock data
4. Display count with large typography
5. Add trend indicator (up/down arrow)
6. Implement loading skeleton state
7. Add hover effect with tooltip
8. Include refresh icon button
9. Simulate refresh with 1s delay
10. Update count with random variance

#### 1.1.2 Ideas by Status Chart
1. Define status types: ['pending', 'approved', 'rejected', 'in_progress']
2. Create mock distribution data
3. Install recharts library
4. Create `IdeasByStatusChart` component
5. Implement responsive bar chart
6. Add custom colors for each status
7. Include interactive tooltips
8. Add click handlers for segments
9. Implement chart animations
10. Create loading state with skeleton

#### 1.1.3 Ideas by Category Chart
1. Define categories: ['Product', 'Process', 'Culture', 'Tech', 'Other']
2. Generate mock category distribution
3. Create `IdeasByCategoryChart` component
4. Implement pie chart with recharts
5. Add percentage labels
6. Include legend component
7. Implement hover effects
8. Add click-to-filter functionality
9. Create smooth transitions
10. Handle empty data states

### 1.2 Recent Submissions Table

1. Create mock ideas array with realistic data
2. Build `RecentSubmissionsTable` component
3. Define table columns: Title, Submitter, Date, Status
4. Implement row hover effects
5. Add status badges with colors
6. Create date formatting utility
7. Add click handler for row navigation
8. Implement loading skeleton rows
9. Add "View All" button
10. Include empty state message

### 1.3 Quick Actions Panel

1. Create `QuickActionsPanel` component
2. Add "Create Idea" button
3. Add "Review Pending" button
4. Add "Export Report" button
5. Implement button loading states
6. Add icon for each action
7. Create tooltips for actions
8. Simulate action delays
9. Show success toasts
10. Track action clicks

### 1.4 Search and Filters

1. Create search input with icon
2. Implement debounced search
3. Filter mock data by search term
4. Add filter dropdown menu
5. Create status filter checkboxes
6. Add category filter options
7. Implement date range picker
8. Create active filter badges
9. Add "Clear all" button
10. Update results in real-time

## 2. Ideas Management (/admin/ideas)

### 2.1 Ideas List Page

1. Create comprehensive mock ideas dataset (100+ items)
2. Build `IdeasDataTable` component
3. Define columns: Select, Title, Submitter, Category, Status, Date, Actions
4. Implement column sorting
5. Add pagination controls
6. Create page size selector
7. Implement row selection checkboxes
8. Add select all functionality
9. Show selection count
10. Create loading state

### 2.2 Bulk Actions Toolbar

1. Create `BulkActionsBar` component
2. Show/hide based on selection
3. Add "Assign" button with user dropdown
4. Add "Categorize" button with category select
5. Add "Update Status" with status options
6. Add "Delete" button with confirmation
7. Implement action progress indicator
8. Show success/error messages
9. Update table after actions
10. Clear selection after action

### 2.3 Advanced Filtering Panel

1. Create collapsible filter panel
2. Add date range picker component
3. Create department multi-select
4. Add status checkbox group
5. Create category tree select
6. Add submitter search input
7. Include priority selector
8. Add tag input field
9. Create saved filter presets
10. Implement filter count badge

### 2.4 Export Functionality

1. Add export button with dropdown
2. Create format options: CSV, Excel, PDF
3. Build export preview modal
4. Add column selection checkboxes
5. Implement date range selector
6. Add filters summary
7. Create progress indicator
8. Generate client-side CSV
9. Trigger file download
10. Show success notification

## 3. Idea Detail/Edit (/admin/ideas/[id])

### 3.1 Idea Detail Layout

1. Create two-column layout
2. Build main content area
3. Add sidebar for metadata
4. Create breadcrumb navigation
5. Add edit mode toggle
6. Implement unsaved changes warning
7. Add print button
8. Create loading skeleton
9. Handle missing idea state
10. Add keyboard shortcuts

### 3.2 Editable Fields

1. Create inline edit components
2. Add title edit with validation
3. Build category dropdown selector
4. Add status change with reason
5. Create assignee search select
6. Add tags input component
7. Build priority selector
8. Add due date picker
9. Show field validation errors
10. Implement auto-save indicator

### 3.3 Internal Notes Section

1. Create notes list component
2. Add new note form
3. Build rich text editor
4. Add note author display
5. Show note timestamps
6. Implement note editing
7. Add delete with confirmation
8. Create note templates
9. Add @mention functionality
10. Show note count badge

### 3.4 Activity Timeline

1. Create timeline component
2. Generate mock activity data
3. Add activity type icons
4. Show user avatars
5. Display relative timestamps
6. Add activity descriptions
7. Implement show more button
8. Add activity filters
9. Create compact/expanded view
10. Add real-time updates simulation

### 3.5 AI Suggestions Panel

1. Create suggestions component
2. Mock AI-generated tags
3. Add confidence scores
4. Show suggested categories
5. Display routing recommendations
6. Add apply/dismiss buttons
7. Create loading animation
8. Show suggestion explanations
9. Track applied suggestions
10. Add feedback buttons

## 4. Reports & Analytics (/admin/reports)

### 4.1 Analytics Dashboard

1. Create date range selector
2. Build metrics overview cards
3. Add comparison to previous period
4. Create trend line charts
5. Add department breakdown
6. Build category distribution
7. Show success rate gauge
8. Add top contributors list
9. Create exportable reports
10. Add refresh functionality

### 4.2 Interactive Charts

1. Implement time series chart
2. Add zoom and pan controls
3. Create data point tooltips
4. Add chart type switcher
5. Implement data granularity selector
6. Add comparison mode
7. Create annotations feature
8. Add fullscreen mode
9. Implement chart export
10. Add loading states

### 4.3 Custom Report Builder

1. Create drag-drop interface
2. Add metric selection panel
3. Build filter configuration
4. Add grouping options
5. Create visualization picker
6. Add calculation builder
7. Implement preview panel
8. Add save report function
9. Create report templates
10. Add scheduling options

## 5. Settings (/admin/settings)

### 5.1 Settings Navigation

1. Create settings layout
2. Add tab navigation
3. Implement tab routing
4. Add tab icons
5. Show active tab indicator
6. Add tab descriptions
7. Create mobile dropdown
8. Add settings search
9. Show unsaved changes badge
10. Add keyboard navigation

### 5.2 Department Management

1. Create departments list
2. Add create department form
3. Build department tree view
4. Add edit inline functionality
5. Implement drag-drop reorder
6. Add delete confirmation
7. Show member count
8. Add bulk import
9. Create department search
10. Add export functionality

### 5.3 Category Configuration

1. Build categories grid
2. Add category creation modal
3. Create color picker
4. Add icon selector
5. Implement category hierarchy
6. Add merge categories feature
7. Show usage statistics
8. Add category templates
9. Create import/export
10. Add category preview

### 5.4 User Role Management

1. Create roles list table
2. Add permission matrix
3. Build role creation form
4. Add permission toggles
5. Create role hierarchy view
6. Add user assignment
7. Show role statistics
8. Add role templates
9. Create bulk operations
10. Add role comparison

### 5.5 Email Notifications

1. Create notification list
2. Add template editor
3. Build recipient rules
4. Add frequency settings
5. Create preview panel
6. Add test send feature
7. Show delivery stats
8. Add template variables
9. Create A/B test setup
10. Add unsubscribe settings

## Mock Data Structures

### Idea Object
```typescript
interface MockIdea {
  id: string;
  title: string;
  description: string;
  submitterId: string;
  submitterName: string;
  submitterAvatar: string;
  category: string;
  status: 'pending' | 'approved' | 'rejected' | 'in_progress';
  priority: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  assigneeId?: string;
  assigneeName?: string;
  department: string;
  votes: number;
  comments: number;
  attachments: number;
}
```

### Activity Object
```typescript
interface MockActivity {
  id: string;
  type: 'created' | 'updated' | 'commented' | 'status_changed' | 'assigned';
  userId: string;
  userName: string;
  userAvatar: string;
  timestamp: Date;
  description: string;
  metadata?: Record<string, any>;
}
```

### User Object
```typescript
interface MockUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'admin' | 'moderator' | 'user';
  department: string;
  lastActive: Date;
  permissions: string[];
}
```

## Implementation Notes

### State Management
- Use React `useState` for component-level state
- Implement React Context for shared admin data
- Use `localStorage` for persistence between sessions
- Simulate API delays with `setTimeout`

### Mock Data Generation
- Create realistic data using faker.js or similar
- Ensure consistent relationships between entities
- Generate sufficient data for pagination testing
- Include edge cases (empty states, errors)

### Interactivity
- All actions should provide immediate feedback
- Use optimistic updates for better UX
- Show loading states during simulated delays
- Implement proper error handling

### Responsive Design
- Test all layouts on mobile devices
- Use responsive table designs
- Implement mobile-friendly navigation
- Ensure touch-friendly interactions

### Performance
- Implement virtual scrolling for large lists
- Use React.memo for expensive components
- Debounce search and filter inputs
- Lazy load chart libraries

### Accessibility
- Ensure proper ARIA labels
- Implement keyboard navigation
- Test with screen readers
- Maintain focus management

This frontend-only demo will provide a complete, interactive admin experience without requiring any backend implementation. All data is mocked and all operations are simulated on the client side.