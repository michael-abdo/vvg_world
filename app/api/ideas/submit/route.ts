import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

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
    
    // Generate a unique ID for the submission
    const ideaId = uuidv4();
    
    // TODO: Save to database
    // For now, we'll just simulate saving and return the data
    const submission = {
      id: ideaId,
      ...validatedData,
      status: 'Under Review',
      submittedAt: new Date().toISOString(),
      votes: 0,
    };
    
    // In production, you would save to database here:
    // await db.ideas.create({ data: submission });
    
    // Log submission for development
    console.log('New idea submitted:', submission);
    
    return NextResponse.json({
      success: true,
      id: ideaId,
      message: 'Idea submitted successfully',
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