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
    console.log('Processing return for booking ID:', id);

    if (!id) {
      console.log('No booking ID provided');
      return NextResponse.json(
        { success: false, error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // First, get the booking to check its current status and get the vehicle ID
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('status, vehicle_id')
      .eq('id', id)
      .single();

    if (bookingError || !booking) {
      console.error('Error finding booking:', bookingError);
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    if (booking.status !== 'active') {
      return NextResponse.json(
        { success: false, error: `Cannot return a booking that is ${booking.status}` },
        { status: 400 }
      );
    }

    // Update booking status
    const { error: updateBookingError } = await supabase
      .from('bookings')
      .update({
        status: 'completed',
        return_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateBookingError) {
      console.error('Error updating booking:', updateBookingError);
      return NextResponse.json(
        { success: false, error: 'Failed to update booking status' },
        { status: 500 }
      );
    }

    // Update vehicle status back to available
    const { error: updateVehicleError } = await supabase
      .from('vehicles')
      .update({ status: 'available' })
      .eq('id', booking.vehicle_id);

    if (updateVehicleError) {
      console.error('Error updating vehicle status:', updateVehicleError);
      // Don't fail the request if vehicle update fails, but log it
    }

    return NextResponse.json({
      success: true,
      message: 'Booking return processed successfully'
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