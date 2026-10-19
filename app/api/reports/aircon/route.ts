import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../../lib/db';
import { getUserFromRequest, getUserBranches } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

// Aircon report — all aircon tickets + refrigerant refill alerts (same room, ≤14 days apart)
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const userBranches = await getUserBranches(user.id, user.role);
    const { searchParams } = new URL(req.url);
    const branch = searchParams.get('branch') || '';
    const days = Math.min(Math.max(parseInt(searchParams.get('period') || '30', 10) || 30, 1), 365);
    const branches = branch && userBranches.includes(branch) ? [branch] : userBranches;

    const rows = await sql`
      select t.ticket_id, t.ticket_number, t.branch_code, t.location_detail, t.description, t.pending_reason, t.created_at, t.status,
             t.main_th as category_name, t.technician_name,
             (fixhub.today_bkk() - (t.created_at at time zone 'Asia/Bangkok')::date)::int as days_ago
      from fixhub.tickets_full t
      where t.created_at >= now() - make_interval(days => ${days})
        and (t.category_id = 1 or t.description ilike '%แอร์%' or t.description ilike '%aircon%' or t.description ilike '%air con%')
        ${branches.length ? sql`and t.branch_code = any(${branches})` : sql`and false`}
      order by t.created_at desc limit 200`;

    const byRoom: Record<string, any[]> = {};
    for (const row of rows) {
      const key = `${row.branch_code} - ${row.location_detail}`;
      (byRoom[key] ||= []).push(row);
    }

    const refillAlerts: any[] = [];
    for (const [key, tickets] of Object.entries(byRoom)) {
      // นับทั้งอาการที่ผู้แจ้งเขียน และบันทึกของช่างตอนซ่อมเสร็จ (เช่น "เติมน้ำยา R32")
      const refills = tickets.filter((t: any) => t.status !== 'CANCELLED' && `${t.description || ''} ${t.pending_reason || ''}`.includes('น้ำยา'));
      for (let i = 1; i < refills.length; i++) {
        const daysBetween = Math.round((new Date(refills[i - 1].created_at).getTime() - new Date(refills[i].created_at).getTime()) / 86400000);
        if (daysBetween <= 14) {
          refillAlerts.push({
            room: key, refill1: refills[i].ticket_number, refill2: refills[i - 1].ticket_number,
            days_between: daysBetween, date1: refills[i].created_at, date2: refills[i - 1].created_at,
          });
          break;
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
