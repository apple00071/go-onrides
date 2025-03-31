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

    // Get active rentals count
    const { count: activeRentals } = await supabase
      .from('rentals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Get today's revenue
    const today = new Date().toISOString().split('T')[0];
    const { data: todayPayments } = await supabase
      .from('payments')
      .select('amount')
      .gte('created_at', today);

    const todayRevenue = todayPayments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;

    // Get recent rentals
    const { data: recentRentals } = await supabase
      .from('rentals')
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
        rental:rentals(rental_id),
        customer:customers(first_name, last_name)
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      success: true,
      data: {
        totalCustomers: totalCustomers || 0,
        totalVehicles: totalVehicles || 0,
        activeRentals: activeRentals || 0,
        todayRevenue,
        recentRentals: recentRentals?.map(rental => ({
          id: rental.id,
          rental_id: rental.rental_id,
          customer_name: `${rental.customer.first_name} ${rental.customer.last_name}`,
          vehicle: `${rental.vehicle.model} (${rental.vehicle.number_plate})`,
          start_date: rental.start_date,
          end_date: rental.end_date,
          status: rental.status,
          amount: rental.total_amount,
          payment_status: rental.payment_status
        })) || [],
        recentPayments: recentPayments?.map(payment => ({
          id: payment.id,
          rental_id: payment.rental?.rental_id,
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