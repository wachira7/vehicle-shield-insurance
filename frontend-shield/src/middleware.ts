import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check for either the HTTP-only auth token or client-side status
  const authToken = request.cookies.get('auth-token');
  const authStatus = request.cookies.get('auth-status');
  
  // Debug log to see what cookies are available (check server console)
  console.log('Cookies in middleware:', {
    'auth-token': authToken?.value, 
    'auth-status': authStatus?.value,
    'url': request.nextUrl.pathname
  });
  
  const protectedPaths = [
    '/dashboard',
    '/dashboard/vehicles',
    '/dashboard/policies', 
    '/dashboard/claims',
    '/dashboard/profile',
    '/dashboard/settings'
  ];
  
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname === path || 
    request.nextUrl.pathname.startsWith(`${path}/`)
  );

  // Check if we're coming from the auth page to prevent redirect loops
  const referer = request.headers.get('referer') || '';
  const isFromAuthPage = referer.includes('/auth');
  
  // Don't redirect if we have valid auth or we just came from auth page
  if (isProtectedPath && !authToken && !authStatus && !isFromAuthPage) {
    console.log('Redirecting to auth page - no valid auth cookie found');
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};