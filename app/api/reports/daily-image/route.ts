import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getUserBranches } from '../../../../lib/auth';
import { buildSummary, renderSummaryPng, SummaryDept, buildBranchDay, renderBranchDayPng, DayDept } from '../../../../lib/daily-summary';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// GET /api/reports/daily-image?dept=MAINT|IT            → รูปสรุป 24 ชม. ทุกสาขา (แบบเดียวกับที่ส่ง 22:00)
// GET /api/reports/daily-image?dept=MAINT|IT|ALL&branch=BV&date=YYYY-MM-DD → รูปรายสาขา: ทุกใบของวันนั้น + ค้างรวม
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // รูปรายสาขา: ทุกคนสร้างได้ เฉพาะสาขาที่ตัวเองมีสิทธิ์ (ให้พนักงานแคปลงกลุ่มได้เอง)
  // รูปสรุปทุกสาขา (แบบ 22:00): เฉพาะแอดมิน · GM · หัวหน้า
  const manager = ['admin', 'gm', 'sup', 'supit'].includes(user.role);
  const sp = new URL(req.url).searchParams;
  const raw = sp.get('dept');
  let dept: DayDept = raw === 'IT' ? 'IT' : raw === 'ALL' ? 'ALL' : 'MAINT';
  const branch = (sp.get('branch') || '').toUpperCase();
  if (!branch) {
    if (!manager) return NextResponse.json({ error: 'กรุณาเลือกสาขา' }, { status: 403 });
    // สรุปทุกสาขา: หัวหน้าช่างเฉพาะงานช่าง · หัวหน้าไอทีเฉพาะงานไอที
    if (user.role === 'sup') dept = 'MAINT';
    if (user.role === 'supit') dept = 'IT';
  }
  try {
    let png: Buffer;
    if (branch) {
      const allowed = await getUserBranches(user.id, user.role);
      if (!allowed.includes(branch)) return NextResponse.json({ error: 'ไม่มีสิทธิ์สาขานี้' }, { status: 403 });
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
      const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.get('date') || '') ? sp.get('date')! : today;
      png = renderBranchDayPng(await buildBranchDay(dept, branch, date > today ? today : date));
    } else {
      png = renderSummaryPng(await buildSummary((dept === 'ALL' ? 'MAINT' : dept) as SummaryDept));
    }
    return new NextResponse(new Uint8Array(png), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    console.error('[daily-image]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
