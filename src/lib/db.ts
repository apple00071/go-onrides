import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

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