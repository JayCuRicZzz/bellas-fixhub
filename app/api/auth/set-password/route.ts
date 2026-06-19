import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { getUserFromRequest } from '../../../../lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { password, confirmPassword } = await req.json();

    if (!password || password.length < 4) {
      return NextResponse.json({ error: 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร' }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'รหัสผ่านไม่ตรงกัน กรุณาลองใหม่' }, { status: 400 });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const userId = user.user_id || user.id;

    await pool.query(
      'UPDATE users SET password = ?, password_reset_required = 0 WHERE user_id = ?',
      [hashedPassword, userId]
    );

    return NextResponse.json({ success: true, message: 'ตั้งรหัสผ่านสำเร็จ' });
  } catch (err: any) {
    console.error('[SetPassword] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
