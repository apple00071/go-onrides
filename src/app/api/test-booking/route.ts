import { NextResponse } from 'next/server';
import { supabase, forceSchemaRefresh } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';
import { dynamic } from '@/app/api/config';

export const runtime = 'nodejs';
export { dynamic };

async function testBooking(request: AuthenticatedRequest) {
  try {
    if (!request.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Log the authenticated user
    console.log('Authenticated user:', request.user);
    
    // Parse request body
    const data = await request.json();
    console.log('Received booking data:', JSON.stringify(data, null, 2));
    
    // Force schema refresh to ensure all columns are recognized
    console.log('Forcing schema refresh...');
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
    
    // Validate required fields
    if (!data.customer_details || !data.customer_details.phone) {
      return NextResponse.json(
        { error: 'Customer phone number is required' },
        { status: 400 }
      );
    }
    
    if (!data.vehicle_id) {
      return NextResponse.json(
        { error: 'Vehicle ID is required' },
        { status: 400 }
      );
    }
    
    // Extract customer data
    const customerData = data.customer_details;
    const phone = customerData.phone;
    
    // Prepare first and last name
    let firstName = customerData.first_name || '';
    let lastName = customerData.last_name || '';
    
    if (!firstName && customerData.name) {
      const nameParts = customerData.name.split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }
    
    // Step 1: Check if customer exists
    console.log('Checking if customer exists with phone:', phone);
    
    const { data: existingCustomer, error: searchError } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();
      
    if (searchError) {
      console.error('Error searching for customer:', searchError);
      return NextResponse.json(
        { error: 'Error searching for customer', details: searchError },
        { status: 500 }
      );
    }
    
    // Step 2: Create or update customer
    let customerId: number;
    
    if (existingCustomer) {
      console.log('Customer found with ID:', existingCustomer.id);
      customerId = existingCustomer.id;
      
      // Update customer details
      console.log('Updating customer details...');
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
        // Continue anyway since we have a valid customer ID
      } else {
        console.log('Customer updated successfully');
      }
    } else {
      console.log('Customer not found, creating new customer...');
      const { data: newCustomer, error: createError } = await supabase
        .from('customers')
        .insert({
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          email: customerData.email || null
        })
        .select('id');
        
      if (createError || !newCustomer || newCustomer.length === 0) {
        console.error('Error creating customer:', createError);
        return NextResponse.json(
          { error: 'Error creating customer', details: createError },
          { status: 500 }
        );
      }
      
      customerId = newCustomer[0].id;
      console.log('New customer created with ID:', customerId);
    }
    
    // Step 3: Get vehicle info for validation
    console.log('Checking vehicle ID:', data.vehicle_id);
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
    
    // Step 3.5: Get a valid worker ID
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
    
    // Step 4: Create the booking - use a simplified approach to avoid schema issues
    console.log('Creating booking with all required fields...');
    
    // Parse pricing data
    const pricing = data.pricing || {};
    const basePrice = pricing.base_price || 0;
    const securityDeposit = pricing.security_deposit || 0;
    const totalAmount = pricing.total_amount || basePrice;
    
    // Log the parsed pricing data
    console.log('Booking pricing parsed:', {
      basePrice,
      securityDeposit,
      totalAmount
    });
    
    // Create bookingInsertData with ALL required fields
    // Include both base_price and total_amount to satisfy NOT NULL constraints
    const bookingInsertData: Record<string, any> = {
      vehicle_id: data.vehicle_id,
      customer_id: customerId,
      worker_id: workerId, // Use the validated worker ID
      start_date: data.start_date,
      end_date: data.end_date,
      base_price: basePrice,
      total_amount: totalAmount,
      status: 'pending'
    };
    
    // Try to add security_deposit if the column exists
    try {
      const { data: testBooking, error: testError } = await supabase
        .from('bookings')
        .select('security_deposit')
        .limit(1);
        
      if (!testError) {
        bookingInsertData.security_deposit = securityDeposit;
      }
    } catch (error) {
      console.log('security_deposit column might not exist, skipping it');
    }
    
    try {
      // Try to insert the booking with all required fields
      console.log('Inserting booking with data:', bookingInsertData);
      const { data: newBooking, error: insertError } = await supabase
        .from('bookings')
        .insert(bookingInsertData)
        .select();
        
      if (insertError) {
        console.error('Error creating booking:', insertError);
        
        // Try a more minimal approach with just the absolutely required fields
        console.log('Trying minimal required fields approach...');
        
        const minimalBookingData = {
          vehicle_id: data.vehicle_id,
          customer_id: customerId,
          worker_id: workerId,
          start_date: data.start_date,
          end_date: data.end_date,
          base_price: basePrice || 0,  // Ensure not null
          total_amount: totalAmount || 0, // Ensure not null
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
        
        console.log('Fallback booking created successfully:', fallbackBooking[0]);
        
        return NextResponse.json({
          success: true,
          message: 'Booking created successfully (fallback approach)',
          booking: fallbackBooking[0]
        });
      }
      
      console.log('Booking created successfully:', newBooking[0]);
      
      // Return the booking data
      return NextResponse.json({
        success: true,
        message: 'Booking created successfully',
        booking: newBooking[0]
      });
    } catch (bookingError) {
      console.error('Error in booking creation process:', bookingError);
      return NextResponse.json(
        { error: 'Error in booking creation process', details: bookingError },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in test booking endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}

export const POST = withAuth(testBooking); 