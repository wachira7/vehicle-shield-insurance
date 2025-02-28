//src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check for the auth cookies
  const authToken = request.cookies.get('auth-token');
  const authStatus = request.cookies.get('auth-status');
  
  // Log the cookies to help with debugging
  console.log('Middleware check:', {
    path: request.nextUrl.pathname,
    authToken: authToken ? 'present' : 'missing',
    authStatus: authStatus ? 'present' : 'missing',
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

  // Only redirect if this is a protected path and no auth cookies exist
  if (isProtectedPath && !authToken && !authStatus) {
    console.log('Redirecting unauthenticated user to auth page');
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};