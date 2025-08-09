import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { painPointsDb } from '@/lib/pain-points-db';
import { getServerSession } from 'next-auth';

// Validation schema matching the frontend
const ideaSubmissionSchema = z.object({
  name: z.string().min(2),
  department: z.string().min(1),
  location: z.string().min(1),
  category: z.enum(['Safety', 'Efficiency', 'Cost Savings', 'Quality', 'Other']),
  description: z.string().min(10),
  title: z.string().min(5).optional(),
  attachment: z.any().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the request body
    const validatedData = ideaSubmissionSchema.parse(body);
    
    // Get user session
    const session = await getServerSession();
    const userEmail = session?.user?.email || `${validatedData.name.toLowerCase().replace(' ', '.')}@vvg.com`;
    
    // Create pain point in database
    const painPoint = await painPointsDb.createPainPoint({
      title: validatedData.title || `${validatedData.category} Improvement from ${validatedData.department}`,
      description: validatedData.description,
      category: validatedData.category,
      submitted_by: userEmail,
      department: validatedData.department,
      location: validatedData.location,
    });
    
    // Update/create user record
    await painPointsDb.createOrUpdateUser({
      email: userEmail,
      name: validatedData.name,
      department: validatedData.department,
      location: validatedData.location,
    });
    
    return NextResponse.json({
      success: true,
      id: painPoint.id,
      data: painPoint,
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
    
    console.error('Error submitting pain point:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to submit pain point',
      },
      { status: 500 }
    );
  }
}