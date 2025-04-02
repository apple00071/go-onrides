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
      total_amount: booking.total_amount || 0,
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
            
            -- Add emergency contact columns if missing
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
            
            // Add emergency contact fields
            if (customerData.father_phone) {
              additionalData.father_phone = customerData.father_phone;
            }
            
            if (customerData.mother_phone) {
              additionalData.mother_phone = customerData.mother_phone;
            }
            
            if (customerData.emergency_contact1) {
              additionalData.emergency_contact1 = customerData.emergency_contact1;
            }
            
            if (customerData.emergency_contact2) {
              additionalData.emergency_contact2 = customerData.emergency_contact2;
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
    
    // Generate a unique booking ID
    const bookingId = `BK${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    
    // Prepare base booking data with fields that are always needed
    const bookingData: Record<string, any> = {
      booking_id: bookingId,
      customer_id: customerId,
      vehicle_id: data.vehicle_id,
      start_date: data.start_date,
      end_date: data.end_date,
      status: 'pending',
      payment_status: 'pending',
      total_amount: pricing.total_amount,
      base_price: pricing.base_price,
      security_deposit: pricing.security_deposit || 0,
      documents: data.documents || null,
      signature: data.signature || null,
      father_phone: data.customer_details?.father_phone || null,
      mother_phone: data.customer_details?.mother_phone || null,
      emergency_contact1: data.customer_details?.emergency_contact1 || null,
      emergency_contact2: data.customer_details?.emergency_contact2 || null
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
        
        const minimalBookingData: Record<string, any> = {
          vehicle_id: data.vehicle_id,
          customer_id: customerId,
          worker_id: workerId,
          start_date: data.start_date,
          end_date: data.end_date,
          base_price: basePrice || 0,
          total_amount: totalAmount || 0,
          status: 'pending'
        };
        
        // Add documents and signature fields if provided
        if (data.documents) {
          // Store for later use, but don't add to the initial object
          console.log('Documents data provided for minimal approach, will update after booking creation');
        }
        
        if (data.signature) {
          // Store for later use, but don't add to the initial object
          console.log('Signature data provided for minimal approach, will update after booking creation');
        }
        
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
                -- Skip column creation as it may not be supported in this context
                
                -- Perform a simple insert with only core fields
                INSERT INTO bookings (
                  vehicle_id, customer_id, worker_id, 
                  start_date, end_date, 
                  base_price, total_amount, status
                )
                VALUES (
                  ${data.vehicle_id}, ${customerId}, ${workerId}, 
                  '${data.start_date}', '${data.end_date}', 
                  ${basePrice || 0}, ${totalAmount || 0}, 'pending'
                )
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
      
      // Get the new booking data
      const { data: newBookingData, error: fetchError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .limit(1);
        
      if (fetchError) {
        console.error('Error fetching new booking:', fetchError);
      }
        
      // Insert worked, return the booking data
      console.log('Booking created successfully with ID:', bookingId);
      
      // Prepare the result object
      const result: any = { 
        success: true, 
        message: 'Booking created successfully',
        booking: newBookingData?.[0] || null
      };
      
      // Check if we have documents or signature to update
      const hasDocsOrSignature = data.documents || data.signature;
      
      if (hasDocsOrSignature) {
        console.log('Documents or signature provided - using direct SQL update');
        try {
          // First try to ensure the columns exist
          try {
            const { error: alterError } = await supabase.rpc('execute_sql', {
              sql_string: `
                DO $$
                BEGIN
                  -- Check and add documents column if missing
                  IF NOT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'bookings' AND column_name = 'documents'
                  ) THEN
                    ALTER TABLE bookings ADD COLUMN documents JSONB;
                    RAISE NOTICE 'Added documents column to bookings table';
                  END IF;
                  
                  -- Check and add signature column if missing
                  IF NOT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'bookings' AND column_name = 'signature'
                  ) THEN
                    ALTER TABLE bookings ADD COLUMN signature TEXT;
                    RAISE NOTICE 'Added signature column to bookings table';
                  END IF;
                END $$;
              `
            });
            
            if (alterError) {
              console.warn('Error ensuring columns exist:', alterError);
            }
          } catch (alterError) {
            console.warn('Exception ensuring columns exist:', alterError);
          }
          
          // Now try to update the booking directly with SQL
          const documentsJson = data.documents 
            ? JSON.stringify(data.documents).replace(/'/g, "''") 
            : null;
            
          const signatureText = data.signature 
            ? data.signature.replace(/'/g, "''") 
            : null;
          
          const updates = [];
          if (data.documents) updates.push(`documents = '${documentsJson}'::jsonb`);
          if (data.signature) updates.push(`signature = '${signatureText}'`);
          
          if (updates.length > 0) {
            const { error: updateError } = await supabase.rpc('execute_sql', {
              sql_string: `
                UPDATE bookings 
                SET ${updates.join(', ')}
                WHERE id = ${bookingId}
              `
            });
            
            if (updateError) {
              console.error('Error updating documents with SQL:', updateError);
              result.documents_updated = false;
              result.signature_updated = false;
              result.document_update_error = `SQL update failed: ${updateError.message}`;
              
              // If this appears to be a schema cache issue, provide guidance
              if (updateError.message.includes('schema cache')) {
                result.document_update_instructions = [
                  'This appears to be a schema cache issue.',
                  'Connect to the Supabase dashboard',
                  'Go to the SQL Editor',
                  'Run: ALTER TABLE bookings ADD COLUMN IF NOT EXISTS documents JSONB;',
                  'Run: ALTER TABLE bookings ADD COLUMN IF NOT EXISTS signature TEXT;'
                ];
              }
            } else {
              result.documents_updated = !!data.documents;
              result.signature_updated = !!data.signature;
            }
          }
        } catch (error) {
          console.error('Exception during document SQL update:', error);
          result.documents_updated = false;
          result.signature_updated = false;
          result.document_update_error = error instanceof Error ? error.message : 'Unknown error';
        }
      }
      
      // Return the booking data
      return NextResponse.json(result);
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
    // Handle basic fields first (which are less likely to have schema issues)
    const basicUpdateData: Record<string, any> = {};
    
    if (data.payment_method) basicUpdateData.payment_method = data.payment_method;
    if (data.notes) basicUpdateData.notes = data.notes;
    
    // Only attempt to update if we have fields to update
    if (Object.keys(basicUpdateData).length > 0) {
      const { error: updateError } = await supabase
        .from('bookings')
        .update(basicUpdateData)
        .eq('id', bookingId);
        
      if (updateError) {
        console.warn('Non-critical: Error updating additional booking details:', updateError);
      } else {
        console.log('Successfully updated basic booking details');
      }
    }
    
    // Handle documents and signature separately
    if (data.documents || data.signature) {
      console.log('Attempting to update documents and signature...');
      
      try {
        // First ensure the columns exist using SQL
        console.log('Ensuring columns exist...');
        await forceSchemaRefresh();
        
        try {
          // First try to directly update with documents and signature
          const docsUpdateData: Record<string, any> = {};
          
          if (data.documents) docsUpdateData.documents = data.documents;
          if (data.signature) docsUpdateData.signature = data.signature;
          
          if (Object.keys(docsUpdateData).length > 0) {
            console.log('Updating with documents/signature data:', docsUpdateData);
            const { error: docsError } = await supabase
              .from('bookings')
              .update(docsUpdateData)
              .eq('id', bookingId);
              
            if (!docsError) {
              console.log('Successfully updated documents and signature directly');
              return;
            }
            
            console.warn('Error updating documents and signature directly:', docsError);
          }
        } catch (directError) {
          console.warn('Caught error during direct update:', directError);
        }
        
        // If direct update fails, try individual SQL statements
        if (data.documents) {
          try {
            // First try to update just the documents field
            const { error: docOnlyError } = await supabase
              .from('bookings')
              .update({ documents: data.documents })
              .eq('id', bookingId);
              
            if (docOnlyError) {
              console.warn('Error updating documents alone:', docOnlyError);
            } else {
              console.log('Successfully updated documents alone');
            }
          } catch (docError) {
            console.warn('Caught error updating documents:', docError);
          }
        }
        
        if (data.signature) {
          try {
            // Then try to update just the signature field
            const { error: sigOnlyError } = await supabase
              .from('bookings')
              .update({ signature: data.signature })
              .eq('id', bookingId);
              
            if (sigOnlyError) {
              console.warn('Error updating signature alone:', sigOnlyError);
            } else {
              console.log('Successfully updated signature alone');
            }
          } catch (sigError) {
            console.warn('Caught error updating signature:', sigError);
          }
        }
      } catch (error) {
        console.warn('Non-critical: Error ensuring columns for documents and signature:', error);
      }
    }
  } catch (error) {
    console.warn('Non-critical: Error updating additional booking data:', error);
  }
}

// Helper function to verify if a column exists in a table
async function verifyColumnExists(tableName: string, columnName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('execute_sql', {
      sql_string: `
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = '${tableName}' AND column_name = '${columnName}'
        ) as exists;
      `
    });
    
    if (error) {
      console.warn(`Error checking if ${columnName} exists in ${tableName}:`, error);
      return false;
    }
    
    // Parse the result to see if the column exists
    const exists = data && Array.isArray(data) && data.length > 0 && data[0].exists === true;
    
    if (!exists) {
      console.log(`Column '${columnName}' does not exist in table '${tableName}'`);
    }
    
    return exists;
  } catch (error) {
    console.warn(`Error verifying column ${columnName} in table ${tableName}:`, error);
    return false;
  }
}

// Export the handlers wrapped with authentication middleware
export const GET = withAuth(getBookings);
export const POST = withAuth(createBooking); 