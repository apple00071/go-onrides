import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';
import { dynamic, revalidate } from '../config';

async function getPayments(request: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Get payments with rental and customer details
    const { data: payments, error, count } = await supabase
      .from('payments')
      .select(`
        *,
        rental:rentals(rental_id, customer:customers(first_name, last_name))
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching payments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch payments' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        payments: payments?.map(payment => ({
          id: payment.id,
          rental_id: payment.rental?.rental_id,
          customer_name: `${payment.rental?.customer?.first_name} ${payment.rental?.customer?.last_name}`,
          amount: payment.amount,
          method: payment.method,
          status: payment.status,
          transaction_id: payment.transaction_id,
          notes: payment.notes,
          created_at: payment.created_at
        })) || [],
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
      rental_id,
      amount,
      method,
      transaction_id,
      notes
    } = body;

    if (!rental_id || !amount || !method) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create payment record
    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        rental_id,
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

    // Update rental payment status
    const { data: rental } = await supabase
      .from('rentals')
      .select('total_amount, paid_amount')
      .eq('id', rental_id)
      .single();

    if (rental) {
      const newPaidAmount = (rental.paid_amount || 0) + amount;
      const paymentStatus = newPaidAmount >= rental.total_amount ? 'paid' : 'partial';

      await supabase
        .from('rentals')
        .update({
          paid_amount: newPaidAmount,
          payment_status: paymentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', rental_id);
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

export const GET = withAuth(getPayments);
export const POST = withAuth(createPayment); 