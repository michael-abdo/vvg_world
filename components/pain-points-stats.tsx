'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart3, TrendingUp, Users, Clock, CheckCircle2, AlertCircle, Lightbulb } from 'lucide-react';

interface PainPointStats {
  totalPainPoints: number;
  pendingReview: number;
  inProgress: number;
  completed: number;
  byCategory: Record<string, number>;
}

// API function to fetch stats
const fetchPainPointStats = async (): Promise<PainPointStats | null> => {
  try {
    const response = await fetch('/api/pain-points/stats');
    if (!response.ok) {
      throw new Error('Failed to fetch pain point statistics');
    }
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error fetching pain point stats:', error);
    return null;
  }
};

const categoryColors = {
  'Safety': 'bg-red-100 text-red-800',
  'Efficiency': 'bg-blue-100 text-blue-800',
  'Cost Savings': 'bg-green-100 text-green-800',
  'Quality': 'bg-purple-100 text-purple-800',
  'Other': 'bg-gray-100 text-gray-800',
};

const categoryIcons = {
  'Safety': '🛡️',
  'Efficiency': '⚡',
  'Cost Savings': '💰',
  'Quality': '✨',
  'Other': '📋',
};

export default function PainPointsStats() {
  const [stats, setStats] = useState<PainPointStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      const data = await fetchPainPointStats();
      if (data) {
        setStats(data);
      } else {
        setError('Failed to load statistics');
      }
      setLoading(false);
    };

    loadStats();

    // Refresh stats every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-3 bg-gray-100 rounded animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Card className="mb-8">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">{error || 'Failed to load pain point statistics'}</p>
        </CardContent>
      </Card>
    );
  }

  const completionRate = stats.totalPainPoints > 0 
    ? Math.round((stats.completed / stats.totalPainPoints) * 100) 
    : 0;

  const inProgressRate = stats.totalPainPoints > 0 
    ? Math.round((stats.inProgress / stats.totalPainPoints) * 100) 
    : 0;

  const pendingRate = stats.totalPainPoints > 0 
    ? Math.round((stats.pendingReview / stats.totalPainPoints) * 100) 
    : 0;

  // Get top categories
  const sortedCategories = Object.entries(stats.byCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Lightbulb className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Pain Points Analytics</h2>
          <p className="text-sm text-gray-600">Track and manage pain point submissions</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              Total Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalPainPoints}</div>
            <p className="text-xs text-muted-foreground">Pain points reported</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingReview}</div>
            <p className="text-xs text-muted-foreground">{pendingRate}% of total</p>
            <Progress value={pendingRate} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">{inProgressRate}% of total</p>
            <Progress value={inProgressRate} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">{completionRate}% completion rate</p>
            <Progress value={completionRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Categories Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              Categories Breakdown
            </CardTitle>
            <CardDescription>Distribution of pain points by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sortedCategories.length > 0 ? (
                sortedCategories.map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{categoryIcons[category as keyof typeof categoryIcons]}</span>
                      <span className="text-sm font-medium">{category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={categoryColors[category as keyof typeof categoryColors]}>
                        {count}
                      </Badge>
                      <div className="text-xs text-gray-500">
                        {stats.totalPainPoints > 0 ? Math.round((count / stats.totalPainPoints) * 100) : 0}%
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Overview</CardTitle>
            <CardDescription>Pain point resolution progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Resolution Progress</span>
                  <span>{completionRate}%</span>
                </div>
                <Progress value={completionRate} className="h-2" />
                <p className="text-xs text-gray-500 mt-1">
                  {stats.completed} of {stats.totalPainPoints} pain points resolved
                </p>
              </div>
              
              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium mb-3">Quick Stats</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Active Issues</p>
                    <p className="font-semibold">{stats.pendingReview + stats.inProgress}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Most Common</p>
                    <p className="font-semibold">
                      {sortedCategories.length > 0 ? sortedCategories[0][0] : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}