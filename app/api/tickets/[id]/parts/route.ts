import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../../../lib/db';
import { getUserFromRequest, canManageTicket } from '../../../../../lib/auth';
import { ticketAccess } from '../../../../../lib/ticket-access';

export const dynamic = 'force-dynamic';

async function guard(req: NextRequest, id: string) {
  const user = await getUserFromRequest(req);
  if (!user) return { err: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const ticketId = Number(id);
  const acc = await ticketAccess(user, ticketId);
  if (acc === 'notfound') return { err: NextResponse.json({ error: 'ไม่พบใบงาน' }, { status: 404 }) };
  if (acc === 'denied') return { err: NextResponse.json({ error: 'ไม่มีสิทธิ์' }, { status: 403 }) };
  return { user, ticketId, ticket: acc };
}

// GET → อะไหล่ที่ใช้ในใบงาน (ยอดสุทธิต่อรายการ)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const g = await guard(req, params.id);
  if (g.err) return g.err;
  const rows = await sql`
    select m.move_id, m.part_id, p.part_code, p.name, p.unit, m.qty, m.unit_cost, m.kind, m.moved_at, m.note,
           pr.full_name as moved_by_name, m.moved_by
    from fixhub.part_moves m join fixhub.parts p on p.part_id = m.part_id
    left join fixhub.profiles pr on pr.user_id = m.moved_by
    where m.ticket_id = ${g.ticketId} order by m.moved_at`;
  return NextResponse.json(rows);
}

// POST { part_id, qty } — ช่าง/ไอทีบันทึกอะไหล่ที่ใช้ (ตัดสต็อกสาขาของใบงาน) · ใช้ได้ระหว่างทำงานจนถึงก่อนอนุมัติ
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const g = await guard(req, params.id);
  if (g.err) return g.err;
  const { user, ticketId, ticket } = g as any;
  if (!canManageTicket(user.role) || user.role === 'gm') return NextResponse.json({ error: 'เฉพาะช่าง/ไอทีเท่านั้น' }, { status: 403 });
  if (!['IN_PROGRESS', 'PAUSED', 'RESOLVED'].includes(ticket.status)) {
    return NextResponse.json({ error: 'บันทึกอะไหล่ได้เมื่อรับงานแล้ว และก่อนหัวหน้าอนุมัติ' }, { status: 409 });
  }
  try {
    const b = await req.json();
    const qty = Number(b.qty);
    if (!Number.isFinite(qty) || qty <= 0 || qty > 10000) return NextResponse.json({ error: 'จำนวนไม่ถูกต้อง' }, { status: 400 });
    const [part] = await sql`select part_id, unit_cost, name, unit from fixhub.parts where part_id = ${Number(b.part_id)} and active`;
    if (!part) return NextResponse.json({ error: 'ไม่พบอะไหล่' }, { status: 404 });
    const [{ stock }] = await sql`select coalesce(sum(qty),0)::float as stock from fixhub.part_moves where part_id = ${part.part_id} and branch_code = ${ticket.branch_code}`;
    await sql`insert into fixhub.part_moves (part_id, branch_code, qty, unit_cost, kind, ticket_id, note, moved_by)
              values (${part.part_id}, ${ticket.branch_code}, ${-qty}, ${part.unit_cost}, 'USE', ${ticketId},
                      ${b.note ? String(b.note).slice(0, 200) : null}, ${user.id})`;
    await sql`insert into fixhub.ticket_activity_log (ticket_id, action, old_status, new_status, action_by, action_by_name, reason)
              values (${ticketId}, 'PART_USED', ${ticket.status}, ${ticket.status}, ${user.id}, ${user.full_name || user.username},
                      ${`ใช้อะไหล่ ${part.name} ${qty} ${part.unit}`})`;
    const remain = Number(stock) - qty;
    return NextResponse.json({ success: true, stock_after: remain, warning: remain < 0 ? `สต็อก ${part.name} ของสาขานี้ติดลบ (${remain}) — แจ้งหัวหน้าให้บันทึกรับเข้า` : undefined });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// DELETE ?move_id= — คืนอะไหล่ (บันทึกเป็น RETURN ไม่ลบประวัติ) · ผู้บันทึกเองหรือหัวหน้า ก่อนอนุมัติ
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const g = await guard(req, params.id);
  if (g.err) return g.err;
  const { user, ticketId, ticket } = g as any;
  if (['APPROVED', 'CANCELLED'].includes(ticket.status)) return NextResponse.json({ error: 'ใบงานปิดแล้ว' }, { status: 409 });
  const moveId = Number(req.nextUrl.searchParams.get('move_id'));
  const [m] = await sql`select * from fixhub.part_moves where move_id = ${moveId} and ticket_id = ${ticketId} and kind = 'USE'`;
  if (!m) return NextResponse.json({ error: 'ไม่พบรายการ' }, { status: 404 });
  const isSup = ['admin', 'sup', 'supit'].includes(user.role);
  if (m.moved_by !== user.id && !isSup) return NextResponse.json({ error: 'ไม่มีสิทธิ์' }, { status: 403 });
  const returned = await sql`select 1 from fixhub.part_moves where kind = 'RETURN' and ticket_id = ${ticketId} and note = ${'คืน #' + moveId}`;
  if (returned.length) return NextResponse.json({ error: 'คืนรายการนี้ไปแล้ว' }, { status: 409 });
  await sql`insert into fixhub.part_moves (part_id, branch_code, qty, unit_cost, kind, ticket_id, note, moved_by)
            values (${m.part_id}, ${m.branch_code}, ${-Number(m.qty)}, ${m.unit_cost}, 'RETURN', ${ticketId}, ${'คืน #' + moveId}, ${user.id})`;
  return NextResponse.json({ success: true });
}
