import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';
import { dynamic } from '@/app/api/config';

export const runtime = 'nodejs';
export { dynamic, };

async function getPayments(request: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Get payments data
    const { data: payments, error, count } = await supabase
      .from('payments')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching payments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch payments' },
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
        .select('id, booking_id, customer_id')
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

    return NextResponse.json({
      success: true,
      data: {
        payments: payments?.map(payment => {
          const booking = bookingsData[payment.booking_id];
          const customer = booking ? customersData[booking.customer_id] : null;
          
          return {
            id: payment.id,
            booking_id: payment.booking_id,
            booking_reference: booking?.booking_id,
            customer_name: customer ? 
              `${customer.first_name} ${customer.last_name}` : 'N/A',
            amount: payment.amount,
            method: payment.method,
            status: payment.status,
            transaction_id: payment.transaction_id,
            notes: payment.notes,
            created_at: payment.created_at
          };
        }) || [],
        pagination: {
          total: count || 0,
          page,
          limit,
          totalPages: Math.ceil((count || 0) / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error in payments endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function createPayment(request: AuthenticatedRequest) {
  try {
    const body = await request.json();
    const {
      booking_id,
      amount,
      method,
      transaction_id,
      notes
    } = body;

    if (!booking_id || !amount || !method) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create payment record
    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        booking_id,
        amount,
        method,
        status: 'completed',
        transaction_id,
        notes,
        received_by: request.user?.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating payment:', error);
      return NextResponse.json(
        { error: 'Failed to create payment' },
        { status: 500 }
      );
    }

    // Update booking payment status
    const { data: booking } = await supabase
      .from('bookings')
      .select('total_amount, paid_amount')
      .eq('id', booking_id)
      .single();

    if (booking) {
      const newPaidAmount = (booking.paid_amount || 0) + amount;
      const paymentStatus = newPaidAmount >= booking.total_amount ? 'paid' : 'partial';

      await supabase
        .from('bookings')
        .update({
          paid_amount: newPaidAmount,
          payment_status: paymentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', booking_id);
    }

    return NextResponse.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Error in create payment endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export { getPayments as GET, createPayment as POST }; 