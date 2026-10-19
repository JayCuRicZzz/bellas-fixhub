// แผนกของผู้ใช้ FixHub — รหัสตรงกับ Bella HR (public.departments) เพื่อให้ซิงก์จาก HR กับตั้งค่าเองเป็นค่าเดียวกัน
// ยกเว้น MAINT / IT = "แผนกงาน" ที่ระบบใช้กรองใบงาน (HR รหัส EN ถูกแปลงเป็น MAINT ผ่าน hr_role_map)
// BB (เบลบอย) ไม่มีใน HR — ใช้ได้เฉพาะบัญชีที่แอดมินตั้งเอง
export const DEPARTMENTS: { code: string; th: string }[] = [
  { code: 'MAINT', th: 'ช่าง' },
  { code: 'IT', th: 'ไอที' },
  { code: 'FO', th: 'ต้อนรับ' },
  { code: 'BB', th: 'เบลบอย' },
  { code: 'HK', th: 'แม่บ้าน' },
  { code: 'FB', th: 'ห้องอาหารและบาร์' },
  { code: 'MK', th: 'ครัว' },
  { code: 'ACC', th: 'บัญชีและการเงิน' },
  { code: 'PU', th: 'จัดซื้อ' },
  { code: 'HR', th: 'ฝ่ายบุคคล' },
  { code: 'GE', th: 'ทั่วไป/สวน' },
  { code: 'DR', th: 'พนักงานขับรถ' },
  { code: 'EXEC', th: 'ฝ่ายบริหาร' },
  { code: 'ADMIN', th: 'ผู้ดูแลระบบ' },
];

// ชื่อเรียกอื่นที่เคยถูกบันทึกไว้ (ค่าเก่า / รหัส HR)
const ALIASES: Record<string, string> = {
  EN: 'ช่าง', MAINTENANCE: 'ช่าง', GM: 'ฝ่ายบริหาร', 'ช่าง': 'ช่าง', 'ไอที': 'ไอที', 'ทั่วไป': 'ทั่วไป',
};

export const DEPT_CODES = new Set(DEPARTMENTS.map(d => d.code));

/** รหัสแผนก → ชื่อไทย (ไม่รู้จัก = คืนค่าเดิม) */
export function deptTh(code?: string | null): string {
  if (!code) return '';
  const up = code.toUpperCase();
  return DEPARTMENTS.find(d => d.code === up)?.th || ALIASES[up] || ALIASES[code] || code;
}
