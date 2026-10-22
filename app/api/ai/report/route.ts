import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../../lib/auth';
import { generateAIReport, generateBreakdownReport } from '../../../../lib/ai';

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const data = await req.json();
    // หน้า AI รายงานใหม่ส่ง breakdown (แยกงานในช่วงนี้/งานค้าง/พัก/ยกเลิก/รายสาขา) · แบบเดิมยังรับได้
    const summary = data?.breakdown?.period ? await generateBreakdownReport(data) : await generateAIReport(data);
    return NextResponse.json({ summary });
  } catch (err: any) {
    console.error('[AI Report] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
