import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as jose from 'jose';
import { supabase } from '@/lib/db';

// Mark as Node.js runtime
export const runtime = 'nodejs';
// Force dynamic
export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const secret = new TextEncoder().encode(JWT_SECRET);

export async function GET(request: Request) {
  try {
    // Get token from cookies
    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No token found' },
        { status: 401 }
      );
    }

    try {
      // Verify token using jose
      const { payload } = await jose.jwtVerify(token, secret);
      const userId = payload.id as number;

      if (!userId) {
        return NextResponse.json(
          { success: false, error: 'Invalid token' },
          { status: 401 }
        );
      }

      // Get user from database
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, username, full_name, role, status, permissions, created_at, last_login_at, phone')
        .eq('id', userId)
        .single();

      if (error || !user) {
        console.error('Error fetching user:', error);
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 401 }
        );
      }

      // Check if user is active
      if (user.status !== 'active') {
        return NextResponse.json(
          { success: false, error: 'Account is not active' },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          full_name: user.full_name,
          role: user.role,
          status: user.status,
          permissions: user.permissions,
          created_at: user.created_at,
          last_login_at: user.last_login_at,
          phone: user.phone
        }
      });
    } catch (verifyError) {
      console.error('Token verification failed:', verifyError);
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 401 }
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Origin': request.headers.get('origin') || 'http://localhost:3000',
    },
  });
} 