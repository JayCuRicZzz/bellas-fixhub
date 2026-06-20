import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { getUserFromRequest } from '../../../../lib/auth';

// POST: Clean all tickets & seed 14 test tickets (7 branches × IT+MAINT)
export async function POST(req: NextRequest) {
  // Accept setup_key OR admin auth
  let isAdmin = false;
  let adminUserId = 1;
  try {
    const body = await req.clone().json();
    if (body.setup_key === process.env.SETUP_KEY || body.setup_key === 'bellas-setup-2026') {
      isAdmin = true;
    }
  } catch {}

  if (!isAdmin) {
    const user = getUserFromRequest(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    adminUserId = user.user_id || user.id;
  }

  try {
    // 1. Count before
    const [countBefore]: any = await pool.query('SELECT COUNT(*) as cnt FROM tickets');
    const totalBefore = countBefore[0].cnt;

    // 2. Delete all related data
    await pool.query('DELETE FROM ticket_images');
    await pool.query('DELETE FROM ticket_comments');
    await pool.query('DELETE FROM pm_logs');
    await pool.query('DELETE FROM sla_logs');
    await pool.query('DELETE FROM tickets');

    // 3. Seed 14 test tickets
    const branches = ['BV', 'BP', 'BC', 'BM', 'BB', 'BE', 'GB'];
    const created: any[] = [];

    for (const branch of branches) {
      // MAINT ticket
      const maintNum = await getNextTicketNumber('MAINT', branch);
      const [maintResult]: any = await pool.query(
        `INSERT INTO tickets (ticket_number, branch_code, department, category_id, status, location_detail, description, reported_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'PENDING', ?, ?, ?, NOW(), NOW())`,
        [
          maintNum,
          branch,
          'MAINT',
          1, // Air Conditioning
          `ห้อง 10${branch} ชั้น 1`,
          `[ทดสอบ] แอร์ไม่เย็น — ตรวจสอบการทำงานของแอร์ห้องพัก`,
          adminUserId,
        ]
      );
      created.push({ ticket_id: maintResult.insertId, ticket_number: maintNum, branch, dept: 'MAINT' });

      // IT ticket
      const itNum = await getNextTicketNumber('IT', branch);
      const [itResult]: any = await pool.query(
        `INSERT INTO tickets (ticket_number, branch_code, department, category_id, status, location_detail, description, reported_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'PENDING', ?, ?, ?, NOW(), NOW())`,
        [
          itNum,
          branch,
          'IT',
          15, // Network
          `ห้อง 10${branch} ชั้น 2`,
          `[ทดสอบ] เน็ตหลุดบ่อย — ตรวจสอบสัญญาณ WiFi และสาย LAN`,
          adminUserId,
        ]
      );
      created.push({ ticket_id: itResult.insertId, ticket_number: itNum, branch, dept: 'IT' });
    }

    return NextResponse.json({
      success: true,
      deleted: totalBefore,
      created: created.length,
      tickets: created,
    });
  } catch (err: any) {
    console.error('[Clean-Seed] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function getNextTicketNumber(dept: string, branch: string): Promise<string> {
  const prefix = `${dept}-${branch}-`;
  const [rows]: any = await pool.query(
    `SELECT ticket_number FROM tickets WHERE ticket_number LIKE ? ORDER BY ticket_number DESC LIMIT 1`,
    [`${prefix}%`]
  );
  let seq = 1;
  if (rows.length > 0 && rows[0].ticket_number) {
    const last = rows[0].ticket_number;
    const numPart = parseInt(last.replace(prefix, ''), 10);
    if (!isNaN(numPart)) seq = numPart + 1;
  }
  return `${prefix}${String(seq).padStart(3, '0')}`;
}
