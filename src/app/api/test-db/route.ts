import { NextResponse } from 'next/server';
import { supabase, forceSchemaRefresh } from '@/lib/db';
import { dynamic } from '@/app/api/config';

// Set the environment for server-side rendering
export const runtime = 'nodejs';
export { dynamic };

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryType = searchParams.get('query') || 'basic';
    
    // Start with basic DB connectivity check
    console.log(`Running DB test: ${queryType}`);
    
    // Force schema refresh to ensure we have the latest schema
    await forceSchemaRefresh();
    
    const results: any = {
      success: true,
      message: 'Database test executed',
      queryType,
      timestamp: new Date().toISOString(),
      tests: []
    };
    
    // Test database connection by listing tables
    try {
      // This is a simpler query that should work more reliably
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id')
        .limit(1);
        
      results.tests.push({
        name: 'basic-connection',
        success: !vehiclesError,
        data: vehiclesData,
        error: vehiclesError
      });
      
      if (vehiclesError) {
        console.error('Basic DB connection error:', vehiclesError);
      } else {
        console.log('Basic DB connection successful');
      }
    } catch (error) {
      console.error('Error in basic DB connection test:', error);
      results.tests.push({
        name: 'basic-connection',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    // Check if customers table exists with a simple query
    try {
      console.log('Checking if customers table exists...');
      const { data: customersTest, error: customersError } = await supabase
        .from('customers')
        .select('id')
        .limit(1);
        
      results.tests.push({
        name: 'customers-table',
        success: !customersError,
        exists: !customersError,
        data: customersTest,
        error: customersError
      });
      
      if (customersError) {
        console.error('Customers table check error:', customersError);
      } else {
        console.log('Customers table exists and is accessible');
      }
    } catch (error) {
      console.error('Error checking customers table:', error);
      results.tests.push({
        name: 'customers-table',
        success: false,
        exists: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Check if bookings table exists with a simple query
    try {
      console.log('Checking if bookings table exists...');
      const { data: bookingsTest, error: bookingsError } = await supabase
        .from('bookings')
        .select('id')
        .limit(1);
        
      results.tests.push({
        name: 'bookings-table',
        success: !bookingsError,
        exists: !bookingsError,
        data: bookingsTest,
        error: bookingsError
      });
      
      if (bookingsError) {
        console.error('Bookings table check error:', bookingsError);
      } else {
        console.log('Bookings table exists and is accessible');
      }
    } catch (error) {
      console.error('Error checking bookings table:', error);
      results.tests.push({
        name: 'bookings-table',
        success: false,
        exists: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    // If queryType is 'test-insert', try to insert a test customer
    if (queryType === 'test-insert') {
      try {
        console.log('Attempting to insert a test customer...');
        
        // First, check if a customer with the test phone number already exists
        const { data: existingCustomer, error: searchError } = await supabase
          .from('customers')
          .select('id')
          .eq('phone', '9876543210')
          .maybeSingle();
          
        if (searchError) {
          console.error('Error searching for existing test customer:', searchError);
          results.tests.push({
            name: 'search-customer',
            success: false,
            error: searchError
          });
        } else {
          results.tests.push({
            name: 'search-customer',
            success: true,
            customerExists: !!existingCustomer,
            data: existingCustomer
          });
          
          // If customer doesn't exist or we want to test updating, insert/update
          if (!existingCustomer) {
            // Try to insert a new test customer
            const { data: insertResult, error: insertError } = await supabase
              .from('customers')
              .insert({
                first_name: 'Test',
                last_name: 'Customer',
                phone: '9876543210'
              })
              .select();
              
            results.tests.push({
              name: 'insert-customer',
              success: !insertError,
              data: insertResult,
              error: insertError
            });
            
            if (insertError) {
              console.error('Error inserting test customer:', insertError);
            } else {
              console.log('Test customer inserted successfully:', insertResult);
            }
          } else {
            // Try to update the existing test customer
            const { data: updateResult, error: updateError } = await supabase
              .from('customers')
              .update({
                first_name: 'Updated',
                last_name: 'TestCustomer'
              })
              .eq('id', existingCustomer.id)
              .select();
              
            results.tests.push({
              name: 'update-customer',
              success: !updateError,
              data: updateResult,
              error: updateError
            });
            
            if (updateError) {
              console.error('Error updating test customer:', updateError);
            } else {
              console.log('Test customer updated successfully:', updateResult);
            }
          }
        }
      } catch (error) {
        console.error('Error in test-insert operations:', error);
        results.tests.push({
          name: 'test-insert',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error in test-db endpoint:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error in test-db endpoint',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 