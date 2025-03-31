import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { withRoleCheck } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';
import { dynamic, revalidate } from '../../../config';

async function handler(request: AuthenticatedRequest) {
  try {
    const workerId = request.user?.id;

    if (!workerId) {
      return NextResponse.json(
        { error: 'Worker ID not found in request' },
        { status: 400 }
      );
    }

    // Get today's rentals handled by the worker
    const today = new Date().toISOString().split('T')[0];
    const { data: todayRentals } = await supabase
      .from('rentals')
      .select('*')
      .eq('worker_id', workerId)
      .gte('created_at', today);

    // Get active rentals assigned to the worker
    const { data: activeRentals } = await supabase
      .from('rentals')
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

    // Get recent rentals handled by the worker
    const { data: recentRentals } = await supabase
      .from('rentals')
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
        todayRentals: todayRentals?.length || 0,
        activeRentals: activeRentals?.length || 0,
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