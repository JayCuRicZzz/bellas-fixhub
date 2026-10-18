import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../../../lib/db';
import { getUserFromRequest } from '../../../../../lib/auth';
import { ticketAccess } from '../../../../../lib/ticket-access';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ticketId = parseInt(params.id, 10);
  if (!ticketId) return NextResponse.json([]);

  try {
    const acc = await ticketAccess(user, ticketId);
    if (acc === 'notfound') return NextResponse.json([], { status: 404 });
    if (acc === 'denied') return NextResponse.json({ error: 'ไม่มีสิทธิ์ดูใบงานนี้' }, { status: 403 });
    const rows = await sql`
      select al.*, p.full_name as action_by_name_display
      from fixhub.ticket_activity_log al
      left join fixhub.profiles p on p.user_id = al.action_by
      where al.ticket_id = ${ticketId}
      order by al.created_at desc, al.id desc`;
    return NextResponse.json(rows.map((r: any) => ({
      ...r,
      actionByName: r.action_by_name_display || r.action_by_name || 'ระบบ',
    })));
  } catch (err: any) {
    console.error('[ActivityLog] Error:', err.message);
    return NextResponse.json([]);
  }
}
