import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Public paths that don't require authentication
  const publicPaths = [
    '/login', 
    '/forgot-password',
    '/reset-password',
    '/api/auth/login', 
    '/api/auth/logout',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/test',
    '/api/users',
    '/api/initialize',
    '/api/init-db'
  ];
  
  // Check if the path is public
  if (publicPaths.some(path => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next();
  }

  // Static assets and images
  if (
    pathname.startsWith('/_next/') ||
    pathname.includes('/images/') ||
    pathname.includes('/fonts/') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Check for auth token
  const authToken = request.cookies.get('authToken');
  
  // No token means unauthorized
  if (!authToken) {
    // If API route, return JSON error
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }
    
    // Otherwise redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Verify token
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    const jwtSecret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(authToken.value, jwtSecret);
    
    // Admin routes protection
    if (pathname.startsWith('/admin') && payload.role !== 'admin') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Forbidden - Admin access required' },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    // Worker/staff routes protection
    if (pathname.startsWith('/worker') && payload.role !== 'worker') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Forbidden - Worker access required' },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    return NextResponse.next();
  } catch (error) {
    // Token verification failed
    console.error('Token verification error:', error);
    
    // If API route, return JSON error
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }
    
    // Clear the invalid token cookie
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.set('authToken', '', {
      expires: new Date(0),
      path: '/',
    });
    
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for specific excluded paths
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 