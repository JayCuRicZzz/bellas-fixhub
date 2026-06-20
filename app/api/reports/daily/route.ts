import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { getUserFromRequest, getUserBranches } from '../../../../lib/auth';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const userId = user.user_id || user.id;
    const userBranches = await getUserBranches(userId, user.role);
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const department = searchParams.get('department') || '';
    const workType = searchParams.get('work_type') || '';

    let dateCondition: string;
    if (startDate && endDate) {
      dateCondition = `DATE(t.created_at) BETWEEN ? AND ?`;
    } else {
      const period = searchParams.get('period') || 'today';
      if (period === 'week') dateCondition = 'DATE(t.created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
      else if (period === 'month') dateCondition = 'DATE(t.created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
      else dateCondition = 'DATE(t.created_at) = CURDATE()';
    }

    // Auto-filter by department for non-supervisor users
    let autoDept = department;
    const supervisorRoles = ['admin', 'gm', 'sup', 'supit'];
    if (!supervisorRoles.includes(user.role)) {
      const deptByRole: Record<string, string> = {
        'tech': 'MAINT',
        'it': 'IT',
        'front': 'MAINT',
        'house': 'MAINT',
      };
      autoDept = department || user.department || deptByRole[user.role] || '';
    }

    // Build WHERE clauses
    let branchClause = '', deptClause = '', workJoin = '', workClause = '';
    const params: any[] = [];

    if (startDate && endDate) { params.push(startDate); params.push(endDate); }

    if (userBranches.length > 0) {
      branchClause = `AND t.branch_code IN (${userBranches.map(() => '?').join(',')})`;
      params.push(...userBranches);
    }
    if (autoDept && (autoDept === 'MAINT' || autoDept === 'IT')) {
      deptClause = 'AND t.reporter_department = ?';
      params.push(autoDept);
    }
    if (workType) {
      workJoin = 'JOIN categories c ON t.category_id = c.category_id';
      workClause = 'AND c.dept_type = ?';
      params.push(workType);
    }

    const baseWhere = `${dateCondition} ${branchClause} ${deptClause} ${workClause}`;

    // Total
    const [totalResult]: any = await pool.query(
      `SELECT COUNT(*) as cnt FROM tickets t ${workJoin} WHERE ${baseWhere}`, params
    );
    const [completedResult]: any = await pool.query(
      `SELECT COUNT(*) as cnt FROM tickets t ${workJoin} WHERE ${dateCondition} AND t.status='APPROVED' ${branchClause} ${deptClause} ${workClause}`, params
    );
    const [pendingResult]: any = await pool.query(
      `SELECT COUNT(*) as cnt FROM tickets t ${workJoin} WHERE ${dateCondition} AND t.status='PENDING' ${branchClause} ${deptClause} ${workClause}`, params
    );
    const [inProgressResult]: any = await pool.query(
      `SELECT COUNT(*) as cnt FROM tickets t ${workJoin} WHERE ${dateCondition} AND t.status IN ('ACCEPTED','IN_PROGRESS') ${branchClause} ${deptClause} ${workClause}`, params
    );
    const [resolvedResult]: any = await pool.query(
      `SELECT COUNT(*) as cnt FROM tickets t ${workJoin} WHERE ${dateCondition} AND t.status='RESOLVED' ${branchClause} ${deptClause} ${workClause}`, params
    );
    const [byDept]: any = await pool.query(
      `SELECT COALESCE(t.reporter_department,'MAINTENANCE') as name, COUNT(*) as count FROM tickets t ${workJoin} WHERE ${baseWhere} GROUP BY t.reporter_department ORDER BY count DESC`, params
    );
    const [byBranch]: any = await pool.query(
      `SELECT t.branch_code as name, COUNT(*) as count FROM tickets t ${workJoin} WHERE ${baseWhere} GROUP BY t.branch_code ORDER BY count DESC`, params
    );
    const [byStatus]: any = await pool.query(
      `SELECT t.status as name, COUNT(*) as count FROM tickets t ${workJoin} WHERE ${baseWhere} GROUP BY t.status`, params
    );
    const [slaCompliance]: any = await pool.query(
      `SELECT COUNT(*) as total, SUM(CASE WHEN t.status='APPROVED' AND t.resolved_at<=t.sla_deadline THEN 1 ELSE 0 END) as on_time, SUM(CASE WHEN t.status='APPROVED' AND t.resolved_at>t.sla_deadline THEN 1 ELSE 0 END) as overdue FROM tickets t ${workJoin} WHERE ${dateCondition} AND t.sla_deadline IS NOT NULL ${branchClause} ${deptClause} ${workClause}`, params
    );

    return NextResponse.json({
      total: totalResult[0].cnt, pending: pendingResult[0].cnt,
      inProgress: inProgressResult[0].cnt, completed: completedResult[0].cnt,
      resolved: resolvedResult[0].cnt,
      byDepartment: byDept, byBranch, byStatus,
      slaCompliance: slaCompliance[0] || { total: 0, on_time: 0, overdue: 0 },
    });
  } catch (err: any) {
    console.error('[Reports] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
