import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, isBackOffice } from '../../../../../lib/auth';
import sql from '../../../../../lib/db';
import { deleteUser, resetPassword, unblockUser, updateUser, validateRole, validateUsername } from '../../../../../lib/users';

export const dynamic = 'force-dynamic';

async function requireAdmin(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || !isBackOffice(user.role)) return null;  // admin + GM
  return user;
}

/** GM จัดการผู้ใช้ได้ แต่แตะบัญชี admin ไม่ได้ และตั้งใครเป็น admin ไม่ได้ */
async function gmBlocked(actor: { role: string }, targetId: string, newRole?: string) {
  if (actor.role === 'admin') return null;
  if (newRole === 'admin') return NextResponse.json({ error: 'เฉพาะแอดมินเท่านั้นที่ตั้งผู้ใช้เป็น admin ได้' }, { status: 403 });
  const [t] = await sql`select role from fixhub.profiles where user_id = ${targetId}`;
  if (t?.role === 'admin') return NextResponse.json({ error: 'บัญชีแอดมินแก้ไขได้โดยแอดมินเท่านั้น' }, { status: 403 });
  return null;
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
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
    if (password && String(password).length < 6) {
      return NextResponse.json({ error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' }, { status: 400 });
    }
    const blocked = await gmBlocked(admin, params.id, role);
    if (blocked) return blocked;
    if (params.id === admin.id && role !== admin.role) {
      return NextResponse.json({ error: 'ไม่สามารถเปลี่ยนระดับสิทธิ์ของบัญชีตัวเองได้' }, { status: 400 });
    }

    await updateUser(params.id, { username, password, full_name, role, department, branch_codes });
    return NextResponse.json({ success: true, message: 'อัปเดตผู้ใช้สำเร็จ' });
  } catch (err: any) {
    console.error('[Admin Users] PUT error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    const { action } = await req.json();
    const blocked = await gmBlocked(admin, params.id);
    if (blocked) return blocked;
    if (action === 'reset_password') {
      const temp = await resetPassword(params.id);
      return NextResponse.json({ success: true, message: 'รีเซ็ตรหัสผ่านสำเร็จ', temp_password: temp });
    }
    if (action === 'unblock') {
      await unblockUser(params.id);
      return NextResponse.json({ success: true, message: 'คืนสิทธิ์ผู้ใช้แล้ว' });
    }
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('[Admin Users] PATCH error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    if (params.id === admin.id) {
      return NextResponse.json({ error: 'ไม่สามารถลบบัญชีของตัวเองได้' }, { status: 400 });
    }
    const blocked = await gmBlocked(admin, params.id);
    if (blocked) return blocked;
    await deleteUser(params.id);
    return NextResponse.json({ success: true, message: 'ลบผู้ใช้สำเร็จ' });
  } catch (err: any) {
    console.error('[Admin Users] DELETE error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
