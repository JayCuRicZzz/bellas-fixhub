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
