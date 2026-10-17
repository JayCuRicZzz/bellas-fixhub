import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// NOTE: runs on the Edge runtime — must not import lib/db (postgres) or lib/auth.
const ACCESS_COOKIE = 'fx_token';
const REFRESH_COOKIE = 'fx_refresh';
const REFRESH_WHEN_LEFT_SEC = 10 * 60; // refresh when < 10 minutes of JWT life left

const publicPaths = [
  '/login', '/login/set-password',
  '/api/auth/login', '/api/auth/logout', '/api/auth/set-password',
  '/api/setup', '/api/cron/pm-check', '/api/cron/daily-summary', '/api/health',
];
const staticPrefixes = ['/_next', '/favicon.ico', '/uploads', '/manifest.json', '/icon-', '/logo.jpg', '/logo.png'];

function decodeExp(token: string): number {
  try {
    const part = token.split('.')[1];
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json).exp || 0;
  } catch {
    return 0;
  }
}

async function refreshSession(refreshToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) return null;
  return data.session;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    publicPaths.some(p => pathname === p || pathname.startsWith(p + '/')) ||
    staticPrefixes.some(p => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  const isApi = pathname.startsWith('/api/');
  let accessToken = request.cookies.get(ACCESS_COOKIE)?.value || '';
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value || '';
  let refreshed: { access_token: string; refresh_token: string } | null = null;

  // Refresh the Supabase session when the access token is about to expire
  if (refreshToken) {
    const exp = accessToken ? decodeExp(accessToken) : 0;
    const now = Math.floor(Date.now() / 1000);
    if (!accessToken || exp - now < REFRESH_WHEN_LEFT_SEC) {
      const session = await refreshSession(refreshToken);
      if (session) {
        refreshed = { access_token: session.access_token, refresh_token: session.refresh_token };
        accessToken = session.access_token;
      } else if (exp && exp < now) {
        accessToken = ''; // expired and could not refresh
      }
    }
  }

  const hasBearer = (request.headers.get('authorization') || '').startsWith('Bearer ');

  if (!accessToken && !(isApi && hasBearer)) {
    if (isApi) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const res = NextResponse.redirect(loginUrl);
    for (const c of [ACCESS_COOKIE, REFRESH_COOKIE, 'token']) res.cookies.set(c, '', { path: '/', maxAge: 0 });
    return res;
  }

  // Forward the (possibly refreshed) token to route handlers via the cookie header
  const requestHeaders = new Headers(request.headers);
  if (refreshed) {
    const cookieHeader = requestHeaders.get('cookie') || '';
    const rewritten = cookieHeader
      .split(';').map(s => s.trim()).filter(s => s && !s.startsWith(`${ACCESS_COOKIE}=`) && !s.startsWith(`${REFRESH_COOKIE}=`))
      .concat([`${ACCESS_COOKIE}=${refreshed.access_token}`, `${REFRESH_COOKIE}=${refreshed.refresh_token}`])
      .join('; ');
    requestHeaders.set('cookie', rewritten);
  }

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  if (refreshed) {
    const secure = process.env.NODE_ENV === 'production';
    const opts = { httpOnly: true, sameSite: 'lax' as const, path: '/', secure, maxAge: 60 * 60 * 24 * 30 };
    res.cookies.set(ACCESS_COOKIE, refreshed.access_token, opts);
    res.cookies.set(REFRESH_COOKIE, refreshed.refresh_token, opts);
  }
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|uploads/).*)'],
};
