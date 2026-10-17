import { NextRequest } from 'next/server';

/** Cron endpoints are protected by CRON_SECRET (query ?key= or header x-cron-key / Authorization: Bearer). */
export function isCronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const { searchParams } = new URL(req.url);
  const auth = req.headers.get('authorization') || '';
  const candidates = [
    searchParams.get('key') || '',
    req.headers.get('x-cron-key') || '',
    auth.startsWith('Bearer ') ? auth.substring(7) : '',
  ];
  return candidates.some(c => c && c === secret);
}
