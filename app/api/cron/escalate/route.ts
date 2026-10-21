import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '../../../../lib/cron';
import { runEscalation, getEscalationConfig, isQuietNow } from '../../../../lib/escalation';
import { pushGmSlaBreached } from '../../../../lib/webpush';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Vercel Cron ทุก 10 นาที — เร่งงานที่ไม่มีคนรับ / ใกล้หรือเกิน SLA
export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    // GM: แจ้งเตือนมือถือเมื่อเกิน SLA — ทำงานแม้ปิดการเตือนใน LINE ไว้
    const cfg = await getEscalationConfig();
    const gm = await pushGmSlaBreached(isQuietNow(cfg)).catch((e: any) => ({ error: e?.message }));
    return NextResponse.json({ success: true, ...(await runEscalation()), gm_push: gm });
  } catch (err: any) {
    console.error('[Cron Escalate]', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
