import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { withRoleCheck } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';
import { dynamic, runtime } from '../../../config';

// Explicitly export these to ensure the route is dynamic
export { dynamic, runtime };

async function handler(request: AuthenticatedRequest) {
  try {
    const workerId = request.user?.id;

    if (!workerId) {
      return NextResponse.json(
        { error: 'Worker ID not found in request' },
        { status: 400 }
      );
    }

    // Get today's bookings handled by the worker
    const today = new Date().toISOString().split('T')[0];
    const { data: todayBookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('worker_id', workerId)
      .gte('created_at', today);

    // Get active bookings assigned to the worker
    const { data: activeBookings } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customers(first_name, last_name),
        vehicle:vehicles(model, number_plate)
      `)
      .eq('worker_id', workerId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    // Get today's payments collected by the worker
    const { data: todayPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('received_by', workerId)
      .gte('created_at', today);

    const todayRevenue = todayPayments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;

    // Get recent bookings handled by the worker
    const { data: recentBookings } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customers(first_name, last_name),
        vehicle:vehicles(model, number_plate)
      `)
      .eq('worker_id', workerId)
      .order('created_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      success: true,
      data: {
        todayBookings: todayBookings?.length || 0,
        activeBookings: activeBookings?.length || 0,
        todayRevenue,
        recentBookings: recentBookings?.map(booking => ({
          id: booking.id,
          booking_id: booking.booking_id,
          customer_name: `${booking.customer.first_name} ${booking.customer.last_name}`,
          vehicle: `${booking.vehicle.model} (${booking.vehicle.number_plate})`,
          start_date: booking.start_date,
          end_date: booking.end_date,
          status: booking.status,
          amount: booking.total_amount,
          payment_status: booking.payment_status
        })) || []
      }
    });
  } catch (error) {
    console.error('Error fetching worker dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}

// Role check middleware to protect the route
export const GET = withRoleCheck(handler, ['admin', 'worker']); 