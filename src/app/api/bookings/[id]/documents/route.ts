import { NextResponse } from 'next/server';
import { supabase, forceSchemaRefresh } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';
import { dynamic } from '@/app/api/config';

export const runtime = 'nodejs';
export { dynamic };

/**
 * Update documents and signatures for a booking
 * This endpoint is designed to handle only document and signature updates separately
 * from the main booking data to avoid schema cache issues
 */
async function updateBookingDocuments(
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
    console.log('Updating documents for booking with ID:', id);
    
    if (!id) {
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

    // Parse the request body
    const data = await request.json();
    console.log('Documents update data received:', JSON.stringify(data, null, 2));

    // Prepare update data
    const updateData: Record<string, any> = {};
    if (data.documents !== undefined) updateData.documents = data.documents;
    if (data.signature !== undefined) updateData.signature = data.signature;
    
    if (Object.keys(updateData).length === 0) {
      console.log('No document or signature data provided');
      return NextResponse.json(
        { success: false, error: 'No document or signature data provided' },
        { status: 400 }
      );
    }
    
    console.log('Prepared update data:', JSON.stringify(updateData, null, 2));
    
    // Try the update
    let updateSuccess = false;
    let updateError = null;
    
    try {
      // Standard update through Supabase client
      const { data: updateResult, error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId);
        
      console.log('Update result:', updateResult);
        
      if (error) {
        console.error('Error updating booking:', error);
        updateError = error;
        
        // Check if it's a column not found error, which likely means the column doesn't exist
        if (error.message.includes('column') && error.message.includes('does not exist')) {
          console.log('Column does not exist - attempting to add the columns to the database');
          
          try {
            // Try to add the columns automatically
            const addColumnsResult = await supabase.rpc('execute_sql', {
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
            
            console.log('Add columns result:', addColumnsResult);
            
            // Try the update again
            const { data: retryResult, error: retryError } = await supabase
              .from('bookings')
              .update(updateData)
              .eq('id', bookingId);
              
            if (retryError) {
              console.error('Error on retry update:', retryError);
              return NextResponse.json({
                success: false,
                error: 'Still failed after adding columns',
                details: retryError
              }, { status: 500 });
            } else {
              console.log('Update succeeded after adding columns!');
              updateSuccess = true;
            }
          } catch (addColumnError) {
            console.error('Error adding columns:', addColumnError);
            return NextResponse.json({
              success: false,
              error: 'Failed to add missing columns',
              details: 'The documents and signature columns need to be added to the bookings table',
              instructions: [
                'Connect to the Supabase database directly',
                'Run the following SQL:',
                'ALTER TABLE bookings ADD COLUMN IF NOT EXISTS documents JSONB;',
                'ALTER TABLE bookings ADD COLUMN IF NOT EXISTS signature TEXT;',
                'ALTER TABLE bookings ADD COLUMN IF NOT EXISTS father_phone TEXT;',
                'ALTER TABLE bookings ADD COLUMN IF NOT EXISTS mother_phone TEXT;',
                'ALTER TABLE bookings ADD COLUMN IF NOT EXISTS emergency_contact1 TEXT;',
                'ALTER TABLE bookings ADD COLUMN IF NOT EXISTS emergency_contact2 TEXT;'
              ]
            }, { status: 500 });
          }
        } else {
          return NextResponse.json({
            success: false,
            error: 'Failed to update documents and signature',
            details: error
          }, { status: 500 });
        }
      } else {
        updateSuccess = true;
        console.log('Update successful!');
      }
    } catch (error) {
      console.error('Exception during update:', error);
      updateError = error;
    }
    
    // Check the result
    if (updateSuccess) {
      // Verify by retrieving the booking
      try {
        const { data: booking, error } = await supabase
          .from('bookings')
          .select('id, documents, signature')
          .eq('id', bookingId)
          .single();
          
        if (error) {
          console.error('Error verifying booking:', error);
          return NextResponse.json({
            success: true,
            warning: 'Update appeared successful but verification failed',
            error_details: error
          });
        }
        
        console.log('Verified booking after update:', JSON.stringify(booking, null, 2));
        
        return NextResponse.json({
          success: true,
          message: 'Documents and signature updated successfully',
          data: {
            documents_updated: data.documents !== undefined && booking.documents !== null,
            signature_updated: data.signature !== undefined && booking.signature !== null,
            documents: booking.documents,
            signature: booking.signature ? booking.signature.substring(0, 50) + '...' : null
          }
        });
      } catch (error) {
        console.error('Exception verifying booking:', error);
        return NextResponse.json({
          success: true,
          warning: 'Update appeared successful but verification failed',
          error_details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to update documents and signature',
        details: updateError
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in document update endpoint:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update documents and signature',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export const PUT = withAuth(updateBookingDocuments); 