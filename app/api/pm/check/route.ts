import { NextRequest, NextResponse } from 'next/server';
import { processDuePmTickets } from '../../../../lib/pm';

export const dynamic = 'force-dynamic';

// Called by Netlify scheduled function every hour
export async function GET(req: NextRequest) {
  try {
    const created = await processDuePmTickets();
    return NextResponse.json({ success: true, tickets_created: created });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
