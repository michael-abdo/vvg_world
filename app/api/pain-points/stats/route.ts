// Pain Points Statistics API
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { painPointsDb } from '@/lib/pain-points-db';

// GET /api/pain-points/stats - Get pain points analytics
export async function GET(request: NextRequest) {
  try {
    const stats = await painPointsDb.getStats();
    
    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching pain points stats:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch statistics'
    }, { status: 500 });
  }
}