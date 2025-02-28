import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check for either the HTTP-only auth token or client-side status
  const authToken = request.cookies.get('auth-token');
  const authStatus = request.cookies.get('auth-status');
  
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

  if (isProtectedPath && !authToken && !authStatus) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};