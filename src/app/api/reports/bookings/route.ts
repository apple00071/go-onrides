import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { withRoleCheck } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';

async function handler(request: AuthenticatedRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const vehicleType = searchParams.get('vehicleType');
    const workerId = searchParams.get('workerId');

    // Build query
    let query = supabase
      .from('bookings')
      .select(`
        *,
        customer:customers(first_name, last_name),
        vehicle:vehicles(model, number_plate, type),
        worker:users(first_name, last_name)
      `);

    // Apply filters
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (vehicleType) {
      query = query.eq('vehicle.type', vehicleType);
    }
    if (workerId) {
      query = query.eq('worker_id', workerId);
    }

    // Execute query
    const { data: bookings, error: bookingsError } = await query;

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      throw bookingsError;
    }

    // Calculate statistics
    const totalBookings = bookings?.length || 0;
    const totalRevenue = bookings?.reduce((sum, booking) => sum + booking.total_amount, 0) || 0;
    const activeBookings = bookings?.filter(r => r.status === 'active').length || 0;
    const completedBookings = bookings?.filter(r => r.status === 'completed').length || 0;
    const cancelledBookings = bookings?.filter(r => r.status === 'cancelled').length || 0;

    // Calculate bookings by vehicle type
    const bookingsByVehicleType = bookings?.reduce((acc: { [key: string]: number }, booking) => {
      const type = booking.vehicle.type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // Calculate bookings by worker
    const bookingsByWorker = bookings?.reduce((acc: { [key: string]: number }, booking) => {
      const workerName = `${booking.worker.first_name} ${booking.worker.last_name}`;
      acc[workerName] = (acc[workerName] || 0) + 1;
      return acc;
    }, {});

    // Format bookings for display
    const formattedBookings = bookings?.map(booking => ({
      id: booking.id,
      booking_id: booking.booking_id,
      customer_name: `${booking.customer.first_name} ${booking.customer.last_name}`,
      vehicle: `${booking.vehicle.model} (${booking.vehicle.number_plate})`,
      vehicle_type: booking.vehicle.type,
      worker_name: `${booking.worker.first_name} ${booking.worker.last_name}`,
      start_date: booking.start_date,
      end_date: booking.end_date,
      status: booking.status,
      total_amount: booking.total_amount,
      payment_status: booking.payment_status,
      created_at: booking.created_at
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalBookings,
        totalRevenue,
        activeBookings,
        completedBookings,
        cancelledBookings,
        bookingsByVehicleType,
        bookingsByWorker,
        bookings: formattedBookings
      }
    });
  } catch (error) {
    console.error('Error generating bookings report:', error);
    return NextResponse.json(
      { error: 'Failed to generate bookings report' },
      { status: 500 }
    );
  }
}

// Role check middleware to protect the route
export const GET = withRoleCheck(handler, ['admin']); 