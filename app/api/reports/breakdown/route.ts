import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../../lib/db';
import { getUserFromRequest } from '../../../../lib/auth';
import { buildReportScope } from '../../../../lib/report-filters';

export const dynamic = 'force-dynamic';

// ข้อมูลสำหรับ "AI รายงานสรุป" — แยกชัด 2 ก้อน ต่อสาขา ครบทุกสถานะ
//   period  = ใบที่แจ้งเข้ามาในช่วงวันที่เลือก (สถานะปัจจุบัน)
//   carried = งานค้างยกมา: แจ้งก่อนวันเริ่ม และยังไม่ปิด ณ ตอนนี้
// + รายการงานที่พักอยู่ · ใบที่ถูกยกเลิกในช่วงนี้ (พร้อมเหตุผล) · ปิดงานค้างเก่าได้ในช่วงนี้
const BUCKET = sql`case when t.status = 'PENDING' then 'pending'
                        when t.status in ('ACCEPTED','IN_PROGRESS') then 'in_progress'
                        when t.status = 'PAUSED' then 'paused'
                        when t.status = 'RESOLVED' then 'resolved'
                        when t.status = 'APPROVED' then 'approved'
                        when t.status = 'CANCELLED' then 'cancelled' else 'other' end`;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const params = new URL(req.url).searchParams;
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
    let s = params.get('start_date') || today, e = params.get('end_date') || s;
    if (!ISO.test(s) || !ISO.test(e)) return NextResponse.json({ error: 'วันที่ไม่ถูกต้อง' }, { status: 400 });
    if (s > e) [s, e] = [e, s];
    const scope = await buildReportScope(user, params);
    const where = sql`${scope.branchFrag} ${scope.deptFrag} ${scope.workFrag}`;
    const created = sql`(t.created_at at time zone 'Asia/Bangkok')::date`;

    const period = await sql`
      select t.branch_code, ${BUCKET} as b, count(*)::int as n
      from fixhub.tickets_full t
      where ${created} between ${s}::date and ${e}::date ${where}
      group by 1, 2`;
    const carried = await sql`
      select t.branch_code, ${BUCKET} as b, count(*)::int as n,
             max((fixhub.today_bkk() - ${created})::int) as oldest_days
      from fixhub.tickets_full t
      where ${created} < ${s}::date and t.status in ('PENDING','ACCEPTED','IN_PROGRESS','PAUSED','RESOLVED') ${where}
      group by 1, 2`;
    const carriedClosed = await sql`
      select t.branch_code, count(*)::int as n
      from fixhub.tickets_full t
      where ${created} < ${s}::date and t.status = 'APPROVED'
        and (t.approved_at at time zone 'Asia/Bangkok')::date between ${s}::date and ${e}::date ${where}
      group by 1`;
    const overdue = await sql`
      select t.branch_code, count(*)::int as n from fixhub.tickets_full t
      where t.status in ('PENDING','ACCEPTED','IN_PROGRESS','PAUSED') and t.sla_deadline < now() ${where}
      group by 1`;
    const paused = await sql`
      select t.ticket_id, t.ticket_number, t.branch_code, t.location_detail, t.paused_reason,
             (t.paused_expected_end at time zone 'Asia/Bangkok')::date::text as due,
             (select count(*)::int from fixhub.ticket_activity_log l where l.ticket_id = t.ticket_id and l.action = 'PAUSED') as rounds
      from fixhub.tickets_full t where t.status = 'PAUSED' ${where}
      order by t.branch_code, t.paused_expected_end limit 100`;
    const cancelled = await sql`
      select distinct on (t.ticket_id) t.ticket_id, t.ticket_number, t.branch_code, t.location_detail,
             l.reason, l.action_by_name as by_name
      from fixhub.tickets_full t
      join fixhub.ticket_activity_log l on l.ticket_id = t.ticket_id and l.action = 'CANCELLED'
      where t.status = 'CANCELLED'
        and (l.created_at at time zone 'Asia/Bangkok')::date between ${s}::date and ${e}::date ${where}
      order by t.ticket_id, l.created_at desc limit 100`;

    // รวมเป็นแถวต่อสาขา
    const empty = () => ({ total: 0, pending: 0, in_progress: 0, paused: 0, resolved: 0, approved: 0, cancelled: 0 } as Record<string, number>);
    const pivot = (rows: any[]) => {
      const m: Record<string, Record<string, number>> = {};
      for (const r of rows) {
        const row = (m[r.branch_code] ||= empty());
        row[r.b] = (row[r.b] || 0) + r.n; row.total += r.n;
        if (r.oldest_days != null) row.oldest_days = Math.max(row.oldest_days || 0, r.oldest_days);
      }
      return m;
    };
    const p = pivot(period), c = pivot(carried);
    for (const r of carriedClosed as any[]) (c[r.branch_code] ||= empty()).closed_in_period = r.n;
    const od: Record<string, number> = Object.fromEntries((overdue as any[]).map(r => [r.branch_code, r.n]));
    const branches = scope.branches.filter(b => p[b] || c[b] || od[b]);
    const sum = (m: Record<string, Record<string, number>>) => {
      const t = empty();
      for (const row of Object.values(m)) for (const k of Object.keys(row)) t[k] = k === 'oldest_days' ? Math.max(t[k] || 0, row[k]) : (t[k] || 0) + row[k];
      return t;
    };
    return NextResponse.json({
      start_date: s, end_date: e, branch: params.get('branch') || '', work_type: scope.workType,
      branches,
      period: { byBranch: p, total: sum(p) },
      carried: { byBranch: c, total: sum(c) },
      overdue: { byBranch: od, total: Object.values(od).reduce((a, b) => a + b, 0) },
      paused, cancelled,
    });
  } catch (err: any) {
    console.error('[Report breakdown]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
