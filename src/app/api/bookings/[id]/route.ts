import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';
import { dynamic } from '@/app/api/config';

export const runtime = 'nodejs';
export { dynamic, };

async function getBookingDetails(
  request: AuthenticatedRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    console.log('Fetching booking details for ID:', id);
    
    if (!id) {
      console.log('No booking ID provided');
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // Convert ID to number and validate
    const bookingId = typeof id === 'string' ? parseInt(id, 10) : id;
    if (isNaN(bookingId)) {
      console.log('Invalid booking ID format:', id);
      return NextResponse.json(
        { success: false, error: 'Invalid booking ID format' },
        { status: 400 }
      );
    }

    console.log('Querying booking with ID:', bookingId);

    // First check if the booking exists
    const { data: bookingExists, error: existsError } = await supabase
      .from('bookings')
      .select('id')
      .eq('id', bookingId)
      .single();

    console.log('Booking exists check:', { bookingExists, existsError });

    if (existsError || !bookingExists) {
      console.log('Booking not found with ID:', bookingId);
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Fetch booking with customer and vehicle details
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customers (
          id,
          first_name,
          last_name,
          phone,
          email
        ),
        vehicle:vehicles (
          id,
          model,
          type,
          number_plate
        )
      `)
      .eq('id', bookingId)
      .single();

    console.log('Raw booking data:', booking);
    console.log('Query error:', error);

    if (error) {
      console.error('Error fetching booking:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch booking details',
          details: error.message
        },
        { status: error.code === 'PGRST116' ? 404 : 500 }
      );
    }

    if (!booking) {
      console.log('No booking found for ID:', bookingId);
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Transform the data to match the expected format
    const transformedBooking = {
      id: booking.id.toString(),
      booking_id: booking.booking_id,
      customer_id: booking.customer_id.toString(),
      vehicle_id: booking.vehicle_id.toString(),
      customer_name: booking.customer ? 
        `${booking.customer.first_name} ${booking.customer.last_name}`.trim() : 
        'Unknown Customer',
      customer_phone: booking.customer?.phone || '',
      customer_email: booking.customer?.email || '',
      vehicle_model: booking.vehicle?.model || 'Unknown Vehicle',
      vehicle_type: booking.vehicle?.type || 'Unknown Type',
      vehicle_number: booking.vehicle?.number_plate || 'No Plate',
      start_date: booking.start_date,
      end_date: booking.end_date,
      status: booking.status,
      amount: booking.total_amount || 0,
      payment_status: booking.payment_status
    };

    console.log('Transformed booking:', transformedBooking);

    return NextResponse.json({
      success: true,
      booking: transformedBooking
    });
  } catch (error) {
    console.error('Error in booking details endpoint:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch booking details',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export { getBookingDetails as GET, getBookingDetails as PUT, getBookingDetails as DELETE }; 