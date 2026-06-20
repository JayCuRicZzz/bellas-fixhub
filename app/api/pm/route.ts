import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';
import { getUserFromRequest } from '../../../lib/auth';
import { calcNextRun, processDuePmTickets } from '../../../lib/pm';

// GET: list all PM schedules
export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const branch = searchParams.get('branch');
    const check = searchParams.get('check'); // trigger due check

    // Trigger auto-check for due PMs
    if (check === '1') {
      const created = await processDuePmTickets();
      if (created > 0) {
        console.log(`[PM] Auto-check created ${created} tickets`);
      }
      return NextResponse.json({ checked: true, tickets_created: created });
    }

    let query = `SELECT ps.*, c.main_th as category_name, c.sub_th as category_sub, c.dept_type,
                        u.full_name as created_by_name
                 FROM pm_schedules ps
                 JOIN categories c ON ps.category_id = c.category_id
                 LEFT JOIN users u ON ps.created_by = u.user_id
                 WHERE ps.active = 1`;
    const params: any[] = [];

    if (branch) {
      query += ' AND ps.branch_code = ?';
      params.push(branch);
    }

    query += ' ORDER BY ps.next_run ASC';

    const [rows]: any = await pool.query(query, params);
    return NextResponse.json(rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: create PM schedule (admin only)
export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  try {
    const { branch_code, title, description, department, category_id, frequency_value, frequency_unit } = await req.json();

    if (!branch_code || !title || !category_id || !frequency_value || !frequency_unit) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
    }

    const nextRun = calcNextRun(frequency_value, frequency_unit);

    const [result]: any = await pool.query(
      `INSERT INTO pm_schedules (branch_code, title, description, department, category_id, frequency_value, frequency_unit, next_run, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [branch_code, title, description || '', department || 'MAINT', category_id, frequency_value, frequency_unit, nextRun, user.user_id || user.id]
    );

    return NextResponse.json({ success: true, id: result.insertId, next_run: nextRun });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
