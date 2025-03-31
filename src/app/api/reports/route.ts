import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { withRoleCheck } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';
import { dynamic, revalidate } from '../config';

async function handler(request: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    // Get total customers
    const { data: customers, error: customerError } = await supabase
      .from('customers')
      .select('*');

    if (customerError) {
      console.error('Error fetching customers:', customerError);
      throw customerError;
    }

    // Get total bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customers(first_name, last_name),
        vehicle:vehicles(model, number_plate)
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      throw bookingsError;
    }

    // Get total payments
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
      throw paymentsError;
    }

    // Calculate statistics
    const totalBookings = bookings?.length || 0;
    const totalRevenue = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
    const activeBookings = bookings?.filter(r => r.status === 'active').length || 0;
    const completedBookings = bookings?.filter(r => r.status === 'completed').length || 0;
    const cancelledBookings = bookings?.filter(r => r.status === 'cancelled').length || 0;

    // Format booking data for display
    const bookingData = bookings?.map(booking => ({
      id: booking.id,
      booking_id: booking.booking_id,
      customer_name: `${booking.customer.first_name} ${booking.customer.last_name}`,
      vehicle: `${booking.vehicle.model} (${booking.vehicle.number_plate})`,
      start_date: booking.start_date,
      end_date: booking.end_date,
      status: booking.status,
      amount: booking.total_amount,
      payment_status: booking.payment_status
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalCustomers: customers?.length || 0,
        totalBookings,
        totalRevenue,
        activeBookings,
        completedBookings,
        cancelledBookings,
        bookings: bookingData
      }
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

// Role check middleware to protect the route
export const GET = withRoleCheck(handler, ['admin']); 