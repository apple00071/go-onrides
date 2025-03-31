import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';
import { dynamic, revalidate } from '../../config';

// Payment report endpoint
async function getPaymentReports(request: AuthenticatedRequest) {
  // Admin or worker authorization required
  if (!request.user || (request.user.role !== 'admin' && request.user.role !== 'worker')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
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

    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // Get payment statistics
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        *,
        rental:rentals(rental_id, customer_id),
        customer:customers(first_name, last_name)
      `)
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
    const totalPayments = payments?.length || 0;
    const totalRevenue = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
    const paymentsByMethod = payments?.reduce((acc: { [key: string]: number }, payment) => {
      acc[payment.method] = (acc[payment.method] || 0) + 1;
      return acc;
    }, {}) || {};
    const revenueByMethod = payments?.reduce((acc: { [key: string]: number }, payment) => {
      acc[payment.method] = (acc[payment.method] || 0) + payment.amount;
      return acc;
    }, {}) || {};

    // Format payment data
    const formattedPayments = payments?.map(payment => ({
      id: payment.id,
      rental_id: payment.rental?.rental_id,
      customer_name: payment.customer ? `${payment.customer.first_name} ${payment.customer.last_name}` : 'N/A',
      amount: payment.amount,
      method: payment.method,
      status: payment.status,
      created_at: payment.created_at,
      reference_number: payment.reference_number
    })) || [];

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalPayments,
          totalRevenue,
          paymentsByMethod,
          revenueByMethod
        },
        payments: formattedPayments
      }
    });
  } catch (error) {
    console.error('Error generating payment report:', error);
    return NextResponse.json(
      { error: 'Failed to generate payment report' },
      { status: 500 }
    );
  }
}

// Helper function to validate date format (YYYY-MM-DD)
function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

export const GET = withAuth(getPaymentReports); 