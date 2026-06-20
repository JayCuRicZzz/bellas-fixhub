import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Allow these paths without auth
const publicPaths = ['/login', '/api/auth/login', '/api/auth/logout', '/login/set-password', '/api/auth/set-password', '/api/setup', '/api/categories'];
const staticPrefixes = ['/_next', '/favicon.ico', '/uploads', '/manifest.json', '/icon-', '/logo.jpg', '/logo.png'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (
    publicPaths.some(p => pathname === p || pathname.startsWith(p + '/')) ||
    staticPrefixes.some(p => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  // API routes: check Authorization header OR cookie
  if (pathname.startsWith('/api/')) {
    // Check Authorization header first
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (token && token.length >= 10) {
        return NextResponse.next();
      }
    }
    // Fallback: check cookie
    const cookieToken = request.cookies.get('token')?.value;
    console.log(`[MW] ${pathname} - Auth header: ${authHeader?.substring(0,20) || 'none'} - Cookie token: ${cookieToken ? cookieToken.substring(0,20)+'...' : 'none'}`);
    if (cookieToken && cookieToken.length >= 10) {
      return NextResponse.next();
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Page routes: check cookie exists (skip API - already handled)
  const token = request.cookies.get('token')?.value;
  if (!token || token.length < 10) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|uploads/).*)',
  ],
};
