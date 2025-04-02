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

    console.log(`Fetched ${bookings?.length || 0} bookings`);

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
    
    // Explicitly check and add missing columns in bookings table
    try {
      console.log('Checking and adding required columns to bookings table...');
      
      // Use supabase RPC to execute SQL
      const { error: sqlError } = await supabase.rpc('execute_sql', {
        sql_string: `
          DO $$
          BEGIN
            -- Check and add security_deposit column if missing
            IF NOT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_name = 'bookings' AND column_name = 'security_deposit'
            ) THEN
              ALTER TABLE bookings ADD COLUMN security_deposit DECIMAL(10,2);
              RAISE NOTICE 'Added missing security_deposit column to bookings table';
            END IF;
            
            -- Check and add base_price column if missing
            IF NOT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_name = 'bookings' AND column_name = 'base_price'
            ) THEN
              ALTER TABLE bookings ADD COLUMN base_price DECIMAL(10,2) NOT NULL DEFAULT 0;
              RAISE NOTICE 'Added missing base_price column to bookings table';
            END IF;
            
            -- Check and add total_amount column if missing
            IF NOT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_name = 'bookings' AND column_name = 'total_amount'
            ) THEN
              ALTER TABLE bookings ADD COLUMN total_amount DECIMAL(10,2) NOT NULL DEFAULT 0;
              RAISE NOTICE 'Added missing total_amount column to bookings table';
            END IF;
            
            -- If total_amount column exists but doesn't have NOT NULL constraint, add it
            IF EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_name = 'bookings' AND column_name = 'total_amount' 
                AND is_nullable = 'YES'
            ) THEN
              -- First set any null values to 0
              UPDATE bookings SET total_amount = 0 WHERE total_amount IS NULL;
              -- Then add the constraint
              ALTER TABLE bookings ALTER COLUMN total_amount SET NOT NULL;
              RAISE NOTICE 'Added NOT NULL constraint to total_amount column';
            END IF;
          END $$;
        `
      });
      
      if (sqlError) {
        console.error('Error ensuring columns exist:', sqlError);
        // Continue with regular flow and see if it works anyway
      } else {
        console.log('Successfully checked and added any missing columns');
        // Force schema refresh again after adding columns
        await forceSchemaRefresh();
      }
    } catch (schemaError) {
      console.error('Error checking/adding columns:', schemaError);
      // Continue with regular flow and see if it works anyway
    }
    
    const data = await request.json();
    console.log('Creating booking with data:', data);

    // Transform the customer data for consistency
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
    
    if (!customerData.phone) {
      return NextResponse.json(
        { error: 'Customer phone number is required' },
        { status: 400 }
      );
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
        .maybeSingle();
        
      if (searchError) {
        console.log('Error searching for customer:', searchError);
      } else if (existingCustomer) {
        customerId = existingCustomer.id;
        console.log('Customer found with ID:', customerId);
      }
    } catch (error) {
      console.log('Error checking for existing customer:', error);
    }
    
    // If customer exists, update them using standard Supabase client with minimum fields
    if (customerId) {
      console.log('Customer already exists, updating their details with ID:', customerId);
      
      try {
        // Update only the most critical fields to avoid schema cache issues
        const { error: updateError } = await supabase
          .from('customers')
          .update({
            first_name: firstName,
            last_name: lastName,
            email: customerData.email || null
          })
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
      // Create a new customer with minimum required fields
      console.log('Creating new customer with minimum fields');
      
      try {
        // Create a customer with only essential fields that must exist
        const { data: newCustomer, error: insertError } = await supabase
          .from('customers')
          .insert({
            first_name: firstName,
            last_name: lastName,
            phone: customerData.phone,
            email: customerData.email || null
          })
          .select();
          
        if (insertError) {
          console.error('Error creating customer:', insertError);
          throw new Error('Failed to create customer: ' + insertError.message);
        } else if (newCustomer && newCustomer.length > 0) {
          customerId = newCustomer[0].id;
          console.log('New customer created with ID:', customerId);
          
          // Try to update additional fields in a separate operation
          try {
            const additionalData: Record<string, any> = {
              address: customerData.address || null,
              city: customerData.city || null,
              state: customerData.state || null,
              pincode: customerData.pincode || null
            };
            
            if (customerData.dl_number) {
              additionalData.dl_number = customerData.dl_number;
            }
            
            if (customerData.dl_expiry) {
              additionalData.dl_expiry = customerData.dl_expiry;
            }
            
            if (customerData.dob) {
              additionalData.dob = customerData.dob;
            }
            
            if (customerData.aadhar_number) {
              additionalData.aadhar_number = customerData.aadhar_number;
            }
            
            const { error: updateError } = await supabase
              .from('customers')
              .update(additionalData)
              .eq('id', customerId);
              
            if (updateError) {
              console.warn('Non-critical: Could not update additional customer fields:', updateError);
            }
          } catch (error) {
            console.warn('Non-critical: Error updating additional customer fields:', error);
          }
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

    // Validate vehicle ID
    if (!data.vehicle_id) {
      return NextResponse.json(
        { error: 'Vehicle ID is required' },
        { status: 400 }
      );
    }
    
    // Verify the vehicle exists
    const { data: vehicleData, error: vehicleError } = await supabase
      .from('vehicles')
      .select('id')
      .eq('id', data.vehicle_id)
      .single();
      
    if (vehicleError || !vehicleData) {
      console.error('Error checking vehicle:', vehicleError);
      return NextResponse.json(
        { error: 'Invalid vehicle ID', details: vehicleError },
        { status: 400 }
      );
    }
    
    // Ensure we have a valid worker ID
    console.log('Checking worker ID:', request.user.id);
    let workerId = request.user.id;
    
    // Check if the worker_id (user id) exists in the users table
    const { data: workerExists, error: workerCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('id', workerId)
      .single();
      
    if (workerCheckError || !workerExists) {
      console.log('Worker ID not found, looking for a valid user ID...');
      
      // Look for any user in the database to use as fallback
      const { data: anyUser, error: anyUserError } = await supabase
        .from('users')
        .select('id')
        .limit(1)
        .single();
        
      if (anyUserError || !anyUser) {
        console.log('No users found in the database, creating a fallback user...');
        
        // Create a fallback user (admin) if none exists
        try {
          const { data: newUser, error: createUserError } = await supabase
            .from('users')
            .insert({
              username: 'system',
              email: 'system@example.com',
              password: 'hashed_password', // This is just a placeholder
              role: 'admin',
              status: 'active'
            })
            .select('id')
            .single();
            
          if (createUserError || !newUser) {
            console.error('Error creating fallback user:', createUserError);
            return NextResponse.json(
              { error: 'Could not find or create a valid user for worker_id', details: createUserError },
              { status: 500 }
            );
          }
          
          workerId = newUser.id;
          console.log('Created fallback user with ID:', workerId);
        } catch (createError) {
          console.error('Error creating fallback user:', createError);
          return NextResponse.json(
            { error: 'Could not create fallback user', details: createError },
            { status: 500 }
          );
        }
      } else {
        workerId = anyUser.id;
        console.log('Using existing user as fallback with ID:', workerId);
      }
    } else {
      console.log('Worker ID is valid:', workerId);
    }

    // Create the booking
    console.log('Creating booking...');
    
    // Parse pricing data
    const pricing = data.pricing || {};
    const basePrice = pricing.base_price || 0;
    const securityDeposit = pricing.security_deposit || 0;
    const totalAmount = pricing.total_amount || basePrice;
    
    // Log the pricing data for debugging
    console.log('Booking pricing data:', {
      base_price: basePrice,
      security_deposit: securityDeposit,
      total_amount: totalAmount
    });
    
    const bookingData: Record<string, any> = {
      vehicle_id: data.vehicle_id,
      customer_id: customerId,
      worker_id: workerId,
      start_date: data.start_date,
      end_date: data.end_date,
      base_price: basePrice,
      total_amount: totalAmount,
      status: 'pending'
    };
    
    // Conditionally include security_deposit if we can safely do so
    try {
      const { data: testBooking, error: testError } = await supabase
        .from('bookings')
        .select('security_deposit')
        .limit(1);
        
      if (!testError) {
        bookingData.security_deposit = securityDeposit;
      }
    } catch (error) {
      console.log('security_deposit column might not exist, skipping it');
    }
    
    try {
      // Create a booking with required fields
      console.log('Inserting booking with data:', bookingData);
      const { data: newBooking, error: insertError } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select();
        
      if (insertError) {
        console.error('Error creating booking:', insertError);
        
        // If that fails, try a more minimal approach
        console.log('Trying minimal required fields approach...');
        
        const minimalBookingData = {
          vehicle_id: data.vehicle_id,
          customer_id: customerId,
          worker_id: workerId,
          start_date: data.start_date,
          end_date: data.end_date,
          base_price: basePrice || 0,
          total_amount: totalAmount || 0,
          status: 'pending'
        };
        
        const { data: fallbackBooking, error: fallbackError } = await supabase
          .from('bookings')
          .insert(minimalBookingData)
          .select();
          
        if (fallbackError) {
          console.error('Fallback approach also failed:', fallbackError);
          
          // If even the minimal approach fails, try a direct SQL insert
          console.log('Trying direct SQL insert...');
          
          try {
            const { error: sqlError } = await supabase.rpc('execute_sql', {
              sql_string: `
                INSERT INTO bookings (vehicle_id, customer_id, worker_id, start_date, end_date, base_price, total_amount, status)
                VALUES (${data.vehicle_id}, ${customerId}, ${workerId}, '${data.start_date}', '${data.end_date}', ${basePrice || 0}, ${totalAmount || 0}, 'pending')
                RETURNING id;
              `
            });
            
            if (sqlError) {
              console.error('Direct SQL insert also failed:', sqlError);
              return NextResponse.json(
                { error: 'Error creating booking (all approaches failed)', details: {
                    original: insertError,
                    fallback: fallbackError,
                    sql: sqlError
                  }
                },
                { status: 500 }
              );
            }
            
            console.log('Direct SQL insert succeeded!');
            
            return NextResponse.json({
              success: true,
              message: 'Booking created successfully (SQL approach)',
              booking: {
                vehicle_id: data.vehicle_id,
                customer_id: customerId,
                worker_id: workerId,
                start_date: data.start_date,
                end_date: data.end_date,
                base_price: basePrice,
                total_amount: totalAmount,
                status: 'pending'
              }
            });
          } catch (sqlError) {
            console.error('Error with direct SQL approach:', sqlError);
            return NextResponse.json(
              { error: 'All booking creation approaches failed', details: {
                  original: insertError,
                  fallback: fallbackError,
                  sql: sqlError
                }
              },
              { status: 500 }
            );
          }
        }
        
        const bookingId = fallbackBooking?.[0]?.id;
        console.log('Fallback booking created successfully with ID:', bookingId);
        
        // Try to update with additional fields
        if (bookingId) {
          await updateBookingAdditionalFields(bookingId, data);
          
          return NextResponse.json({ 
            success: true, 
            message: 'Booking created successfully (fallback approach)',
            booking: fallbackBooking[0]
          });
        } else {
          return NextResponse.json({ 
            success: true, 
            message: 'Booking created but could not retrieve ID',
            booking: fallbackBooking?.[0] || null
          });
        }
      }
      
      const bookingId = newBooking?.[0]?.id;
      console.log('Booking created successfully with ID:', bookingId);
      
      // Update with additional fields if we have an ID
      if (bookingId) {
        await updateBookingAdditionalFields(bookingId, data);
      }
      
      // Return success with the booking data
      return NextResponse.json({ 
        success: true, 
        message: 'Booking created successfully',
        booking: newBooking?.[0] || null
      });
    } catch (error) {
      console.error('Error in booking creation process:', error);
      return NextResponse.json(
        { error: 'Error in booking creation process', details: error },
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

// Helper function to update additional booking fields without risking schema issues
async function updateBookingAdditionalFields(bookingId: number, data: any) {
  try {
    const updateData: Record<string, any> = {};
    
    // Add additional fields if they exist in the data
    if (data.payment_method) updateData.payment_method = data.payment_method;
    if (data.notes) updateData.notes = data.notes;
    
    // Only attempt to update if we have fields to update
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId);
        
      if (updateError) {
        console.warn('Non-critical: Error updating additional booking details:', updateError);
      }
    }
    
    // Try to update documents and signature in a separate operation
    if (data.documents || data.signature) {
      const docUpdateData: Record<string, any> = {};
      
      if (data.documents) docUpdateData.documents = data.documents;
      if (data.signature) docUpdateData.signature = data.signature;
      
      const { error: docUpdateError } = await supabase
        .from('bookings')
        .update(docUpdateData)
        .eq('id', bookingId);
        
      if (docUpdateError) {
        console.warn('Non-critical: Error updating documents and signature:', docUpdateError);
      }
    }
  } catch (error) {
    console.warn('Non-critical: Error updating additional booking data:', error);
  }
}

// Export the handlers wrapped with authentication middleware
export const GET = withAuth(getBookings);
export const POST = withAuth(createBooking); 