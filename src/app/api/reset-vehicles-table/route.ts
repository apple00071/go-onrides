import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';

/**
 * Nuclear option API endpoint to completely reset the vehicles table
 * This endpoint drops and recreates the vehicles table from scratch
 */
export const POST = withAuth(async (request: AuthenticatedRequest): Promise<NextResponse> => {
  try {
    // Verify that the user is an admin
    if (request.user?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    console.log('Starting nuclear reset of vehicles table...');

    // First, get the database connection status
    const { data: statusData, error: statusError } = await supabase.from('users').select('count(*)', { count: 'exact', head: true });
    
    if (statusError) {
      console.error('Database connection check failed:', statusError);
      return NextResponse.json({
        success: false,
        error: 'Database connection failed. Cannot proceed with reset.'
      }, { status: 500 });
    }
    
    // Step 1: Fix bookings table first - this ensures our vehicle deletion will work
    try {
      // First check if the bookings table exists
      const { error: bookingsCheckError } = await supabase.rpc('execute_sql', {
        sql_string: `
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'bookings'
          );
        `
      });
      
      if (bookingsCheckError) {
        console.log('Cannot verify if bookings table exists:', bookingsCheckError);
      }
      
      // Attempt to clear out all bookings to prevent constraint issues
      const { error: clearBookingsError } = await supabase
        .from('bookings')
        .delete()
        .neq('id', 0);
        
      if (clearBookingsError) {
        console.log('Error clearing bookings (may not exist yet):', clearBookingsError);
      }
      
      // Remove any constraints from bookings table
      const { error: constraintError } = await supabase.rpc('execute_sql', {
        sql_string: `
          -- First, drop constraints from bookings table that reference vehicles
          ALTER TABLE IF EXISTS bookings DROP CONSTRAINT IF EXISTS bookings_vehicle_id_fkey;
          ALTER TABLE IF EXISTS bookings DROP CONSTRAINT IF EXISTS fk_vehicle_id;
          -- Drop any other potential constraint names
          ALTER TABLE IF EXISTS bookings DROP CONSTRAINT IF EXISTS bookings_vehicle_id_fkey1;
          ALTER TABLE IF EXISTS bookings DROP CONSTRAINT IF EXISTS bookings_vehicle_id_foreign;
        `
      });
      
      if (constraintError) {
        console.error('Error removing constraints:', constraintError);
      } else {
        console.log('Successfully removed foreign key constraints');
      }
    } catch (err) {
      console.error('Error preparing bookings table:', err);
    }
    
    // Step 2: Drop and recreate the vehicles table using SQL
    let recreateSuccess = false;
    try {
      const { error: dropError } = await supabase.rpc('execute_sql', {
        sql_string: `
          -- Drop the vehicles table entirely
          DROP TABLE IF EXISTS vehicles CASCADE;
          
          -- Recreate the vehicles table with basic schema
          CREATE TABLE vehicles (
            id BIGSERIAL PRIMARY KEY,
            type TEXT NOT NULL,
            model TEXT NOT NULL,
            number_plate TEXT UNIQUE NOT NULL,
            status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'rented', 'maintenance', 'retired')),
            daily_rate DECIMAL(10,2) NOT NULL,
            manufacturer TEXT,
            year INTEGER,
            color TEXT,
            hourly_rate DECIMAL(10,2),
            weekly_rate DECIMAL(10,2),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
          
          -- Recreate indexes
          CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
          CREATE INDEX IF NOT EXISTS idx_vehicles_number_plate ON vehicles(number_plate);
          CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles(type);
        `
      });
      
      if (dropError) {
        console.error('Error in table recreation:', dropError);
      } else {
        console.log('Successfully recreated vehicles table');
        recreateSuccess = true;
      }
    } catch (err) {
      console.error('Exception in table recreation:', err);
    }
    
    // Step 3: Fix or create bookings table if needed
    try {
      const { error: fixBookingsError } = await supabase.rpc('execute_sql', {
        sql_string: `
          -- Create a bookings table if it doesn't exist
          CREATE TABLE IF NOT EXISTS bookings (
            id BIGSERIAL PRIMARY KEY,
            booking_id TEXT,
            customer_id BIGINT,
            vehicle_id BIGINT,
            worker_id BIGINT,
            start_date TIMESTAMP WITH TIME ZONE,
            end_date TIMESTAMP WITH TIME ZONE,
            return_date TIMESTAMP WITH TIME ZONE,
            status TEXT DEFAULT 'pending',
            base_price DECIMAL(10,2),
            total_amount DECIMAL(10,2),
            remarks TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
          
          -- Create sequence for booking IDs if it doesn't exist
          CREATE SEQUENCE IF NOT EXISTS bookings_id_seq;
          
          -- Create bookings indexes
          CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
          CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(start_date, end_date);
          CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
          CREATE INDEX IF NOT EXISTS idx_bookings_vehicle ON bookings(vehicle_id);
        `
      });
      
      if (fixBookingsError) {
        console.error('Error fixing bookings table:', fixBookingsError);
      } else {
        console.log('Successfully prepared bookings table');
      }
    } catch (err) {
      console.error('Exception fixing bookings table:', err);
    }
    
    // Step 4: Verify the vehicles table was recreated properly
    try {
      const { count, error: countError } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true });
        
      if (countError) {
        console.error('Error verifying vehicles table recreation:', countError);
      } else {
        console.log(`Vehicles table exists and has ${count || 0} rows`);
      }
    } catch (err) {
      console.error('Exception verifying vehicles table:', err);
    }
    
    // Step 5: Restore the foreign key constraint in the bookings table
    if (recreateSuccess) {
      try {
        const { error: fkError } = await supabase.rpc('execute_sql', {
          sql_string: `
            -- Add back the foreign key constraint to the bookings table
            ALTER TABLE IF EXISTS bookings 
            ADD CONSTRAINT bookings_vehicle_id_fkey 
            FOREIGN KEY (vehicle_id) 
            REFERENCES vehicles(id);
          `
        });
        
        if (fkError) {
          console.error('Error recreating foreign key constraint:', fkError);
        } else {
          console.log('Successfully recreated foreign key constraint');
        }
      } catch (err) {
        console.error('Exception recreating foreign key constraint:', err);
      }
    }

    if (recreateSuccess) {
      return NextResponse.json({
        success: true,
        message: 'Vehicles table has been completely reset and recreated. Database structure has been fixed.'
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Failed to completely reset the vehicles table. See server logs for details.'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in vehicles table reset:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error during vehicles table reset' 
      },
      { status: 500 }
    );
  }
}); 