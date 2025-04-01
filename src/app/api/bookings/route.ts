import { NextResponse } from 'next/server';
import { supabase, forceSchemaRefresh } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';
import { dynamic } from '@/app/api/config';
import { transformCustomerData } from '@/lib/utils';

export const runtime = 'nodejs';
export { dynamic };

async function getBookings(request: AuthenticatedRequest) {
  try {
    console.log('Fetching bookings...');
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const sort = searchParams.get('sort') || 'created_at';
    const order = searchParams.get('order') || 'desc';
    
    // Fetch bookings with customer and vehicle details
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customers (
          id,
          first_name,
          last_name,
          phone
        ),
        vehicle:vehicles (
          id,
          model,
          type,
          number_plate
        )
      `)
      .order(sort, { ascending: order === 'asc' })
      .limit(limit);

    if (error) {
      console.error('Error fetching bookings:', error);
      throw error;
    }

    // Transform the data to match the expected format
    const transformedBookings = bookings?.map(booking => ({
      id: booking.id.toString(),
      booking_id: booking.booking_id,
      customer_id: booking.customer_id.toString(),
      vehicle_id: booking.vehicle_id.toString(),
      customer_name: booking.customer ? 
        `${booking.customer.first_name} ${booking.customer.last_name}`.trim() : 
        'Unknown Customer',
      vehicle_model: booking.vehicle?.model || 'Unknown Vehicle',
      vehicle_type: booking.vehicle?.type || 'Unknown Type',
      vehicle_number: booking.vehicle?.number_plate || 'No Plate',
      start_date: booking.start_date,
      end_date: booking.end_date,
      status: booking.status,
      amount: booking.total_amount || 0,
      payment_status: booking.payment_status
    })) || [];

    return NextResponse.json({
      success: true,
      bookings: transformedBookings
    });
  } catch (error) {
    console.error('Error in bookings endpoint:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch bookings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function createBooking(request: AuthenticatedRequest) {
  if (!request.user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    // Force schema refresh to ensure all columns are recognized
    console.log('Forcing schema refresh before booking creation...');
    await forceSchemaRefresh();
    
    // Ensure all required columns exist in the database
    try {
      console.log('Ensuring all required columns exist...');
      await supabase.rpc('execute_sql', {
        sql_string: `
          BEGIN;
          
          -- Ensure customers table has all required columns
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'dl_expiry') THEN
              ALTER TABLE customers ADD COLUMN dl_expiry DATE;
              RAISE NOTICE 'Added dl_expiry column to customers table';
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'dob') THEN
              ALTER TABLE customers ADD COLUMN dob DATE;
              RAISE NOTICE 'Added dob column to customers table';
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'aadhar_number') THEN
              ALTER TABLE customers ADD COLUMN aadhar_number TEXT;
              RAISE NOTICE 'Added aadhar_number column to customers table';
            END IF;
          END $$;
          
          -- Ensure bookings table has all required columns
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'base_price') THEN
              ALTER TABLE bookings ADD COLUMN base_price DECIMAL(10,2);
              RAISE NOTICE 'Added base_price column to bookings table';
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'security_deposit') THEN
              ALTER TABLE bookings ADD COLUMN security_deposit DECIMAL(10,2) DEFAULT 0;
              RAISE NOTICE 'Added security_deposit column to bookings table';
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'documents') THEN
              ALTER TABLE bookings ADD COLUMN documents JSONB;
              RAISE NOTICE 'Added documents column to bookings table';
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'signature') THEN
              ALTER TABLE bookings ADD COLUMN signature TEXT;
              RAISE NOTICE 'Added signature column to bookings table';
            END IF;
          END $$;
          
          COMMIT;
        `
      });
      console.log('Schema check and column creation completed');
      
      // Force another schema refresh after adding any columns
      await forceSchemaRefresh();
    } catch (schemaError) {
      console.error('Error ensuring column existence:', schemaError);
      // Continue with the process, as forceSchemaRefresh may have already fixed the issue
    }

    const data = await request.json();
    console.log('Creating booking with data:', data);

    // Transform the customer data to ensure it has the correct structure
    const customerData = transformCustomerData(data.customer_details);
    
    // Always create both first_name and last_name from full_name if needed
    let firstName = '';
    let lastName = '';
    
    if (customerData.full_name) {
      const nameParts = customerData.full_name.split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    } else if (customerData.first_name || customerData.last_name) {
      firstName = customerData.first_name || '';
      lastName = customerData.last_name || '';
    } else if (customerData.fullName) {
      const nameParts = customerData.fullName.split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }
    
    // Check if customer already exists with this phone number
    let customerId = null;
    console.log('Checking if customer exists with phone:', customerData.phone);
    
    try {
      // Use standard Supabase client to find existing customer
      const { data: existingCustomer, error: searchError } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', customerData.phone)
        .single();
        
      if (searchError) {
        console.log('Error searching for customer:', searchError);
      } else if (existingCustomer) {
        customerId = existingCustomer.id;
        console.log('Customer found with ID:', customerId);
      }
    } catch (error) {
      console.log('Error checking for existing customer:', error);
    }
    
    // If customer exists, update them using standard Supabase client
    if (customerId) {
      console.log('Customer already exists, updating their details with ID:', customerId);
      
      try {
        // Prepare customer data update object
        const customerUpdateData: Record<string, any> = {
          first_name: firstName,
          last_name: lastName,
          email: customerData.email || undefined,
          address: customerData.address || undefined,
          city: customerData.city || undefined,
          state: customerData.state || undefined,
          pincode: customerData.pincode || undefined,
          dl_number: customerData.dl_number || undefined
        };
        
        // Conditionally add date fields if they exist
        if (customerData.dl_expiry) {
          customerUpdateData['dl_expiry'] = customerData.dl_expiry;
        }
        
        if (customerData.dob) {
          customerUpdateData['dob'] = customerData.dob;
        }
        
        if (customerData.aadhar_number) {
          customerUpdateData['aadhar_number'] = customerData.aadhar_number;
        }
        
        const { error: updateError } = await supabase
          .from('customers')
          .update(customerUpdateData)
          .eq('id', customerId);
          
        if (updateError) {
          console.error('Error updating customer:', updateError);
        } else {
        console.log('Customer updated successfully');
        }
      } catch (error) {
        console.error('Error updating customer:', error);
        // Continue anyway as we already have a valid customer ID
      }
    } else {
      // Create a new customer using standard Supabase client
      console.log('Creating new customer');
      
      try {
        // Prepare customer data
        const newCustomerData: Record<string, any> = {
          first_name: firstName,
          last_name: lastName,
          email: customerData.email || undefined,
          phone: customerData.phone,
          address: customerData.address || undefined,
          city: customerData.city || undefined,
          state: customerData.state || undefined,
          pincode: customerData.pincode || undefined,
          dl_number: customerData.dl_number || undefined
        };
        
        // Conditionally add date fields if they exist
        if (customerData.dl_expiry) {
          newCustomerData['dl_expiry'] = customerData.dl_expiry;
        }
        
        if (customerData.dob) {
          newCustomerData['dob'] = customerData.dob;
        }
        
        if (customerData.aadhar_number) {
          newCustomerData['aadhar_number'] = customerData.aadhar_number;
        }
        
        const { data: newCustomer, error: insertError } = await supabase
          .from('customers')
          .insert([newCustomerData])
          .select();
          
        if (insertError) {
          console.error('Error creating customer:', insertError);
          throw new Error('Failed to create customer: ' + insertError.message);
        } else if (newCustomer && newCustomer.length > 0) {
          customerId = newCustomer[0].id;
                console.log('New customer created with ID:', customerId);
              } else {
          throw new Error('Customer insert did not return an ID');
        }
      } catch (error) {
        console.error('Error creating customer:', error);
        return NextResponse.json(
          { error: 'Failed to create customer', details: error },
          { status: 500 }
        );
      }
    }

    if (!customerId) {
      console.error('No valid customer ID available');
      return NextResponse.json(
        { error: 'Failed to obtain valid customer ID' },
        { status: 500 }
      );
    }

    // Create the booking using direct SQL
    console.log('Creating booking for customer ID:', customerId);
    
    try {
      // Convert dates to ISO strings if needed
      const startDate = data.start_date instanceof Date ? data.start_date.toISOString() : data.start_date;
      const endDate = data.end_date instanceof Date ? data.end_date.toISOString() : data.end_date;
      
      console.log('Prepared booking data:', {
        vehicle_id: data.vehicle_id,
        customer_id: customerId,
        start_date: startDate,
        end_date: endDate,
        base_price: data.pricing.base_price,
        security_deposit: data.pricing.security_deposit || 0,
        total_amount: data.pricing.total_amount || data.pricing.base_price,
        payment_method: data.payment_method || 'cash',
        notes: data.notes || '',
      });
      
      // Use direct SQL to insert the booking to bypass schema cache issues
      const { data: insertResult, error: sqlError } = await supabase.rpc('execute_sql', {
        sql_string: `
          INSERT INTO bookings (
            vehicle_id, 
            customer_id, 
            start_date, 
            end_date, 
            base_price, 
            security_deposit, 
            total_amount, 
            payment_method, 
            notes, 
            status,
            created_at
          ) 
          VALUES (
            ${data.vehicle_id}, 
            ${customerId}, 
            '${startDate}', 
            '${endDate}', 
            ${data.pricing.base_price}, 
            ${data.pricing.security_deposit || 0}, 
            ${data.pricing.total_amount || data.pricing.base_price}, 
            '${data.payment_method || 'cash'}', 
            '${(data.notes || '').replace(/'/g, "''")}', 
            'pending',
            NOW()
          )
          RETURNING id, vehicle_id, customer_id, start_date, end_date, base_price, total_amount;
        `
      });
      
      console.log('Direct SQL insert result:', insertResult);
        
      if (sqlError) {
        console.error('Error executing SQL insert:', sqlError);
        throw new Error('Failed to create booking: ' + sqlError.message);
      } 
      
      // Extract the booking ID from the result
      let bookingId;
      if (insertResult && insertResult.length > 0 && insertResult[0] && insertResult[0].length > 0) {
        bookingId = insertResult[0][0]?.id;
        console.log('Booking created successfully with ID:', bookingId);
      } else {
        throw new Error('Booking insert did not return an ID');
      }
      
      // Try to update documents and signature in a separate operation if needed
      if (bookingId && (data.documents || data.signature)) {
        try {
          let updateSQL = 'UPDATE bookings SET ';
          const updates = [];
          
          if (data.documents) {
            updates.push(`documents = '${JSON.stringify(data.documents)}'::jsonb`);
          }
          
          if (data.signature) {
            updates.push(`signature = '${data.signature.replace(/'/g, "''")}'`);
          }
          
          if (updates.length > 0) {
            updateSQL += updates.join(', ') + ` WHERE id = ${bookingId}`;
            
            const { error: updateError } = await supabase.rpc('execute_sql', {
              sql_string: updateSQL
            });
            
            if (updateError) {
              console.error('Error updating documents and signature:', updateError);
            }
          }
        } catch (error) {
          console.log('Error updating documents and signature (non-critical):', error);
          // Continue anyway as these are non-critical fields
        }
      }
      
      // Return the newly created booking
      return NextResponse.json(
        { 
          success: true, 
          booking: insertResult[0][0] || { id: bookingId }
        },
        { status: 200 }
      );
    } catch (error) {
      console.error('Error creating booking:', error);
      return NextResponse.json(
        { error: 'Failed to create booking', details: error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in booking creation:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}

// Export the handlers wrapped with authentication middleware
export const GET = withAuth(getBookings);
export const POST = withAuth(createBooking); 