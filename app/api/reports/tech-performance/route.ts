import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../../lib/db';
import { getUserFromRequest } from '../../../../lib/auth';
import { buildReportScope } from '../../../../lib/report-filters';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get('period') === 'custom' && !(searchParams.get('start_date') && searchParams.get('end_date'))) {
      searchParams.set('period', 'today');
    }
    const scope = await buildReportScope(user, searchParams);

    // Per technician: tickets they are assigned to (technician_id), scoped by date/branch/department
    const rows = await sql`
      select p.user_id, p.full_name, p.department, p.role,
             count(*) filter (where t.status in ('IN_PROGRESS','RESOLVED','APPROVED','PAUSED'))::int as accepted,
             count(*) filter (where t.status in ('RESOLVED','APPROVED'))::int as completed,
             count(*) filter (where t.status in ('PENDING','ACCEPTED','IN_PROGRESS','PAUSED'))::int as backlog,
             round(avg(t.kpi_rating) filter (where t.kpi_rating > 0)::numeric, 1) as avg_rating,
             round(100.0 * count(*) filter (where t.sla_minutes is not null and t.sla_minutes <= coalesce(sc.sla_minutes, 480))
                   / nullif(count(*) filter (where t.sla_minutes is not null), 0), 0) as sla_percent
      from fixhub.profiles p
      join fixhub.tickets_full t on t.technician_id = p.user_id and ${scope.whereFrag}
      left join fixhub.sla_config sc on sc.priority = t.priority
      where p.role in ('tech','it','sup','supit')
      group by p.user_id, p.full_name, p.department, p.role
      having count(*) > 0
      order by completed desc, accepted desc`;

    return NextResponse.json(rows.map((r: any) => ({
      ...r,
      avg_rating: r.avg_rating === null ? null : Number(r.avg_rating),
      sla_percent: r.sla_percent === null ? null : Number(r.sla_percent),
    })));
  } catch (err: any) {
    console.error('[TechPerformance] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
