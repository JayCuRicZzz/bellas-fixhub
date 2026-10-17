import { NextResponse } from 'next/server';
import sql from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await sql`select priority, sla_minutes from fixhub.sla_config`;
    const slaMap: Record<string, { sla_hours: number; sla_minutes: number }> = {};
    for (const row of rows) {
      slaMap[row.priority] = { sla_hours: Math.floor(row.sla_minutes / 60), sla_minutes: row.sla_minutes };
    }
    return NextResponse.json(slaMap);
  } catch (err: any) {
    console.error('[SLA] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
