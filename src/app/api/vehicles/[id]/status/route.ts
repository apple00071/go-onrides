import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';
import { dynamic, revalidate } from '@/app/api/config';

async function changeVehicleStatus(
  request: AuthenticatedRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['available', 'rented', 'maintenance', 'retired'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      );
    }

    // Update vehicle status
    const { data: vehicle, error } = await supabase
      .from('vehicles')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating vehicle status:', error);
      return NextResponse.json(
        { error: 'Failed to update vehicle status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      vehicle
    });
  } catch (error) {
    console.error('Error in change vehicle status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const PATCH = withAuth(changeVehicleStatus); 