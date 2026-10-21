import sql from './db';
import { sendLineMessage } from './line';

export interface PmSchedule {
  id: number;
  branch_code: string;
  title: string;
  description: string;
  department: string;
  category_id: number;
  frequency_value: number;
  frequency_unit: 'day' | 'week' | 'month' | 'year';
  last_run: string | null;
  next_run: string;
  created_by: string | null;
  active: boolean;
  created_at: string;
}

export const FREQ_UNITS = ['day', 'week', 'month', 'year'];

export function calcNextRun(freqValue: number, freqUnit: string, fromDate: Date = new Date()): Date {
  const d = new Date(fromDate);
  switch (freqUnit) {
    case 'day': d.setDate(d.getDate() + freqValue); break;
    case 'week': d.setDate(d.getDate() + freqValue * 7); break;
    case 'month': d.setMonth(d.getMonth() + freqValue); break;
    case 'year': d.setFullYear(d.getFullYear() + freqValue); break;
  }
  return d;
}

/** Create tickets for every due PM schedule. Each schedule is processed in its own transaction. */
export async function processDuePmTickets(): Promise<number> {
  let created = 0;
  const due = await sql`
    select ps.*, c.dept_type
    from fixhub.pm_schedules ps
    join fixhub.categories c on c.category_id = ps.category_id
    where ps.active and ps.next_run <= now()
    order by ps.next_run asc
    limit 200`;

  for (const pm of due) {
    try {
      const deptType: string = pm.dept_type;
      const deptCode = deptType === 'IT' ? 'IT' : 'EN';
      const reporterDept = deptType === 'IT' ? 'IT' : 'MAINT';
      // นับรอบถัดไปจากกำหนดเดิม (ไม่ใช่เวลาที่ cron รัน) → ไม่เลื่อนช้าไปรอบละ 1 ชม.
      // ถ้าค้างหลายรอบ (ระบบปิดไปนาน) ข้ามไปรอบแรกที่ยังไม่ถึง — สร้างใบงานครั้งเดียว
      let nextRun = calcNextRun(pm.frequency_value, pm.frequency_unit, new Date(pm.next_run));
      for (let i = 0; nextRun <= new Date() && i < 1000; i++) nextRun = calcNextRun(pm.frequency_value, pm.frequency_unit, nextRun);

      const result = await sql.begin(async (tx) => {
        // lock row; skip if another worker already advanced it
        const [locked] = await tx`select next_run from fixhub.pm_schedules where id = ${pm.id} for update`;
        if (!locked || new Date(locked.next_run) > new Date()) return null;

        const sla = await tx`select sla_minutes from fixhub.sla_config where priority = 'medium'`;
        const slaMinutes: number = sla[0]?.sla_minutes || 240;

        const [t] = await tx`
          insert into fixhub.tickets
            (ticket_number, branch_code, category_id, reporter_id, reporter_department, location_detail, description,
             priority, difficulty, status, sla_deadline)
          values
            (fixhub.next_ticket_number(${pm.branch_code}, ${deptCode}), ${pm.branch_code}, ${pm.category_id}, ${pm.created_by},
             ${reporterDept}, 'PM อัตโนมัติ', ${`[PM] ${pm.title}${pm.description ? ': ' + pm.description : ''}`},
             'medium', 'medium', 'PENDING', now() + make_interval(mins => ${slaMinutes}))
          returning ticket_id, ticket_number`;

        await tx`update fixhub.pm_schedules set last_run = now(), next_run = ${nextRun} where id = ${pm.id}`;
        await tx`insert into fixhub.pm_logs (pm_id, ticket_id) values (${pm.id}, ${t.ticket_id})`;
        await tx`
          insert into fixhub.ticket_activity_log (ticket_id, action, old_status, new_status, action_by, action_by_name, reason)
          values (${t.ticket_id}, 'CREATED', null, 'PENDING', ${pm.created_by}, 'PM อัตโนมัติ', ${`PM #${pm.id}`})`;
        return t;
      });

      if (!result) continue;
      created++;
      sendLineMessage(
        `📢 [PM อัตโนมัติ] มีงานบำรุงรักษาตามรอบ!\n🔢 ${result.ticket_number}\n🏨 ${pm.branch_code}\n📝 ${pm.title}\n📅 ครั้งต่อไป: ${nextRun.toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' })}`,
        deptType, [], { ticketEvent: true }
      ).catch(() => {});
      console.log(`[PM] Auto-created ticket ${result.ticket_number} for PM #${pm.id}`);
    } catch (err: any) {
      console.error(`[PM] Error processing PM #${pm.id}:`, err.message);
    }
  }
  return created;
}
