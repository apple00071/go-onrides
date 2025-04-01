import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import { dynamic } from '@/app/api/config';

// Explicitly export these to ensure the route is dynamic
export const runtime = 'nodejs';
export { dynamic, };

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface TokenResult {
  adminTokenExists: boolean;
  authTokenExists: boolean;
  adminTokenData: string | JwtPayload | { error: string } | null;
  authTokenData: string | JwtPayload | { error: string } | null;
}

export async function GET() {
  try {
    const cookieStore = cookies();
    const adminToken = cookieStore.get('adminToken')?.value;
    const authToken = cookieStore.get('authToken')?.value;
    
    const result: TokenResult = {
      adminTokenExists: !!adminToken,
      authTokenExists: !!authToken,
      adminTokenData: null,
      authTokenData: null
    };
    
    if (adminToken) {
      try {
        result.adminTokenData = jwt.verify(adminToken, JWT_SECRET);
      } catch (err) {
        result.adminTokenData = { error: 'Invalid token' };
      }
    }
    
    if (authToken) {
      try {
        result.authTokenData = jwt.verify(authToken, JWT_SECRET);
      } catch (err) {
        result.authTokenData = { error: 'Invalid token' };
      }
    }
    
    return NextResponse.json({
      status: 'success',
      cookies: result,
      allCookies: cookieStore.getAll().map(c => c.name)
    });
  } catch (error) {
    console.error('Error checking auth tokens:', error);
    return NextResponse.json({ 
      status: 'error', 
      message: 'Error checking auth tokens',
      error: String(error)
    }, { status: 500 });
  }
} 