import { NextResponse } from 'next/server';
import sql from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, any> = {
    supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    service_role: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    database_url: !!process.env.DATABASE_URL,
    cron_secret: !!process.env.CRON_SECRET,
    line: !!process.env.LINE_ACCESS_TOKEN,
    ai: !!process.env.AI_API_KEY,
  };
  try {
    const [r] = await sql`select count(*)::int as n from fixhub.branches`;
    checks.db = `ok (${r.n} branches)`;
  } catch (e: any) {
    checks.db = 'error'; console.error('[health] db:', e.message);
  }
  const ok = checks.supabase_url && checks.anon_key && checks.service_role && checks.database_url && String(checks.db).startsWith('ok');
  return NextResponse.json({ ok, checks }, { status: ok ? 200 : 503 });
}
