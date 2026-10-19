import { deptTh } from './departments';

// ข้อความ "งานแจ้งซ่อมใหม่" — ใช้ร่วมกันระหว่าง LINE อัตโนมัติ (POST /api/tickets)
// กับปุ่ม "คัดลอก" ในหน้าใบงาน เพื่อให้ข้อความสองทางเหมือนกันทุกตัวอักษร

export const PRIORITY_LINE: Record<string, string> = {
  urgent: '🔴 ด่วนมาก', high: '🟠 สูง', medium: '🔵 ปานกลาง', low: '⚪ น้อย', non_urgent: '⚫ ไม่เร่งด่วน',
};

/** "BV - ต้อนรับ" — สาขาและแผนกของผู้แจ้ง */
export function reporterOrigin(r: { branch_code?: string | null; department?: string | null; role?: string | null }) {
  const d = r.department ? deptTh(r.department) : (r.role === 'gm' ? 'ฝ่ายบริหาร' : '');
  return [r.branch_code, d].filter(Boolean).join(' - ') || '-';
}

export interface NewTicketLine {
  priority: string;
  ticketNumber: string;
  branchCode: string;
  locationDetail: string;
  assetLine?: string | null;
  description: string;
  reporterName: string;
  reporter: { branch_code?: string | null; department?: string | null; role?: string | null };
  alerts?: string[];
  statusLine?: string | null;
}

export function formatNewTicketLine(t: NewTicketLine): string {
  return [
    `📢 งานแจ้งซ่อมใหม่ ${PRIORITY_LINE[t.priority] || ''}`,
    `🔢 ${t.ticketNumber}`,
    `🏨 ${t.branchCode} 📍 ${t.locationDetail}`,
    ...(t.assetLine ? [t.assetLine] : []),
    `📝 ${t.description}`,
    `👤 ${t.reporterName} ( ${reporterOrigin(t.reporter)} )`,
    ...(t.statusLine ? [t.statusLine] : []),
    ...(t.alerts && t.alerts.length ? ['', ...t.alerts] : []),
  ].join('\n');
}

/** บรรทัดอุปกรณ์ เช่น "🧰 BV-AC-0012 แอร์ห้อง 305 (ยังอยู่ในประกัน — แจ้งผู้ขายก่อนซ่อมเอง)" */
export function assetLineOf(a: { asset_code: string; name: string; warranty_until?: string | Date | null } | null | undefined) {
  if (!a) return null;
  const inWarranty = a.warranty_until && new Date(a.warranty_until) >= new Date();
  return `🧰 ${a.asset_code} ${a.name}${inWarranty ? ' (ยังอยู่ในประกัน — แจ้งผู้ขายก่อนซ่อมเอง)' : ''}`;
}
