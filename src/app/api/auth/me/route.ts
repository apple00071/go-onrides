import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { dynamic } from '../../config';

// Set the environment for server-side rendering
export const runtime = 'nodejs';
export { dynamic };

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET(request: Request) {
  try {
    // Check for token in cookies
    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { authenticated: false, error: 'No authentication token found' },
        { status: 401 }
      );
    }

    // Verify token
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        id: number;
        username: string;
        email: string;
        role: string;
        status: string;
      };

      return NextResponse.json({
        authenticated: true,
        user: {
          id: decoded.id,
          username: decoded.username,
          email: decoded.email,
          role: decoded.role,
          status: decoded.status
        }
      });
    } catch (verifyError) {
      console.error('Token verification failed:', verifyError);
      // Delete invalid token
      cookieStore.delete('token');
      
      return NextResponse.json(
        { authenticated: false, error: 'Invalid authentication token' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error checking authentication:', error);
    return NextResponse.json(
      { authenticated: false, error: 'Authentication check failed' },
      { status: 500 }
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