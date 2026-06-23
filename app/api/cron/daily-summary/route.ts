import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';

// No-auth endpoint for scheduled functions to get daily summary + send LINE
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key') || '';
  if (key !== 'bellas-cron-2026') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const today = new Date().toLocaleDateString('th-TH', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
    });

    // MAINT stats
    const [maintTotal]: any = await pool.query(
      `SELECT COUNT(*) as cnt FROM tickets WHERE reporter_department='MAINT' AND DATE(created_at)=CURDATE()`
    );
    const [maintPending]: any = await pool.query(
      `SELECT COUNT(*) as cnt FROM tickets WHERE reporter_department='MAINT' AND status='PENDING' AND DATE(created_at)=CURDATE()`
    );
    const [maintProgress]: any = await pool.query(
      `SELECT COUNT(*) as cnt FROM tickets WHERE reporter_department='MAINT' AND status IN ('ACCEPTED','IN_PROGRESS') AND DATE(created_at)=CURDATE()`
    );
    const [maintDone]: any = await pool.query(
      `SELECT COUNT(*) as cnt FROM tickets WHERE reporter_department='MAINT' AND status='APPROVED' AND DATE(created_at)=CURDATE()`
    );

    // IT stats
    const [itTotal]: any = await pool.query(
      `SELECT COUNT(*) as cnt FROM tickets WHERE reporter_department='IT' AND DATE(created_at)=CURDATE()`
    );
    const [itPending]: any = await pool.query(
      `SELECT COUNT(*) as cnt FROM tickets WHERE reporter_department='IT' AND status='PENDING' AND DATE(created_at)=CURDATE()`
    );
    const [itProgress]: any = await pool.query(
      `SELECT COUNT(*) as cnt FROM tickets WHERE reporter_department='IT' AND status IN ('ACCEPTED','IN_PROGRESS') AND DATE(created_at)=CURDATE()`
    );
    const [itDone]: any = await pool.query(
      `SELECT COUNT(*) as cnt FROM tickets WHERE reporter_department='IT' AND status='APPROVED' AND DATE(created_at)=CURDATE()`
    );

    const BASE_URL = process.env.URL || 'https://bellas-fixhub.netlify.app';
    const lineToken = process.env.LINE_ACCESS_TOKEN || '';

    const results = { maintSent: false, itSent: false };

    // Send MAINT summary
    const maintMsg = [
      `📊 สรุปงานช่าง — ${today}`,
      ``,
      `📝 แจ้งใหม่: ${maintTotal[0].cnt} รายการ`,
      `⏳ รอ: ${maintPending[0].cnt} | 🔧 กำลังทำ: ${maintProgress[0].cnt} | ✅ เสร็จ: ${maintDone[0].cnt}`,
      ``,
      `🔗 ${BASE_URL}/dashboard`,
    ].join('\n');

    const targetMaint = process.env.LINE_TARGET_ID_MAINT || process.env.LINE_TARGET_ID || '';
    if (lineToken && targetMaint) {
      await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${lineToken}` },
        body: JSON.stringify({ to: targetMaint, messages: [{ type: 'text', text: `[ช่าง]\n${maintMsg}` }] }),
      });
      results.maintSent = true;
    }

    // Send IT summary
    const itMsg = [
      `📊 สรุปงานไอที — ${today}`,
      ``,
      `📝 แจ้งใหม่: ${itTotal[0].cnt} รายการ`,
      `⏳ รอ: ${itPending[0].cnt} | 🔧 กำลังทำ: ${itProgress[0].cnt} | ✅ เสร็จ: ${itDone[0].cnt}`,
      ``,
      `🔗 ${BASE_URL}/dashboard`,
    ].join('\n');

    const targetIT = process.env.LINE_TARGET_ID_IT || '';
    if (lineToken && targetIT) {
      await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${lineToken}` },
        body: JSON.stringify({ to: targetIT, messages: [{ type: 'text', text: `[ไอที]\n${itMsg}` }] }),
      });
      results.itSent = true;
    }

    return NextResponse.json({ success: true, ...results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
