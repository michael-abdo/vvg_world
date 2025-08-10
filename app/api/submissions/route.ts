import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

interface PainPoint {
  id: number;
  title: string;
  description: string;
  category: string;
  submitted_by: string;
  department: string;
  location: string;
  status: string;
  upvotes: number;
  downvotes: number;
  created_at: string;
  updated_at: string;
}

export async function GET() {
  try {
    // Query pain_points table with vote count aggregation
    const query = `
      SELECT 
        p.id,
        p.title,
        p.description,
        p.category,
        p.submitted_by,
        p.department,
        p.location,
        p.status,
        p.upvotes,
        p.downvotes,
        p.created_at,
        p.updated_at,
        COALESCE(SUM(CASE WHEN v.vote_type = 'up' THEN 1 ELSE 0 END), 0) as actual_upvotes,
        COALESCE(SUM(CASE WHEN v.vote_type = 'down' THEN 1 ELSE 0 END), 0) as actual_downvotes
      FROM pain_points p
      LEFT JOIN pain_point_votes v ON p.id = v.pain_point_id
      GROUP BY p.id, p.title, p.description, p.category, p.submitted_by, 
               p.department, p.location, p.status, p.upvotes, p.downvotes, 
               p.created_at, p.updated_at
      ORDER BY p.created_at DESC
    `;

    const results: PainPoint[] = await executeQuery({
      query: query,
      values: []
    });

    // Transform the database results to match frontend expectations
    const submissions = results.map((painPoint: any) => {
      // Extract name from email (michael.abdo@vvg.com -> Michael Abdo)
      const nameFromEmail = painPoint.submitted_by
        .split('@')[0]
        .split('.')
        .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');

      return {
        id: painPoint.id.toString(),
        name: nameFromEmail,
        department: painPoint.department || 'Unknown',
        location: painPoint.location || 'Unknown',
        category: painPoint.category,
        description: painPoint.description,
        status: transformStatus(painPoint.status),
        votes: Math.max(painPoint.actual_upvotes || painPoint.upvotes, 0),
        submittedAt: painPoint.created_at,
      };
    });

    console.log(`Retrieved ${submissions.length} pain points from database`);

    return NextResponse.json({
      success: true,
      submissions: submissions
    });

  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch submissions',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// Helper function to transform database status to frontend status
function transformStatus(dbStatus: string): string {
  const statusMap: { [key: string]: string } = {
    'pending': 'Under Review',
    'under_review': 'Under Review',
    'in_progress': 'In Progress',
    'completed': 'Implemented',
    'rejected': 'Under Review'
  };

  return statusMap[dbStatus] || 'Under Review';
}