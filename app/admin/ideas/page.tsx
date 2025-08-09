'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Filter, Download, Edit, Eye, Trash2 } from 'lucide-react';

// API Types
interface PainPoint {
  id: number;
  title: string;
  description: string;
  category: 'Safety' | 'Efficiency' | 'Cost Savings' | 'Quality' | 'Other';
  submitted_by: string;
  department?: string;
  location?: string;
  status: 'pending' | 'under_review' | 'in_progress' | 'completed' | 'rejected';
  upvotes: number;
  downvotes: number;
  created_at: string;
  updated_at: string;
}

interface Idea {
  id: string;
  title: string;
  description: string;
  submitter: string;
  submitterEmail: string;
  category: string;
  status: 'pending' | 'under_review' | 'in_progress' | 'completed' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'critical';
  department: string;
  createdAt: string;
  votes: number;
  assignee?: string;
}

// API functions
const fetchPainPoints = async (): Promise<PainPoint[]> => {
  try {
    const response = await fetch('/api/pain-points');
    if (!response.ok) {
      throw new Error('Failed to fetch pain points');
    }
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Error fetching pain points:', error);
    return [];
  }
};

const updatePainPoint = async (id: number, updates: Partial<PainPoint>): Promise<PainPoint | null> => {
  try {
    const response = await fetch(`/api/pain-points/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      throw new Error('Failed to update pain point');
    }
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error updating pain point:', error);
    return null;
  }
};

const deletePainPoint = async (id: number): Promise<boolean> => {
  try {
    const response = await fetch(`/api/pain-points/${id}`, {
      method: 'DELETE',
    });
    return response.ok;
  } catch (error) {
    console.error('Error deleting pain point:', error);
    return false;
  }
};

// Helper function to extract name from email
const getNameFromEmail = (email: string): string => {
  const name = email.split('@')[0];
  return name.split('.').map(part => 
    part.charAt(0).toUpperCase() + part.slice(1)
  ).join(' ');
};

// Helper function to convert PainPoint to Idea for display
const convertPainPointToIdea = (painPoint: PainPoint): Idea => ({
  id: painPoint.id.toString(),
  title: painPoint.title,
  description: painPoint.description,
  submitter: getNameFromEmail(painPoint.submitted_by),
  submitterEmail: painPoint.submitted_by,
  category: painPoint.category,
  status: painPoint.status,
  priority: painPoint.upvotes > 10 ? 'high' : painPoint.upvotes > 5 ? 'medium' : 'low',
  department: painPoint.department || 'Unknown',
  createdAt: painPoint.created_at,
  votes: painPoint.upvotes + painPoint.downvotes,
});

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  under_review: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800'
};

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
};

export default function IdeasManagement() {
  const [painPoints, setPainPoints] = useState<PainPoint[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await fetchPainPoints();
      setPainPoints(data);
      const convertedIdeas = data.map(convertPainPointToIdea);
      setIdeas(convertedIdeas);
      setLoading(false);
    };
    loadData();
  }, []);

  const categories = Array.from(new Set(ideas.map(idea => idea.category)));
  const statuses = Array.from(new Set(ideas.map(idea => idea.status)));

  const filteredIdeas = useMemo(() => {
    let filtered = [...ideas];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(idea =>
        idea.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        idea.submitter.toLowerCase().includes(searchTerm.toLowerCase()) ||
        idea.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(idea => idea.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(idea => idea.category === categoryFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue = a[sortBy as keyof Idea];
      let bValue = b[sortBy as keyof Idea];

      if (sortBy === 'createdAt') {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [ideas, searchTerm, statusFilter, categoryFilter, sortBy, sortOrder]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredIdeas.map(idea => idea.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkAction = async (action: string) => {
    console.log(`Bulk action: ${action} on items:`, Array.from(selectedIds));
    
    if (action === 'approve') {
      for (const id of selectedIds) {
        await updatePainPoint(parseInt(id), { status: 'in_progress' });
      }
    } else if (action === 'reject') {
      for (const id of selectedIds) {
        await updatePainPoint(parseInt(id), { status: 'rejected' });
      }
    }
    
    // Reload data after bulk action
    const data = await fetchPainPoints();
    setPainPoints(data);
    const convertedIdeas = data.map(convertPainPointToIdea);
    setIdeas(convertedIdeas);
    setSelectedIds(new Set());
  };

  const handleEdit = async (id: string, updates: Partial<PainPoint>) => {
    const result = await updatePainPoint(parseInt(id), updates);
    if (result) {
      // Reload data
      const data = await fetchPainPoints();
      setPainPoints(data);
      const convertedIdeas = data.map(convertPainPointToIdea);
      setIdeas(convertedIdeas);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this pain point?');
    if (confirmed) {
      const success = await deletePainPoint(parseInt(id));
      if (success) {
        // Reload data
        const data = await fetchPainPoints();
        setPainPoints(data);
        const convertedIdeas = data.map(convertPainPointToIdea);
        setIdeas(convertedIdeas);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pain points...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pain Points Management</h1>
          <p className="text-gray-600">Manage and review all submitted pain points</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => console.log('Export')}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>Add Pain Point</Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search pain points..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {statuses.map(status => (
                  <SelectItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [field, order] = value.split('-');
              setSortBy(field);
              setSortOrder(order as 'asc' | 'desc');
            }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt-desc">Newest First</SelectItem>
                <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                <SelectItem value="votes-desc">Most Votes</SelectItem>
                <SelectItem value="votes-asc">Least Votes</SelectItem>
                <SelectItem value="title-asc">Title A-Z</SelectItem>
                <SelectItem value="title-desc">Title Z-A</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">
                {selectedIds.size} item{selectedIds.size > 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('approve')}>
                  Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('reject')}>
                  Reject
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('assign')}>
                  Assign
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('categorize')}>
                  Categorize
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ideas Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedIds.size === filteredIdeas.length && filteredIdeas.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Submitter</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Votes</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIdeas.map((idea) => (
                <TableRow key={idea.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(idea.id)}
                      onCheckedChange={(checked) => handleSelectRow(idea.id, !!checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{idea.title}</div>
                      <div className="text-sm text-gray-500 truncate max-w-[300px]">
                        {idea.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{idea.submitter}</div>
                      <div className="text-sm text-gray-500">{idea.department}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{idea.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[idea.status as keyof typeof statusColors]}>
                      {idea.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={priorityColors[idea.priority]}>
                      {idea.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{idea.votes}</TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {formatDate(idea.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => console.log('Edit', idea.id)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(idea.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredIdeas.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No pain points found matching your criteria.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}