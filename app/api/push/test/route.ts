import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../../lib/auth';
import { sendPushToUsers } from '../../../../lib/webpush';

export const dynamic = 'force-dynamic';

// POST → ส่งแจ้งเตือนทดสอบถึงเครื่องของตัวเอง
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const r = await sendPushToUsers([user.id], {
    title: '🔔 ทดสอบแจ้งเตือน FixHub',
    body: 'ถ้าเห็นข้อความนี้ เครื่องนี้จะได้รับแจ้งเตือนงานใหม่แล้ว',
    url: '/dashboard', tag: 'test',
  });
  if (r.sent === 0) return NextResponse.json({ error: 'ส่งไม่สำเร็จ — ลองปิดแล้วเปิดการแจ้งเตือนใหม่', ...r }, { status: 500 });
  return NextResponse.json({ success: true, ...r });
}
