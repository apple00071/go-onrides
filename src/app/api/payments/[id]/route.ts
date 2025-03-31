import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';
import { dynamic, revalidate } from '@/app/api/config';

// Get a specific payment by ID
async function getPayment(request: AuthenticatedRequest, { params }: { params: { id: string } }) {
  try {
    const { data: payment, error } = await supabase
      .from('payments')
      .select(`
        *,
        rental:rentals(rental_id, customer_id, vehicle_id),
        customer:customers(first_name, last_name),
        received_by:users(full_name)
      `)
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Error fetching payment:', error);
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ payment });
  } catch (error) {
    console.error('Error in get payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update a payment
async function updatePayment(request: AuthenticatedRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { status, notes } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    const { data: payment, error } = await supabase
      .from('payments')
      .update({
        status,
        notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating payment:', error);
      return NextResponse.json(
        { error: 'Failed to update payment' },
        { status: 500 }
      );
    }

    return NextResponse.json({ payment });
  } catch (error) {
    console.error('Error in update payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete a payment
async function deletePayment(request: AuthenticatedRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting payment:', error);
      return NextResponse.json(
        { error: 'Failed to delete payment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Payment deleted successfully'
    });
  } catch (error) {
    console.error('Error in delete payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getPayment);
export const PATCH = withAuth(updatePayment);
export const DELETE = withAuth(deletePayment); 