// งานที่พัก — รายการ + ปล่อยงานที่ครบวันพักกลับเป็น "รอรับงาน" อัตโนมัติ (เรียกจาก cron ทุก 10 นาที)
// รอบที่พัก = จำนวน PAUSED ในประวัติใบงาน (ไม่มีคอลัมน์ใหม่)
import sql from './db';
import { sendPushToUsers, workersFor } from './webpush';

const BKK = 'Asia/Bangkok';
const RELEASE_HOUR = 7;   // ปล่อยตั้งแต่ 07:00 ของวันที่ครบกำหนด (ไม่ปลุกช่างกลางดึก)

export async function pauseCounts(ticketIds: number[]): Promise<Record<number, number>> {
  if (!ticketIds.length) return {};
  const rows = await sql`select ticket_id, count(*)::int as n from fixhub.ticket_activity_log
                         where action = 'PAUSED' and ticket_id = any(${ticketIds}) group by ticket_id`;
  return Object.fromEntries(rows.map((r: any) => [r.ticket_id, r.n]));
}

export async function releaseExpiredPauses() {
  if ((new Date().getUTCHours() + 7) % 24 < RELEASE_HOUR) {   // ไทย = UTC+7 ไม่มีเวลาออมแสง
    return { released: 0, skipped: 'before-07' };
  }
  const due = await sql`
    select t.ticket_id, t.ticket_number, t.branch_code, t.location_detail, t.paused_reason, t.technician_id,
           c.dept_type,
           (select count(*)::int from fixhub.ticket_activity_log l where l.ticket_id = t.ticket_id and l.action = 'PAUSED') as rounds
    from fixhub.tickets t join fixhub.categories c on c.category_id = t.category_id
    where t.status = 'PAUSED' and t.paused_expected_end is not null
      and (t.paused_expected_end at time zone ${BKK})::date <= fixhub.today_bkk()
    order by t.paused_expected_end limit 50`;
  let released = 0;
  for (const t of due as any[]) {
    const note = `ครบกำหนดพักงาน (รอบที่ ${t.rounds}) — ${t.paused_reason || ''}`.trim();
    const upd = await sql`
      update fixhub.tickets set status = 'PENDING', pending_reason = ${note},
        technician_id = null, accepted_at = null, accepted_by = null, sla_deadline = null,
        paused_reason = null, paused_at = null, paused_expected_end = null
      where ticket_id = ${t.ticket_id} and status = 'PAUSED' returning ticket_id`;
    if (!upd.length) continue;
    released++;
    await sql`insert into fixhub.ticket_activity_log (ticket_id, action, old_status, new_status, action_by, action_by_name, reason)
              values (${t.ticket_id}, 'PAUSE_EXPIRED', 'PAUSED', 'PENDING', null, 'ระบบ', ${note})`;
    const to = await workersFor(t.branch_code, t.dept_type === 'IT' ? 'IT' : 'MAINT').catch(() => [] as string[]);
    await sendPushToUsers([...to, t.technician_id].filter(Boolean), {
      title: `⏰ ครบวันพัก รอรับงาน · ${t.branch_code} · ${t.location_detail || ''}`.slice(0, 80),
      body: `${t.ticket_number} · พักรอบที่ ${t.rounds} · ${t.paused_reason || ''}`.slice(0, 160),
      url: `/dashboard/${t.ticket_id}`, tag: `ticket-${t.ticket_id}`,
    });
  }
  return { released, due: due.length };
}
