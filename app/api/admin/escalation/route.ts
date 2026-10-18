import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../../lib/auth';
import { getEscalationConfig, setEscalationConfig, runEscalation } from '../../../../lib/escalation';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  return NextResponse.json(await getEscalationConfig());
}

// PUT { ...config } บันทึก · POST { action: 'run' } สั่งตรวจทันที
export async function PUT(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  try {
    return NextResponse.json({ success: true, config: await setEscalationConfig(await req.json(), user.id) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  try {
    return NextResponse.json({ success: true, ...(await runEscalation()) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
