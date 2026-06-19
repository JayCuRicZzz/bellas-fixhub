import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../../lib/auth';
import { generateAIReport } from '../../../../lib/ai';

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.json();
    const summary = await generateAIReport(data);
    return NextResponse.json({ summary });
  } catch (err: any) {
    console.error('[AI Report] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
