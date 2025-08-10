import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { executeQuery } from '@/lib/db';

// Validation schema for voting
const voteSchema = z.object({
  painPointId: z.string().min(1),
  userEmail: z.string().email().optional().default('michael.abdo@vvg.com'),
  voteType: z.enum(['up', 'down']).optional().default('up'), // Default to upvote
  action: z.enum(['add', 'remove']).optional().default('add')
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the request body
    const validatedData = voteSchema.parse(body);
    const { painPointId, userEmail, voteType, action } = validatedData;

    // Convert painPointId to number
    const painPointIdNum = parseInt(painPointId);
    
    if (action === 'add') {
      // Add vote with uniqueness check
      const insertVoteQuery = `
        INSERT INTO pain_point_votes (pain_point_id, user_email, vote_type)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE vote_type = VALUES(vote_type)
      `;
      
      await executeQuery({
        query: insertVoteQuery,
        values: [painPointIdNum, userEmail, voteType]
      });

      console.log(`Added ${voteType} vote for pain point ${painPointId} by ${userEmail}`);
      
    } else if (action === 'remove') {
      // Remove vote
      const deleteVoteQuery = `
        DELETE FROM pain_point_votes 
        WHERE pain_point_id = ? AND user_email = ?
      `;
      
      await executeQuery({
        query: deleteVoteQuery,
        values: [painPointIdNum, userEmail]
      });

      console.log(`Removed vote for pain point ${painPointId} by ${userEmail}`);
    }

    // Update cached vote counts in pain_points table
    const updateCountsQuery = `
      UPDATE pain_points 
      SET 
        upvotes = (
          SELECT COUNT(*) 
          FROM pain_point_votes 
          WHERE pain_point_id = ? AND vote_type = 'up'
        ),
        downvotes = (
          SELECT COUNT(*) 
          FROM pain_point_votes 
          WHERE pain_point_id = ? AND vote_type = 'down'
        )
      WHERE id = ?
    `;
    
    await executeQuery({
      query: updateCountsQuery,
      values: [painPointIdNum, painPointIdNum, painPointIdNum]
    });

    // Get updated vote counts
    const getCountsQuery = `
      SELECT upvotes, downvotes 
      FROM pain_points 
      WHERE id = ?
    `;
    
    const result: any = await executeQuery({
      query: getCountsQuery,
      values: [painPointIdNum]
    });

    const updatedCounts = result[0] || { upvotes: 0, downvotes: 0 };

    return NextResponse.json({
      success: true,
      message: `Vote ${action === 'add' ? 'added' : 'removed'} successfully`,
      votes: updatedCounts.upvotes,
      upvotes: updatedCounts.upvotes,
      downvotes: updatedCounts.downvotes
    });

  } catch (error) {
    console.error('Error processing vote:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process vote',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}