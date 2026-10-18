import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../../lib/auth';
import { buildSummary, renderSummaryPng, SummaryDept } from '../../../../lib/daily-summary';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// GET /api/reports/daily-image?dept=MAINT|IT → PNG of today's summary (managers / supervisors / admin)
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || !['admin', 'gm', 'sup', 'supit'].includes(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const dept = (new URL(req.url).searchParams.get('dept') === 'IT' ? 'IT' : 'MAINT') as SummaryDept;
  try {
    const png = renderSummaryPng(await buildSummary(dept));
    return new NextResponse(new Uint8Array(png), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    console.error('[daily-image]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
