import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { withAuth } from '@/lib/auth';
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

    // Get rental statistics
    const { data: rentals, error: rentalsError } = await supabase
      .from('rentals')
      .select(`
        *,
        customer:customers(first_name, last_name),
        vehicle:vehicles(model, number_plate)
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (rentalsError) {
      console.error('Error fetching rentals:', rentalsError);
      return NextResponse.json(
        { error: 'Failed to fetch rental data' },
        { status: 500 }
      );
    }

    // Get payment statistics
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
      return NextResponse.json(
        { error: 'Failed to fetch payment data' },
        { status: 500 }
      );
    }

    // Calculate statistics
    const totalRentals = rentals?.length || 0;
    const totalRevenue = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
    const activeRentals = rentals?.filter(r => r.status === 'active').length || 0;
    const completedRentals = rentals?.filter(r => r.status === 'completed').length || 0;
    const cancelledRentals = rentals?.filter(r => r.status === 'cancelled').length || 0;

    // Format rental data
    const rentalData = rentals?.map(rental => ({
      id: rental.id,
      rental_id: rental.rental_id,
      customer_name: `${rental.customer.first_name} ${rental.customer.last_name}`,
      vehicle: `${rental.vehicle.model} (${rental.vehicle.number_plate})`,
      start_date: rental.start_date,
      end_date: rental.end_date,
      status: rental.status,
      total_amount: rental.total_amount,
      payment_status: rental.payment_status
    })) || [];

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalRentals,
          totalRevenue,
          activeRentals,
          completedRentals,
          cancelledRentals
        },
        rentals: rentalData
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

export const GET = withAuth(handler); 