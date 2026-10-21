import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../../lib/auth';
import { getLineConfig, setLineConfig } from '../../../../lib/line-config';
import { pushLineText } from '../../../../lib/line';
import { sendDailySummary } from '../../../../lib/daily-summary';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function mask(token: string) {
  return token ? 'sk-' + token.slice(-8).padStart(12, '*') : '';
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const cfg = await getLineConfig();
  return NextResponse.json({ accessToken: mask(cfg.accessToken), targetIdMaint: cfg.targetIdMaint, targetIdIT: cfg.targetIdIT, autoMaint: cfg.autoMaint, autoIT: cfg.autoIT, configured: !!cfg.accessToken });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    if (body.action === 'test') {
      const cfg = await getLineConfig();
      const to = body.group === 'IT' ? cfg.targetIdIT : cfg.targetIdMaint;
      if (!cfg.accessToken || !to) return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่า token / target id' }, { status: 400 });
      const r = await pushLineText(to, `🔔 ทดสอบการแจ้งเตือนจาก Bellas FixHub (${body.group === 'IT' ? 'ไอที' : 'ช่าง'})`, cfg.accessToken);
      return NextResponse.json({ success: r.ok, status: r.status, result: r.result });
    }
    if (body.action === 'send-summary') {
      const r = await sendDailySummary(body.group === 'IT' ? 'IT' : 'MAINT');
      return NextResponse.json({ success: r.sent, ...r });
    }
    const cfg = await setLineConfig(body, user.id);
    return NextResponse.json({ success: true, targetIdMaint: cfg.targetIdMaint, targetIdIT: cfg.targetIdIT, autoMaint: cfg.autoMaint, autoIT: cfg.autoIT, configured: !!cfg.accessToken });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
