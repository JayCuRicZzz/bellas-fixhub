import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { getUserFromRequest } from '../../../../lib/auth';
import bcrypt from 'bcryptjs';

// Ensure only admin can access
function requireAdmin(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return null;
  if (user.role !== 'admin') return null;
  return user;
}

export async function GET(req: NextRequest) {
  const user = requireAdmin(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    // Get all users with their branches
    const [users]: any = await pool.query(
      `SELECT u.user_id as id, u.username, u.full_name, u.role, u.department, u.branch_code
       FROM users u
       ORDER BY u.user_id`
    );

    // Get branch assignments for all users
    const [branches]: any = await pool.query(
      `SELECT ub.user_id, ub.branch_code FROM user_branches ub`
    );

    // Map branches to users
    const branchMap: Record<number, string[]> = {};
    for (const b of branches) {
      if (!branchMap[b.user_id]) branchMap[b.user_id] = [];
      branchMap[b.user_id].push(b.branch_code);
    }

    // Attach branches to each user
    const usersWithBranches = users.map((u: any) => ({
      ...u,
      branches: branchMap[u.id] || [u.branch_code].filter(Boolean),
    }));

    return NextResponse.json(usersWithBranches);
  } catch (err: any) {
    console.error('[Admin Users] GET error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { username, password, full_name, role, department, branch_codes } = await req.json();

    if (!username || !full_name || !role) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }

    // Check unique username
    const [existing]: any = await pool.query(
      'SELECT user_id FROM users WHERE username = ?',
      [username]
    );
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' },
        { status: 400 }
      );
    }

    // Use provided password or random temp
    const tempPassword = password || Math.random().toString(36).slice(-8);
    const hashedPassword = bcrypt.hashSync(tempPassword, 10);

    // Use the first branch_code as the primary
    const primaryBranch = (branch_codes && branch_codes.length > 0) ? branch_codes[0] : null;

    const [result]: any = await pool.query(
      `INSERT INTO users (username, password, full_name, role, department, branch_code, password_reset_required)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [username, hashedPassword, full_name, role, department || null, primaryBranch]
    );

    const userId = result.insertId;

    // Insert user_branches
    if (branch_codes && branch_codes.length > 0) {
      const values = branch_codes.map((bc: string) => [userId, bc]);
      await pool.query(
        `INSERT INTO user_branches (user_id, branch_code) VALUES ?`,
        [values]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'สร้างผู้ใช้สำเร็จ',
      user: { id: userId, username, full_name, role, department, branch_codes },
    });
  } catch (err: any) {
    console.error('[Admin Users] POST error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
