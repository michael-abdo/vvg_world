import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-utils';
import { painPointsDb } from '@/lib/pain-points-db';

interface DashboardData {
  stats: {
    totalIdeas: number;
    pendingReview: number;
    approved: number;
    rejected: number;
    totalUsers: number;
    activeUsers: number;
  };
  statusData: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  categoryData: Array<{
    name: string;
    count: number;
    color: string;
  }>;
  recentIdeas: Array<{
    id: string;
    title: string;
    submitter: string;
    status: string;
    date: string;
    category: string;
  }>;
}

export const GET = withAuth(async (request: NextRequest) => {
  try {
    // Get overall stats
    const stats = await painPointsDb.getStats();
    
    // Get submission trends for status distribution
    const trends = await painPointsDb.getSubmissionTrends(1);
    const currentMonth = trends[0];
    
    // Get all pain points for status distribution
    const allPainPoints = await painPointsDb.getAllPainPoints();
    const statusCounts = allPainPoints.reduce((acc, pp) => {
      acc[pp.status] = (acc[pp.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Format status data
    const statusData = [
      { name: 'Pending', value: statusCounts.pending || 0, color: '#f59e0b' },
      { name: 'Approved', value: statusCounts.completed || 0, color: '#10b981' },
      { name: 'Rejected', value: statusCounts.rejected || 0, color: '#ef4444' }
    ];
    
    // Get category distribution
    const categoryMap: Record<string, number> = {};
    allPainPoints.forEach(pp => {
      const category = pp.category || 'Other';
      categoryMap[category] = (categoryMap[category] || 0) + 1;
    });
    
    const categoryColors: Record<string, string> = {
      'Safety': '#ef4444',
      'Efficiency': '#3b82f6',
      'Cost Savings': '#10b981',
      'Quality': '#f59e0b',
      'Other': '#6b7280'
    };
    
    const categoryData = Object.entries(categoryMap).map(([name, count]) => ({
      name,
      count,
      color: categoryColors[name] || '#6b7280'
    })).sort((a, b) => b.count - a.count);
    
    // Get recent ideas (last 5)
    const recentIdeas = allPainPoints.slice(0, 5).map(pp => ({
      id: pp.id.toString(),
      title: pp.title,
      submitter: pp.submitted_by,
      status: pp.status,
      date: new Date(pp.created_at).toISOString().split('T')[0],
      category: pp.category || 'Other'
    }));
    
    // Get user counts
    const uniqueUsers = new Set(allPainPoints.map(pp => pp.submitted_by));
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 30);
    const activeUsers = new Set(
      allPainPoints
        .filter(pp => new Date(pp.created_at) > recentDate)
        .map(pp => pp.submitted_by)
    );
    
    const dashboardData: DashboardData = {
      stats: {
        totalIdeas: stats.totalPainPoints,
        pendingReview: stats.pendingReview,
        approved: stats.completed,
        rejected: statusCounts.rejected || 0,
        totalUsers: uniqueUsers.size,
        activeUsers: activeUsers.size
      },
      statusData,
      categoryData,
      recentIdeas
    };
    
    return NextResponse.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch dashboard data' 
      },
      { status: 500 }
    );
  }
}, { allowDevBypass: true });