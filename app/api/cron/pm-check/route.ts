import { NextRequest, NextResponse } from 'next/server';
import { processDuePmTickets } from '../../../../lib/pm';
import { isCronAuthorized } from '../../../../lib/cron';

export const dynamic = 'force-dynamic';

// Hourly PM check — called by Netlify scheduled function
export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const created = await processDuePmTickets();
    return NextResponse.json({ success: true, tickets_created: created });
  } catch (err: any) {
    console.error('[Cron PM] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
