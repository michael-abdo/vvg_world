import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { executeQuery } from '@/lib/db';

// Validation schema matching the frontend
const ideaSubmissionSchema = z.object({
  name: z.string().min(2),
  department: z.string().min(1),
  location: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(10),
  attachment: z.any().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the request body
    const validatedData = ideaSubmissionSchema.parse(body);
    
    // Create database insert query for pain_points table
    const insertQuery = `
      INSERT INTO pain_points (
        title, 
        description, 
        category, 
        submitted_by, 
        department, 
        location,
        status,
        upvotes,
        downvotes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      `Pain Point: ${validatedData.category}`, // title - we'll create a generic title
      validatedData.description,
      validatedData.category,
      `${validatedData.name.toLowerCase().replace(/\s+/g, '.')}@vvg.com`, // submitted_by (email format)
      validatedData.department,
      validatedData.location,
      'under_review', // status
      0, // upvotes
      0  // downvotes
    ];
    
    // Save to database
    const result: any = await executeQuery({
      query: insertQuery,
      values: values
    });
    
    // Get the database-generated ID
    const painPointId = result.insertId;
    
    // Log submission for development
    console.log('New pain point submitted to database:', {
      id: painPointId,
      ...validatedData
    });

    // Trigger data pipeline routing for the new pain point
    try {
      const { routingEngine } = await import('@/lib/services/routing-engine');
      
      const painPointData = {
        id: painPointId,
        title: `Pain Point: ${validatedData.category}`,
        description: validatedData.description,
        category: validatedData.category,
        submittedBy: `${validatedData.name.toLowerCase().replace(/\s+/g, '.')}@vvg.com`,
        department: validatedData.department,
        location: validatedData.location
      };

      // Process routing rules for this pain point
      const routingResult = await routingEngine.executeRouting(painPointData);
      
      console.log('Pain point routing completed:', {
        painPointId,
        success: routingResult.success,
        actionsTaken: routingResult.actionsTaken
      });
    } catch (routingError) {
      // Don't fail the submission if routing fails
      console.error('Pain point routing failed, but submission was successful:', routingError);
    }
    
    return NextResponse.json({
      success: true,
      id: painPointId,
      message: 'Pain point submitted successfully',
    });
  } catch (error) {
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
    
    console.error('Error submitting idea:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to submit idea',
      },
      { status: 500 }
    );
  }
}