import { NextRequest, NextResponse } from 'next/server';
import { painPointsDb } from '@/lib/pain-points-db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';

export async function GET(request: NextRequest) {
  try {
    // Check for dev bypass
    if (process.env.NODE_ENV === 'development' && process.env.DISABLE_AUTH === 'true') {
      console.log('Using development authentication bypass');
      const userEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
      console.log('Fetching reports data for user:', userEmail);
    } else {
      // Normal authentication flow
      const session = await getServerSession(authOptions);
      if (!session?.user?.email) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }
      console.log('Fetching reports data for user:', session.user.email);
    }
    
    // Fetch all analytics data in parallel for better performance
    const [submissionTrends, departmentData, successRateData, keyMetrics] = await Promise.all([
      painPointsDb.getSubmissionTrends(),
      painPointsDb.getDepartmentAnalytics(),
      painPointsDb.getSuccessRateData(),
      painPointsDb.getReportsKeyMetrics()
    ]);

    console.log('Analytics data fetched successfully:', {
      submissionTrends: submissionTrends.length,
      departmentData: departmentData.length,
      successRateData: successRateData.length,
      keyMetrics: Object.keys(keyMetrics).length
    });

    return NextResponse.json({
      success: true,
      data: {
        submissionTrends,
        departmentData,
        successRateData,
        keyMetrics
      }
    });
  } catch (error) {
    console.error('Reports API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch reports data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}