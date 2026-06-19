import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../../lib/db';
import { getUserFromRequest } from '../../../../../lib/auth';
import bcrypt from 'bcryptjs';

function requireAdmin(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== 'admin') return null;
  return user;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const userId = parseInt(params.id);
    const { username, password, full_name, role, department, branch_codes } = await req.json();

    if (!username || !full_name || !role) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }

    // Check unique username (exclude current user)
    const [existing]: any = await pool.query(
      'SELECT user_id FROM users WHERE username = ? AND user_id != ?',
      [username, userId]
    );
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' },
        { status: 400 }
      );
    }

    // Primary branch from selection
    const primaryBranch = (branch_codes && branch_codes.length > 0) ? branch_codes[0] : null;

    if (password) {
      const hashedPassword = bcrypt.hashSync(password, 10);
      await pool.query(
        `UPDATE users SET username = ?, password = ?, full_name = ?, role = ?, department = ?, branch_code = ?
         WHERE user_id = ?`,
        [username, hashedPassword, full_name, role, department || null, primaryBranch, userId]
      );
    } else {
      await pool.query(
        `UPDATE users SET username = ?, full_name = ?, role = ?, department = ?, branch_code = ?
         WHERE user_id = ?`,
        [username, full_name, role, department || null, primaryBranch, userId]
      );
    }

    // Sync user_branches
    await pool.query('DELETE FROM user_branches WHERE user_id = ?', [userId]);
    if (branch_codes && branch_codes.length > 0) {
      const values = branch_codes.map((bc: string) => [userId, bc]);
      await pool.query(
        `INSERT INTO user_branches (user_id, branch_code) VALUES ?`,
        [values]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'อัปเดตผู้ใช้สำเร็จ',
    });
  } catch (err: any) {
    console.error('[Admin Users] PUT error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: Password reset by admin
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const userId = parseInt(params.id);
    const { action } = await req.json();

    if (action === 'reset_password') {
      const tempPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = bcrypt.hashSync(tempPassword, 10);

      await pool.query(
        'UPDATE users SET password = ?, password_reset_required = 1 WHERE user_id = ?',
        [hashedPassword, userId]
      );

      return NextResponse.json({
        success: true,
        message: 'รีเซ็ตรหัสผ่านสำเร็จ',
        temp_password: tempPassword,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('[Admin Users] PATCH error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const userId = parseInt(params.id);

    // Don't allow admin to delete themselves
    if (userId === admin.user_id || userId === admin.id) {
      return NextResponse.json(
        { error: 'ไม่สามารถลบบัญชีของตัวเองได้' },
        { status: 400 }
      );
    }

    await pool.query('DELETE FROM user_branches WHERE user_id = ?', [userId]);
    await pool.query('DELETE FROM users WHERE user_id = ?', [userId]);

    return NextResponse.json({
      success: true,
      message: 'ลบผู้ใช้สำเร็จ',
    });
  } catch (err: any) {
    console.error('[Admin Users] DELETE error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
