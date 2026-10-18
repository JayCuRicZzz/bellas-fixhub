import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../../lib/db';
import { getUserFromRequest, canApproveTicket, canManageTicket } from '../../../../lib/auth';
import { canSeeTicket } from '../../../../lib/ticket-access';
import { sendLineMessage } from '../../../../lib/line';
import { User } from '../../../../types';

export const dynamic = 'force-dynamic';

const VALID_DIFFICULTY = ['easy', 'medium', 'hard', 'very_hard'];

async function logActivity(ticketId: number, action: string, oldStatus: string | null, newStatus: string | null, user: User, reason?: string | null) {
  try {
    await sql`
      insert into fixhub.ticket_activity_log (ticket_id, action, old_status, new_status, action_by, action_by_name, reason)
      values (${ticketId}, ${action}, ${oldStatus}, ${newStatus}, ${user.id}, ${user.full_name || user.username}, ${reason || null})`;
  } catch (e: any) {
    console.error('[Activity Log] Failed:', e.message);
  }
}

async function loadTicket(ticketId: number) {
  const rows = await sql`select * from fixhub.tickets_full where ticket_id = ${ticketId}`;
  return rows[0] || null;
}

const MAX_REASON = 1000;
const clip = (v: any) => (v == null ? null : String(v).slice(0, MAX_REASON));

function parseId(id: string): number | null {
  const n = parseInt(id, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ticketId = parseId(params.id);
  if (!ticketId) return NextResponse.json({ error: 'ไม่พบใบงาน' }, { status: 404 });

  try {
    const ticket = await loadTicket(ticketId);
    if (!ticket) return NextResponse.json({ error: 'ไม่พบใบงาน' }, { status: 404 });
    if (!(await canSeeTicket(user, ticket))) return NextResponse.json({ error: 'ไม่มีสิทธิ์ดูใบงานนี้' }, { status: 403 });

    const images = await sql`select image_url, image_type from fixhub.ticket_images where ticket_id = ${ticketId} order by uploaded_at`;
    ticket.images = images.map((i: any) => i.image_url);
    ticket.image_url = ticket.images[0] || null;
    return NextResponse.json(ticket);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ticketId = parseId(params.id);
  if (!ticketId) return NextResponse.json({ error: 'ไม่พบใบงาน' }, { status: 404 });

  try {
    const body = await req.json();
    const { status, pending_reason, kpi_rating, difficulty, paused_reason, paused_expected_end } = body;
    const userId = user.id;

    const current = await loadTicket(ticketId);
    if (!current) return NextResponse.json({ error: 'ไม่พบใบงาน' }, { status: 404 });
    if (!(await canSeeTicket(user, current))) return NextResponse.json({ error: 'ไม่มีสิทธิ์แก้ไขใบงานนี้' }, { status: 403 });

    const isSupervisor = canApproveTicket(user.role);           // sup, supit, admin, gm
    const isWorker = canManageTicket(user.role) && user.role !== 'gm'; // tech, it, sup, supit, admin (GM ดูและอนุมัติ ไม่ลงมือ)
    const isOwnReport = current.reporter_id === userId;
    const st: string = current.status;
    let slaInfo: any = null;
    const reasonIn = clip(pending_reason);

    // ── ตารางสถานะที่อนุญาต (state machine) ─────────────────────────────────────
    //   PENDING → IN_PROGRESS (รับงาน) → PAUSED ⇄ IN_PROGRESS → RESOLVED → APPROVED
    //   RESOLVED/IN_PROGRESS → PENDING (หัวหน้าตีกลับ) · RESOLVED/APPROVED → PENDING (ผู้แจ้งแจ้งงานไม่เรียบร้อย)
    //   APPROVED / CANCELLED = ปิดแล้ว (ยกเว้นผู้แจ้ง/หัวหน้าเปิดใหม่ด้วย FLAGGED จาก APPROVED)
    const conflict = (msg = 'สถานะใบงานเปลี่ยนไปแล้ว กรุณารีเฟรช') => NextResponse.json({ error: msg }, { status: 409 });
    const accept = async () => {
      const sla = await sql`select sla_minutes from fixhub.sla_config where priority = ${current.priority || 'medium'}`;
      const slaMinutes: number = sla[0]?.sla_minutes || 240;
      const rows = await sql`
        update fixhub.tickets set status = 'IN_PROGRESS', technician_id = ${userId},
          accepted_at = now(), accepted_by = ${userId},
          sla_deadline = now() + make_interval(mins => ${slaMinutes}),
          pending_reason = null
        where ticket_id = ${ticketId} and status = 'PENDING'
        returning ticket_id`;
      return rows.length ? slaMinutes : null;
    };

    if (status === 'ACCEPTED' || (status === 'IN_PROGRESS' && st === 'PENDING')) {
      if (user.role === 'gm') return NextResponse.json({ error: 'GM ไม่สามารถรับงานได้' }, { status: 403 });
      if (!isWorker) return NextResponse.json({ error: 'เฉพาะช่าง/ไอทีเท่านั้นที่รับงานได้' }, { status: 403 });
      if (st !== 'PENDING') return conflict('ใบงานนี้ถูกรับไปแล้ว');
      const slaMinutes = await accept();
      if (slaMinutes == null) return conflict('ใบงานนี้ถูกรับไปแล้ว');
      await logActivity(ticketId, 'ACCEPTED', st, 'IN_PROGRESS', user);
      slaInfo = { accepted_by: userId, sla_minutes_target: slaMinutes };

    } else if (status === 'IN_PROGRESS') {
      if (!isWorker) return NextResponse.json({ error: 'ไม่มีสิทธิ์' }, { status: 403 });
      if (st !== 'PAUSED') return conflict();
      await sql`
        update fixhub.tickets set status = 'IN_PROGRESS', paused_reason = null, paused_expected_end = null
        where ticket_id = ${ticketId} and status = 'PAUSED'`;
      await logActivity(ticketId, 'RESUME', 'PAUSED', 'IN_PROGRESS', user);
      slaInfo = { resumed_by: userId };

    } else if (status === 'RESOLVED') {
      if (!isWorker) return NextResponse.json({ error: 'ไม่มีสิทธิ์' }, { status: 403 });
      if (!['PENDING', 'IN_PROGRESS'].includes(st)) return conflict();
      const [row] = await sql`
        update fixhub.tickets set status = 'RESOLVED', pending_reason = ${reasonIn},
          resolved_at = now(), resolved_by = ${userId},
          technician_id = coalesce(technician_id, ${userId}),
          accepted_at = coalesce(accepted_at, now()), accepted_by = coalesce(accepted_by, ${userId}),
          sla_minutes = case when accepted_at is not null
                             then greatest(0, floor(extract(epoch from (now() - accepted_at)) / 60))::int
                             else 0 end
        where ticket_id = ${ticketId} and status in ('PENDING','IN_PROGRESS')
        returning sla_minutes`;
      if (!row) return conflict();
      await logActivity(ticketId, 'RESOLVED', st, 'RESOLVED', user, reasonIn);
      slaInfo = { resolved_by: userId, sla_minutes: row?.sla_minutes ?? null };
      // (no LINE push on resolve — counted in the daily summary image)

    } else if (status === 'APPROVED') {
      if (!isSupervisor) return NextResponse.json({ error: 'เฉพาะหัวหน้าเท่านั้นที่อนุมัติได้' }, { status: 403 });
      if (st !== 'RESOLVED') return conflict('อนุมัติได้เฉพาะงานที่ช่างกดซ่อมเสร็จแล้ว');
      if (current.resolved_by === userId && !['admin', 'gm'].includes(user.role)) {
        return NextResponse.json({ error: 'ไม่สามารถอนุมัติงานที่ตัวเองซ่อม — ให้หัวหน้าคนอื่น / GM / แอดมินอนุมัติ' }, { status: 403 });
      }
      const diff = VALID_DIFFICULTY.includes(difficulty) ? difficulty : null;
      const rows = await sql`
        update fixhub.tickets set status = 'APPROVED', approved_at = now(), approved_by = ${userId},
          difficulty = coalesce(${diff}, difficulty)
        where ticket_id = ${ticketId} and status = 'RESOLVED' returning ticket_id`;
      if (!rows.length) return conflict();
      await logActivity(ticketId, 'APPROVED', st, 'APPROVED', user);
      slaInfo = { approved_by: userId, difficulty: diff };

    } else if (status === 'REJECTED') {
      if (!isSupervisor) return NextResponse.json({ error: 'เฉพาะหัวหน้าเท่านั้นที่ตีกลับได้' }, { status: 403 });
      if (!['RESOLVED', 'IN_PROGRESS'].includes(st)) return conflict();
      const reason = reasonIn || 'หัวหน้าปฏิเสธงาน กรุณาดำเนินการใหม่';
      await sql`
        update fixhub.tickets set status = 'PENDING', pending_reason = ${reason}, technician_id = null,
          accepted_at = null, accepted_by = null, resolved_at = null, resolved_by = null, sla_minutes = null
        where ticket_id = ${ticketId} and status in ('RESOLVED','IN_PROGRESS')`;
      await logActivity(ticketId, 'REJECTED', st, 'PENDING', user, reason);
      slaInfo = { rejected_by: userId, reason };
      // (no LINE push on reject — technician sees it in the system / daily summary)

    } else if (status === 'FLAGGED') {
      if (!(isOwnReport || isSupervisor)) return NextResponse.json({ error: 'เฉพาะผู้แจ้งหรือหัวหน้าเท่านั้น' }, { status: 403 });
      if (!['RESOLVED', 'APPROVED'].includes(st)) return conflict('แจ้งงานไม่เรียบร้อยได้เฉพาะงานที่ซ่อมเสร็จแล้ว');
      const reason = reasonIn || 'ผู้แจ้งแจ้งว่างานยังไม่เรียบร้อย';
      await sql`
        update fixhub.tickets set status = 'PENDING', pending_reason = ${reason}, technician_id = null,
          accepted_at = null, accepted_by = null, resolved_at = null, resolved_by = null,
          approved_at = null, approved_by = null, sla_minutes = null, kpi_rating = null
        where ticket_id = ${ticketId} and status in ('RESOLVED','APPROVED')`;
      await logActivity(ticketId, 'FLAGGED', st, 'PENDING', user, reason);
      slaInfo = { flagged_by: userId, reason };
      sendLineMessage(`🚩 งานไม่เรียบร้อย — แจ้งโดย${isOwnReport ? 'ผู้แจ้ง' : 'หัวหน้า'}\n🔢 ${current.ticket_number}\n📍 ${current.location_detail}\n📝 ${reason}`, current.dept_type).catch(() => {});

    } else if (status === 'CANCELLED') {
      // หัวหน้ายกเลิกได้ทุกงานที่ยังไม่ปิด · ผู้แจ้งยกเลิกใบของตัวเองได้ก่อนช่างรับงาน
      const allowed = isSupervisor || (isOwnReport && st === 'PENDING');
      if (!allowed) return NextResponse.json({ error: 'ไม่มีสิทธิ์ยกเลิกใบงานนี้' }, { status: 403 });
      if (['APPROVED', 'CANCELLED'].includes(st)) return conflict('ใบงานนี้ปิดแล้ว');
      await sql`update fixhub.tickets set status = 'CANCELLED', pending_reason = ${reasonIn}
                where ticket_id = ${ticketId} and status not in ('APPROVED','CANCELLED')`;
      await logActivity(ticketId, 'CANCELLED', st, 'CANCELLED', user, reasonIn);

    } else if (status === 'PAUSED') {
      if (!isWorker) return NextResponse.json({ error: 'ไม่มีสิทธิ์' }, { status: 403 });
      if (st !== 'IN_PROGRESS') return conflict('พักงานได้เฉพาะงานที่กำลังดำเนินการ');
      if (!paused_reason) return NextResponse.json({ error: 'กรุณาระบุเหตุผลที่พักงาน' }, { status: 400 });
      const end = new Date(paused_expected_end);
      if (!paused_expected_end || isNaN(end.getTime())) return NextResponse.json({ error: 'กรุณาระบุวันที่คาดว่าจะเสร็จ' }, { status: 400 });
      const pr = clip(paused_reason);
      await sql`
        update fixhub.tickets set status = 'PAUSED', paused_reason = ${pr}, paused_at = now(),
          paused_expected_end = ${end}
        where ticket_id = ${ticketId} and status = 'IN_PROGRESS'`;
      await logActivity(ticketId, 'PAUSED', st, 'PAUSED', user, pr);
      slaInfo = { paused_by: userId, reason: pr, expected_end: paused_expected_end };

    } else if (status) {
      return NextResponse.json({ error: `สถานะไม่ถูกต้อง: ${status}` }, { status: 400 });

    } else {
      // no status change: difficulty (supervisor) and/or KPI rating (reporter or supervisor)
      let touched = false;
      if (difficulty !== undefined) {
        if (!isSupervisor) return NextResponse.json({ error: 'เฉพาะหัวหน้าเท่านั้นที่กำหนดระดับความยากได้' }, { status: 403 });
        if (st === 'CANCELLED') return conflict('ใบงานนี้ถูกยกเลิกแล้ว');
        if (!VALID_DIFFICULTY.includes(difficulty)) return NextResponse.json({ error: 'ระดับความยากไม่ถูกต้อง' }, { status: 400 });
        await sql`update fixhub.tickets set difficulty = ${difficulty} where ticket_id = ${ticketId}`;
        await logActivity(ticketId, 'DIFFICULTY', current.status, current.status, user, `ระดับความยาก: ${difficulty}`);
        touched = true;
      }
      if (kpi_rating !== undefined) {
        if (!(isOwnReport || isSupervisor)) return NextResponse.json({ error: 'เฉพาะผู้แจ้งหรือหัวหน้าเท่านั้นที่ให้คะแนนได้' }, { status: 403 });
        if (st !== 'APPROVED') return conflict('ให้คะแนนได้หลังหัวหน้าอนุมัติงานแล้ว');
        const rating = parseInt(kpi_rating, 10);
        if (!(rating >= 1 && rating <= 5)) return NextResponse.json({ error: 'คะแนนต้องอยู่ระหว่าง 1-5' }, { status: 400 });
        await sql`update fixhub.tickets set kpi_rating = ${rating} where ticket_id = ${ticketId}`;
        await logActivity(ticketId, 'RATED', current.status, current.status, user, `ให้คะแนน ${rating} ดาว`);
        touched = true;
      }
      if (!touched) return NextResponse.json({ error: 'ไม่มีข้อมูลที่ต้องอัปเดต' }, { status: 400 });
    }

    const ticket = await loadTicket(ticketId);
    return NextResponse.json({ success: true, message: 'อัปเดตสถานะสำเร็จ', ticket, sla: slaInfo });
  } catch (err: any) {
    console.error('[Tickets] Update error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
