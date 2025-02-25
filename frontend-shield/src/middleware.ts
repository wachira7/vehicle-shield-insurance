//src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get('auth');
  
  // Updated to reflect new dashboard/* route structure
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

  if (isProtectedPath && !authCookie) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Simplified matcher since all protected routes are under /dashboard now
  matcher: ['/dashboard/:path*'],
};