import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '../../../../lib/cron';
import { runEscalation } from '../../../../lib/escalation';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Vercel Cron ทุก 10 นาที — เร่งงานที่ไม่มีคนรับ / ใกล้หรือเกิน SLA
export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    return NextResponse.json({ success: true, ...(await runEscalation()) });
  } catch (err: any) {
    console.error('[Cron Escalate]', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
