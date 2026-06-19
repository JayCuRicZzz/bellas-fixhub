import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { signToken } from '../../../../lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    // Handle both JSON and form-data
    let username, password;
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      const body = await req.json();
      username = body.username;
      password = body.password;
    } else {
      const formData = await req.formData();
      username = formData.get('username')?.toString() || '';
      password = formData.get('password')?.toString() || '';
    }

    console.log(`[LOGIN] Attempt: "${username}"`);

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' },
        { status: 400 }
      );
    }

    const [rows]: any = await pool.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (rows.length === 0) {
      if (contentType.includes('application/json')) {
        return NextResponse.json(
          { success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
          { status: 401 }
        );
      }
      return NextResponse.redirect(new URL('/login?error=invalid', req.url), 302);
    }

    const user = rows[0];
    
    let passwordMatch = false;
    if (user.password && user.password.startsWith('$2')) {
      passwordMatch = bcrypt.compareSync(password, user.password);
    } else {
      passwordMatch = user.password === password;
    }

    if (!passwordMatch) {
      if (contentType.includes('application/json')) {
        return NextResponse.json(
          { success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
          { status: 401 }
        );
      }
      return NextResponse.redirect(new URL('/login?error=invalid', req.url), 302);
    }

    const token = signToken({
      id: user.user_id,
      user_id: user.user_id,
      username: user.username,
      full_name: user.full_name || user.username,
      role: user.role,
      branch_code: user.branch_code || 'BV',
      department: user.department || null,
    });

    // For form submissions, redirect to dashboard with cookie
    const isJson = contentType.includes('application/json');
    
    if (isJson) {
      // Fetch user branches
      const [branches]: any = await pool.query(
        'SELECT branch_code FROM user_branches WHERE user_id = ?',
        [user.user_id]
      );
      const userBranches = branches.length > 0 
        ? branches.map((b: any) => b.branch_code)
        : [user.branch_code || 'BV'].filter(Boolean);

      const response = NextResponse.json({
        success: true,
        token,
        password_reset_required: !!user.password_reset_required,
        user: {
          id: user.user_id,
          user_id: user.user_id,
          username: user.username,
          full_name: user.full_name || user.username,
          role: user.role,
          branch_code: user.branch_code || 'BV',
          department: user.department || null,
          branches: userBranches,
        },
      });
      response.headers.set(
        'Set-Cookie',
        `token=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`
      );
      return response;
    } else {
      // HTML form submission - redirect
      const redirectUrl = user.password_reset_required 
        ? new URL('/login/set-password', req.url)
        : new URL('/dashboard', req.url);
      const response = NextResponse.redirect(redirectUrl, 302);
      response.headers.set(
        'Set-Cookie',
        `token=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`
      );
      return response;
    }
  } catch (err: any) {
    console.error('[Login] Error:', err.message);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' },
      { status: 500 }
    );
  }
}
