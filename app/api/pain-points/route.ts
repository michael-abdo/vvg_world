// Pain Points CRUD API - GET (list all) and POST (create)
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { painPointsDb } from '@/lib/pain-points-db';
import { getServerSession } from 'next-auth';

// Validation schema for creating pain points
const createPainPointSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(255),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.enum(['Safety', 'Efficiency', 'Cost Savings', 'Quality', 'Other']),
  department: z.string().optional(),
  location: z.string().optional(),
  attachment_url: z.string().url().optional(),
  attachment_filename: z.string().optional(),
  attachment_size: z.number().optional(),
});

// GET /api/pain-points - List all pain points
export async function GET(request: NextRequest) {
  try {
    const painPoints = await painPointsDb.getAllPainPoints();
    
    return NextResponse.json({
      success: true,
      data: painPoints,
      count: painPoints.length
    });
  } catch (error) {
    console.error('Error fetching pain points:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch pain points'
    }, { status: 500 });
  }
}

// POST /api/pain-points - Create new pain point
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = createPainPointSchema.parse(body);
    
    // Get user session for submitted_by field
    const session = await getServerSession();
    const userEmail = session?.user?.email || 'anonymous@vvg.com';
    
    // Create pain point
    const painPoint = await painPointsDb.createPainPoint({
      ...validatedData,
      submitted_by: userEmail,
    });
    
    // Update user record if we have session info
    if (session?.user?.email) {
      await painPointsDb.createOrUpdateUser({
        email: session.user.email,
        name: session.user.name || undefined,
        department: validatedData.department,
        location: validatedData.location,
      });
    }
    
    return NextResponse.json({
      success: true,
      data: painPoint,
      message: 'Pain point created successfully'
    }, { status: 201 });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      }, { status: 400 });
    }
    
    console.error('Error creating pain point:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create pain point'
    }, { status: 500 });
  }
}