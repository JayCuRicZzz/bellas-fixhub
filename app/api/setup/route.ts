import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../lib/db';
import { createUser } from '../../../lib/users';

export const dynamic = 'force-dynamic';

/**
 * One-time bootstrap: creates the first admin account.
 * POST { setup_key, username?, password?, full_name? }
 * Requires env SETUP_KEY. Refuses if an admin already exists.
 */
export async function POST(req: NextRequest) {
  try {
    const setupKey = process.env.SETUP_KEY;
    if (!setupKey) {
      return NextResponse.json({ error: 'SETUP_KEY is not configured on the server' }, { status: 500 });
    }
    const body = await req.json().catch(() => ({}));
    if (body.setup_key !== setupKey) {
      return NextResponse.json({ error: 'Invalid setup key' }, { status: 403 });
    }

    const admins = await sql`select username from fixhub.profiles where role = 'admin'`;
    if (admins.length > 0) {
      return NextResponse.json({ success: true, message: 'Admin already exists', admins: admins.map((a: any) => a.username) });
    }

    const username = body.username || 'admin';
    const password = body.password;
    if (!password || String(password).length < 8) {
      return NextResponse.json({ error: 'กรุณาส่ง password (อย่างน้อย 8 ตัวอักษร) สำหรับบัญชี admin' }, { status: 400 });
    }

    const branches = (await sql`select branch_code from fixhub.branches order by sort_order`).map((b: any) => b.branch_code);
    const result = await createUser({
      username,
      password,
      full_name: body.full_name || 'ผู้ดูแลระบบ',
      role: 'admin',
      department: 'ADMIN',
      branch_codes: branches,
      password_reset_required: false,
    });

    return NextResponse.json({ success: true, message: `Setup complete — admin "${username}" created`, id: result.id });
  } catch (err: any) {
    console.error('[Setup] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, message: 'POST with setup_key to bootstrap the first admin' });
}
