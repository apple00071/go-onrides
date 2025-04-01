import { NextResponse, NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { dynamic } from '../../../api/config';

// Set the environment for server-side rendering
export const runtime = 'nodejs';
export { dynamic };

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { error: 'Authentication check failed' },
      { status: 500 }
    );
  }
} 