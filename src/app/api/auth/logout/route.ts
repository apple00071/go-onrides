import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { dynamic } from '../../config';

// Set the environment for server-side rendering
export const runtime = 'nodejs';
export { dynamic };

export async function POST() {
  try {
    // Clear the authentication cookie
    const cookieStore = cookies();
    cookieStore.delete('token');
    
    // Also clear adminToken if it exists
    cookieStore.delete('adminToken');

    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
    },
  });
} 