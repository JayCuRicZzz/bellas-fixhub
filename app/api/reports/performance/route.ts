import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../../lib/db';
import { getUserFromRequest } from '../../../../lib/auth';
import { buildReportScope } from '../../../../lib/report-filters';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || !['admin', 'gm', 'sup', 'supit'].includes(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    if (!searchParams.get('period') && !searchParams.get('start_date')) searchParams.set('period', 'all');
    const scope = await buildReportScope(user, searchParams);

    const rows = await sql`
      select coalesce(p.full_name, p.username, 'Unknown') as technician_name,
             p.user_id as technician_id,
             p.department,
             count(*)::int as total_work,
             count(*) filter (where t.status = 'APPROVED')::int as approved_count,
             round(avg(t.kpi_rating)::numeric, 2) as avg_kpi,
             count(*) filter (where t.difficulty = 'easy')::int as easy_count,
             count(*) filter (where t.difficulty = 'medium')::int as medium_count,
             count(*) filter (where t.difficulty = 'hard')::int as hard_count,
             count(*) filter (where t.difficulty = 'very_hard')::int as very_hard_count,
             round(avg(t.sla_minutes)::numeric, 0) as avg_sla_minutes,
             count(*) filter (where t.sla_minutes is not null and t.resolved_at <= t.sla_deadline)::int as on_time_count,
             count(*) filter (where t.sla_minutes is not null and t.resolved_at >  t.sla_deadline)::int as overdue_count
      from fixhub.tickets_full t
      left join fixhub.profiles p on p.user_id = t.resolved_by
      where t.resolved_by is not null and ${scope.whereFrag}
      group by p.user_id, p.full_name, p.username, p.department
      order by total_work desc`;

    return NextResponse.json(rows.map((r: any) => ({
      ...r,
      avg_kpi: r.avg_kpi === null ? null : Number(r.avg_kpi),
      avg_sla_minutes: r.avg_sla_minutes === null ? null : Number(r.avg_sla_minutes),
    })));
  } catch (err: any) {
    console.error('[Perf Report] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
