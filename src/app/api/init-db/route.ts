import { NextResponse } from 'next/server';
import { initializeSupabaseSchema } from '@/lib/init-supabase';
import { isDevelopment } from '@/lib/supabase';

// Set runtime and dynamic options explicitly as string literals
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * API endpoint to initialize the database schema
 * Only works in development mode for safety
 */
export async function GET(request: Request) {
  // Only allow in development mode
  if (!isDevelopment()) {
    return NextResponse.json(
      { 
        success: false,
        message: 'This endpoint is only available in development mode'
      },
      { status: 403 }
    );
  }

  try {
    // Check for force flag in query params
    const { searchParams } = new URL(request.url);
    const forceInit = searchParams.get('force') === 'true';
    
    console.log(`Initializing database${forceInit ? ' with force option' : ''}...`);
    
    const result = await initializeSupabaseSchema({ force: forceInit });
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Database initialized successfully${forceInit ? ' with sample data' : ''}`,
        force: forceInit
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Database initialization failed',
        error: result.error
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Database initialization error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Database initialization failed', 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 