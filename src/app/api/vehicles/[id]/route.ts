import { NextResponse } from 'next/server';
import { supabase, TABLES } from '@/lib/supabase';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';

// Get a specific vehicle by ID
async function getVehicle(request: AuthenticatedRequest, { params }: { params: { id: string } }) {
  try {
    const vehicleId = params.id;
    console.log('Fetching vehicle details for ID:', vehicleId);
    
    if (!vehicleId) {
      console.log('No vehicle ID provided');
      return NextResponse.json(
        { success: false, error: 'Vehicle ID is required' },
        { status: 400 }
      );
    }

    // Convert ID to number and validate
    const id = typeof vehicleId === 'string' ? parseInt(vehicleId, 10) : vehicleId;
    if (isNaN(id)) {
      console.log('Invalid vehicle ID format:', vehicleId);
      return NextResponse.json(
        { success: false, error: 'Invalid vehicle ID format' },
        { status: 400 }
      );
    }

    // First check if the vehicle exists
    const { data: vehicleExists, error: existsError } = await supabase
      .from(TABLES.VEHICLES)
      .select('id')
      .eq('id', id)
      .single();

    console.log('Vehicle exists check:', { vehicleExists, existsError });

    if (existsError || !vehicleExists) {
      console.log('Vehicle not found with ID:', id);
      return NextResponse.json(
        { success: false, error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    // Fetch vehicle details
    const { data: vehicle, error } = await supabase
      .from(TABLES.VEHICLES)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching vehicle:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch vehicle details',
          details: error.message
        },
        { status: 500 }
      );
    }

    // Get booking history
    const { data: bookings, error: bookingsError } = await supabase
      .from(TABLES.BOOKINGS)
      .select(`
        id,
        booking_id,
        start_date,
        end_date,
        status,
        total_amount,
        payment_status,
        customer:customers (
          id,
          first_name,
          last_name,
          phone
        )
      `)
      .eq('vehicle_id', id)
      .order('created_at', { ascending: false });

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
    }

    return NextResponse.json({
      success: true,
      vehicle: {
        ...vehicle,
        booking_history: bookings || []
      }
    });
  } catch (error) {
    console.error('Error in vehicle details endpoint:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch vehicle details',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Update a vehicle
async function updateVehicle(request: AuthenticatedRequest, { params }: { params: { id: string } }) {
  try {
    const vehicleId = params.id;
    console.log('Updating vehicle with ID:', vehicleId);
    
    if (!vehicleId) {
      return NextResponse.json(
        { success: false, error: 'Vehicle ID is required' },
        { status: 400 }
      );
    }

    // Convert ID to number and validate
    const id = typeof vehicleId === 'string' ? parseInt(vehicleId, 10) : vehicleId;
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid vehicle ID format' },
        { status: 400 }
      );
    }

    // Get request body
    const data = await request.json();
    console.log('Update data:', data);

    // Check if vehicle exists
    const { data: existingVehicle, error: checkError } = await supabase
      .from(TABLES.VEHICLES)
      .select('*')
      .eq('id', id)
      .single();

    if (checkError || !existingVehicle) {
      return NextResponse.json(
        { success: false, error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    // Check if number plate is being updated and is unique
    if (data.number_plate && data.number_plate !== existingVehicle.number_plate) {
      const { data: duplicateVehicle } = await supabase
        .from(TABLES.VEHICLES)
        .select('id')
        .eq('number_plate', data.number_plate)
        .neq('id', id)
        .single();

      if (duplicateVehicle) {
        return NextResponse.json(
          { success: false, error: 'A vehicle with this number plate already exists' },
          { status: 400 }
        );
      }
    }

    // Update vehicle
    const { data: updatedVehicle, error: updateError } = await supabase
      .from(TABLES.VEHICLES)
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating vehicle:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update vehicle' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      vehicle: updatedVehicle
    });
  } catch (error) {
    console.error('Error updating vehicle:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update vehicle' },
      { status: 500 }
    );
  }
}

// Change vehicle status
async function changeVehicleStatus(request: AuthenticatedRequest, { params }: { params: { id: string } }) {
  try {
    const vehicleId = params.id;
    console.log('Changing status for vehicle with ID:', vehicleId);
    
    if (!vehicleId) {
      return NextResponse.json(
        { success: false, error: 'Vehicle ID is required' },
        { status: 400 }
      );
    }

    // Get request body
    const data = await request.json();
    const { status } = data;

    // Validate status
    const validStatuses = ['available', 'rented', 'maintenance'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid status. Status must be one of: ' + validStatuses.join(', ')
        },
        { status: 400 }
      );
    }

    // Convert ID to number and validate
    const id = typeof vehicleId === 'string' ? parseInt(vehicleId, 10) : vehicleId;
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid vehicle ID format' },
        { status: 400 }
      );
    }

    // Check if vehicle exists
    const { data: existingVehicle, error: checkError } = await supabase
      .from(TABLES.VEHICLES)
      .select('*')
      .eq('id', id)
      .single();

    if (checkError || !existingVehicle) {
      return NextResponse.json(
        { success: false, error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    // If trying to mark as available, check if there are any active bookings
    if (status === 'available') {
      const { data: activeBookings, error: bookingsError } = await supabase
        .from(TABLES.BOOKINGS)
        .select('id')
        .eq('vehicle_id', id)
        .eq('status', 'active')
        .limit(1);

      if (bookingsError) {
        console.error('Error checking active bookings:', bookingsError);
        return NextResponse.json(
          { success: false, error: 'Failed to check active bookings' },
          { status: 500 }
        );
      }

      if (activeBookings && activeBookings.length > 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Cannot mark vehicle as available while it has active bookings'
          },
          { status: 400 }
        );
      }
    }

    // Update vehicle status
    const { data: updatedVehicle, error: updateError } = await supabase
      .from(TABLES.VEHICLES)
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating vehicle status:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update vehicle status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Vehicle status has been updated to ${status}`,
      vehicle: updatedVehicle
    });
  } catch (error) {
    console.error('Error updating vehicle status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update vehicle status' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getVehicle);
export const PUT = withAuth(updateVehicle);
export const PATCH = withAuth(changeVehicleStatus); 