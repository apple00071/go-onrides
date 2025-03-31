import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';
import { dynamic, revalidate } from '@/app/api/config';

// Get a single rental with detailed information
async function getRental(request: AuthenticatedRequest, { params }: { params: { id: string } }) {
  try {
    const { data: rental, error } = await supabase
      .from('rentals')
      .select(`
        *,
        customer:customers(
          id,
          first_name,
          last_name,
          email,
          phone,
          father_phone,
          mother_phone,
          emergency_contact1,
          emergency_contact2
        ),
        vehicle:vehicles(
          id,
          model,
          type,
          number_plate,
          daily_rate
        ),
        worker:users(
          id,
          full_name
        )
      `)
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Error fetching rental:', error);
      return NextResponse.json(
        { error: 'Rental not found' },
        { status: 404 }
      );
    }

    // Get payments for this rental
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('rental_id', rental.id)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      rental: {
        ...rental,
        payments: payments || []
      }
    });
  } catch (error) {
    console.error('Error in get rental:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update a rental - Admin only
async function updateRental(request: AuthenticatedRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { start_date, end_date, status, notes } = body;

    // Validate required fields
    if (!start_date || !end_date) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    // Update rental
    const { data: rental, error } = await supabase
      .from('rentals')
      .update({
        start_date,
        end_date,
        status,
        notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating rental:', error);
      return NextResponse.json(
        { error: 'Failed to update rental' },
        { status: 500 }
      );
    }

    return NextResponse.json({ rental });
  } catch (error) {
    console.error('Error in update rental:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete a rental - Admin only
async function deleteRental(request: AuthenticatedRequest, { params }: { params: { id: string } }) {
  try {
    // Check if rental has any payments
    const { data: payments } = await supabase
      .from('payments')
      .select('id')
      .eq('rental_id', params.id);

    if (payments && payments.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete rental with associated payments' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('rentals')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting rental:', error);
      return NextResponse.json(
        { error: 'Failed to delete rental' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Rental deleted successfully'
    });
  } catch (error) {
    console.error('Error in delete rental:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getRental);
export const PATCH = withAuth(updateRental);
export const DELETE = withAuth(deleteRental); 