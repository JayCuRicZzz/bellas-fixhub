import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../../lib/auth';
import { getLineConfig, setLineConfig } from '../../../../lib/line-config';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = getLineConfig().accessToken;
  return NextResponse.json({
    accessToken: token ? 'sk-' + token.slice(-8).padStart(8, '*') : '',
    targetIdMaint: getLineConfig().targetIdMaint,
    targetIdIT: getLineConfig().targetIdIT,
  });
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    setLineConfig(body);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
