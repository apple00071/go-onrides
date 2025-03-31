import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as jose from 'jose';
import { User, AuthenticatedRequest } from '@/types';
import { jwtVerify } from 'jose';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const COOKIE_NAME = 'token';

/**
 * Middleware for protecting API routes - verifies JWT token and attaches user to request
 */
export async function verifyAuth(request: NextRequest): Promise<User | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    
    if (!token) {
      return null;
    }
    
    // Verify JWT
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(JWT_SECRET)
    );
    
    if (!payload) {
      return null;
    }
    
    // Create user object from payload with proper type conversions
    const user: User = {
      id: typeof payload.id === 'string' ? parseInt(payload.id, 10) : payload.id as number,
      email: payload.email as string,
      username: payload.username as string,
      full_name: payload.full_name as string,
      role: payload.role as 'admin' | 'worker',
      // Map 'suspended' status to 'inactive' for compatibility
      status: payload.status === 'suspended' ? 'inactive' : (payload.status as 'active' | 'inactive'),
      created_at: payload.created_at as string,
      last_login_at: payload.last_login_at as string | undefined,
      permissions: Array.isArray(payload.permissions) ? payload.permissions : []
    };
    
    return user;
  } catch (error) {
    console.error('Auth verification error:', error);
    return null;
  }
}

export function withAuth(handler: (req: AuthenticatedRequest, context?: any) => Promise<NextResponse>) {
  return async (request: NextRequest, context?: any) => {
    const user = await verifyAuth(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Add the user to the request
    const authRequest = request as AuthenticatedRequest;
    authRequest.user = user;
    
    return handler(authRequest, context);
  };
}

/**
 * Check if a user has one of the required roles
 */
export function checkRole(user: User | undefined, roles: string | string[]): boolean {
  if (!user) return false;
  
  if (typeof roles === 'string') {
    return user.role === roles;
  }
  
  return roles.includes(user.role);
}

/**
 * Middleware that combines authentication and role checking
 */
export function withRoleCheck(handler: (req: AuthenticatedRequest, context?: any) => Promise<NextResponse>, roles: string | string[]) {
  return withAuth(async (req: AuthenticatedRequest, context?: any) => {
    if (!checkRole(req.user, roles)) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }
    return handler(req, context);
  });
}

/**
 * Generate a JWT token for authentication
 */
export async function generateAuthToken(payload: any) {
  const secret = new TextEncoder().encode(JWT_SECRET);
  const token = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);
  
  return token;
}

/**
 * Set the authentication cookie
 */
export function setAuthCookie(token: string) {
  const cookieStore = cookies();
  
  // Get the current environment
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: !isDevelopment, // Only false in development
    sameSite: isDevelopment ? 'lax' : 'strict', // More permissive in development
    maxAge: 24 * 60 * 60, // 24 hours
    path: '/'
  });
}

/**
 * Clear the authentication cookie
 */
export function clearAuthCookie() {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, '', {
    expires: new Date(0),
    path: '/'
  });
}

export function getAuthCookie() {
  const cookieStore = cookies();
  return cookieStore.get(COOKIE_NAME);
}

// Helper to check if running in development mode
export function isDevelopment() {
  return process.env.NODE_ENV === 'development';
}

// Function to generate a secure random string
export function generateRandomString(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const values = new Uint8Array(length);
  crypto.getRandomValues(values);
  for (let i = 0; i < length; i++) {
    result += chars[values[i] % chars.length];
  }
  return result;
} 