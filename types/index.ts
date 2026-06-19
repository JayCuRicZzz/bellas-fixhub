export interface User {
  id: number;
  user_id?: number;
  username: string;
  password?: string;
  full_name: string;
  role: string;
  branch_code: string;
  department?: string;
  branches?: string[];
}

export interface Category {
  category_id: number;
  main_th: string;
  main_en?: string;
  sub_th: string;
  sub_en?: string;
  dept_type: string;
}

export interface Ticket {
  ticket_id: number;
  ticket_number: string;
  branch_code: string;
  category_id: number;
  reporter_id: number;
  location_detail: string;
  description: string;
  status: 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'RESOLVED' | 'APPROVED' | 'CANCELLED';
  priority: 'non_urgent' | 'low' | 'medium' | 'high' | 'urgent';
  difficulty?: 'easy' | 'medium' | 'hard' | 'very_hard';
  technician_id: number | null;
  pending_reason: string | null;
  kpi_rating: number | null;
  image_url: string | null;
  images?: string[];
  accepted_at: string | null;
  resolved_at: string | null;
  approved_at: string | null;
  sla_deadline: string | null;
  sla_minutes: number | null;
  sla_overdue?: boolean;
  accepted_by: number | null;
  resolved_by: number | null;
  approved_by: number | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  main_th?: string;
  sub_th?: string;
  dept_type?: string;
  reporter_department?: string;
  reporter_name?: string;
  technician_name?: string;
  accepted_by_name?: string;
  resolved_by_name?: string;
  approved_by_name?: string;
}

export interface Branch {
  branch_code: string;
  branch_name: string;
  branch_name_en: string;
}

export interface TicketFormData {
  branch_code: string;
  category_id: number;
  location_detail: string;
  description: string;
  priority: 'non_urgent' | 'low' | 'medium' | 'high' | 'urgent';
  difficulty?: 'easy' | 'medium' | 'hard' | 'very_hard';
}

export interface LoginFormData {
  username: string;
  password: string;
}

export interface DailyReport {
  total: number;
  success: number;
  pending: number;
  inProgress: number;
  completed: number;
  resolved?: number;
  byDepartment: { name: string; count: number }[];
  byBranch: { name: string; count: number }[];
  byStatus: { name: string; count: number }[];
  slaCompliance?: { on_time: number; overdue: number; total: number };
  pending_details: any[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  ticketPreview?: Partial<Ticket>;
}

export const BRANCHES: Branch[] = [
  { branch_code: 'BV', branch_name: 'BellaVilla', branch_name_en: 'BellaVilla' },
  { branch_code: 'BP', branch_name: 'BellaVilla Prima', branch_name_en: 'BellaVilla Prima' },
  { branch_code: 'BC', branch_name: 'BellaVilla Cabana', branch_name_en: 'BellaVilla Cabana' },
  { branch_code: 'BM', branch_name: 'BellaVilla Metro', branch_name_en: 'BellaVilla Metro' },
  { branch_code: 'BB', branch_name: 'Best Bella Pattaya', branch_name_en: 'Best Bella Pattaya' },
  { branch_code: 'BE', branch_name: 'BellaVilla Express', branch_name_en: 'BellaVilla Express' },
  { branch_code: 'GB', branch_name: 'Grand Bella Pattaya', branch_name_en: 'Grand Bella Pattaya' },
];

export interface Department {
  code: string;
  name_th: string;
  name_en: string;
  icon: string;
  color: string;
}

export const DEPARTMENTS: Department[] = [
  { code: 'MAINTENANCE', name_th: 'ช่าง', name_en: 'Maintenance', icon: '🔧', color: 'text-orange-400' },
  { code: 'IT', name_th: 'ไอที', name_en: 'IT', icon: '💻', color: 'text-blue-400' },
  { code: 'ACC', name_th: 'บัญชี', name_en: 'Accounting', icon: '📊', color: 'text-emerald-400' },
  { code: 'MK', name_th: 'การตลาด', name_en: 'Marketing', icon: '📢', color: 'text-pink-400' },
  { code: 'HK', name_th: 'แม่บ้าน', name_en: 'Housekeeping', icon: '🧹', color: 'text-cyan-400' },
  { code: 'FO', name_th: 'ฟร้อนท์', name_en: 'Front Office', icon: '🏨', color: 'text-purple-400' },
  { code: 'FB', name_th: 'อาหารและเครื่องดื่ม', name_en: 'Food & Beverage', icon: '🍽️', color: 'text-yellow-400' },
  { code: 'GE', name_th: 'แผนกทั่วไป', name_en: 'General', icon: '⚙️', color: 'text-slate-400' },
  { code: 'GM', name_th: 'ผู้จัดการ', name_en: 'General Manager', icon: '👔', color: 'text-gold-400' },
];

export function getDepartmentByCode(code: string): Department | undefined {
  return DEPARTMENTS.find(d => d.code === code);
}

export const STATUS_LABELS: Record<string, string> = {
  PENDING: 'รอดำเนินการ',
  ACCEPTED: 'รับงานแล้ว',
  IN_PROGRESS: 'กำลังดำเนินการ',
  RESOLVED: 'ดำเนินการเสร็จ',
  APPROVED: 'อนุมัติแล้ว',
  CANCELLED: 'ยกเลิก',
};

export const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  ACCEPTED: 'bg-blue-100 text-blue-800 border-blue-300',
  IN_PROGRESS: 'bg-purple-100 text-purple-800 border-purple-300',
  RESOLVED: 'bg-green-100 text-green-800 border-green-300',
  APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  CANCELLED: 'bg-red-100 text-red-800 border-red-300',
};

export const PRIORITY_LABELS: Record<string, string> = {
  non_urgent: 'ไม่เร่งด่วน',
  low: 'น้อย',
  medium: 'ปานกลาง',
  high: 'สูง',
  urgent: 'ด่วนมาก',
};

export const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-600',
  urgent: 'bg-red-100 text-red-600',
};

export const DIFFICULTY_LABELS: Record<string, { th: string; en: string }> = {
  easy: { th: 'ง่าย', en: 'Easy' },
  medium: { th: 'ปานกลาง', en: 'Medium' },
  hard: { th: 'ยาก', en: 'Hard' },
  very_hard: { th: 'ยากมาก', en: 'Very Hard' },
};

export const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-green-500/10 text-green-400 border-green-500/30',
  medium: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  hard: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  very_hard: 'bg-red-500/10 text-red-400 border-red-500/30',
};

export const DEPARTMENT_NAMES: Record<string, string> = {
  'ช่าง': 'ฝ่ายช่าง',
  'ไอที': 'ฝ่ายไอที',
};
