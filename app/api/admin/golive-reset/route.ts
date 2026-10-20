import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../../lib/db';
import { getUserFromRequest } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

// ล้างใบงานทดสอบก่อนเริ่มใช้งานจริง — แอดมินเท่านั้น · กดได้ครั้งเดียว
// คัดลอกทุกแถวไว้ใน fixhub.reset_archive ก่อนลบ (ย้อนดู/กู้คืนได้)
const PHRASE = 'ล้างใบงาน';

async function status() {
  const [c] = await sql`select
    (select count(*)::int from fixhub.tickets) as tickets,
    (select count(*)::int from fixhub.ticket_images) as images,
    (select count(*)::int from fixhub.ticket_activity_log) as logs`;
  const done = await sql`select value from fixhub.app_settings where key = 'golive_reset'`;
  return { ...c, done: done[0]?.value || null };
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'เฉพาะแอดมิน' }, { status: 403 });
  return NextResponse.json(await status());
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'เฉพาะแอดมิน' }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  if (String(b?.confirm || '').trim() !== PHRASE) return NextResponse.json({ error: `พิมพ์คำว่า "${PHRASE}" ให้ตรงก่อนกดยืนยัน` }, { status: 400 });

  try {
    const result = await sql.begin(async (tx: any) => {
      const done = await tx`select 1 from fixhub.app_settings where key = 'golive_reset' for update`;
      if (done.length) throw Object.assign(new Error('ล้างไปแล้วครั้งหนึ่ง — ปุ่มนี้ใช้ได้ครั้งเดียว'), { code: 'DONE' });
      const [{ at }] = await tx`select now() as at`;
      const by = user.id;
      // 1) เก็บสำรองทุกอย่างที่ผูกกับใบงาน
      await tx`insert into fixhub.reset_archive (batch_at, batch_by, table_name, row_data) select ${at}, ${by}, 'tickets', to_jsonb(t) from fixhub.tickets t`;
      await tx`insert into fixhub.reset_archive (batch_at, batch_by, table_name, row_data) select ${at}, ${by}, 'ticket_images', to_jsonb(t) from fixhub.ticket_images t`;
      await tx`insert into fixhub.reset_archive (batch_at, batch_by, table_name, row_data) select ${at}, ${by}, 'ticket_activity_log', to_jsonb(t) from fixhub.ticket_activity_log t`;
      await tx`insert into fixhub.reset_archive (batch_at, batch_by, table_name, row_data) select ${at}, ${by}, 'ticket_escalations', to_jsonb(t) from fixhub.ticket_escalations t`;
      await tx`insert into fixhub.reset_archive (batch_at, batch_by, table_name, row_data) select ${at}, ${by}, 'part_moves', to_jsonb(t) from fixhub.part_moves t where t.ticket_id is not null`;
      await tx`insert into fixhub.reset_archive (batch_at, batch_by, table_name, row_data) select ${at}, ${by}, 'pm_logs', to_jsonb(t) from fixhub.pm_logs t where t.ticket_id is not null`;
      await tx`insert into fixhub.reset_archive (batch_at, batch_by, table_name, row_data) select ${at}, ${by}, 'ticket_counters', to_jsonb(t) from fixhub.ticket_counters t`;
      // 2) ลบใบงาน (รูป/บันทึก/การเตือน ลบตาม cascade · อะไหล่/PM เหลือแถวแต่ตัดการผูกใบงาน)
      const del = await tx`delete from fixhub.tickets returning ticket_id`;
      // 3) เริ่มนับเลขใบงานใหม่ (00001)
      await tx`delete from fixhub.ticket_counters`;
      const summary = { done_at: at, done_by: by, done_by_name: user.full_name || user.username, tickets: del.length };
      await tx`insert into fixhub.app_settings (key, value, updated_by, updated_at) values ('golive_reset', ${tx.json(summary)}, ${by}, now())`;
      return summary;
    });
    return NextResponse.json({ success: true, ...result, after: await status() });
  } catch (e: any) {
    if (e?.code === 'DONE') return NextResponse.json({ error: e.message }, { status: 409 });
    console.error('[golive-reset]', e?.message);
    return NextResponse.json({ error: 'ล้างไม่สำเร็จ ไม่มีอะไรถูกลบ: ' + e?.message }, { status: 500 });
  }
}
