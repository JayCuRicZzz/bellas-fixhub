// ประเภทอุปกรณ์ (ใช้ทั้งฝั่ง server และหน้าเว็บ) — code ใช้เป็นส่วนหนึ่งของรหัสทรัพย์สิน เช่น BV-AC-0001
export interface AssetType { code: string; th: string; dept: 'MAINTENANCE' | 'IT'; icon: string; cat?: number }  // cat = หมวดงานเริ่มต้นตอนแจ้งซ่อมจาก QR

export const ASSET_TYPES: AssetType[] = [
  { cat: 1, code: 'AC', th: 'แอร์', dept: 'MAINTENANCE', icon: '❄️' },
  { cat: 2, code: 'FRIDGE', th: 'ตู้เย็น/มินิบาร์', dept: 'MAINTENANCE', icon: '🧊' },
  { cat: 3, code: 'WH', th: 'เครื่องทำน้ำอุ่น', dept: 'MAINTENANCE', icon: '🚿' },
  { cat: 3, code: 'PUMP', th: 'ปั๊มน้ำ', dept: 'MAINTENANCE', icon: '💧' },
  { cat: 8, code: 'POOL', th: 'ระบบสระว่ายน้ำ', dept: 'MAINTENANCE', icon: '🏊' },
  { cat: 7, code: 'LIFT', th: 'ลิฟต์', dept: 'MAINTENANCE', icon: '🛗' },
  { cat: 2, code: 'GEN', th: 'เครื่องปั่นไฟ', dept: 'MAINTENANCE', icon: '⚡' },
  { cat: 2, code: 'ELEC', th: 'ตู้ไฟ/ระบบไฟฟ้า', dept: 'MAINTENANCE', icon: '🔌' },
  { cat: 9, code: 'DOOR', th: 'ประตู/กุญแจ', dept: 'MAINTENANCE', icon: '🚪' },
  { cat: 6, code: 'FURN', th: 'เฟอร์นิเจอร์', dept: 'MAINTENANCE', icon: '🛏️' },
  { code: 'MOTH', th: 'อื่น ๆ (ช่าง)', dept: 'MAINTENANCE', icon: '🔧' },
  { cat: 18, code: 'PC', th: 'คอมพิวเตอร์', dept: 'IT', icon: '🖥️' },
  { cat: 18, code: 'NB', th: 'โน้ตบุ๊ก', dept: 'IT', icon: '💻' },
  { cat: 23, code: 'PRN', th: 'ปริ้นเตอร์', dept: 'IT', icon: '🖨️' },
  { cat: 16, code: 'AP', th: 'Wi-Fi Access Point', dept: 'IT', icon: '📶' },
  { cat: 15, code: 'NET', th: 'Router/Switch', dept: 'IT', icon: '🌐' },
  { cat: 19, code: 'CCTV', th: 'กล้องวงจรปิด', dept: 'IT', icon: '📹' },
  { cat: 19, code: 'NVR', th: 'เครื่องบันทึก NVR', dept: 'IT', icon: '💾' },
  { cat: 24, code: 'POS', th: 'เครื่อง POS', dept: 'IT', icon: '🧾' },
  { cat: 17, code: 'PHONE', th: 'โทรศัพท์/ตู้สาขา', dept: 'IT', icon: '☎️' },
  { cat: 20, code: 'TV', th: 'ทีวี/กล่องทีวี', dept: 'IT', icon: '📺' },
  { cat: 22, code: 'KEY', th: 'ระบบคีย์การ์ด', dept: 'IT', icon: '🔑' },
  { cat: 15, code: 'UPS', th: 'UPS', dept: 'IT', icon: '🔋' },
  { code: 'IOTH', th: 'อื่น ๆ (ไอที)', dept: 'IT', icon: '💡' },
];

export const assetTypeOf = (code: string) => ASSET_TYPES.find(t => t.code === code);
export const MANAGER_ROLES = ['admin', 'sup', 'supit'];
export const isAssetManager = (role?: string) => !!role && MANAGER_ROLES.includes(role);
