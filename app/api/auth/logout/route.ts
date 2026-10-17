import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies, ACCESS_COOKIE } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

/** Revoke the Supabase session server-side (best effort), then clear cookies. */
async function revoke(req: NextRequest) {
  const token = req.cookies.get(ACCESS_COOKIE)?.value;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !key) return;
  await fetch(`${url}/auth/v1/logout?scope=local`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${token}` },
  }).catch(() => {});
}

export async function POST(req: NextRequest) {
  await revoke(req);
  const response = NextResponse.json({ success: true });
  clearAuthCookies(response);
  return response;
}

export async function GET(req: NextRequest) {
  await revoke(req);
  const response = NextResponse.redirect(new URL('/login', req.url), 302);
  clearAuthCookies(response);
  return response;
}
