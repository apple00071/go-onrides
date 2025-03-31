import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';
import { dynamic, revalidate, runtime } from '@/app/api/config';

async function handler(
  request: AuthenticatedRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    console.log('Processing return for rental ID:', id);

    if (!id) {
      console.log('No rental ID provided');
      return NextResponse.json(
        { success: false, error: 'Rental ID is required' },
        { status: 400 }
      );
    }

    // First, get the rental to check its current status and get the vehicle ID
    const { data: rental, error: rentalError } = await supabase
      .from('rentals')
      .select('status, vehicle_id')
      .eq('id', id)
      .single();

    if (rentalError || !rental) {
      console.error('Error finding rental:', rentalError);
      return NextResponse.json(
        { success: false, error: 'Rental not found' },
        { status: 404 }
      );
    }

    if (rental.status !== 'active') {
      return NextResponse.json(
        { success: false, error: `Cannot return a rental that is ${rental.status}` },
        { status: 400 }
      );
    }

    // Update rental status
    const { error: updateRentalError } = await supabase
      .from('rentals')
      .update({
        status: 'completed',
        return_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateRentalError) {
      console.error('Error updating rental:', updateRentalError);
      return NextResponse.json(
        { success: false, error: 'Failed to update rental status' },
        { status: 500 }
      );
    }

    // Update vehicle status back to available
    const { error: updateVehicleError } = await supabase
      .from('vehicles')
      .update({ status: 'available' })
      .eq('id', rental.vehicle_id);

    if (updateVehicleError) {
      console.error('Error updating vehicle status:', updateVehicleError);
      // Don't fail the request if vehicle update fails, but log it
    }

    return NextResponse.json({
      success: true,
      message: 'Rental return processed successfully'
    });
  } catch (error) {
    console.error('Error processing return:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process return',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export const PATCH = withAuth(handler); 