import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';
import { dynamic, runtime } from '@/app/api/config';

export { dynamic, runtime };

// Get a single booking with detailed information
async function getBooking(request: AuthenticatedRequest, { params }: { params: { id: string } }) {
  try {
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customers(
          id,
          first_name,
          last_name,
          email,
          phone,
          father_phone,
          mother_phone,
          emergency_contact1,
          emergency_contact2
        ),
        vehicle:vehicles(
          id,
          model,
          type,
          number_plate,
          daily_rate
        ),
        worker:users(
          id,
          full_name
        )
      `)
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Error fetching booking:', error);
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Get payments for this booking
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', booking.id)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      booking: {
        ...booking,
        payments: payments || []
      }
    });
  } catch (error) {
    console.error('Error in get booking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update a booking - Admin only
async function updateBooking(request: AuthenticatedRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { start_date, end_date, status, notes } = body;

    // Validate required fields
    if (!start_date || !end_date) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    // Update booking
    const { data: booking, error } = await supabase
      .from('bookings')
      .update({
        start_date,
        end_date,
        status,
        notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating booking:', error);
      return NextResponse.json(
        { error: 'Failed to update booking' },
        { status: 500 }
      );
    }

    return NextResponse.json({ booking });
  } catch (error) {
    console.error('Error in update booking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete a booking - Admin only
async function deleteBooking(request: AuthenticatedRequest, { params }: { params: { id: string } }) {
  try {
    // Check if booking has any payments
    const { data: payments } = await supabase
      .from('payments')
      .select('id')
      .eq('booking_id', params.id);

    if (payments && payments.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete booking with associated payments' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting booking:', error);
      return NextResponse.json(
        { error: 'Failed to delete booking' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Booking deleted successfully'
    });
  } catch (error) {
    console.error('Error in delete booking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle methods
export const GET = withAuth(getBooking);
export const PUT = withAuth(updateBooking);
export const DELETE = withAuth(deleteBooking); 