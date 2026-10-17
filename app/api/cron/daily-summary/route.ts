import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../../lib/db';
import { isCronAuthorized } from '../../../../lib/cron';
import { getLineConfig } from '../../../../lib/line-config';
import { pushLineText } from '../../../../lib/line';

export const dynamic = 'force-dynamic';

async function deptStats(dept: 'MAINT' | 'IT') {
  const [r] = await sql`
    select count(*) filter (where (created_at at time zone 'Asia/Bangkok')::date = fixhub.today_bkk())::int as new_today,
           count(*) filter (where status = 'PENDING')::int as pending,
           count(*) filter (where status in ('ACCEPTED','IN_PROGRESS','PAUSED'))::int as in_progress,
           count(*) filter (where status = 'RESOLVED')::int as awaiting_approval,
           count(*) filter (where status = 'APPROVED' and (approved_at at time zone 'Asia/Bangkok')::date = fixhub.today_bkk())::int as done_today,
           count(*) filter (where status not in ('APPROVED','CANCELLED') and sla_deadline < now())::int as overdue
    from fixhub.tickets where reporter_department = ${dept}`;
  return r;
}

// Daily LINE summary (22:00 Bangkok) — called by Netlify scheduled function
export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const today = new Date().toLocaleDateString('th-TH', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', timeZone: 'Asia/Bangkok',
    });
    const BASE_URL = process.env.URL || process.env.NEXT_PUBLIC_APP_URL || 'https://bellas-fixhub.netlify.app';
    const cfg = await getLineConfig();
    const results = { maintSent: false, itSent: false };

    const groups: { dept: 'MAINT' | 'IT'; label: string; to: string }[] = [
      { dept: 'MAINT', label: 'ช่าง', to: cfg.targetIdMaint },
      { dept: 'IT', label: 'ไอที', to: cfg.targetIdIT },
    ];

    for (const g of groups) {
      const s = await deptStats(g.dept);
      const msg = [
        `[${g.label}]`,
        `📊 สรุปงาน${g.label} — ${today}`,
        ``,
        `📝 แจ้งใหม่วันนี้: ${s.new_today} รายการ`,
        `⏳ รอรับงาน: ${s.pending} | 🔧 กำลังทำ: ${s.in_progress} | 🔍 รอตรวจ: ${s.awaiting_approval}`,
        `✅ เสร็จวันนี้: ${s.done_today}${s.overdue > 0 ? ` | ⚠️ เกิน SLA: ${s.overdue}` : ''}`,
        ``,
        `🔗 ${BASE_URL}/dashboard`,
      ].join('\n');
      if (cfg.accessToken && g.to) {
        const r = await pushLineText(g.to, msg, cfg.accessToken);
        if (g.dept === 'MAINT') results.maintSent = r.ok; else results.itSent = r.ok;
      }
    }

    return NextResponse.json({ success: true, ...results });
  } catch (err: any) {
    console.error('[Cron Summary] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
