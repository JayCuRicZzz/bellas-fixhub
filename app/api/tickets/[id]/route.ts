import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../../lib/db';
import { getUserFromRequest, canApproveTicket, canManageTicket } from '../../../../lib/auth';
import { canSeeTicket } from '../../../../lib/ticket-access';
import { sendLineMessage } from '../../../../lib/line';
import { notifyReporter, sendPushToUsers, gmsFor, workersFor } from '../../../../lib/webpush';
import { User } from '../../../../types';
import { pauseCounts } from '../../../../lib/pause';
import { getCancelRequest, cancelApprovers, WORKER_ROLES, CANCEL_APPROVER_ROLES } from '../../../../lib/cancel-request';

export const dynamic = 'force-dynamic';

const VALID_DIFFICULTY = ['easy', 'medium', 'hard', 'very_hard'];
const REFRIGERANT_TYPES = ['R32', 'R410A', 'R22', 'OTHER'];
const REFILL_REPEAT_DAYS = 15;

/** ช่างติ๊ก "เติมน้ำยาแอร์" → หาการเติมครั้งก่อนในห้องเดียวกัน (หรือแอร์เครื่องเดียวกันถ้าผูก QR) ภายใน 15 วัน
 *  เจอ = บันทึกลงใบ (ป้ายแดง) + แจ้งมือถือหัวหน้าช่าง/GM สาขา + LINE กลุ่มช่าง · ไม่ throw */
async function checkRefrigerantRepeat(t: any, user: User) {
  try {
    const sameUnit = t.asset_id ? sql`asset_id = ${t.asset_id}`
      : t.room_no ? sql`room_no = ${t.room_no}` : sql`location_detail = ${t.location_detail}`;
    const [prev] = await sql`
      select ticket_id, ticket_number, resolved_at, refrigerant_type,
             greatest(0, (fixhub.today_bkk() - (resolved_at at time zone 'Asia/Bangkok')::date))::int as days
      from fixhub.tickets
      where branch_code = ${t.branch_code} and ${sameUnit}
        and ticket_id <> ${t.ticket_id} and refrigerant_refilled and status <> 'CANCELLED'
        and resolved_at >= now() - make_interval(days => ${REFILL_REPEAT_DAYS})
      order by resolved_at desc limit 1`;
    if (!prev) {
      await sql`update fixhub.tickets set refrigerant_repeat_of = null, refrigerant_repeat_days = null where ticket_id = ${t.ticket_id}`;
      return null;
    }
    await sql`update fixhub.tickets set refrigerant_repeat_of = ${prev.ticket_id}, refrigerant_repeat_days = ${prev.days}
              where ticket_id = ${t.ticket_id}`;
    const where = `${t.branch_code} · ${t.location_detail || t.room_no || ''}`;
    const text = `🚨 เติมน้ำยาแอร์ซ้ำภายใน ${REFILL_REPEAT_DAYS} วัน · Refrigerant refilled twice\n`
      + `📍 ${where}\n`
      + `ครั้งก่อน: ${prev.ticket_number} (${prev.days === 0 ? 'วันนี้' : prev.days + ' วันที่แล้ว'})\n`
      + `ครั้งนี้: ${t.ticket_number} · ${user.full_name || user.username}\n`
      + `⚠️ อาจมีจุดรั่ว ควรตรวจหาจุดรั่วก่อนเติมอีก`;
    // ไม่ใช่ ticketEvent → ส่งเข้ากลุ่มช่างแม้เปิดโหมด "ส่งต่อเอง" (เป็นสัญญาณเตือน แบบเดียวกับสรุป 22:00)
    await sendLineMessage(text, 'MAINT').catch(() => null);
    const sups = (await workersFor(t.branch_code, 'MAINT').catch(() => [] as string[]));
    const supIds = sups.length
      ? (await sql`select user_id from fixhub.profiles where user_id = any(${sups}) and role = 'sup'`).map((r: any) => r.user_id as string)
      : [];
    const gms = await gmsFor(t.branch_code).catch(() => [] as string[]);
    await sendPushToUsers([...supIds, ...gms], {
      title: `🚨 เติมน้ำยาแอร์ซ้ำ · ${where}`.slice(0, 80),
      body: `${t.ticket_number} · ครั้งก่อน ${prev.ticket_number} (${prev.days} วัน) — ตรวจจุดรั่ว`.slice(0, 160),
      url: `/dashboard/${t.ticket_id}`, tag: `ticket-${t.ticket_id}-refill`,
    });
    return { repeat_of: prev.ticket_number, days: prev.days };
  } catch (e: any) {
    console.error('[Refrigerant] check failed:', e?.message);
    return null;
  }
}

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
    ticket.cancel_request = await getCancelRequest(ticketId).catch(() => null);
    ticket.pause_count = (await pauseCounts([ticketId]).catch(() => ({} as Record<number, number>)))[ticketId] || 0;
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
      await notifyReporter(current as any, 'accepted', userId, user.full_name || user.username);
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
      // ธงเติมน้ำยาแอร์ — ช่างติ๊กเอง (ทับค่าทุกครั้งที่กดซ่อมเสร็จ เผื่อใบถูกตีกลับแล้วซ่อมใหม่)
      const refilled = body.refrigerant_refilled === true;
      const rType = refilled && REFRIGERANT_TYPES.includes(body.refrigerant_type) ? body.refrigerant_type : null;
      await sql`update fixhub.tickets set refrigerant_refilled = ${refilled}, refrigerant_type = ${rType},
                  refrigerant_repeat_of = null, refrigerant_repeat_days = null
                where ticket_id = ${ticketId}`;
      if (refilled) {
        const rep = await checkRefrigerantRepeat(current, user);
        if (rep) slaInfo = { ...(slaInfo || {}), refrigerant_repeat: rep };
      }
      await logActivity(ticketId, 'RESOLVED', st, 'RESOLVED', user, refilled ? `[เติมน้ำยาแอร์${rType ? ' ' + rType : ''}] ${reasonIn || ''}`.trim() : reasonIn);
      await notifyReporter(current as any, 'resolved', userId, user.full_name || user.username);
      slaInfo = { ...(slaInfo || {}), resolved_by: userId, sla_minutes: row?.sla_minutes ?? null };
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
      // แจ้งผู้แจ้ง: งานเสร็จและอนุมัติแล้ว → เข้าไปกดปิดงาน/ให้คะแนน
      await notifyReporter(current as any, 'approved', userId, user.full_name || user.username);
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
      sendLineMessage(`🚩 งานไม่เรียบร้อย — แจ้งโดย${isOwnReport ? 'ผู้แจ้ง' : 'หัวหน้า'}\n🔢 ${current.ticket_number}\n📍 ${current.location_detail}\n📝 ${reason}`, current.dept_type, [], { ticketEvent: true }).catch(() => {});

    } else if (status === 'CANCEL_REQUEST') {
      // ผู้แจ้งขอยกเลิก (ต้องมีเหตุผล) → GM สาขา / Admin เป็นคนอนุมัติ · ช่างและไอที (รวมหัวหน้า) ขอไม่ได้
      if (WORKER_ROLES.includes(user.role)) return NextResponse.json({ error: 'ช่างและไอทีไม่สามารถยกเลิกใบงานได้' }, { status: 403 });
      if (!isOwnReport) return NextResponse.json({ error: 'ขอยกเลิกได้เฉพาะใบงานที่ตัวเองแจ้ง' }, { status: 403 });
      if (['APPROVED', 'CANCELLED'].includes(st)) return conflict('ใบงานนี้ปิดแล้ว');
      if (!reasonIn || reasonIn.trim().length < 3) return NextResponse.json({ error: 'กรุณาระบุเหตุผลที่ขอยกเลิก' }, { status: 400 });
      if (await getCancelRequest(ticketId)) return conflict('ส่งคำขอยกเลิกไปแล้ว รอผู้จัดการอนุมัติ');
      await logActivity(ticketId, 'CANCEL_REQUESTED', st, st, user, reasonIn.trim());
      const to = await cancelApprovers(current.branch_code).catch(() => [] as string[]);
      await sendPushToUsers(to.filter(u => u !== userId), {
        title: `⏳ ขอยกเลิกใบงาน · ${current.branch_code} · ${current.location_detail || ''}`.slice(0, 80),
        body: `${current.ticket_number} · ${user.full_name || user.username}: ${reasonIn.trim()}`.slice(0, 160),
        url: `/dashboard/${ticketId}`, tag: `ticket-${ticketId}-cancelreq`,
      });
      slaInfo = { cancel_requested: true };

    } else if (status === 'CANCEL_REJECT') {
      if (!CANCEL_APPROVER_ROLES.includes(user.role)) return NextResponse.json({ error: 'เฉพาะ GM / Admin เท่านั้นที่อนุมัติคำขอยกเลิกได้' }, { status: 403 });
      const req = await getCancelRequest(ticketId);
      if (!req) return conflict('ไม่มีคำขอยกเลิกที่รออยู่');
      await logActivity(ticketId, 'CANCEL_REJECTED', st, st, user, reasonIn);
      if (req.by_id && req.by_id !== userId) {
        await sendPushToUsers([req.by_id], {
          title: '❌ ไม่อนุมัติยกเลิก · Cancel request declined',
          body: `${current.ticket_number} · ${user.full_name || user.username}${reasonIn ? ': ' + reasonIn : ''}`.slice(0, 160),
          url: `/dashboard/${ticketId}`, tag: `ticket-${ticketId}-cancelreq`,
        });
      }

    } else if (status === 'CANCELLED') {
      // ยกเลิกจริงได้เฉพาะ GM / Admin (ยกเลิกเอง หรืออนุมัติคำขอของผู้แจ้ง) — ต้องมีเหตุผลเสมอ
      if (!CANCEL_APPROVER_ROLES.includes(user.role)) {
        return NextResponse.json({ error: WORKER_ROLES.includes(user.role) ? 'ช่างและไอทีไม่สามารถยกเลิกใบงานได้' : 'ส่งคำขอยกเลิกให้ผู้จัดการอนุมัติ' }, { status: 403 });
      }
      if (['APPROVED', 'CANCELLED'].includes(st)) return conflict('ใบงานนี้ปิดแล้ว');
      const req = await getCancelRequest(ticketId);
      const reason = (reasonIn && reasonIn.trim()) || (req ? `อนุมัติคำขอของ ${req.by_name || 'ผู้แจ้ง'}: ${req.reason || ''}` : '');
      if (!reason) return NextResponse.json({ error: 'กรุณาระบุเหตุผลที่ยกเลิก' }, { status: 400 });
      await sql`update fixhub.tickets set status = 'CANCELLED', pending_reason = ${clip(reason)}
                where ticket_id = ${ticketId} and status not in ('APPROVED','CANCELLED')`;
      await logActivity(ticketId, 'CANCELLED', st, 'CANCELLED', user, clip(reason));
      if (req?.by_id && req.by_id !== userId) {
        await sendPushToUsers([req.by_id], {
          title: '✅ อนุมัติยกเลิกแล้ว · Cancel approved',
          body: `${current.ticket_number} · ${user.full_name || user.username}`.slice(0, 160),
          url: `/dashboard/${ticketId}`, tag: `ticket-${ticketId}-cancelreq`,
        });
      }

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
