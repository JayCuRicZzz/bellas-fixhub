import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { getUserFromRequest, getUserBranches } from '../../../../lib/auth';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'today';
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const deptFilter = searchParams.get('department');
    const workTypeFilter = searchParams.get('work_type');

    let dateFilter = '';
    const params: any[] = [];

    if (period === 'custom' && startDate && endDate) {
      dateFilter = 'AND DATE(t.created_at) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    } else if (period === 'week') {
      dateFilter = 'AND t.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
    } else if (period === 'month') {
      dateFilter = 'AND t.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
    } else {
      // today
      dateFilter = 'AND DATE(t.created_at) = CURDATE()';
    }

    // Department / branch scope
    const userId = user.user_id || user.id;
    const userBranches = await getUserBranches(userId, user.role);
    const isGod = ['admin', 'gm'].includes(user.role);

    let scopeFilter = '';
    if (!isGod) {
      const branchList = userBranches.map((b: string) => `'${b}'`).join(',');
      const userDept = user.department || (['tech','sup','front','house'].includes(user.role) ? 'MAINT' : ['it','supit'].includes(user.role) ? 'IT' : null);
      scopeFilter = `AND (t.branch_code IN (${branchList}) AND t.reporter_department = '${userDept}')`;
    }
    if (deptFilter) scopeFilter += ` AND t.reporter_department = '${deptFilter}'`;
    if (workTypeFilter) scopeFilter += ` AND c.dept_type = '${workTypeFilter}'`;

    const query = `
      SELECT
        tu.user_id,
        tu.full_name,
        tu.department,
        COUNT(CASE WHEN t.technician_id IS NOT NULL AND (t.status IN ('IN_PROGRESS','RESOLVED','APPROVED','PAUSED')) THEN 1 END) as accepted,
        COUNT(CASE WHEN t.status IN ('RESOLVED','APPROVED') THEN 1 END) as completed,
        COUNT(CASE WHEN t.status IN ('PENDING','ACCEPTED','IN_PROGRESS','PAUSED') AND t.technician_id = tu.user_id THEN 1 END) as backlog,
        ROUND(AVG(CASE WHEN t.kpi_rating > 0 THEN t.kpi_rating END), 1) as avg_rating,
        ROUND(100 * SUM(CASE WHEN t.sla_minutes IS NOT NULL AND t.sla_minutes <= COALESCE(sc.sla_minutes, 480) THEN 1 ELSE 0 END) / NULLIF(SUM(CASE WHEN t.sla_minutes IS NOT NULL THEN 1 ELSE 0 END), 0), 0) as sla_percent
      FROM users tu
      LEFT JOIN tickets t ON t.technician_id = tu.user_id ${dateFilter}
      LEFT JOIN categories c ON t.category_id = c.category_id
      LEFT JOIN sla_config sc ON t.priority = sc.priority
      WHERE tu.role IN ('tech', 'it')
      ${scopeFilter}
      GROUP BY tu.user_id, tu.full_name, tu.department
      HAVING accepted > 0 OR completed > 0
      ORDER BY completed DESC, accepted DESC
    `;

    const [rows]: any = await pool.query(query, params);
    return NextResponse.json(rows);
  } catch (err: any) {
    console.error('[TechPerformance] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
