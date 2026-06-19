import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const deptType = searchParams.get('dept_type') || '';

    let query = 'SELECT * FROM categories';
    const params: string[] = [];

    if (deptType) {
      // Map Thai names to DB values
      const dbDept = deptType === 'ช่าง' ? 'MAINTENANCE' : deptType === 'ไอที' ? 'IT' : deptType;
      query += ' WHERE dept_type = ?';
      params.push(dbDept);
    }

    query += ' ORDER BY category_id';

    const [rows]: any = await pool.query(query, params);
    return NextResponse.json(rows);
  } catch (err: any) {
    console.error('[Categories] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
