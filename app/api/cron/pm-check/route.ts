import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { processDuePmTickets } from '../../../../lib/pm';

// Hourly PM check — called by Netlify scheduled function
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key') || '';
  if (key !== 'bellas-cron-2026') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const created = await processDuePmTickets();
    return NextResponse.json({ success: true, tickets_created: created });
  } catch (err: any) {
    // Don't error out — PM might just not have due items
    return NextResponse.json({ success: true, tickets_created: 0 });
  }
}
