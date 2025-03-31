import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';

// Define paths that should be dynamic
const DYNAMIC_ROUTES = [
  '/api/test/check-auth-token',
  '/api/admin/dashboard/stats',
  '/api/auth/me',
  '/api/customers/search',
  '/api/reports/rentals',
  '/api/reports/payments',
  '/api/reports',
  '/api/worker/dashboard/stats'
];

// Define paths that should skip authentication
const PUBLIC_PATHS = [
  '/login',
  '/worker/login',
  '/api/login',
  '/api/worker/login',
  '/_next',
  '/favicon.ico',
  '/images',
  '/fonts'
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Force dynamic behavior for specific API routes
  if (DYNAMIC_ROUTES.some(route => pathname.startsWith(route))) {
    const response = NextResponse.next();
    response.headers.set('x-middleware-cache', 'no-cache');
    return response;
  }

  // Skip authentication for public paths
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Continue with existing authentication logic
  const adminToken = request.cookies.get('adminToken');
  const authToken = request.cookies.get('authToken');

  // Redirect to login if accessing admin routes without admin token
  if (pathname.startsWith('/admin') && !adminToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect to worker login if accessing worker routes without auth token
  if (pathname.startsWith('/worker') && !authToken) {
    return NextResponse.redirect(new URL('/worker/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/|images/|fonts/).*)',
  ],
}; 