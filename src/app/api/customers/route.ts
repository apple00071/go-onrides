import { NextResponse } from 'next/server';
import { supabase, TABLES } from '@/lib/supabase';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';

// Original authenticated endpoint
async function getCustomers(request: AuthenticatedRequest) {
  try {
    const { data: customers, error } = await supabase
      .from(TABLES.CUSTOMERS)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customers:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch customers' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      customers: customers || []
    });
  } catch (error) {
    console.error('Error in customers endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

async function createCustomer(request: AuthenticatedRequest) {
  try {
    const data = await request.json();
    console.log('Creating customer with data:', data);

    // Validate required fields
    if (!data.first_name || !data.last_name || !data.phone) {
      return NextResponse.json(
        { success: false, error: 'First name, last name, and phone are required' },
        { status: 400 }
      );
    }

    // Check if customer with same phone number exists
    const { data: existingCustomer } = await supabase
      .from(TABLES.CUSTOMERS)
      .select('id')
      .eq('phone', data.phone)
      .single();

    if (existingCustomer) {
      return NextResponse.json(
        { success: false, error: 'Customer with this phone number already exists' },
        { status: 400 }
      );
    }

    // Map form fields to database fields
    const customerData = {
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email || null,
      phone: data.phone,
      father_phone: data.father_phone || null,
      mother_phone: data.mother_phone || null,
      emergency_contact1: data.emergency_contact1 || null,
      emergency_contact2: data.emergency_contact2 || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      pincode: data.pincode || null,
      dl_number: data.dl_number || null,
      aadhar_number: data.aadhar_number || null,
      // Map file fields to URL fields
      photo_url: data.photo || null,
      dl_front_url: data.dl_front || null,
      dl_back_url: data.dl_back || null,
      aadhar_front_url: data.aadhar_front || null,
      aadhar_back_url: data.aadhar_back || null,
      notes: data.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Mapped customer data:', customerData);

    // Create new customer
    const { data: customer, error } = await supabase
      .from(TABLES.CUSTOMERS)
      .insert(customerData)
      .select()
      .single();

    if (error) {
      console.error('Error creating customer:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to create customer',
          details: error.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      customer
    });
  } catch (error) {
    console.error('Error in create customer:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create customer',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Export the authenticated routes
export const GET = withAuth(getCustomers);
export const POST = withAuth(createCustomer); 