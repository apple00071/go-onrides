import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wmjbuctpkgpljvlmfipb.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtamJ1Y3Rwa2dwbGp2bG1maXBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMxNjY2NjQsImV4cCI6MjA1ODc0MjY2NH0.AkUmL9TdQad---b3W6_QAMmrTbe90cBSCtpZ3haCNkg';

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Missing Supabase environment variables, using development fallbacks');
  }

  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
    },
  });
} 