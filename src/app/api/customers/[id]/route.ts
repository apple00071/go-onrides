import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';
import { dynamic } from '@/app/api/config';

export const runtime = 'nodejs';
export { dynamic, };

interface Booking {
  id: number;
  booking_id: string;
  start_date: string;
  end_date: string;
  status: string;
  total_amount: number;
  payment_status: string;
  vehicle?: {
    id: number;
    model: string;
    type: string;
    number_plate: string;
  };
}

interface CustomerWithBookings {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  bookings: Booking[];
}

// Get a specific customer by ID
async function getCustomer(request: AuthenticatedRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    console.log('Fetching customer details for ID:', id);

    if (!id) {
      console.log('No customer ID provided');
      return NextResponse.json(
        { success: false, error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // Convert ID to number and validate
    const customerId = typeof id === 'string' ? parseInt(id, 10) : id;
    if (isNaN(customerId)) {
      console.log('Invalid customer ID format:', id);
      return NextResponse.json(
        { success: false, error: 'Invalid customer ID format' },
        { status: 400 }
      );
    }

    // First check if the customer exists
    const { data: customerExists, error: existsError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .single();

    console.log('Customer exists check:', { customerExists, existsError });

    if (existsError || !customerExists) {
      console.log('Customer not found with ID:', customerId);
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Fetch customer with their bookings
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select(`
        *,
        bookings (
          id,
          booking_id,
          start_date,
          end_date,
          status,
          total_amount,
          payment_status,
          vehicle:vehicles (
            id,
            model,
            type,
            number_plate
          )
        )
      `)
      .eq('id', customerId)
      .single();

    if (customerError) {
      console.error('Error fetching customer:', customerError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch customer details' },
        { status: 500 }
      );
    }

    // Transform the data to match the expected format
    const transformedCustomer = {
      id: customer.id,
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      state: customer.state,
      pincode: customer.pincode,
      father_phone: customer.father_phone,
      mother_phone: customer.mother_phone,
      emergency_contact1: customer.emergency_contact1,
      emergency_contact2: customer.emergency_contact2,
      dl_number: customer.dl_number,
      aadhar_number: customer.aadhar_number,
      photo_url: customer.photo_url,
      dl_front_url: customer.dl_front_url,
      dl_back_url: customer.dl_back_url,
      aadhar_front_url: customer.aadhar_front_url,
      aadhar_back_url: customer.aadhar_back_url,
      notes: customer.notes,
      created_at: customer.created_at,
      updated_at: customer.updated_at,
      bookings: customer.bookings || []
    };

    return NextResponse.json({
      success: true,
      customer: transformedCustomer
    });
  } catch (error) {
    console.error('Error in customer details endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customer details' },
      { status: 500 }
    );
  }
}

// Update a customer
async function updateCustomer(request: AuthenticatedRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const data = await request.json();
    console.log('Updating customer:', { id, data });

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // Convert ID to number and validate
    const customerId = typeof id === 'string' ? parseInt(id, 10) : id;
    if (isNaN(customerId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid customer ID format' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!data.first_name || !data.last_name || !data.phone) {
      return NextResponse.json(
        { success: false, error: 'First name, last name, and phone are required' },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (data.email && !isValidEmail(data.email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate phone format
    if (!isValidPhone(data.phone)) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Check if customer exists
    const { data: existingCustomer, error: checkError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .single();

    if (checkError || !existingCustomer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Check if phone number is already used by another customer
    const { data: phoneCheck, error: phoneError } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', data.phone)
      .neq('id', customerId)
      .single();

    if (phoneCheck) {
      return NextResponse.json(
        { success: false, error: 'Phone number is already in use by another customer' },
        { status: 400 }
      );
    }

    // Update customer
    const { data: updatedCustomer, error: updateError } = await supabase
      .from('customers')
      .update({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        dl_number: data.dl_number,
        aadhar_number: data.aadhar_number,
        updated_at: new Date().toISOString()
      })
      .eq('id', customerId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating customer:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update customer' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      customer: updatedCustomer
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update customer' },
      { status: 500 }
    );
  }
}

// Delete a customer
async function deleteCustomer(request: AuthenticatedRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    console.log('Deleting customer:', id);

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // Convert ID to number and validate
    const customerId = typeof id === 'string' ? parseInt(id, 10) : id;
    if (isNaN(customerId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid customer ID format' },
        { status: 400 }
      );
    }

    // Check if customer exists
    const { data: existingCustomer, error: checkError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .single();

    if (checkError || !existingCustomer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Check if customer has any bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, status')
      .eq('customer_id', customerId);

    if (bookings && bookings.length > 0) {
      const activeBookings = bookings.filter(b => b.status === 'active');
      if (activeBookings.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Cannot delete customer with active bookings' },
          { status: 400 }
        );
      }
    }

    // Delete customer
    const { error: deleteError } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId);

    if (deleteError) {
      console.error('Error deleting customer:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete customer' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete customer' },
      { status: 500 }
    );
  }
}

// Helper functions for validation
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string): boolean {
  return /^\d{10}$/.test(phone);
}

export { getCustomer as GET, updateCustomer as PUT, deleteCustomer as DELETE }; 