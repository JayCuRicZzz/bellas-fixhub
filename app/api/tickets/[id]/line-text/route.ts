import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../../../lib/db';
import { getUserFromRequest } from '../../../../../lib/auth';
import { ticketAccess } from '../../../../../lib/ticket-access';
import { formatNewTicketLine, assetLineOf } from '../../../../../lib/line-format';
import { STATUS_LABELS } from '../../../../../types';

export const dynamic = 'force-dynamic';

// GET → ข้อความแบบเดียวกับที่ระบบส่งเข้า LINE ตอนแจ้งซ่อม (สำหรับปุ่ม "คัดลอก" ไปวางเอง)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ticketId = Number(params.id);
  const acc = await ticketAccess(user, ticketId);
  if (acc === 'notfound') return NextResponse.json({ error: 'ไม่พบใบงาน' }, { status: 404 });
  if (acc === 'denied') return NextResponse.json({ error: 'ไม่มีสิทธิ์' }, { status: 403 });

  const [t] = await sql`
    select t.ticket_number, t.priority, t.branch_code, t.location_detail, t.description, t.status,
           p.full_name as reporter_name, p.username as reporter_username,
           p.branch_code as reporter_branch, p.department as reporter_dept, p.role as reporter_role,
           a.asset_code, a.name as asset_name, a.warranty_until
    from fixhub.tickets t
    left join fixhub.profiles p on p.user_id = t.reporter_id
    left join fixhub.assets a on a.asset_id = t.asset_id
    where t.ticket_id = ${ticketId}`;
  if (!t) return NextResponse.json({ error: 'ไม่พบใบงาน' }, { status: 404 });

  const text = formatNewTicketLine({
    priority: t.priority,
    ticketNumber: t.ticket_number,
    branchCode: t.branch_code,
    locationDetail: t.location_detail,
    assetLine: t.asset_code ? assetLineOf({ asset_code: t.asset_code, name: t.asset_name, warranty_until: t.warranty_until }) : null,
    description: t.description,
    reporterName: t.reporter_name || t.reporter_username || 'ไม่ระบุ',
    reporter: { branch_code: t.reporter_branch, department: t.reporter_dept, role: t.reporter_role },
    // ใบที่ไม่ได้รอรับงานแล้ว บอกสถานะปัจจุบันด้วย กันคนในกลุ่มเข้าใจผิดว่ายังไม่มีคนรับ
    statusLine: t.status !== 'PENDING' ? `🏷️ สถานะ: ${(STATUS_LABELS as any)[t.status] || t.status}` : null,
  });
  return NextResponse.json({ text });
}
