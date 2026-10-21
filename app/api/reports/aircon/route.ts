import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../../lib/db';
import { getUserFromRequest, getUserBranches } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

// Aircon report — all aircon tickets + refrigerant refills (ธงที่ช่างติ๊ก) + เติมซ้ำห้องเดิมภายใน 15 วัน (ป้ายแดง)
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
             t.main_th as category_name, t.technician_name, t.room_no,
             t.refrigerant_refilled, t.refrigerant_type, t.refrigerant_repeat_of, t.refrigerant_repeat_days, t.resolved_at,
             (fixhub.today_bkk() - (t.created_at at time zone 'Asia/Bangkok')::date)::int as days_ago
      from fixhub.tickets_full t
      where t.created_at >= now() - make_interval(days => ${days})
        and (t.category_id = 1 or t.refrigerant_refilled or t.description ilike '%แอร์%' or t.description ilike '%aircon%' or t.description ilike '%air con%')
        ${branches.length ? sql`and t.branch_code = any(${branches})` : sql`and false`}
      order by t.created_at desc limit 200`;

    const byRoom: Record<string, any[]> = {};
    for (const row of rows) {
      const key = `${row.branch_code} - ${row.location_detail}`;
      (byRoom[key] ||= []).push(row);
    }

    // เติมซ้ำ = ใบที่ระบบผูกไว้ตอนช่างกดซ่อมเสร็จ (refrigerant_repeat_of) — คิดครั้งเดียว ตรงกับป้ายแดงในใบงาน
    const byId = new Map<number, any>(rows.map((r: any) => [r.ticket_id, r]));
    const repeats = rows.filter((r: any) => r.refrigerant_refilled && r.refrigerant_repeat_of && r.status !== 'CANCELLED');
    const prevMissing = repeats.map((r: any) => r.refrigerant_repeat_of).filter((id: number) => !byId.has(id));
    if (prevMissing.length) {
      for (const p of await sql`select ticket_id, ticket_number, resolved_at, created_at from fixhub.tickets where ticket_id = any(${prevMissing})`)
        byId.set(p.ticket_id, p);
    }
    const refillAlerts = repeats.map((r: any) => {
      const prev = byId.get(r.refrigerant_repeat_of) || {};
      return {
        room: `${r.branch_code} - ${r.location_detail}`,
        refill1: prev.ticket_number || '-', refill2: r.ticket_number, ticket_id: r.ticket_id,
        days_between: r.refrigerant_repeat_days ?? null,
        date1: prev.resolved_at || prev.created_at || null, date2: r.resolved_at || r.created_at,
      };
    });
    const refillCount = rows.filter((r: any) => r.refrigerant_refilled && r.status !== 'CANCELLED').length;

    return NextResponse.json({
      total_tickets: rows.length,
      rooms_affected: Object.keys(byRoom).length,
      refill_alerts: refillAlerts,
      refill_alert_count: refillAlerts.length,
      refill_count: refillCount,
      repeat_days: 15,
      tickets: rows,
    });
  } catch (err: any) {
    console.error('[Aircon Report] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
