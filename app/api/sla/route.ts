import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [rows]: any = await pool.query('SELECT priority, sla_minutes FROM sla_config');
    const slaMap: Record<string, { sla_hours: number; sla_minutes: number }> = {};
    for (const row of rows) {
      slaMap[row.priority] = {
        sla_hours: Math.floor(row.sla_minutes / 60),
        sla_minutes: row.sla_minutes,
      };
    }
    return NextResponse.json(slaMap);
  } catch (err: any) {
    console.error('[SLA] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
