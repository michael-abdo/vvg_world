// Pain Points CRUD API - GET (single), PUT (update), DELETE
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { painPointsDb } from '@/lib/pain-points-db';
import { getServerSession } from 'next-auth';

// Validation schema for updating pain points
const updatePainPointSchema = z.object({
  title: z.string().min(5).max(255).optional(),
  description: z.string().min(10).optional(),
  category: z.enum(['Safety', 'Efficiency', 'Cost Savings', 'Quality', 'Other']).optional(),
  status: z.enum(['pending', 'under_review', 'in_progress', 'completed', 'rejected']).optional(),
  department: z.string().optional(),
  location: z.string().optional(),
  attachment_url: z.string().url().optional(),
  attachment_filename: z.string().optional(),
  attachment_size: z.number().optional(),
});

// GET /api/pain-points/[id] - Get single pain point
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
    
    const painPoint = await painPointsDb.getPainPointById(id);
    
    if (!painPoint) {
      return NextResponse.json({
        success: false,
        error: 'Pain point not found'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data: painPoint
    });
  } catch (error) {
    console.error('Error fetching pain point:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch pain point'
    }, { status: 500 });
  }
}

// PUT /api/pain-points/[id] - Update pain point
export async function PUT(
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
    
    const body = await request.json();
    const validatedData = updatePainPointSchema.parse(body);
    
    // Check if pain point exists
    const existingPainPoint = await painPointsDb.getPainPointById(id);
    if (!existingPainPoint) {
      return NextResponse.json({
        success: false,
        error: 'Pain point not found'
      }, { status: 404 });
    }
    
    // Update pain point
    const updatedPainPoint = await painPointsDb.updatePainPoint(id, validatedData);
    
    return NextResponse.json({
      success: true,
      data: updatedPainPoint,
      message: 'Pain point updated successfully'
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      }, { status: 400 });
    }
    
    console.error('Error updating pain point:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update pain point'
    }, { status: 500 });
  }
}

// DELETE /api/pain-points/[id] - Delete pain point
export async function DELETE(
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
    
    // Check if pain point exists
    const existingPainPoint = await painPointsDb.getPainPointById(id);
    if (!existingPainPoint) {
      return NextResponse.json({
        success: false,
        error: 'Pain point not found'
      }, { status: 404 });
    }
    
    // Get user session to check permissions (optional: only allow deletion by submitter or admin)
    const session = await getServerSession();
    const userEmail = session?.user?.email;
    
    // For now, allow any authenticated user to delete
    // In production, you might want to restrict this
    if (!userEmail) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }
    
    await painPointsDb.deletePainPoint(id);
    
    return NextResponse.json({
      success: true,
      message: 'Pain point deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting pain point:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete pain point'
    }, { status: 500 });
  }
}