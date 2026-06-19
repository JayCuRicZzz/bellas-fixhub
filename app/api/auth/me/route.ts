import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../../lib/auth';
import pool from '../../../../lib/db';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = user.user_id || user.id;

    const [rows]: any = await pool.query(
      'SELECT user_id as id, username, full_name, role, branch_code, department FROM users WHERE user_id = ?',
      [userId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user branches
    const [branches]: any = await pool.query(
      'SELECT branch_code FROM user_branches WHERE user_id = ?',
      [userId]
    );

    const userData = {
      ...rows[0],
      branches: branches.map((b: any) => b.branch_code),
    };

    return NextResponse.json({ user: userData });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
