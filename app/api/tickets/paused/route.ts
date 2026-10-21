import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../../lib/db';
import { getUserFromRequest, getUserBranches, getWorkDeptScope } from '../../../../lib/auth';
import { pauseCounts } from '../../../../lib/pause';

export const dynamic = 'force-dynamic';

// งานที่พักอยู่ในสาขาที่ผู้ใช้มีสิทธิ์ (ช่างเห็นงานช่าง ไอทีเห็นงานไอที — กติกาเดียวกับรายการใบงาน)
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const branches = await getUserBranches(user.id, user.role);
    const scope = getWorkDeptScope(user);
    const branch = new URL(req.url).searchParams.get('branch') || '';
    const rows = await sql`
      select t.ticket_id, t.ticket_number, t.branch_code, t.location_detail, t.room_no, t.description, t.priority,
             t.paused_reason, t.paused_at, t.paused_expected_end, t.technician_name, t.reporter_name, t.dept_type,
             t.main_th, t.created_at,
             ((t.paused_expected_end at time zone 'Asia/Bangkok')::date - fixhub.today_bkk())::int as days_left
      from fixhub.tickets_full t
      where t.status = 'PAUSED'
        ${branches.length ? sql`and t.branch_code = any(${branches})` : sql`and false`}
        ${branch && branches.includes(branch) ? sql`and t.branch_code = ${branch}` : sql``}
        ${scope ? sql`and (t.reporter_id = ${user.id} or t.reporter_department = ${scope})` : sql``}
      order by t.paused_expected_end nulls last, t.paused_at`;
    const counts = await pauseCounts(rows.map((r: any) => r.ticket_id));
    return NextResponse.json({ items: rows.map((r: any) => ({ ...r, pause_round: counts[r.ticket_id] || 1 })) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
