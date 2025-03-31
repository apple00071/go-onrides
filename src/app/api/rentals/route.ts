import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';

async function getBookings(request: AuthenticatedRequest) {
  try {
    console.log('Fetching bookings...');
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const sort = searchParams.get('sort') || 'created_at';
    const order = searchParams.get('order') || 'desc';
    
    // Fetch bookings with customer and vehicle details
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customers (
          id,
          first_name,
          last_name,
          phone
        ),
        vehicle:vehicles (
          id,
          model,
          type,
          number_plate
        )
      `)
      .order(sort, { ascending: order === 'asc' })
      .limit(limit);

    if (error) {
      console.error('Error fetching bookings:', error);
      throw error;
    }

    // Transform the data to match the expected format
    const transformedBookings = bookings?.map(booking => ({
      id: booking.id.toString(),
      booking_id: booking.booking_id,
      customer_id: booking.customer_id.toString(),
      vehicle_id: booking.vehicle_id.toString(),
      customer_name: booking.customer ? 
        `${booking.customer.first_name} ${booking.customer.last_name}`.trim() : 
        'Unknown Customer',
      vehicle_model: booking.vehicle?.model || 'Unknown Vehicle',
      vehicle_type: booking.vehicle?.type || 'Unknown Type',
      vehicle_number: booking.vehicle?.number_plate || 'No Plate',
      start_date: booking.start_date,
      end_date: booking.end_date,
      status: booking.status,
      amount: booking.total_amount || 0,
      payment_status: booking.payment_status
    })) || [];

    return NextResponse.json({
      success: true,
      bookings: transformedBookings
    });
  } catch (error) {
    console.error('Error in bookings endpoint:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch bookings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function createBooking(request: AuthenticatedRequest) {
  if (!request.user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const data = await request.json();
    console.log('Creating booking with data:', data);

    // Validate required fields
    if (!data.vehicle_id || !data.customer_id || !data.start_date || !data.end_date) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Convert vehicle_id to number and validate
    const vehicleId = typeof data.vehicle_id === 'string' ? parseInt(data.vehicle_id, 10) : data.vehicle_id;
    if (isNaN(vehicleId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid vehicle ID format' },
        { status: 400 }
      );
    }

    // Check if vehicle exists and is available
    console.log('Checking vehicle with ID:', vehicleId);
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', vehicleId)
      .single();

    console.log('Found vehicle:', vehicle);
    console.log('Vehicle query error:', vehicleError);

    if (vehicleError || !vehicle) {
      console.error('Error checking vehicle:', vehicleError);
      return NextResponse.json(
        { success: false, error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    if (vehicle.status !== 'available') {
      return NextResponse.json(
        { success: false, error: 'Selected vehicle is not available' },
        { status: 400 }
      );
    }

    // Convert customer_id to number and validate
    const customerId = typeof data.customer_id === 'string' ? parseInt(data.customer_id, 10) : data.customer_id;
    if (isNaN(customerId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid customer ID format' },
        { status: 400 }
      );
    }

    // Check if customer exists
    console.log('Checking customer with ID:', customerId);
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    console.log('Found customer:', customer);
    console.log('Customer query error:', customerError);

    if (customerError || !customer) {
      console.error('Error checking customer:', customerError);
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Create new booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        customer_id: customerId,
        vehicle_id: vehicleId,
        worker_id: request.user.id,
        start_date: data.start_date,
        end_date: data.end_date,
        status: 'active',
        base_price: data.base_price,
        additional_charges: data.additional_charges || 0,
        discount: data.discount || 0,
        total_amount: parseFloat(data.base_price) + 
                     parseFloat(data.additional_charges || '0') - 
                     parseFloat(data.discount || '0'),
        payment_status: 'pending'
      })
      .select()
      .single();

    if (bookingError) {
      console.error('Error creating booking:', bookingError);
      throw bookingError;
    }

    console.log('Created booking:', booking);

    // Update vehicle status to 'rented'
    const { error: updateError } = await supabase
      .from('vehicles')
      .update({ status: 'rented' })
      .eq('id', vehicleId);

    if (updateError) {
      console.error('Error updating vehicle status:', updateError);
      // Don't throw here, as the booking was created successfully
    }

    // Return the booking with properly formatted ID
    return NextResponse.json({
      success: true,
      booking: {
        ...booking,
        id: booking.id.toString(),
        customer_id: booking.customer_id.toString(),
        vehicle_id: booking.vehicle_id.toString(),
        worker_id: booking.worker_id.toString()
      }
    });
  } catch (error) {
    console.error('Error in create booking:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create booking'
      },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getBookings);
export const POST = withAuth(createBooking); 