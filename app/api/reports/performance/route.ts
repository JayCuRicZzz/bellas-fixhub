import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUserFromRequest, getUserBranches } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || !['admin', 'gm'].includes(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = user.user_id as number;
    const userBranches = await getUserBranches(userId, user.role);
    const { searchParams } = new URL(req.url);
    const workType = searchParams.get('work_type') || '';

    let branchClause = '', workJoin = '', workClause = '';
    const params: any[] = [];
    if (userBranches.length > 0) {
      branchClause = `AND t.branch_code IN (${userBranches.map(() => '?').join(',')})`;
      params.push(...userBranches);
    }
    if (workType) {
      workJoin = 'JOIN categories c ON t.category_id = c.category_id';
      workClause = 'AND c.dept_type = ?';
      params.push(workType);
    }

    // Per-technician stats
    const [rows]: any = await pool.query(
      `SELECT 
         COALESCE(tu.full_name, tu.username, 'Unknown') as technician_name,
         tu.user_id as technician_id,
         COUNT(*) as total_work,
         SUM(CASE WHEN t.status = 'APPROVED' THEN 1 ELSE 0 END) as approved_count,
         AVG(t.kpi_rating) as avg_kpi,
         SUM(CASE WHEN t.difficulty = 'easy' THEN 1 ELSE 0 END) as easy_count,
         SUM(CASE WHEN t.difficulty = 'medium' THEN 1 ELSE 0 END) as medium_count,
         SUM(CASE WHEN t.difficulty = 'hard' THEN 1 ELSE 0 END) as hard_count,
         SUM(CASE WHEN t.difficulty = 'very_hard' THEN 1 ELSE 0 END) as very_hard_count,
         AVG(t.sla_minutes) as avg_sla_minutes,
         SUM(CASE WHEN t.sla_minutes IS NOT NULL AND t.resolved_at <= t.sla_deadline THEN 1 ELSE 0 END) as on_time_count,
         SUM(CASE WHEN t.sla_minutes IS NOT NULL AND t.resolved_at > t.sla_deadline THEN 1 ELSE 0 END) as overdue_count
       FROM tickets t ${workJoin}
       LEFT JOIN users tu ON t.resolved_by = tu.user_id
       WHERE t.resolved_by IS NOT NULL ${branchClause} ${workClause}
       GROUP BY tu.user_id, tu.full_name, tu.username
       ORDER BY total_work DESC`,
      params
    );

    return NextResponse.json(rows);
  } catch (err: any) {
    console.error('[Perf Report] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
