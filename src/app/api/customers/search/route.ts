import { NextResponse } from 'next/server';
import { supabase, TABLES } from '@/lib/supabase';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';
import { dynamic, revalidate } from '../../config';

async function searchCustomers(request: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const aadhar = searchParams.get('aadhar');
    const name = searchParams.get('name');
    const phone = searchParams.get('phone');
    const email = searchParams.get('email');

    let query = supabase
      .from(TABLES.CUSTOMERS)
      .select('*');

    // Apply filters based on search parameters
    if (aadhar) {
      query = query.ilike('aadhar_number', `%${aadhar}%`);
    }
    if (name) {
      query = query.or(`first_name.ilike.%${name}%,last_name.ilike.%${name}%`);
    }
    if (phone) {
      query = query.ilike('phone', `%${phone}%`);
    }
    if (email) {
      query = query.ilike('email', `%${email}%`);
    }

    const { data: customers, error } = await query.limit(10);

    if (error) {
      console.error('Error searching customers:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to search customers' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      customers: customers || []
    });
  } catch (error) {
    console.error('Error in customer search:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search customers' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(searchCustomers); 