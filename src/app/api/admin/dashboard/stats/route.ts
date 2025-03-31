import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { withRoleCheck } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';
import { dynamic, revalidate } from '../../../config';

async function handler(request: AuthenticatedRequest) {
  try {
    // Get total customers count
    const { count: totalCustomers } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });

    // Get total vehicles count
    const { count: totalVehicles } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true });

    // Get active bookings count
    const { count: activeBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Get today's revenue
    const today = new Date().toISOString().split('T')[0];
    const { data: todayPayments } = await supabase
      .from('payments')
      .select('amount')
      .gte('created_at', today);

    const todayRevenue = todayPayments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;

    // Get recent bookings
    const { data: recentBookings } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customers(first_name, last_name),
        vehicle:vehicles(model, number_plate)
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    // Get recent payments
    const { data: recentPayments } = await supabase
      .from('payments')
      .select(`
        *,
        booking:bookings(booking_id),
        customer:customers(first_name, last_name)
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      success: true,
      data: {
        totalCustomers: totalCustomers || 0,
        totalVehicles: totalVehicles || 0,
        activeBookings: activeBookings || 0,
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
        })) || [],
        recentPayments: recentPayments?.map(payment => ({
          id: payment.id,
          booking_id: payment.booking?.booking_id,
          customer_name: `${payment.customer.first_name} ${payment.customer.last_name}`,
          amount: payment.amount,
          method: payment.method,
          status: payment.status,
          created_at: payment.created_at
        })) || []
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}

// Role check middleware to protect the route
export const GET = withRoleCheck(handler, ['admin']); 