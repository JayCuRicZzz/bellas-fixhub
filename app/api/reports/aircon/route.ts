import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { getUserFromRequest, getUserBranches } from '../../../../lib/auth';

// GET: Aircon refill report — tracks repeated refrigerant refills within 14 days
export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const userId = user.user_id || user.id;
    const userBranches = await getUserBranches(userId, user.role);
    const { searchParams } = new URL(req.url);
    const branch = searchParams.get('branch') || '';
    const period = searchParams.get('period') || '30';

    const daysAgo = parseInt(period);

    // Find tickets related to aircon refill
    let query = `
      SELECT t.ticket_id, t.ticket_number, t.branch_code, t.location_detail, 
             t.description, t.created_at, t.status,
             c.main_th as category_name,
             DATEDIFF(NOW(), t.created_at) as days_ago
      FROM tickets t
      JOIN categories c ON t.category_id = c.category_id
      WHERE t.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        AND (c.category_id BETWEEN 1 AND 3
             OR t.description LIKE '%น้ำยาแอร์%'
             OR t.description LIKE '%เติมน้ำยา%'
             OR t.description LIKE '%แอร์ไม่เย็น%')
    `;
    const params: any[] = [daysAgo];

    if (userBranches.length > 0) {
      query += ` AND t.branch_code IN (${userBranches.map(() => '?').join(',')})`;
      params.push(...userBranches);
    }
    if (branch) {
      query += ' AND t.branch_code = ?';
      params.push(branch);
    }

    query += ' ORDER BY t.created_at DESC LIMIT 100';

    const [rows]: any = await pool.query(query, params);

    // Group by location (room) to find duplicates
    const byRoom: Record<string, any[]> = {};
    for (const row of rows) {
      const key = `${row.branch_code} - ${row.location_detail}`;
      if (!byRoom[key]) byRoom[key] = [];
      byRoom[key].push(row);
    }

    // Find rooms with refills within 14 days
    const refillAlerts: any[] = [];
    for (const [key, tickets] of Object.entries(byRoom)) {
      if (tickets.length >= 2) {
        for (let i = 1; i < tickets.length; i++) {
          const daysBetween = Math.round(
            (new Date(tickets[i - 1].created_at).getTime() - new Date(tickets[i].created_at).getTime()) / (24 * 60 * 60 * 1000)
          );
          if (daysBetween <= 14) {
            refillAlerts.push({
              room: key,
              refill1: tickets[i].ticket_number,
              refill2: tickets[i - 1].ticket_number,
              days_between: daysBetween,
              date1: tickets[i].created_at,
              date2: tickets[i - 1].created_at,
            });
            break; // Only flag once per room
          }
        }
      }
    }

    return NextResponse.json({
      total_tickets: rows.length,
      rooms_affected: Object.keys(byRoom).length,
      refill_alerts: refillAlerts,
      refill_alert_count: refillAlerts.length,
      tickets: rows,
    });
  } catch (err: any) {
    console.error('[Aircon Report] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
