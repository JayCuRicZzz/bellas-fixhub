import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../../lib/db';
import { getUserFromRequest, invalidateUserCache } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { password, confirmPassword } = await req.json();

    if (!password || String(password).length < 6) {
      return NextResponse.json({ error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'รหัสผ่านไม่ตรงกัน กรุณาลองใหม่' }, { status: 400 });
    }

    const admin = supabaseAdmin();
    const { error } = await admin.auth.admin.updateUserById(user.id, { password });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await sql`update fixhub.profiles set password_reset_required = false where user_id = ${user.id}`;
    invalidateUserCache(user.id);

    return NextResponse.json({ success: true, message: 'ตั้งรหัสผ่านสำเร็จ' });
  } catch (err: any) {
    console.error('[SetPassword] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
