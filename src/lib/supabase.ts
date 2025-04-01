import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client with fallbacks
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wmjbuctpkgpljvlmfipb.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtamJ1Y3Rwa2dwbGp2bG1maXBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMxNjY2NjQsImV4cCI6MjA1ODc0MjY2NH0.AkUmL9TdQad---b3W6_QAMmrTbe90cBSCtpZ3haCNkg';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Missing Supabase environment variables, using development fallbacks');
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