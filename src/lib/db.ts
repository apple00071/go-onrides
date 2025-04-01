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