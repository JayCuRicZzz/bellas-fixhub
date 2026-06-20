import pool from './db';
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
  created_by: number;
  active: number;
  created_at: string;
}

// Calculate next run date
export function calcNextRun(
  freqValue: number,
  freqUnit: string,
  fromDate: Date = new Date()
): Date {
  const d = new Date(fromDate);
  switch (freqUnit) {
    case 'day': d.setDate(d.getDate() + freqValue); break;
    case 'week': d.setDate(d.getDate() + freqValue * 7); break;
    case 'month': d.setMonth(d.getMonth() + freqValue); break;
    case 'year': d.setFullYear(d.getFullYear() + freqValue); break;
  }
  return d;
}

// Auto-create tickets for due PMs — call this via scheduled function or periodically
export async function processDuePmTickets(): Promise<number> {
  let created = 0;
  try {
    const now = new Date();
    const [rows]: any = await pool.query(
      `SELECT * FROM pm_schedules WHERE active = 1 AND next_run <= ? ORDER BY next_run ASC`,
      [now]
    );

    for (const pm of rows) {
      try {
        // Get category dept_type for ticket numbering
        const [cats]: any = await pool.query(
          'SELECT dept_type FROM categories WHERE category_id = ?',
          [pm.category_id]
        );
        const deptType = cats[0]?.dept_type || 'MAINT';
        const deptCode = deptType === 'IT' ? 'IT' : 'EN';

        // Generate ticket number
        const year = now.getFullYear().toString();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const prefix = `${pm.branch_code}-${deptCode}-${year}-${month}-`;
        const [existing]: any = await pool.query(
          `SELECT MAX(ticket_number) as max_num FROM tickets WHERE ticket_number LIKE ?`,
          [`${prefix}%`]
        );
        let seq = 1;
        if (existing[0]?.max_num) {
          seq = parseInt(existing[0].max_num.slice(-5), 10) + 1;
        }
        const ticketNumber = `${prefix}${String(seq).padStart(5, '0')}`;

        // Calculate SLA
        const priority = pm.department === 'IT' ? 'medium' : 'medium';
        const [slaRows]: any = await pool.query(
          'SELECT sla_minutes FROM sla_config WHERE priority = ?',
          [priority]
        );
        const slaMinutes = slaRows[0]?.sla_minutes || 240;
        const slaDeadline = new Date(now.getTime() + slaMinutes * 60 * 1000);

        // Create ticket
        const [result]: any = await pool.query(
          `INSERT INTO tickets (ticket_number, branch_code, category_id, reporter_id, reporter_department, location_detail, description, priority, difficulty, status, sla_deadline)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'medium', 'PENDING', ?)`,
          [ticketNumber, pm.branch_code, pm.category_id, pm.created_by, pm.department, 'PM อัตโนมัติ', `[PM] ${pm.title}: ${pm.description}`, priority, slaDeadline]
        );

        // Update PM last_run + next_run
        const nextRun = calcNextRun(pm.frequency_value, pm.frequency_unit, now);
        await pool.query(
          'UPDATE pm_schedules SET last_run = ?, next_run = ? WHERE id = ?',
          [now, nextRun, pm.id]
        );

        // Send LINE notification
        sendLineMessage(
          `📢 [PM อัตโนมัติ] มีงานบำรุงรักษาตามรอบ!\n🔢 ${ticketNumber}\n🏨 ${pm.branch_code}\n📝 ${pm.title}\n📅 ครั้งต่อไป: ${nextRun.toLocaleDateString('th-TH')}`,
          deptType
        );

        created++;
        console.log(`[PM] Auto-created ticket ${ticketNumber} for PM #${pm.id}`);
      } catch (err: any) {
        console.error(`[PM] Error processing PM #${pm.id}:`, err.message);
      }
    }
  } catch (err: any) {
    console.error('[PM] processDuePmTickets error:', err.message);
  }
  return created;
}
