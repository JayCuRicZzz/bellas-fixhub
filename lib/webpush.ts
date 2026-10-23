// แจ้งเตือนบนมือถือผ่านเว็บแอป (Web Push) — ฟรี ไม่จำกัด ใช้คู่กับ LINE
// กุญแจ VAPID สร้างอัตโนมัติครั้งแรก เก็บใน fixhub.app_settings (key = 'webpush') ฝั่งเซิร์ฟเวอร์
// คนที่ไม่ได้กด "เปิดการแจ้งเตือน" จะไม่ได้รับ — ไม่กระทบ LINE เดิม
import webpush from 'web-push';
import sql from './db';

const SUBJECT = 'https://bellafixhub.bellavillapattaya.com';
let keysCache: { publicKey: string; privateKey: string } | null = null;

export async function getVapidKeys() {
  if (keysCache) return keysCache;
  const rows = await sql`select value from fixhub.app_settings where key = 'webpush'`;
  let v: any = rows[0]?.value;
  if (!v?.publicKey || !v?.privateKey) {
    const k = webpush.generateVAPIDKeys();
    // on conflict do nothing → ถ้ามีอีก instance สร้างพร้อมกัน ใช้ของที่บันทึกก่อน
    await sql`insert into fixhub.app_settings (key, value, updated_at)
              values ('webpush', ${sql.json({ publicKey: k.publicKey, privateKey: k.privateKey } as any)}, now())
              on conflict (key) do nothing`;
    const again = await sql`select value from fixhub.app_settings where key = 'webpush'`;
    v = again[0]?.value;
  }
  keysCache = { publicKey: v.publicKey, privateKey: v.privateKey };
  return keysCache;
}

export interface PushPayload { title: string; body: string; url?: string; tag?: string }

/** ส่งถึงทุกเครื่องของผู้ใช้ที่ระบุ — ไม่ throw · ลบเครื่องที่ยกเลิกแล้ว (404/410) ทิ้ง */
export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (!ids.length) return { sent: 0, failed: 0 };
  try {
    const { publicKey, privateKey } = await getVapidKeys();
    webpush.setVapidDetails(SUBJECT, publicKey, privateKey);
    const subs = await sql`select id, endpoint, p256dh, auth from fixhub.push_subscriptions where user_id = any(${ids})`;
    const body = JSON.stringify(payload);
    let sent = 0, failed = 0;
    await Promise.all(subs.map(async (s: any) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 6 * 3600, urgency: 'high' });
        sent++;
        await sql`update fixhub.push_subscriptions set last_ok_at = now(), fail_count = 0 where id = ${s.id}`;
      } catch (e: any) {
        failed++;
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await sql`delete from fixhub.push_subscriptions where id = ${s.id}`;
        } else {
          console.error('[Push] send failed:', e?.statusCode, e?.body || e?.message);
          await sql`update fixhub.push_subscriptions set fail_count = fail_count + 1 where id = ${s.id}`;
        }
      }
    }));
    return { sent, failed };
  } catch (e: any) {
    console.error('[Push] error:', e?.message);
    return { sent: 0, failed: -1 };
  }
}

/** ช่าง/ไอที (และหัวหน้า) ที่ดูแลสาขานั้น — ผู้รับแจ้งเตือนงานใหม่ */
export async function workersFor(branchCode: string, dept: 'IT' | 'MAINT', excludeUserId?: string) {
  const roles = dept === 'IT' ? ['it', 'supit'] : ['tech', 'sup'];
  const rows = await sql`
    select p.user_id from fixhub.profiles p
    where p.role = any(${roles}) and coalesce(p.active, true) and not coalesce(p.blocked, false)
      and (p.branch_code = ${branchCode}
           or exists (select 1 from fixhub.user_branches ub where ub.user_id = p.user_id and ub.branch_code = ${branchCode}))
      ${excludeUserId ? sql`and p.user_id <> ${excludeUserId}` : sql``}`;
  return rows.map((r: any) => r.user_id as string);
}

/** GM ที่ดูแลสาขานั้น (สาขาหลักหรือสาขาที่ได้สิทธิ์) */
export async function gmsFor(branchCode: string, excludeUserId?: string) {
  const rows = await sql`
    select p.user_id from fixhub.profiles p
    where p.role = 'gm' and coalesce(p.active, true) and not coalesce(p.blocked, false)
      and (p.branch_code = ${branchCode}
           or exists (select 1 from fixhub.user_branches ub where ub.user_id = p.user_id and ub.branch_code = ${branchCode}))
      ${excludeUserId ? sql`and p.user_id <> ${excludeUserId}` : sql``}`;
  return rows.map((r: any) => r.user_id as string);
}

/** แจ้งผู้แจ้งเมื่อสถานะใบของตัวเองเปลี่ยน (สองภาษา เพราะพนักงานหลายสัญชาติ) — ไม่ throw */
export async function notifyReporter(t: { ticket_id: number; ticket_number: string; reporter_id?: string; location_detail?: string },
                                     kind: 'accepted' | 'resolved' | 'approved', actorId: string, actorName: string) {
  if (!t.reporter_id || t.reporter_id === actorId) return;
  const head = kind === 'accepted' ? '👷 มีช่างรับงานแล้ว · Job accepted'
    : kind === 'approved' ? '⭐ งานเสร็จแล้ว กดปิดงาน + ให้คะแนน · Please rate the repair'
    : '✅ ซ่อมเสร็จแล้ว · Repair done';
  await sendPushToUsers([t.reporter_id], {
    title: `${head}`,
    body: `${t.ticket_number} · ${t.location_detail || ''} · ${actorName}`.slice(0, 160),
    url: `/dashboard/${t.ticket_id}`,
    tag: `ticket-${t.ticket_id}-${kind}`,
  });
}

/** GM: งานที่เกิน SLA แล้วยังไม่ปิด — ใบละครั้งเดียว · กลางคืน (23–07) เฉพาะด่วนมาก/สูง */
export async function pushGmSlaBreached(quiet: boolean) {
  const rows = await sql`
    select t.ticket_id, t.ticket_number, t.branch_code, t.location_detail, t.priority, t.sla_deadline
    from fixhub.tickets t
    where t.status in ('PENDING','IN_PROGRESS','PAUSED')
      and t.sla_deadline is not null and now() > t.sla_deadline
      and t.created_at > now() - interval '30 days'
      ${quiet ? sql`and t.priority in ('urgent','high')` : sql``}
      and not exists (select 1 from fixhub.push_log l where l.ticket_id = t.ticket_id and l.kind = 'gm_sla_breached')
    order by t.sla_deadline limit 50`;
  let sent = 0;
  for (const r of rows as any[]) {
    const to = await gmsFor(r.branch_code);
    if (to.length) {
      const res = await sendPushToUsers(to, {
        title: `🔴 เกิน SLA · ${r.branch_code} · ${r.location_detail || ''}`.slice(0, 80),
        body: `${r.ticket_number} ยังไม่ปิดงาน · SLA overdue`,
        url: `/dashboard/${r.ticket_id}`, tag: `ticket-${r.ticket_id}-sla`,
      });
      sent += res.sent;
    }
    await sql`insert into fixhub.push_log (ticket_id, kind) values (${r.ticket_id}, 'gm_sla_breached') on conflict do nothing`;
  }
  return { tickets: rows.length, sent };
}
