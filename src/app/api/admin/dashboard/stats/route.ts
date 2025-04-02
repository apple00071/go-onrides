import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { withRoleCheck } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';
import { dynamic } from '@/app/api/config';

export const runtime = 'nodejs';
export { dynamic, };

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
      
    // Get total bookings count
    const { count: totalBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true });

    // Get active bookings count
    const { count: activeBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
      
    // Get total revenue
    const { data: allPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'completed');
      
    const totalRevenue = allPayments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
    
    // Get pending payments
    const { data: pendingPaymentsData } = await supabase
      .from('bookings')
      .select('total_amount')
      .eq('payment_status', 'pending');
      
    const pendingPayments = pendingPaymentsData?.reduce((sum, booking) => sum + (booking.total_amount || 0), 0) || 0;

    // Get today's revenue
    const today = new Date().toISOString().split('T')[0];
    const { data: todayPayments } = await supabase
      .from('payments')
      .select('amount')
      .gte('created_at', today);

    const todayRevenue = todayPayments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;

    // Get recent bookings with details
    const { data: recentBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*, customers(full_name), vehicles(make, model, registration_number)')
      .order('created_at', { ascending: false })
      .limit(5);

    if (bookingsError) {
      console.error('Error fetching recent bookings:', bookingsError);
    }

    // Format and map the bookings data
    const formattedBookings = recentBookings?.map(booking => {
      return {
        id: booking.id,
        customer_name: booking.customers?.full_name || 'Unknown Customer',
        vehicle: booking.vehicles ? `${booking.vehicles.make} ${booking.vehicles.model}` : 'Unknown Vehicle',
        vehicle_number: booking.vehicles?.registration_number || 'Unknown',
        start_date: booking.start_date,
        end_date: booking.end_date,
        total_amount: booking.total_amount || 0,
        status: booking.status || 'pending'
      };
    }) || [];

    return NextResponse.json({
      totalBookings,
      activeBookings,
      totalRevenue,
      pendingPayments,
      recentBookings: formattedBookings
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