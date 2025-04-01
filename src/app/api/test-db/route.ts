import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { dynamic } from '../config';

// Set the environment for server-side rendering
export const runtime = 'nodejs';
export { dynamic };

export async function GET(request: Request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || 'customers';
    
    let result;
    
    if (query === 'customers') {
      // Try to use standard Supabase methods instead of execute_sql
      const { data: tableExists, error: tableError } = await supabase
        .from('customers')
        .select('count(*)', { count: 'exact', head: true });
      
      const { data: columns, error: columnsError } = await supabase
        .from('customers')
        .select('*')
        .limit(1);
        
      const { data: samples, error: samplesError } = await supabase
        .from('customers')
        .select('*')
        .limit(5);
      
      result = {
        tableExists: tableExists !== null,
        tableError: tableError,
        columns: columns ? Object.keys(columns[0] || {}) : [],
        columnsError: columnsError,
        samples: samples,
        samplesError: samplesError
      };
    } else if (query === 'test-insert') {
      // Test insert with standard Supabase client
      const { data: inserted, error: insertError } = await supabase
        .from('customers')
        .insert([
          {
            first_name: 'Test',
            last_name: 'Customer',
            phone: '9876543210' // Use a different number each time
          }
        ])
        .select();
      
      result = {
        inserted: inserted,
        insertError: insertError
      };
    }

    return NextResponse.json({
      success: true,
      message: 'Database test completed',
      data: result
    });
  } catch (error) {
    console.error('Error testing database:', error);
    return NextResponse.json(
      { success: false, error: 'Database test failed', details: error },
      { status: 500 }
    );
  }
} 