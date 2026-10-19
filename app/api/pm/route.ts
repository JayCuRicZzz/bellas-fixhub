import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../lib/db';
import { getUserFromRequest, getUserBranches, isBackOffice } from '../../../lib/auth';
import { calcNextRun, processDuePmTickets, FREQ_UNITS } from '../../../lib/pm';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const branch = searchParams.get('branch') || '';
    const includeInactive = searchParams.get('all') === '1' && isBackOffice(user.role);

    if (searchParams.get('check') === '1') {
      if (!['admin', 'gm', 'sup', 'supit'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      const created = await processDuePmTickets();
      return NextResponse.json({ checked: true, tickets_created: created });
    }

    const branches = await getUserBranches(user.id, user.role);
    const rows = await sql`
      select ps.*, c.main_th as category_name, c.sub_th as category_sub, c.dept_type,
             p.full_name as created_by_name
      from fixhub.pm_schedules ps
      join fixhub.categories c on c.category_id = ps.category_id
      left join fixhub.profiles p on p.user_id = ps.created_by
      where ${includeInactive ? sql`true` : sql`ps.active`}
        ${branches.length ? sql`and ps.branch_code = any(${branches})` : sql`and false`}
        ${branch ? sql`and ps.branch_code = ${branch}` : sql``}
      order by ps.next_run asc`;
    return NextResponse.json(rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || !isBackOffice(user.role)) return NextResponse.json({ error: 'เฉพาะแอดมิน/GM' }, { status: 403 });

  try {
    const { branch_code, title, description, category_id, frequency_value, frequency_unit, first_run } = await req.json();
    const freqVal = parseInt(frequency_value, 10);
    if (!branch_code || !title || !category_id || !freqVal || !FREQ_UNITS.includes(frequency_unit)) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
    }
    const cat = await sql`select dept_type from fixhub.categories where category_id = ${Number(category_id)}`;
    if (cat.length === 0) return NextResponse.json({ error: 'หมวดงานไม่ถูกต้อง' }, { status: 400 });
    const department = cat[0].dept_type === 'IT' ? 'IT' : 'MAINT';
    const nextRun = first_run ? new Date(first_run) : calcNextRun(freqVal, frequency_unit);

    const [row] = await sql`
      insert into fixhub.pm_schedules (branch_code, title, description, department, category_id, frequency_value, frequency_unit, next_run, created_by)
      values (${branch_code}, ${title}, ${description || ''}, ${department}, ${Number(category_id)}, ${freqVal}, ${frequency_unit}, ${nextRun}, ${user.id})
      returning id`;
    return NextResponse.json({ success: true, id: row.id, next_run: nextRun });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
