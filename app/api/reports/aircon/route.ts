import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { getUserFromRequest, getUserBranches } from '../../../../lib/auth';

// GET: Aircon report — all aircon tickets + refrigerant refill alerts
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

    // Find ALL aircon-related tickets (cat 1-3 OR description has 'แอร์')
    let query = `
      SELECT t.ticket_id, t.ticket_number, t.branch_code, t.location_detail, 
             t.description, t.created_at, t.status,
             c.main_th as category_name,
             DATEDIFF(NOW(), t.created_at) as days_ago
      FROM tickets t
      JOIN categories c ON t.category_id = c.category_id
      WHERE t.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        AND (c.category_id BETWEEN 1 AND 3
             OR t.description LIKE '%แอร์%'
             OR t.description LIKE '%aircon%')
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

    // Find rooms with refrigerant refills within 14 days (only actual refrigerant tickets)
    const refillAlerts: any[] = [];
    for (const [key, tickets] of Object.entries(byRoom)) {
      // Filter to only refrigerant-related tickets
      const refillTickets = tickets.filter((t: any) =>
        t.description.includes('น้ำยา') || t.description.includes('เติมน้ำยา')
      );
      if (refillTickets.length >= 2) {
        for (let i = 1; i < refillTickets.length; i++) {
          const daysBetween = Math.round(
            (new Date(refillTickets[i - 1].created_at).getTime() - new Date(refillTickets[i].created_at).getTime()) / (24 * 60 * 60 * 1000)
          );
          if (daysBetween <= 14) {
            refillAlerts.push({
              room: key,
              refill1: refillTickets[i].ticket_number,
              refill2: refillTickets[i - 1].ticket_number,
              days_between: daysBetween,
              date1: refillTickets[i].created_at,
              date2: refillTickets[i - 1].created_at,
            });
            break;
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
