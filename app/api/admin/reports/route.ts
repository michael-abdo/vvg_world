import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-utils';
import { painPointsDb } from '@/lib/pain-points-db';

async function getReportsHandler(request: NextRequest, userEmail: string) {
  try {
    console.log('Fetching reports data for user:', userEmail);
    
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

export const GET = withAuth(getReportsHandler, { allowDevBypass: true });