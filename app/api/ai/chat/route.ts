import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { chatWithAI } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { message, branch_code, history } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const result = await chatWithAI(
      message,
      branch_code || user.branch_code,
      history || []
    );

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[AI Chat] Error:', err.message);
    return NextResponse.json(
      {
        action: 'general_chat',
        message: 'ขออภัยครับ เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง',
      },
      { status: 200 }
    );
  }
}
