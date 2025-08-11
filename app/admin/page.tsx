'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, FileText, TrendingUp, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { ApiResponse, DashboardData } from '@/types/dashboard';


export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  // Fetch dashboard data from API
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Add dev bypass header in development
      const headers: Record<string, string> = {};
      if (process.env.NODE_ENV === 'development') {
        headers['X-Dev-Bypass'] = 'true';
      }
      
      const response = await fetch('/api/admin/dashboard', { headers });
      const result: ApiResponse<DashboardData> = await response.json();
      
      if (result.success && result.data) {
        setDashboardData(result.data);
      } else {
        setError(result.error || 'Failed to fetch dashboard data');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Network error - please try again');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800',
      'under_review': 'bg-blue-100 text-blue-800',
      'in_progress': 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      implemented: 'bg-green-100 text-green-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return variants[status as keyof typeof variants] || variants.pending;
  };

  if (loading || !dashboardData) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-6 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4 animate-pulse">
            <CardContent className="p-6">
              <div className="h-64 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
          <Card className="col-span-3 animate-pulse">
            <CardContent className="p-6">
              <div className="h-64 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchDashboardData}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Button>Generate Report</Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Ideas</p>
                <p className="text-3xl font-bold">{dashboardData.stats.totalIdeas}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-3xl font-bold text-yellow-600">{dashboardData.stats.pendingReview}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-3xl font-bold text-green-600">{dashboardData.stats.approved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-3xl font-bold">{dashboardData.stats.totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Ideas by Status</CardTitle>
            <CardDescription>Current distribution of idea statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboardData.statusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Ideas by Category</CardTitle>
            <CardDescription>Distribution across categories</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dashboardData.categoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  label={({ name, count }) => `${name}: ${count}`}
                >
                  {dashboardData.categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Ideas Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Ideas</CardTitle>
          <CardDescription>Latest submissions requiring your attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dashboardData.recentIdeas.map((idea) => (
              <div key={idea.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{idea.title}</h3>
                  <p className="text-sm text-gray-600">by {idea.submitter} • {idea.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{idea.category}</Badge>
                  <Badge className={getStatusBadge(idea.status)}>
                    {idea.status}
                  </Badge>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Button variant="outline" className="w-full">
              View All Ideas
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}