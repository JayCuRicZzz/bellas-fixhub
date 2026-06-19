import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../../lib/auth';
import { classifyRequestAI } from '../../../../lib/ai';

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const result = await classifyRequestAI(text);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[AI Classify] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
