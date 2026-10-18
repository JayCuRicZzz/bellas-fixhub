// การเร่งงานอัตโนมัติ (Escalation) — cron ทุก 10 นาที
//   ระดับ 1 not_accepted : ใบงานยังไม่มีใครรับเกิน X นาที
//   ระดับ 2 sla_near     : งานที่ยังไม่เสร็จ เหลือเวลาก่อนครบ SLA ไม่ถึง Y นาที
//   ระดับ 3 sla_breached : เลย SLA แล้ว
//   แต่ละใบงานแจ้งแต่ละระดับ "ครั้งเดียว" (fixhub.ticket_escalations) และรวมทุกใบในรอบเดียวกันเป็น
//   ข้อความเดียวต่อกลุ่ม (ช่าง/ไอที) → ประหยัดโควตา LINE
import sql from './db';
import { sendLineMessage } from './line';

export interface EscalationConfig {
  enabled: boolean;
  acceptMinutes: number;      // ไม่มีคนรับเกินกี่นาที
  nearMinutes: number;        // เตือนก่อนครบ SLA กี่นาที
  breached: boolean;          // แจ้งเมื่อเลย SLA
  quietStart: number;         // ช่วงเงียบ (ชั่วโมง BKK) — งานด่วน/สูงยังแจ้งเสมอ
  quietEnd: number;
}
export const DEFAULT_ESCALATION: EscalationConfig = {
  enabled: true, acceptMinutes: 30, nearMinutes: 60, breached: true, quietStart: 23, quietEnd: 7,
};

export async function getEscalationConfig(): Promise<EscalationConfig> {
  try {
    const rows = await sql`select value from fixhub.app_settings where key = 'escalation'`;
    return { ...DEFAULT_ESCALATION, ...(rows[0]?.value || {}) };
  } catch { return DEFAULT_ESCALATION; }
}

export async function setEscalationConfig(patch: Partial<EscalationConfig>, by?: string) {
  const cur = await getEscalationConfig();
  const clamp = (v: any, lo: number, hi: number, d: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : d; };
  const next: EscalationConfig = {
    enabled: patch.enabled !== undefined ? !!patch.enabled : cur.enabled,
    acceptMinutes: clamp(patch.acceptMinutes ?? cur.acceptMinutes, 5, 1440, cur.acceptMinutes),
    nearMinutes: clamp(patch.nearMinutes ?? cur.nearMinutes, 0, 1440, cur.nearMinutes),
    breached: patch.breached !== undefined ? !!patch.breached : cur.breached,
    quietStart: clamp(patch.quietStart ?? cur.quietStart, 0, 23, cur.quietStart),
    quietEnd: clamp(patch.quietEnd ?? cur.quietEnd, 0, 23, cur.quietEnd),
  };
  await sql`insert into fixhub.app_settings (key, value, updated_by, updated_at)
            values ('escalation', ${sql.json(next as any)}, ${by ?? null}, now())
            on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now()`;
  return next;
}

function bkkHour(d = new Date()) {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', hour12: false }).format(d)) % 24;
}
function inQuiet(cfg: EscalationConfig, h = bkkHour()) {
  if (cfg.quietStart === cfg.quietEnd) return false;
  return cfg.quietStart < cfg.quietEnd ? h >= cfg.quietStart && h < cfg.quietEnd : h >= cfg.quietStart || h < cfg.quietEnd;
}

const fmtMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} ชม. ${m % 60 ? `${m % 60} นาที` : ''}`.trim() : `${m} นาที`);

export async function runEscalation(): Promise<{ sent: number; tickets: number; skipped?: string }> {
  const cfg = await getEscalationConfig();
  if (!cfg.enabled) return { sent: 0, tickets: 0, skipped: 'disabled' };
  const quiet = inQuiet(cfg);
  const urgentOnly = quiet ? sql`and t.priority in ('urgent','high')` : sql``;

  // เลือกระดับสูงสุดที่เข้าเงื่อนไขของแต่ละใบ และยังไม่เคยแจ้งระดับนั้น
  const rows = await sql`
    with cand as (
      select t.ticket_id, t.ticket_number, t.branch_code, t.location_detail, t.status, t.priority, t.created_at, t.sla_deadline,
             t.technician_name, t.dept_type,
             case
               when ${cfg.breached} and t.sla_deadline is not null and now() > t.sla_deadline then 'sla_breached'
               when ${cfg.nearMinutes} > 0 and t.sla_deadline is not null
                    and now() > t.sla_deadline - make_interval(mins => ${cfg.nearMinutes}) then 'sla_near'
               when t.status = 'PENDING' and now() > t.created_at + make_interval(mins => ${cfg.acceptMinutes}) then 'not_accepted'
             end as level
      from fixhub.tickets_full t
      where t.status in ('PENDING','IN_PROGRESS','PAUSED') ${urgentOnly}
        and t.created_at > now() - interval '30 days'
    )
    select c.* from cand c
    where c.level is not null
      and not exists (select 1 from fixhub.ticket_escalations e where e.ticket_id = c.ticket_id and e.level = c.level)
      -- เลย SLA แล้วไม่ต้องย้อนไปแจ้ง "ใกล้ครบ"
      and not (c.level = 'sla_near' and exists (select 1 from fixhub.ticket_escalations e where e.ticket_id = c.ticket_id and e.level = 'sla_breached'))
    order by c.dept_type, c.level desc, c.created_at
    limit 60`;
  if (!rows.length) return { sent: 0, tickets: 0 };

  const now = Date.now();
  let sent = 0;
  for (const dept of ['MAINTENANCE', 'IT']) {
    const list = rows.filter((r: any) => (r.dept_type === 'IT' ? 'IT' : 'MAINTENANCE') === dept);
    if (!list.length) continue;
    const line = (r: any) => {
      const who = r.technician_name ? `👷 ${r.technician_name}` : '👷 ยังไม่มีคนรับ';
      if (r.level === 'not_accepted') {
        return `⏳ ${r.ticket_number} · ${r.branch_code} ${r.location_detail} — รอรับงาน ${fmtMin(Math.round((now - new Date(r.created_at).getTime()) / 60000))}`;
      }
      const left = Math.round((new Date(r.sla_deadline).getTime() - now) / 60000);
      return r.level === 'sla_breached'
        ? `🔴 ${r.ticket_number} · ${r.branch_code} ${r.location_detail} — เกิน SLA ${fmtMin(-left)} · ${who}`
        : `🟠 ${r.ticket_number} · ${r.branch_code} ${r.location_detail} — เหลือ ${fmtMin(Math.max(left, 0))} · ${who}`;
    };
    const text = [
      `🚨 เร่งงาน (${list.length} ใบ)`,
      ...list.map(line),
      '',
      'หัวหน้าโปรดติดตาม · ช่าง/ไอทีกดรับงานในระบบ',
    ].join('\n');
    const r = await sendLineMessage(text, dept === 'IT' ? 'IT' : 'MAINTENANCE');
    // บันทึกว่าแจ้งแล้วแม้ LINE ล้ม (กันส่งรัว ๆ ทุก 10 นาที) — ข้อผิดพลาดดูได้ที่ log
    await sql`insert into fixhub.ticket_escalations ${sql(list.map((x: any) => ({ ticket_id: x.ticket_id, level: x.level })), 'ticket_id', 'level')}
              on conflict do nothing`;
    if ((r as any).success) sent++;
  }
  return { sent, tickets: rows.length };
}
