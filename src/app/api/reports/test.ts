import { NextResponse } from 'next/server';

// Set runtime and dynamic options explicitly as string literals
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    // Log the request details
    console.log('Reports Test API called');
    
    // Get any query parameters
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'last30days';
    
    console.log('Reports Test API params:', { range });
    
    // Return a simple response with the params
    return NextResponse.json({
      success: true,
      message: 'Reports Test API is working',
      params: { range }
    });
  } catch (error) {
    console.error('Error in reports test API:', error);
    return NextResponse.json(
      { error: 'Test failed' },
      { status: 500 }
    );
  }
} 