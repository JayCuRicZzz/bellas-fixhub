import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../../lib/db';
import { getUserFromRequest } from '../../../../lib/auth';
import { getVapidKeys } from '../../../../lib/webpush';

export const dynamic = 'force-dynamic';

// GET → public key (ใช้ตอนสมัครรับแจ้งเตือน) + เครื่องนี้สมัครแล้วหรือยัง (?endpoint=)
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { publicKey } = await getVapidKeys();
  const endpoint = req.nextUrl.searchParams.get('endpoint');
  let subscribed = false;
  if (endpoint) {
    const r = await sql`select 1 from fixhub.push_subscriptions where endpoint = ${endpoint} and user_id = ${user.id}`;
    subscribed = r.length > 0;
  }
  return NextResponse.json({ publicKey, subscribed });
}

// POST { endpoint, keys: { p256dh, auth } } → ผูกเครื่องนี้กับผู้ใช้ที่ล็อกอินอยู่
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const endpoint = String(b?.endpoint || '');
  const p256dh = String(b?.keys?.p256dh || '');
  const auth = String(b?.keys?.auth || '');
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000 || !p256dh || !auth || p256dh.length > 200 || auth.length > 100) {
    return NextResponse.json({ error: 'ข้อมูลการสมัครไม่ถูกต้อง' }, { status: 400 });
  }
  const ua = (req.headers.get('user-agent') || '').slice(0, 200);
  // เครื่องเดิมเปลี่ยนคนล็อกอิน → ย้ายไปเป็นของคนใหม่
  await sql`
    insert into fixhub.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
    values (${user.id}, ${endpoint}, ${p256dh}, ${auth}, ${ua})
    on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
      user_agent = excluded.user_agent, fail_count = 0`;
  return NextResponse.json({ success: true });
}

// DELETE { endpoint } → ปิดแจ้งเตือนเครื่องนี้
export async function DELETE(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  await sql`delete from fixhub.push_subscriptions where endpoint = ${String(b?.endpoint || '')} and user_id = ${user.id}`;
  return NextResponse.json({ success: true });
}
