// คำขอยกเลิกใบงาน — ไม่มีคอลัมน์ใหม่ ใช้ประวัติใน ticket_activity_log
//   CANCEL_REQUESTED (ผู้แจ้งขอ + เหตุผล) → CANCELLED (GM/Admin อนุมัติ) หรือ CANCEL_REJECTED (ไม่อนุมัติ)
// คำขอค้าง = รายการล่าสุดในสามชนิดนี้เป็น CANCEL_REQUESTED และใบยังไม่ปิด
import sql from './db';

export const WORKER_ROLES = ['tech', 'it', 'sup', 'supit'];   // ยกเลิก/ขอยกเลิกไม่ได้
export const CANCEL_APPROVER_ROLES = ['admin', 'gm'];

export interface CancelRequest { reason: string | null; by_id: string | null; by_name: string | null; at: string }

export async function getCancelRequest(ticketId: number): Promise<CancelRequest | null> {
  const [r] = await sql`
    select l.action, l.reason, l.action_by as by_id, l.action_by_name as by_name, l.created_at as at, t.status
    from fixhub.ticket_activity_log l join fixhub.tickets t on t.ticket_id = l.ticket_id
    where l.ticket_id = ${ticketId} and l.action in ('CANCEL_REQUESTED','CANCEL_REJECTED','CANCELLED')
    order by l.created_at desc, l.id desc limit 1`;
  if (!r || r.action !== 'CANCEL_REQUESTED' || ['APPROVED', 'CANCELLED'].includes(r.status)) return null;
  return { reason: r.reason, by_id: r.by_id, by_name: r.by_name, at: r.at };
}

/** คำขอที่ค้างอยู่ในสาขาที่กำหนด (สำหรับการ์ดบนแดชบอร์ดของ GM/Admin) */
export async function listCancelRequests(branches: string[]) {
  if (!branches.length) return [];
  return sql`
    select * from (
      select distinct on (l.ticket_id) l.ticket_id, l.action, l.reason, l.action_by_name as by_name, l.created_at as at,
             t.ticket_number, t.branch_code, t.location_detail, t.status
      from fixhub.ticket_activity_log l join fixhub.tickets t on t.ticket_id = l.ticket_id
      where l.action in ('CANCEL_REQUESTED','CANCEL_REJECTED','CANCELLED')
        and t.branch_code = any(${branches}) and t.status not in ('APPROVED','CANCELLED')
        and l.created_at > now() - interval '60 days'
      order by l.ticket_id, l.created_at desc, l.id desc
    ) x where x.action = 'CANCEL_REQUESTED' order by x.at`;
}

/** ผู้อนุมัติ: GM ที่ดูแลสาขา + Admin */
export async function cancelApprovers(branchCode: string) {
  const rows = await sql`
    select p.user_id from fixhub.profiles p
    where coalesce(p.active, true) and not coalesce(p.blocked, false)
      and (p.role = 'admin'
           or (p.role = 'gm' and (p.branch_code = ${branchCode}
               or exists (select 1 from fixhub.user_branches ub where ub.user_id = p.user_id and ub.branch_code = ${branchCode}))))`;
  return rows.map((r: any) => r.user_id as string);
}
