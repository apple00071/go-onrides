import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key');
}

// Create a single supabase client for the entire application
export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to check if we're in development mode
export const isDevelopment = () => process.env.NODE_ENV === 'development';

// Tables in Supabase
export const TABLES = {
  USERS: 'users',
  CUSTOMERS: 'customers',
  VEHICLES: 'vehicles',
  BOOKINGS: 'bookings',
  SETTINGS: 'settings'
}; 