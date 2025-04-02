import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { supabase } from '@/lib/db';
import type { AuthenticatedRequest } from '@/types';
import { dynamic } from '@/app/api/config';

export const runtime = 'nodejs';
export { dynamic };

async function testAuth(request: AuthenticatedRequest) {
  try {
    // If we got here, the user is authenticated
    console.log('User authenticated:', request.user);
    
    // Test database connection
    const { data: dbTest, error: dbError } = await supabase
      .from('users')
      .select('id, username, email, role')
      .limit(1);
      
    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Authentication successful but database error occurred',
          user: request.user,
          dbError
        },
        { status: 500 }
      );
    }
    
    // Test if we can query vehicle data which should have fewer schema issues
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('id, model, number_plate')
      .limit(3);
      
    // Return user data and database test results
    return NextResponse.json({
      success: true,
      message: 'Authentication successful',
      user: request.user,
      dbTest,
      vehicles: vehicles || [],
      vehiclesError: vehiclesError || null
    });
  } catch (error) {
    console.error('Error in test-auth endpoint:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error in test-auth endpoint',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export const GET = withAuth(testAuth); 