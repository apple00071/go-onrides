import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';

// Set runtime and dynamic options explicitly as string literals
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

    // Get corresponding bookings and customers
    const bookingIds = payments?.map(p => p.booking_id).filter(Boolean) || [];
    
    // Get bookings data if we have booking IDs
    let bookingsData: Record<string | number, any> = {};
    let customersData: Record<string | number, any> = {};
    
    if (bookingIds.length > 0) {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, customer_id')
        .in('id', bookingIds);
        
      if (bookings?.length) {
        // Create a lookup map for bookings
        bookingsData = bookings.reduce((acc: Record<string | number, any>, booking) => {
          acc[booking.id] = booking;
          return acc;
        }, {});
        
        // Get customer data 
        const customerIds = bookings.map(b => b.customer_id).filter(Boolean);
        
        if (customerIds.length > 0) {
          const { data: customers } = await supabase
            .from('customers')
            .select('id, first_name, last_name')
            .in('id', customerIds);
            
          if (customers?.length) {
            // Create a lookup map for customers
            customersData = customers.reduce((acc: Record<string | number, any>, customer) => {
              acc[customer.id] = customer;
              return acc;
            }, {});
          }
        }
      }
    }

    // Calculate statistics
    const totalPayments = payments?.length || 0;
    const totalRevenue = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
    
    const paymentsByMethod = (payments || []).reduce((acc: { [key: string]: number }, payment) => {
      if (payment.method) {
        acc[payment.method] = (acc[payment.method] || 0) + 1;
      }
      return acc;
    }, {});

    const revenueByMethod = (payments || []).reduce((acc: { [key: string]: number }, payment) => {
      if (payment.method && payment.amount) {
        acc[payment.method] = (acc[payment.method] || 0) + payment.amount;
      }
      return acc;
    }, {});

    // Format payment data
    const formattedPayments = payments?.map(payment => {
      const booking = bookingsData[payment.booking_id];
      const customer = booking ? customersData[booking.customer_id] : null;
      
      return {
        id: payment.id,
        booking_id: payment.booking_id,
        customer_name: customer ? 
          `${customer.first_name} ${customer.last_name}` : 'N/A',
        amount: payment.amount,
        method: payment.method,
        status: payment.status,
        created_at: payment.created_at,
        reference_number: payment.reference_number
      };
    });

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