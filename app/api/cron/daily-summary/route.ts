import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '../../../../lib/cron';
import { sendDailySummary } from '../../../../lib/daily-summary';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Daily LINE summary (22:00 Bangkok) — called by Vercel Cron (Authorization: Bearer CRON_SECRET)
// One push per department group: [summary image, short text] → counts once per group member.
export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const results = [];
  for (const dept of ['MAINT', 'IT'] as const) {
    try {
      results.push(await sendDailySummary(dept));
    } catch (err: any) {
      console.error(`[Cron Summary] ${dept} failed:`, err.message);
      results.push({ dept, sent: false, error: err.message });
    }
  }
  return NextResponse.json({ success: results.some(r => r.sent), results });
}
