// Pain Points Voting API
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { painPointsDb } from '@/lib/pain-points-db';
import { getServerSession } from 'next-auth';

// Validation schema for voting
const voteSchema = z.object({
  vote_type: z.enum(['up', 'down']),
});

// POST /api/pain-points/[id]/vote - Vote on a pain point
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid pain point ID'
      }, { status: 400 });
    }
    
    // Check authentication
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }
    
    const body = await request.json();
    const { vote_type } = voteSchema.parse(body);
    
    // Check if pain point exists
    const existingPainPoint = await painPointsDb.getPainPointById(id);
    if (!existingPainPoint) {
      return NextResponse.json({
        success: false,
        error: 'Pain point not found'
      }, { status: 404 });
    }
    
    // Cast vote (this handles creating/updating votes and updating cached counts)
    const updatedPainPoint = await painPointsDb.vote(id, session.user.email, vote_type);
    
    return NextResponse.json({
      success: true,
      data: updatedPainPoint,
      message: `Vote ${vote_type} recorded successfully`
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      }, { status: 400 });
    }
    
    console.error('Error voting on pain point:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to record vote'
    }, { status: 500 });
  }
}

// GET /api/pain-points/[id]/vote - Get user's current vote
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid pain point ID'
      }, { status: 400 });
    }
    
    // Check authentication
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }
    
    // Get user's current vote
    const userVote = await painPointsDb.getUserVote(id, session.user.email);
    
    return NextResponse.json({
      success: true,
      data: userVote
    });
    
  } catch (error) {
    console.error('Error fetching user vote:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch user vote'
    }, { status: 500 });
  }
}