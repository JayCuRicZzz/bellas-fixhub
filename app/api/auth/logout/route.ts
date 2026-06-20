import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ success: true });
  response.headers.set(
    'Set-Cookie',
    'token=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  );
  return response;
}

export async function GET(req: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', req.url), 302);
  response.headers.set(
    'Set-Cookie',
    'token=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  );
  return response;
}
