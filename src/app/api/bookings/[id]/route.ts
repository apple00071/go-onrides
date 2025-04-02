import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';
import { dynamic } from '@/app/api/config';

export const runtime = 'nodejs';
export { dynamic, };

async function getBookingDetails(
  request: AuthenticatedRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    console.log('Fetching booking details for ID:', id);
    
    if (!id) {
      console.log('No booking ID provided');
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // Convert ID to number and validate
    const bookingId = typeof id === 'string' ? parseInt(id, 10) : id;
    if (isNaN(bookingId)) {
      console.log('Invalid booking ID format:', id);
      return NextResponse.json(
        { success: false, error: 'Invalid booking ID format' },
        { status: 400 }
      );
    }

    console.log('Querying booking with ID:', bookingId);

    // First check if the booking exists
    const { data: bookingExists, error: existsError } = await supabase
      .from('bookings')
      .select('id')
      .eq('id', bookingId)
      .single();

    console.log('Booking exists check:', { bookingExists, existsError });

    if (existsError || !bookingExists) {
      console.log('Booking not found with ID:', bookingId);
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Fetch booking with customer and vehicle details
    // First try a query that includes documents and signature
    try {
      const { data: booking, error } = await supabase
        .from('bookings')
        .select(`
          *,
          customer:customers (
            id,
            first_name,
            last_name,
            phone,
            email
          ),
          vehicle:vehicles (
            id,
            model,
            type,
            number_plate
          )
        `)
        .eq('id', bookingId)
        .single();

      console.log('Raw booking data:', booking);
      console.log('Query error:', error);

      if (error) {
        console.error('Error fetching booking:', error);
        return NextResponse.json(
          { 
            success: false, 
            error: 'Failed to fetch booking details',
            details: error.message
          },
          { status: error.code === 'PGRST116' ? 404 : 500 }
        );
      }

      if (!booking) {
        console.log('No booking found for ID:', bookingId);
        return NextResponse.json(
          { success: false, error: 'Booking not found' },
          { status: 404 }
        );
      }

      // Check for documents and signature columns in the database
      // If they don't exist, try to add them
      if ((!booking.hasOwnProperty('documents') || !booking.hasOwnProperty('signature'))) {
        console.log('Documents or signature columns might be missing, trying to add them...');
        try {
          await supabase.rpc('execute_sql', {
            sql_string: `
              DO $$
              BEGIN
                -- Check and add documents column if missing
                IF NOT EXISTS (
                  SELECT FROM information_schema.columns 
                  WHERE table_name = 'bookings' AND column_name = 'documents'
                ) THEN
                  ALTER TABLE bookings ADD COLUMN documents JSONB;
                  RAISE NOTICE 'Added missing documents column to bookings table';
                END IF;
                
                -- Check and add signature column if missing
                IF NOT EXISTS (
                  SELECT FROM information_schema.columns 
                  WHERE table_name = 'bookings' AND column_name = 'signature'
                ) THEN
                  ALTER TABLE bookings ADD COLUMN signature TEXT;
                  RAISE NOTICE 'Added missing signature column to bookings table';
                END IF;
              END $$;
            `
          });
          console.log('Added missing columns if needed');
        } catch (error) {
          console.warn('Error when trying to add missing columns:', error);
        }
      }

      // Transform the data to match the expected format, including documents and signature
      const transformedBooking = {
        id: booking.id.toString(),
        booking_id: booking.booking_id,
        customer_id: booking.customer_id.toString(),
        vehicle_id: booking.vehicle_id.toString(),
        customer_name: booking.customer ? 
          `${booking.customer.first_name} ${booking.customer.last_name}`.trim() : 
          'Unknown Customer',
        customer_phone: booking.customer?.phone || '',
        customer_email: booking.customer?.email || '',
        vehicle_model: booking.vehicle?.model || 'Unknown Vehicle',
        vehicle_type: booking.vehicle?.type || 'Unknown Type',
        vehicle_number: booking.vehicle?.number_plate || 'No Plate',
        start_date: booking.start_date,
        end_date: booking.end_date,
        status: booking.status,
        total_amount: booking.total_amount || 0,
        payment_status: booking.payment_status,
        documents: booking.documents || {},
        signature: booking.signature || null,
        notes: booking.notes || null,
        father_phone: booking.father_phone || '',
        mother_phone: booking.mother_phone || '',
        emergency_contact1: booking.emergency_contact1 || '',
        emergency_contact2: booking.emergency_contact2 || ''
      };

      console.log('Raw booking documents:', booking.documents);
      console.log('Raw booking signature:', booking.signature ? 'Present (truncated)' : 'Not present');
      console.log('Transformed booking documents:', transformedBooking.documents);
      console.log('Transformed booking signature:', transformedBooking.signature ? 'Present (truncated)' : 'Not present');
      console.log('Document keys:', transformedBooking.documents ? Object.keys(transformedBooking.documents) : 'No documents');

      return NextResponse.json({
        success: true,
        booking: transformedBooking
      });
    } catch (error) {
      console.error('Error in booking details endpoint:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch booking details',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (outerError) {
    console.error('Outer error in booking details endpoint:', outerError);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process booking details request',
        details: outerError instanceof Error ? outerError.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function updateBooking(
  request: AuthenticatedRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check for authentication
    if (!request.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const id = params.id;
    console.log('Updating booking with ID:', id);
    
    if (!id) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // Convert ID to number and validate
    const bookingId = typeof id === 'string' ? parseInt(id, 10) : id;
    if (isNaN(bookingId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid booking ID format' },
        { status: 400 }
      );
    }

    // First check if the booking exists
    const { data: bookingExists, error: existsError } = await supabase
      .from('bookings')
      .select('id')
      .eq('id', bookingId)
      .single();

    if (existsError || !bookingExists) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Parse the request body
    const data = await request.json();
    console.log('Update data:', data);

    // Ensure documents and signature columns exist
    try {
      await supabase.rpc('execute_sql', {
        sql_string: `
          DO $$
          BEGIN
            -- Check and add documents column if missing
            IF NOT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_name = 'bookings' AND column_name = 'documents'
            ) THEN
              ALTER TABLE bookings ADD COLUMN documents JSONB;
              RAISE NOTICE 'Added missing documents column to bookings table';
            END IF;
            
            -- Check and add signature column if missing
            IF NOT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_name = 'bookings' AND column_name = 'signature'
            ) THEN
              ALTER TABLE bookings ADD COLUMN signature TEXT;
              RAISE NOTICE 'Added missing signature column to bookings table';
            END IF;
            
            -- Check and add emergency contact columns if missing
            IF NOT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_name = 'bookings' AND column_name = 'father_phone'
            ) THEN
              ALTER TABLE bookings ADD COLUMN father_phone TEXT;
              RAISE NOTICE 'Added missing father_phone column to bookings table';
            END IF;
            
            IF NOT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_name = 'bookings' AND column_name = 'mother_phone'
            ) THEN
              ALTER TABLE bookings ADD COLUMN mother_phone TEXT;
              RAISE NOTICE 'Added missing mother_phone column to bookings table';
            END IF;
            
            IF NOT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_name = 'bookings' AND column_name = 'emergency_contact1'
            ) THEN
              ALTER TABLE bookings ADD COLUMN emergency_contact1 TEXT;
              RAISE NOTICE 'Added missing emergency_contact1 column to bookings table';
            END IF;
            
            IF NOT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_name = 'bookings' AND column_name = 'emergency_contact2'
            ) THEN
              ALTER TABLE bookings ADD COLUMN emergency_contact2 TEXT;
              RAISE NOTICE 'Added missing emergency_contact2 column to bookings table';
            END IF;
          END $$;
        `
      });
    } catch (error) {
      console.warn('Error ensuring columns exist:', error);
      // Continue anyway, the update might still work
    }

    // Build the update data
    const updateData: Record<string, any> = {};
    
    // Only include fields that are actually provided
    if (data.status !== undefined) updateData.status = data.status;
    if (data.payment_status !== undefined) updateData.payment_status = data.payment_status;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.documents !== undefined) updateData.documents = data.documents;
    if (data.signature !== undefined) updateData.signature = data.signature;
    if (data.father_phone !== undefined) updateData.father_phone = data.father_phone;
    if (data.mother_phone !== undefined) updateData.mother_phone = data.mother_phone;
    if (data.emergency_contact1 !== undefined) updateData.emergency_contact1 = data.emergency_contact1;
    if (data.emergency_contact2 !== undefined) updateData.emergency_contact2 = data.emergency_contact2;
    
    // Perform the update
    const { data: updatedBooking, error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', bookingId)
      .select();
      
    if (error) {
      console.error('Error updating booking:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update booking', details: error },
        { status: 500 }
      );
    }
    
    console.log('Booking updated successfully:', updatedBooking);
    
    return NextResponse.json({
      success: true,
      message: 'Booking updated successfully',
      booking: updatedBooking ? updatedBooking[0] : null
    });
  } catch (error) {
    console.error('Error in update booking endpoint:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update booking',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export { getBookingDetails as GET };
export const PUT = withAuth(updateBooking); 