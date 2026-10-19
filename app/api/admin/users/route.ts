import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, isBackOffice } from '../../../../lib/auth';
import { createUser, listUsers, validateRole, validateUsername } from '../../../../lib/users';

export const dynamic = 'force-dynamic';

async function requireAdmin(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || !isBackOffice(user.role)) return null;  // admin + GM
  return user;
}

export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  try {
    return NextResponse.json(await listUsers());
  } catch (err: any) {
    console.error('[Admin Users] GET error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    const { username, password, full_name, role, department, branch_codes } = await req.json();
    if (!username || !full_name || !role) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
    }
    const uErr = validateUsername(username);
    if (uErr) return NextResponse.json({ error: uErr }, { status: 400 });
    if (!validateRole(role)) return NextResponse.json({ error: 'role ไม่ถูกต้อง' }, { status: 400 });
    if (role === 'admin' && admin.role !== 'admin') return NextResponse.json({ error: 'เฉพาะแอดมินเท่านั้นที่ตั้งผู้ใช้เป็น admin ได้' }, { status: 403 });
    if (password && String(password).length < 6) {
      return NextResponse.json({ error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' }, { status: 400 });
    }

    const result = await createUser({ username, password, full_name, role, department, branch_codes });
    return NextResponse.json({
      success: true,
      message: 'สร้างผู้ใช้สำเร็จ',
      temp_password: result.temp_password,
      user: { id: result.id, username, full_name, role, department, branch_codes },
    });
  } catch (err: any) {
    console.error('[Admin Users] POST error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
