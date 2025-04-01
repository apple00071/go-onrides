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

// Fix the schema issue with the color column
(async () => {
  try {
    await supabase.rpc('execute_sql', {
      sql_string: `
        DO $$
        BEGIN
          -- Check and add color column if missing
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
        END $$;
      `
    });
    console.log('Database schema fix applied: All missing columns have been added to the vehicles table');
  } catch (err) {
    console.error('Failed to fix vehicles schema:', err);
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