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
    const scope = await buildReportScope(user, searchParams);

    const [summary] = await sql`
      select count(*)::int as total,
             count(*) filter (where t.status = 'PENDING')::int as pending,
             count(*) filter (where t.status in ('ACCEPTED','IN_PROGRESS','PAUSED'))::int as in_progress,
             count(*) filter (where t.status = 'RESOLVED')::int as resolved,
             count(*) filter (where t.status = 'APPROVED')::int as completed,
             count(*) filter (where t.status = 'CANCELLED')::int as cancelled,
             count(*) filter (where t.status = 'APPROVED' and t.sla_deadline is not null)::int as sla_total,
             count(*) filter (where t.status = 'APPROVED' and t.resolved_at <= t.sla_deadline)::int as sla_on_time,
             count(*) filter (where t.status = 'APPROVED' and t.resolved_at >  t.sla_deadline)::int as sla_overdue,
             count(*) filter (where t.status not in ('APPROVED','CANCELLED') and t.sla_deadline < now())::int as overdue_open
      from fixhub.tickets_full t
      where ${scope.whereFrag}`;

    const byDept = await sql`
      select case coalesce(t.reporter_department,'MAINT') when 'MAINT' then 'MAINTENANCE' else t.reporter_department end as name,
             count(*)::int as count
      from fixhub.tickets_full t where ${scope.whereFrag}
      group by 1 order by count desc`;

    const byBranch = await sql`
      select t.branch_code as name, count(*)::int as count
      from fixhub.tickets_full t where ${scope.whereFrag}
      group by 1 order by count desc`;

    const byStatus = await sql`
      select t.status as name, count(*)::int as count
      from fixhub.tickets_full t where ${scope.whereFrag}
      group by 1 order by count desc`;

    const byCategory = await sql`
      select t.main_th as name, t.dept_type, count(*)::int as count
      from fixhub.tickets_full t where ${scope.whereFrag}
      group by 1, 2 order by count desc limit 10`;

    const pendingDetails = await sql`
      select t.ticket_id, t.ticket_number, t.branch_code, t.location_detail, t.description, t.priority,
             t.status, t.created_at, t.sla_deadline, t.sla_overdue, t.technician_name, t.main_th
      from fixhub.tickets_full t
      where ${scope.whereFrag} and t.status in ('PENDING','ACCEPTED','IN_PROGRESS','PAUSED')
      order by t.sla_deadline asc nulls last limit 50`;

    return NextResponse.json({
      total: summary.total,
      pending: summary.pending,
      inProgress: summary.in_progress,
      resolved: summary.resolved,
      completed: summary.completed,
      cancelled: summary.cancelled,
      success: summary.completed,
      overdueOpen: summary.overdue_open,
      byDepartment: byDept,
      byBranch,
      byStatus,
      byCategory,
      slaCompliance: { total: summary.sla_total, on_time: summary.sla_on_time, overdue: summary.sla_overdue },
      pending_details: pendingDetails,
    });
  } catch (err: any) {
    console.error('[Reports] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
