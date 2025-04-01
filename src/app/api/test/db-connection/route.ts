import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

// Set runtime and dynamic options explicitly as string literals
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface TableResult {
  success: boolean;
  count: number;
  error: string | null;
}

export async function GET() {
  try {
    console.log('Testing database connection...');
    
    // Test query to get table counts
    const tableNames = ['users', 'customers', 'vehicles', 'bookings', 'payments'];
    const results: Record<string, TableResult> = {};
    
    for (const table of tableNames) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
          
        results[table] = {
          success: !error,
          count: count || 0,
          error: error ? error.message : null
        };
      } catch (err) {
        results[table] = {
          success: false,
          count: 0,
          error: err instanceof Error ? err.message : 'Unknown error'
        };
      }
    }
    
    // Get supabase connection info
    const connectionInfo = {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set',
      hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    };
    
    return NextResponse.json({
      success: true,
      connectionInfo,
      tables: results
    });
  } catch (error) {
    console.error('Database connection test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 