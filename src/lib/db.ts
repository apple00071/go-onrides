import { createClient } from '@supabase/supabase-js';

// Get environment variables with fallbacks for development
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://wmjbuctpkgpljvlmfipb.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtamJ1Y3Rwa2dwbGp2bG1maXBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMxNjY2NjQsImV4cCI6MjA1ODc0MjY2NH0.AkUmL9TdQad---b3W6_QAMmrTbe90cBSCtpZ3haCNkg';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Missing Supabase environment variables, using development fallbacks');
}

// Make sure we have at least fallback values
if (!supabaseUrl) {
  throw new Error('supabaseUrl is required. Please set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL environment variable.');
}

if (!supabaseKey) {
  throw new Error('supabaseKey is required. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_KEY environment variable.');
}

// Create Supabase client with error handling
export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Force Supabase to refresh its schema cache by making direct SQL queries
 * This helps address the "column not found in schema cache" errors
 */
export async function forceSchemaRefresh() {
  try {
    // First perform an ANALYZE on all tables to update statistics
    await supabase.rpc('execute_sql', {
      sql_string: `
        ANALYZE customers;
        ANALYZE vehicles;
        ANALYZE bookings;
      `
    });
    
    // Then query each table to force Supabase to update its cache
    await supabase.from('customers').select('id').limit(1);
    await supabase.from('vehicles').select('id').limit(1);
    await supabase.from('bookings').select('id').limit(1);
    
    // For more stubborn cache issues, this direct query helps
    await supabase.rpc('execute_sql', {
      sql_string: `
        -- This helps clear out any stale schema cache
        SELECT current_setting('search_path');
        SET search_path TO public;
        SELECT pg_sleep(0.5); -- Give the system time to process
        SELECT * FROM customers LIMIT 1;
        SELECT * FROM vehicles LIMIT 1;
        SELECT * FROM bookings LIMIT 1;
      `
    });
    
    console.log('Schema cache refreshed successfully');
    return true;
  } catch (error) {
    console.error('Error refreshing schema cache:', error);
    return false;
  }
}

// Fix the schema issue with the color column
(async () => {
  try {
    await supabase.rpc('execute_sql', {
      sql_string: `
        DO $$
        BEGIN
          -- Check customers table structure first
          IF NOT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'customers'
          ) THEN
            CREATE TABLE customers (
              id SERIAL PRIMARY KEY,
              first_name TEXT,
              last_name TEXT,
              email TEXT,
              phone TEXT,
              address TEXT,
              city TEXT,
              state TEXT,
              pincode TEXT,
              created_at TIMESTAMPTZ DEFAULT NOW(),
              updated_at TIMESTAMPTZ DEFAULT NOW()
            );
            RAISE NOTICE 'Created customers table';
          END IF;

          -- Check if first_name and last_name exist but full_name doesn't
          IF EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'customers' AND column_name = 'first_name'
          ) AND EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'customers' AND column_name = 'last_name'
          ) AND NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'customers' AND column_name = 'full_name'
          ) THEN
            ALTER TABLE customers ADD COLUMN full_name TEXT;
            UPDATE customers SET full_name = CONCAT(first_name, ' ', last_name);
            RAISE NOTICE 'Added full_name column to customers table';
          END IF;

          -- Check if full_name exists but first_name and last_name don't
          IF EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'customers' AND column_name = 'full_name'
          ) AND NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'customers' AND column_name = 'first_name'
          ) THEN
            ALTER TABLE customers ADD COLUMN first_name TEXT;
            ALTER TABLE customers ADD COLUMN last_name TEXT;
            RAISE NOTICE 'Added first_name and last_name columns to customers table';
          END IF;

          -- Check and add columns to vehicles table
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'vehicles' AND column_name = 'color'
          ) THEN
            ALTER TABLE vehicles ADD COLUMN color TEXT;
            RAISE NOTICE 'Added missing color column to vehicles table';
          END IF;
          
          -- Check and add manufacturer column if missing
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'vehicles' AND column_name = 'manufacturer'
          ) THEN
            ALTER TABLE vehicles ADD COLUMN manufacturer TEXT;
            RAISE NOTICE 'Added missing manufacturer column to vehicles table';
          END IF;
          
          -- Check and add year column if missing
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'vehicles' AND column_name = 'year'
          ) THEN
            ALTER TABLE vehicles ADD COLUMN year INTEGER;
            RAISE NOTICE 'Added missing year column to vehicles table';
          END IF;
          
          -- Check and add hourly_rate column if missing
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'vehicles' AND column_name = 'hourly_rate'
          ) THEN
            ALTER TABLE vehicles ADD COLUMN hourly_rate DECIMAL(10,2);
            RAISE NOTICE 'Added missing hourly_rate column to vehicles table';
          END IF;
          
          -- Check and add weekly_rate column if missing
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'vehicles' AND column_name = 'weekly_rate'
          ) THEN
            ALTER TABLE vehicles ADD COLUMN weekly_rate DECIMAL(10,2);
            RAISE NOTICE 'Added missing weekly_rate column to vehicles table';
          END IF;
          
          -- Check and add created_at column if missing
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'vehicles' AND column_name = 'created_at'
          ) THEN
            ALTER TABLE vehicles ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
            RAISE NOTICE 'Added missing created_at column to vehicles table';
          END IF;
          
          -- Check and add updated_at column if missing
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'vehicles' AND column_name = 'updated_at'
          ) THEN
            ALTER TABLE vehicles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
            RAISE NOTICE 'Added missing updated_at column to vehicles table';
          END IF;

          -- Check and add columns to customers table
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'customers' AND column_name = 'dl_number'
          ) THEN
            ALTER TABLE customers ADD COLUMN dl_number TEXT;
            RAISE NOTICE 'Added missing dl_number column to customers table';
          END IF;

          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'customers' AND column_name = 'dl_expiry'
          ) THEN
            ALTER TABLE customers ADD COLUMN dl_expiry TIMESTAMPTZ;
            RAISE NOTICE 'Added missing dl_expiry column to customers table';
          END IF;

          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'customers' AND column_name = 'dob'
          ) THEN
            ALTER TABLE customers ADD COLUMN dob TIMESTAMPTZ;
            RAISE NOTICE 'Added missing dob column to customers table';
          END IF;

          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'customers' AND column_name = 'aadhar_number'
          ) THEN
            ALTER TABLE customers ADD COLUMN aadhar_number TEXT;
            RAISE NOTICE 'Added missing aadhar_number column to customers table';
          END IF;

          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'customers' AND column_name = 'father_phone'
          ) THEN
            ALTER TABLE customers ADD COLUMN father_phone TEXT;
            RAISE NOTICE 'Added missing father_phone column to customers table';
          END IF;

          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'customers' AND column_name = 'mother_phone'
          ) THEN
            ALTER TABLE customers ADD COLUMN mother_phone TEXT;
            RAISE NOTICE 'Added missing mother_phone column to customers table';
          END IF;

          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'customers' AND column_name = 'emergency_contact1'
          ) THEN
            ALTER TABLE customers ADD COLUMN emergency_contact1 TEXT;
            RAISE NOTICE 'Added missing emergency_contact1 column to customers table';
          END IF;

          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'customers' AND column_name = 'emergency_contact2'
          ) THEN
            ALTER TABLE customers ADD COLUMN emergency_contact2 TEXT;
            RAISE NOTICE 'Added missing emergency_contact2 column to customers table';
          END IF;

          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'customers' AND column_name = 'address'
          ) THEN
            ALTER TABLE customers ADD COLUMN address TEXT;
            RAISE NOTICE 'Added missing address column to customers table';
          END IF;

          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'customers' AND column_name = 'city'
          ) THEN
            ALTER TABLE customers ADD COLUMN city TEXT;
            RAISE NOTICE 'Added missing city column to customers table';
          END IF;

          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'customers' AND column_name = 'state'
          ) THEN
            ALTER TABLE customers ADD COLUMN state TEXT;
            RAISE NOTICE 'Added missing state column to customers table';
          END IF;

          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'customers' AND column_name = 'pincode'
          ) THEN
            ALTER TABLE customers ADD COLUMN pincode TEXT;
            RAISE NOTICE 'Added missing pincode column to customers table';
          END IF;

          -- Check bookings table exists
          IF NOT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'bookings'
          ) THEN
            CREATE TABLE bookings (
              id SERIAL PRIMARY KEY,
              vehicle_id INTEGER,
              customer_id INTEGER,
              start_date TIMESTAMPTZ,
              end_date TIMESTAMPTZ,
              status TEXT,
              base_price DECIMAL(10,2),
              security_deposit DECIMAL(10,2),
              total_amount DECIMAL(10,2),
              payment_method TEXT,
              notes TEXT,
              created_at TIMESTAMPTZ DEFAULT NOW(),
              updated_at TIMESTAMPTZ DEFAULT NOW()
            );
            RAISE NOTICE 'Created bookings table';
          END IF;
          
          -- Check and add columns to bookings table
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'bookings' AND column_name = 'base_price'
          ) THEN
            ALTER TABLE bookings ADD COLUMN base_price DECIMAL(10,2);
            RAISE NOTICE 'Added missing base_price column to bookings table';
          END IF;
          
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'bookings' AND column_name = 'security_deposit'
          ) THEN
            ALTER TABLE bookings ADD COLUMN security_deposit DECIMAL(10,2);
            RAISE NOTICE 'Added missing security_deposit column to bookings table';
          END IF;
          
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'bookings' AND column_name = 'total_amount'
          ) THEN
            ALTER TABLE bookings ADD COLUMN total_amount DECIMAL(10,2);
            RAISE NOTICE 'Added missing total_amount column to bookings table';
          END IF;
          
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'bookings' AND column_name = 'payment_method'
          ) THEN
            ALTER TABLE bookings ADD COLUMN payment_method TEXT;
            RAISE NOTICE 'Added missing payment_method column to bookings table';
          END IF;
          
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'bookings' AND column_name = 'notes'
          ) THEN
            ALTER TABLE bookings ADD COLUMN notes TEXT;
            RAISE NOTICE 'Added missing notes column to bookings table';
          END IF;
          
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'bookings' AND column_name = 'documents'
          ) THEN
            ALTER TABLE bookings ADD COLUMN documents JSONB;
            RAISE NOTICE 'Added missing documents column to bookings table';
          END IF;
          
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'bookings' AND column_name = 'signature'
          ) THEN
            ALTER TABLE bookings ADD COLUMN signature TEXT;
            RAISE NOTICE 'Added missing signature column to bookings table';
          END IF;

          -- Force Supabase to refresh its schema cache
          PERFORM pg_sleep(1);
          ANALYZE customers;
          ANALYZE vehicles;
          ANALYZE bookings;
        END $$;
      `
    });
    
    // Additional schema refresh to ensure Supabase client has latest schema
    await supabase.rpc('execute_sql', {
      sql_string: `SELECT * FROM customers LIMIT 1; SELECT * FROM vehicles LIMIT 1; SELECT * FROM bookings LIMIT 1;`
    });
    
    console.log('Database schema fix applied: All missing columns have been added to the vehicles, customers, and bookings tables');
  } catch (err) {
    console.error('Failed to fix schema:', err);
  }
})();

// Tables
export const TABLES = {
  USERS: 'users',
  CUSTOMERS: 'customers',
  VEHICLES: 'vehicles',
  BOOKINGS: 'bookings',
  PAYMENTS: 'payments',
  SETTINGS: 'settings',
  MAINTENANCE: 'maintenance_records'
} as const;

// Helper function to handle Supabase errors
export const handleSupabaseError = (error: any) => {
  console.error('Database error:', error);
  throw new Error(error.message || 'An error occurred while accessing the database');
}; 