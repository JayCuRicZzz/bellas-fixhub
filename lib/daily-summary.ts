// Daily summary image (PNG) per department → Supabase Storage → LINE (image + short text in ONE push).
// Rendering: hand-built SVG → @resvg/resvg-js (rustybuzz shaping = correct Thai vowels/tone marks).
import path from 'path';
import { Resvg } from '@resvg/resvg-js';
import sql from './db';
import { supabaseAdmin } from './supabase';
import { IMAGE_BUCKET } from './upload';
import { getLineConfig } from './line-config';

export type SummaryDept = 'MAINT' | 'IT';

const OPEN = ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'PAUSED'];
const BKK = 'Asia/Bangkok';

export interface BranchRow {
  branch_code: string;
  branch_name: string;
  new_today: number;
  done_today: number;
  not_accepted: number;
  in_progress: number;
  awaiting: number;
  open_total: number;
  overdue: number;
}
export interface OldTicket {
  ticket_number: string;
  branch_code: string;
  location_detail: string;
  description: string;
  status: string;
  created_at: string;
  sla_deadline: string | null;
  technician_name: string | null;
  overdue: boolean;
}
export interface Closer { name: string; n: number }
export interface DailySummary {
  dept: SummaryDept;
  dateLabel: string;
  timeLabel: string;
  dateKey: string;
  branches: BranchRow[];
  total: Omit<BranchRow, 'branch_code' | 'branch_name'>;
  oldest: OldTicket[];
  closers: Closer[];
}

// ---------------------------------------------------------------- data
// "วันนี้" = ย้อนหลัง 24 ชม. จากเวลาที่สรุป (ส่ง 22:00 → นับ 22:00 เมื่อวาน–22:00 วันนี้ ไม่มีช่วงตกหล่น)
export async function buildSummary(dept: SummaryDept, now = new Date()): Promise<DailySummary> {
  const since = new Date(now.getTime() - 24 * 3600 * 1000);
  const rows = await sql`
    select b.branch_code, b.branch_name_en as branch_name,
      count(t.ticket_id) filter (where t.status <> 'CANCELLED' and t.created_at > ${since} and t.created_at <= ${now})::int as new_today,
      count(t.ticket_id) filter (where t.status in ('RESOLVED','APPROVED')
                                   and t.resolved_at > ${since} and t.resolved_at <= ${now})::int as done_today,
      count(t.ticket_id) filter (where t.status = 'PENDING')::int as not_accepted,
      count(t.ticket_id) filter (where t.status in ('ACCEPTED','IN_PROGRESS','PAUSED'))::int as in_progress,
      count(t.ticket_id) filter (where t.status = 'RESOLVED')::int as awaiting,
      count(t.ticket_id) filter (where t.status = any(${OPEN}))::int as open_total,
      count(t.ticket_id) filter (where t.status = any(${OPEN}) and t.sla_deadline < now())::int as overdue
    from fixhub.branches b
    left join fixhub.tickets t on t.branch_code = b.branch_code and t.reporter_department = ${dept}
    where b.active
    group by b.branch_code, b.branch_name_en, b.sort_order
    order by b.sort_order`;

  const branches = rows as unknown as BranchRow[];
  const keys = ['new_today', 'done_today', 'not_accepted', 'in_progress', 'awaiting', 'open_total', 'overdue'] as const;
  const total = Object.fromEntries(keys.map(k => [k, branches.reduce((s, b) => s + (b[k] || 0), 0)])) as DailySummary['total'];

  const oldest = await sql`
    select t.ticket_number, t.branch_code, t.location_detail, t.description, t.status, t.created_at,
           t.sla_deadline, t.technician_name, (t.sla_deadline is not null and t.sla_deadline < now()) as overdue
    from fixhub.tickets_full t
    where t.reporter_department = ${dept} and t.status = any(${OPEN})
    order by (t.sla_deadline is not null and t.sla_deadline < now()) desc, t.created_at asc
    limit 6`;

  const closers = await sql`
    select coalesce(p.full_name, p.username) as name, count(*)::int as n
    from fixhub.tickets t join fixhub.profiles p on p.user_id = t.resolved_by
    where t.reporter_department = ${dept} and t.status in ('RESOLVED','APPROVED')
      and t.resolved_at > ${since} and t.resolved_at <= ${now}
    group by p.user_id, p.full_name, p.username
    order by n desc, name limit 8`;

  const dateLabel = now.toLocaleDateString('th-TH', { timeZone: BKK, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeLabel = now.toLocaleTimeString('th-TH', { timeZone: BKK, hour: '2-digit', minute: '2-digit' });
  const dateKey = new Intl.DateTimeFormat('en-CA', { timeZone: BKK }).format(now); // YYYY-MM-DD

  return { dept, dateLabel, timeLabel, dateKey, branches, total, oldest: oldest as unknown as OldTicket[], closers: closers as unknown as Closer[] };
}

// ---------------------------------------------------------------- svg helpers
const C = {
  bg: '#0b1220', panel: '#121b2e', panel2: '#17223a', line: '#24314d',
  text: '#e8edf7', sub: '#94a3c4', gold: '#e5b840', green: '#34c47c', red: '#ef5350', amber: '#f5a524', blue: '#5b9cff',
};
// สระอำ (U+0E33) ใน resvg + Sarabun: ตัว "า" หายเหลือแต่นิคหิต (เช่น "ประจำ" → "ประจํ")
//   → แยกเป็น นิคหิต (U+0E4D) + สระอา (U+0E32) ก่อนวาด ซึ่งเป็นรูปแบบที่ฟอนต์จัดตำแหน่งได้ถูก
const thaiFix = (s: string) => s.replace(/\u0E33/g, '\u0E4D\u0E32');
const esc = (s: string) => thaiFix(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const seg = typeof Intl !== 'undefined' && (Intl as any).Segmenter ? new (Intl as any).Segmenter('th', { granularity: 'grapheme' }) : null;
function clip(s: string, max: number) {
  const g: string[] = seg ? Array.from(seg.segment(s || ''), (x: any) => x.segment) : Array.from(s || '');
  return g.length > max ? g.slice(0, max - 1).join('') + '…' : g.join('');
}
function txt(x: number, y: number, s: string, size = 26, color = C.text, weight = 400, anchor: 'start' | 'middle' | 'end' = 'start') {
  return `<text x="${x}" y="${y}" font-family="Sarabun" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}">${esc(s)}</text>`;
}
function age(fromIso: string, now: Date) {
  const mins = Math.max(0, Math.round((now.getTime() - new Date(fromIso).getTime()) / 60000));
  const d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60);
  return d > 0 ? `${d} วัน ${h} ชม.` : h > 0 ? `${h} ชม.` : `${mins} นาที`;
}
function graphemes(s: string) { return seg ? Array.from(seg.segment(s)).length : Array.from(s).length; }
/** Drop role suffix like "(ช่าง)" and honorifics for compact display. */
function shortName(n: string) { return (n || '').replace(/\s*\(.*?\)\s*$/, '').replace(/^(นาย|นางสาว|นาง|Mr\.?|Mrs\.?|Ms\.?)\s*/i, ''); }
const STATUS_TH: Record<string, string> = { PENDING: 'ยังไม่มีคนรับ', ACCEPTED: 'รับแล้ว', IN_PROGRESS: 'กำลังทำ', PAUSED: 'พักงาน' };

// ---------------------------------------------------------------- render
export function renderSummarySvg(s: DailySummary, now = new Date()): { svg: string; width: number; height: number } {
  const W = 1200, P = 40;
  const deptTh = s.dept === 'IT' ? 'ไอที' : 'ช่าง';
  const accent = s.dept === 'IT' ? C.blue : C.gold;
  const parts: string[] = [];
  let y = 0;

  // header
  parts.push(`<rect x="0" y="0" width="${W}" height="128" fill="${C.panel}"/>`);
  parts.push(`<rect x="0" y="124" width="${W}" height="4" fill="${accent}"/>`);
  parts.push(txt(P, 58, `สรุปงาน${deptTh}ประจำวัน`, 40, C.text, 700));
  parts.push(txt(P, 100, `${s.dateLabel} · ข้อมูล ณ ${s.timeLabel} น.`, 24, C.sub));
  parts.push(txt(W - P, 58, 'Bellas FixHub', 30, accent, 700, 'end'));
  parts.push(txt(W - P, 100, 'Bella Villa Pattaya Group', 22, C.sub, 400, 'end'));
  y = 160;

  // KPI tiles
  const tiles = [
    { label: 'แจ้งใหม่ 24 ชม.', v: s.total.new_today, color: C.text },
    { label: 'ซ่อมเสร็จ 24 ชม.', v: s.total.done_today, color: C.green },
    { label: 'งานค้างทั้งหมด', v: s.total.open_total, color: s.total.open_total ? C.amber : C.green },
    { label: 'เกิน SLA', v: s.total.overdue, color: s.total.overdue ? C.red : C.green },
  ];
  const tw = (W - P * 2 - 3 * 20) / 4;
  tiles.forEach((t, i) => {
    const x = P + i * (tw + 20);
    parts.push(`<rect x="${x}" y="${y}" width="${tw}" height="120" rx="16" fill="${C.panel}" stroke="${C.line}"/>`);
    parts.push(txt(x + 24, y + 42, t.label, 24, C.sub));
    parts.push(txt(x + 24, y + 98, String(t.v), 52, t.color, 700));
  });
  y += 150;

  // branch table
  const cols = [
    { k: 'branch', label: 'สาขา', w: 300, align: 'start' as const },
    { k: 'new_today', label: 'แจ้งใหม่', w: 110 },
    { k: 'done_today', label: 'เสร็จ', w: 110 },
    { k: 'not_accepted', label: 'ยังไม่รับ', w: 110 },
    { k: 'in_progress', label: 'กำลังทำ', w: 110 },
    { k: 'awaiting', label: 'รอตรวจ', w: 100 },
    { k: 'open_total', label: 'ค้างรวม', w: 100 },
    { k: 'overdue', label: 'เกิน SLA', w: 180 },
  ];
  const tableW = W - P * 2;
  const rowH = 56;
  const rowsAll = [...s.branches, { branch_code: 'รวม', branch_name: 'ทุกสาขา', ...s.total } as BranchRow];
  const tableH = rowH * (rowsAll.length + 1) + 8;
  parts.push(`<rect x="${P}" y="${y}" width="${tableW}" height="${tableH}" rx="16" fill="${C.panel}" stroke="${C.line}"/>`);
  // header row
  let cx = P + 24;
  cols.forEach(c => {
    const ax = c.align === 'start' ? cx : cx + c.w / 2;
    parts.push(txt(ax, y + 38, c.label, 22, C.sub, 700, c.align || 'middle'));
    cx += c.w;
  });
  y += rowH;
  rowsAll.forEach((r, idx) => {
    const isTotal = idx === rowsAll.length - 1;
    if (isTotal) parts.push(`<rect x="${P}" y="${y}" width="${tableW}" height="${rowH}" fill="${C.panel2}"/>`);
    parts.push(`<line x1="${P + 16}" x2="${P + tableW - 16}" y1="${y}" y2="${y}" stroke="${C.line}"/>`);
    let x = P + 24;
    const by = y + 37;
    cols.forEach(c => {
      if (c.k === 'branch') {
        parts.push(txt(x, by, r.branch_code, 26, isTotal ? C.gold : accent, 700));
        parts.push(txt(x + 64, by, clip(r.branch_name, 20), 22, isTotal ? C.gold : C.text, isTotal ? 700 : 400));
      } else {
        const v = (r as any)[c.k] as number;
        let color = C.text, weight = isTotal ? 700 : 400;
        if (c.k === 'overdue' && v > 0) { color = C.red; weight = 700; }
        else if (c.k === 'not_accepted' && v > 0) { color = C.amber; weight = 700; }
        else if (c.k === 'done_today' && v > 0) color = C.green;
        else if (v === 0) color = '#56627d';
        const cxm = x + c.w / 2;
        if (c.k === 'overdue' && v > 0) {
          parts.push(`<rect x="${cxm - 34}" y="${y + 10}" width="68" height="36" rx="18" fill="${C.red}" fill-opacity="0.18"/>`);
        }
        if (c.k === 'overdue' && v === 0 && r.open_total === 0) {
          parts.push(txt(cxm, by, 'ไม่มีค้าง', 20, C.green, 700, 'middle'));
        } else {
          parts.push(txt(cxm, by, String(v), 26, color, weight, 'middle'));
        }
      }
      x += c.w;
    });
    y += rowH;
  });
  y += 70;

  // oldest open tickets
  parts.push(txt(P, y, 'งานค้างที่ต้องเร่ง (เกิน SLA / ค้างนานที่สุด)', 28, C.text, 700));
  y += 22;
  if (s.oldest.length === 0) {
    parts.push(`<rect x="${P}" y="${y}" width="${tableW}" height="70" rx="14" fill="${C.panel}" stroke="${C.line}"/>`);
    parts.push(txt(P + 24, y + 45, 'ไม่มีงานค้าง — เยี่ยมมาก', 26, C.green, 700));
    y += 90;
  } else {
    const ih = 92;
    parts.push(`<rect x="${P}" y="${y}" width="${tableW}" height="${ih * s.oldest.length + 8}" rx="14" fill="${C.panel}" stroke="${C.line}"/>`);
    s.oldest.forEach((t, i) => {
      const ty = y + i * ih;
      if (i > 0) parts.push(`<line x1="${P + 16}" x2="${P + tableW - 16}" y1="${ty + 4}" y2="${ty + 4}" stroke="${C.line}"/>`);
      parts.push(`<rect x="${P + 18}" y="${ty + 22}" width="8" height="56" rx="4" fill="${t.overdue ? C.red : C.amber}"/>`);
      parts.push(txt(P + 42, ty + 44, t.ticket_number, 22, accent, 700));
      parts.push(txt(P + 42, ty + 78, clip(`${t.location_detail} · ${t.description}`, 50), 22, C.text));
      const who = t.technician_name ? `${clip(shortName(t.technician_name), 18)} · ${STATUS_TH[t.status] || t.status}` : (STATUS_TH[t.status] || t.status);
      parts.push(txt(P + tableW - 24, ty + 44, `ค้าง ${age(t.created_at, now)}`, 22, t.overdue ? C.red : C.amber, 700, 'end'));
      parts.push(txt(P + tableW - 24, ty + 78, who, 20, C.sub, 400, 'end'));
    });
    y += ih * s.oldest.length + 70;
  }

  // closers (wraps to more lines; nobody is dropped)
  parts.push(txt(P, y, 'ปิดงาน 24 ชม. ล่าสุด', 28, C.text, 700));
  y += 22;
  if (s.closers.length === 0) {
    parts.push(`<rect x="${P}" y="${y}" width="${tableW}" height="70" rx="14" fill="${C.panel}" stroke="${C.line}"/>`);
    parts.push(txt(P + 24, y + 45, 'ยังไม่มีการปิดงานใน 24 ชม.', 24, C.sub));
    y += 110;
  } else {
    const chips: { x: number; row: number; w: number; label: string }[] = [];
    let x = P + 24, row = 0;
    for (const c of s.closers) {
      const label = `${clip(shortName(c.name), 18)}  ${c.n} งาน`;
      const w = 40 + graphemes(label) * 14;
      if (x + w > P + tableW - 20) { row++; x = P + 24; }
      chips.push({ x, row, w, label });
      x += w + 12;
    }
    const boxH = 30 + (row + 1) * 52;
    parts.push(`<rect x="${P}" y="${y}" width="${tableW}" height="${boxH}" rx="14" fill="${C.panel}" stroke="${C.line}"/>`);
    for (const c of chips) {
      const cy = y + 15 + c.row * 52;
      parts.push(`<rect x="${c.x}" y="${cy}" width="${c.w}" height="40" rx="20" fill="${C.green}" fill-opacity="0.15"/>`);
      parts.push(txt(c.x + 18, cy + 28, c.label, 22, C.green, 700));
    }
    y += boxH + 50;
  }

  // footer
  parts.push(txt(P, y, 'รับงานและอัปเดตสถานะในระบบทุกครั้ง · bellafixhub.bellavillapattaya.com', 20, C.sub));
  const H = y + 36;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
    + `<rect width="${W}" height="${H}" fill="${C.bg}"/>${parts.join('')}</svg>`;
  return { svg, width: W, height: H };
}

const FONT_DIR = path.join(process.cwd(), 'lib', 'fonts');
export function renderSummaryPng(s: DailySummary, now = new Date()): Buffer {
  const { svg } = renderSummarySvg(s, now);
  const r = new Resvg(svg, {
    font: {
      fontFiles: [path.join(FONT_DIR, 'Sarabun-Regular.ttf'), path.join(FONT_DIR, 'Sarabun-Bold.ttf')],
      loadSystemFonts: false,
      defaultFontFamily: 'Sarabun',
    },
    fitTo: { mode: 'width', value: 1200 },
  });
  return r.render().asPng();
}

// ---------------------------------------------------------------- รูปรายงานรายสาขา (เลือกสาขา + วัน)
// แบบเดียวกับรูป 22:00 แต่เจาะสาขาเดียว: ตัวเลขใหญ่ + ทุกใบงานของวันนั้นพร้อมรายละเอียด + งานค้างยกมา
export type DayDept = SummaryDept | 'ALL';
export interface DayTicket {
  ticket_number: string; created_at: string; location_detail: string; description: string; status: string;
  technician_name: string | null; resolved_at: string | null; sla_deadline: string | null; dept_type: string | null; overdue: boolean;
}
export interface BranchDay {
  dept: DayDept; branch_code: string; branch_name: string; dateKey: string; dateLabel: string; timeLabel: string;
  kpi: { reported: number; done: number; open_total: number; overdue: number; cancelled: number };
  day: DayTicket[]; carried: DayTicket[];
}

export async function buildBranchDay(dept: DayDept, branch: string, dateKey: string, now = new Date()): Promise<BranchDay> {
  const deptFrag = dept === 'ALL' ? sql`` : sql`and t.reporter_department = ${dept}`;
  const [b] = await sql`select branch_code, branch_name_en as branch_name from fixhub.branches where branch_code = ${branch}`;
  const day = await sql`
    select t.ticket_number, t.created_at, t.location_detail, t.description, t.status, t.technician_name, t.resolved_at,
           t.sla_deadline, t.dept_type, (t.status = any(${OPEN}) and t.sla_deadline is not null and t.sla_deadline < now()) as overdue
    from fixhub.tickets_full t
    where t.branch_code = ${branch} ${deptFrag} and (t.created_at at time zone ${BKK})::date = ${dateKey}::date
    order by t.created_at`;
  const carried = await sql`
    select t.ticket_number, t.created_at, t.location_detail, t.description, t.status, t.technician_name, t.resolved_at,
           t.sla_deadline, t.dept_type, (t.sla_deadline is not null and t.sla_deadline < now()) as overdue
    from fixhub.tickets_full t
    where t.branch_code = ${branch} ${deptFrag} and t.status = any(${OPEN}) and (t.created_at at time zone ${BKK})::date < ${dateKey}::date
    order by t.created_at limit 12`;
  const [k] = await sql`
    select
      count(*) filter (where (t.created_at at time zone ${BKK})::date = ${dateKey}::date and t.status <> 'CANCELLED')::int as reported,
      count(*) filter (where (t.created_at at time zone ${BKK})::date = ${dateKey}::date and t.status = 'CANCELLED')::int as cancelled,
      count(*) filter (where t.status in ('RESOLVED','APPROVED') and (t.resolved_at at time zone ${BKK})::date = ${dateKey}::date)::int as done,
      count(*) filter (where t.status = any(${OPEN}))::int as open_total,
      count(*) filter (where t.status = any(${OPEN}) and t.sla_deadline < now())::int as overdue
    from fixhub.tickets t where t.branch_code = ${branch} ${deptFrag}`;
  const d = new Date(`${dateKey}T12:00:00+07:00`);
  return {
    dept, branch_code: branch, branch_name: b?.branch_name || branch, dateKey,
    dateLabel: d.toLocaleDateString('th-TH', { timeZone: BKK, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    timeLabel: now.toLocaleTimeString('th-TH', { timeZone: BKK, hour: '2-digit', minute: '2-digit' }),
    kpi: k as any, day: day as unknown as DayTicket[], carried: carried as unknown as DayTicket[],
  };
}

const ST_ALL: Record<string, { th: string; color: string }> = {
  PENDING: { th: 'ยังไม่มีคนรับ', color: C.amber }, ACCEPTED: { th: 'รับงานแล้ว', color: C.blue },
  IN_PROGRESS: { th: 'กำลังทำ', color: C.blue }, PAUSED: { th: 'พักงาน', color: C.amber },
  RESOLVED: { th: 'ซ่อมเสร็จ · รอตรวจ', color: C.green }, APPROVED: { th: 'อนุมัติแล้ว', color: C.green },
  CANCELLED: { th: 'ยกเลิก', color: '#6b7896' },
};
const dm = (iso: string) => new Date(iso).toLocaleDateString('th-TH', { timeZone: BKK, day: 'numeric', month: 'short' });
const hm = (iso: string) => new Date(iso).toLocaleTimeString('th-TH', { timeZone: BKK, hour: '2-digit', minute: '2-digit' });

export function renderBranchDaySvg(s: BranchDay, now = new Date()) {
  const W = 1200, P = 40, tableW = W - P * 2;
  const deptTh = s.dept === 'IT' ? 'งานไอที' : s.dept === 'MAINT' ? 'งานช่าง' : 'งานช่างและไอที';
  const accent = s.dept === 'IT' ? C.blue : C.gold;
  const parts: string[] = [];
  let y = 0;

  parts.push(`<rect x="0" y="0" width="${W}" height="150" fill="${C.panel}"/>`);
  parts.push(`<rect x="0" y="146" width="${W}" height="4" fill="${accent}"/>`);
  parts.push(txt(P, 62, `สรุป${deptTh} · สาขา ${s.branch_code}`, 42, C.text, 700));
  parts.push(txt(P, 100, clip(s.branch_name, 40), 26, accent, 700));
  parts.push(txt(P, 134, `${s.dateLabel} · ข้อมูล ณ ${s.timeLabel} น.`, 22, C.sub));
  parts.push(txt(W - P, 62, 'Bellas FixHub', 30, accent, 700, 'end'));
  parts.push(txt(W - P, 100, 'Bella Villa Pattaya Group', 22, C.sub, 400, 'end'));
  y = 180;

  // ตัวเลขใหญ่
  const tiles = [
    { label: 'แจ้งซ่อมวันนี้', v: s.kpi.reported, color: C.text },
    { label: 'ซ่อมเสร็จวันนี้', v: s.kpi.done, color: C.green },
    { label: 'ค้างรวมทั้งหมด', v: s.kpi.open_total, color: s.kpi.open_total ? C.amber : C.green },
    { label: 'เกิน SLA', v: s.kpi.overdue, color: s.kpi.overdue ? C.red : C.green },
  ];
  const tw = (W - P * 2 - 3 * 20) / 4;
  tiles.forEach((t, i) => {
    const x = P + i * (tw + 20);
    parts.push(`<rect x="${x}" y="${y}" width="${tw}" height="190" rx="20" fill="${C.panel}" stroke="${i === 2 && t.v ? C.amber : C.line}" stroke-width="${i === 2 && t.v ? 3 : 1}"/>`);
    parts.push(txt(x + tw / 2, y + 48, t.label, 28, C.sub, 700, 'middle'));
    parts.push(txt(x + tw / 2, y + 150, String(t.v), 96, t.color, 700, 'middle'));
  });
  y += 220;
  if (s.kpi.cancelled) { parts.push(txt(P, y, `ยกเลิก ${s.kpi.cancelled} ใบ (ไม่นับในยอดแจ้ง)`, 20, C.sub)); y += 30; }
  y += 30;

  const ticketList = (title: string, list: DayTicket[], empty: string, showAge: boolean) => {
    parts.push(txt(P, y, title, 30, C.text, 700));
    y += 22;
    if (!list.length) {
      parts.push(`<rect x="${P}" y="${y}" width="${tableW}" height="76" rx="14" fill="${C.panel}" stroke="${C.line}"/>`);
      parts.push(txt(P + 24, y + 48, empty, 26, C.green, 700));
      y += 76 + 60;
      return;
    }
    const ih = 112;
    parts.push(`<rect x="${P}" y="${y}" width="${tableW}" height="${ih * list.length + 8}" rx="14" fill="${C.panel}" stroke="${C.line}"/>`);
    list.forEach((t, i) => {
      const ty = y + i * ih;
      const st = ST_ALL[t.status] || { th: t.status, color: C.sub };
      const bar = t.overdue ? C.red : st.color;
      if (i > 0) parts.push(`<line x1="${P + 16}" x2="${P + tableW - 16}" y1="${ty + 4}" y2="${ty + 4}" stroke="${C.line}"/>`);
      parts.push(`<rect x="${P + 18}" y="${ty + 22}" width="8" height="74" rx="4" fill="${bar}"/>`);
      parts.push(txt(P + 42, ty + 46, `${t.ticket_number}  ·  ${showAge ? dm(t.created_at) + ' ' : ''}${hm(t.created_at)} น.`, 22, accent, 700));
      parts.push(txt(P + 42, ty + 86, clip(`${t.location_detail} · ${t.description}`, 46), 24, C.text));
      // ป้ายสถานะขวาบน
      const label = t.overdue ? `${st.th} · เกิน SLA` : st.th;
      const pw = 24 + graphemes(label) * 13;
      parts.push(`<rect x="${P + tableW - 24 - pw}" y="${ty + 20}" width="${pw}" height="36" rx="18" fill="${bar}" fill-opacity="0.18"/>`);
      parts.push(txt(P + tableW - 24 - pw / 2, ty + 45, label, 20, bar, 700, 'middle'));
      const who = t.technician_name ? `ช่าง ${clip(shortName(t.technician_name), 18)}` : '';
      const tail = showAge ? `ค้าง ${age(t.created_at, now)}` : (t.resolved_at && ['RESOLVED', 'APPROVED'].includes(t.status) ? `เสร็จ ${hm(t.resolved_at)} น.` : '');
      parts.push(txt(P + tableW - 24, ty + 88, [who, tail].filter(Boolean).join('  ·  '), 20, C.sub, 400, 'end'));
    });
    y += ih * list.length + 70;
  };

  const MAX = 60;
  const shown = s.day.slice(0, MAX);
  ticketList(`งานทุกใบของวันนี้ (${s.day.length} ใบ)`, shown, 'ไม่มีการแจ้งซ่อมในวันนี้', false);
  if (s.day.length > MAX) { parts.push(txt(P, y - 40, `… และอีก ${s.day.length - MAX} ใบ ดูทั้งหมดในหน้ารายงาน`, 22, C.sub)); }
  ticketList(`งานค้างยกมาจากวันก่อน (${s.carried.length}${s.carried.length >= 12 ? '+' : ''} ใบ)`, s.carried, 'ไม่มีงานค้างจากวันก่อน', true);

  parts.push(txt(P, y, 'รับงานและอัปเดตสถานะในระบบทุกครั้ง · bellafixhub.bellavillapattaya.com', 20, C.sub));
  const H = y + 36;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
    + `<rect width="${W}" height="${H}" fill="${C.bg}"/>${parts.join('')}</svg>`;
  return { svg, width: W, height: H };
}

export function renderBranchDayPng(s: BranchDay, now = new Date()): Buffer {
  const { svg } = renderBranchDaySvg(s, now);
  const r = new Resvg(svg, {
    font: { fontFiles: [path.join(FONT_DIR, 'Sarabun-Regular.ttf'), path.join(FONT_DIR, 'Sarabun-Bold.ttf')], loadSystemFonts: false, defaultFontFamily: 'Sarabun' },
    fitTo: { mode: 'width', value: 1200 },
  });
  return r.render().asPng();
}

// ---------------------------------------------------------------- text + delivery
export function summaryText(s: DailySummary, link: string): string {
  const deptTh = s.dept === 'IT' ? 'ไอที' : 'ช่าง';
  const hot = s.branches.filter(b => b.overdue > 0).sort((a, b) => b.overdue - a.overdue).map(b => `${b.branch_code}(${b.overdue})`);
  const waiting = s.branches.filter(b => b.not_accepted > 0).map(b => `${b.branch_code}(${b.not_accepted})`);
  const lines = [
    `📊 สรุปงาน${deptTh} ${s.dateLabel}`,
    `(24 ชม.) แจ้งใหม่ ${s.total.new_today} · เสร็จ ${s.total.done_today} · ค้าง ${s.total.open_total} · เกิน SLA ${s.total.overdue}`,
  ];
  if (hot.length) lines.push(`🔴 เร่งด่วน: ${hot.join(' ')}`);
  if (waiting.length) lines.push(`⏳ ยังไม่มีคนรับ: ${waiting.join(' ')}`);
  if (!s.total.open_total) lines.push('✅ ไม่มีงานค้าง');
  lines.push(`🔗 ${link}`);
  return lines.join('\n');
}

export async function uploadSummaryPng(png: Buffer, s: DailySummary): Promise<string> {
  const supabase = supabaseAdmin();
  const p = `reports/daily/${s.dateKey}-${s.dept}-${Date.now()}.png`;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(p, png, { contentType: 'image/png', upsert: true, cacheControl: '86400' });
  if (error) throw new Error(`upload summary failed: ${error.message}`);
  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(p).data.publicUrl;
}

/** Build → render → upload → push [image, text] in ONE request (counts once per recipient). */
export async function sendDailySummary(dept: SummaryDept, opts: { to?: string } = {}) {
  const cfg = await getLineConfig();
  const to = opts.to || (dept === 'IT' ? cfg.targetIdIT : cfg.targetIdMaint);
  if (!cfg.accessToken || !to) return { dept, sent: false, reason: 'LINE not configured' };

  const s = await buildSummary(dept);
  const png = renderSummaryPng(s);
  const url = await uploadSummaryPng(png, s);
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://bellafixhub.bellavillapattaya.com';
  const text = summaryText(s, `${base}/dashboard/reports`);

  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.accessToken}` },
    body: JSON.stringify({
      to,
      messages: [
        { type: 'image', originalContentUrl: url, previewImageUrl: url },
        { type: 'text', text },
      ],
    }),
  });
  const body = await res.json().catch(() => ({}));
  return { dept, sent: res.ok, status: res.status, image: url, bytes: png.length, error: res.ok ? undefined : body };
}
