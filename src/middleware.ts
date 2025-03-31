import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';

// Force dynamic for middleware
export const dynamic = 'force-dynamic';

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const secret = new TextEncoder().encode(JWT_SECRET);

interface JWTPayload {
  id: string | number;
  email: string;
  role: string;
  permissions: string[];
  iat?: number;
  exp?: number;
}

// Routes that require authentication
const protectedRoutes = [
  '/admin',
  '/worker',
  '/api/admin',
  '/api/worker',
  '/api/bookings',
  '/api/vehicles',
  '/api/customers',
  '/api/reports',
  '/api/settings'
];

// Routes that are always public
const publicRoutes = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/_next',
  '/favicon.ico',
  '/public'
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check if it's a protected route
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Get token from cookies
  const token = request.cookies.get('token')?.value;

  if (!token) {
    // If accessing API route, return 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // For other routes, redirect to login
    const url = new URL('/login', request.url);
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  try {
    // Verify token using jose
    const { payload } = await jose.jwtVerify(token, secret) as { payload: JWTPayload };

    // Check role-based access
    if (pathname.startsWith('/admin') && payload.role !== 'admin') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    if (pathname.startsWith('/worker') && !['admin', 'worker'].includes(payload.role)) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    // Add user info to headers for API routes
    if (pathname.startsWith('/api/')) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', payload.id.toString());
      requestHeaders.set('x-user-role', payload.role);
      requestHeaders.set('x-user-permissions', JSON.stringify(payload.permissions));

      return NextResponse.next({
        headers: requestHeaders,
      });
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Token verification failed:', error);
    
    // Clear invalid token
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('token');
    
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /_next (Next.js internals)
     * 2. /favicon.ico, /sitemap.xml (static files)
     * 3. /public (public assets)
     * 4. .*\\..*$ (files with extensions, e.g. images)
     */
    '/((?!_next|favicon.ico|sitemap.xml|public|.*\\..*$).*)',
    '/api/:path*'
  ],
}; 