import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../lib/db';
import { getUserFromRequest, getUserBranches, getWorkDeptScope } from '../../../lib/auth';
import { SUPABASE_URL } from '../../../lib/supabase';
import { IMAGE_BUCKET } from '../../../lib/upload';
import { translateToThai } from '../../../lib/translate';
import { sendLineMessage } from '../../../lib/line';
import { getLineConfig } from '../../../lib/line-config';
import { formatNewTicketLine, assetLineOf, PRIORITY_LINE } from '../../../lib/line-format';
import { sendPushToUsers, workersFor, gmsFor } from '../../../lib/webpush';
import { toLineImageUrls } from '../../../lib/line-images';

export const dynamic = 'force-dynamic';

const VALID_STATUS = ['PENDING','ACCEPTED','IN_PROGRESS','PAUSED','RESOLVED','APPROVED','REJECTED','FLAGGED','CANCELLED'];
const VALID_PRIORITY = ['non_urgent','low','medium','high','urgent'];
const VALID_DIFFICULTY = ['easy','medium','hard','very_hard'];

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const userBranches = await getUserBranches(user.id, user.role);
    const { searchParams } = new URL(req.url);
    const deptType = searchParams.get('dept_type') || '';
    const status = searchParams.get('status') || '';
    const branch = searchParams.get('branch') || '';
    const department = searchParams.get('department') || '';
    const q = (searchParams.get('q') || '').trim();
    // ?room=305 → ประวัติซ่อมของห้อง/จุด (เลขห้องต้องตรงทั้งตัว: 305 ไม่ติด 1305 หรือ 3051)
    const room = (searchParams.get('room') || '').trim().slice(0, 60);
    const roomRe = /^\d+$/.test(room) ? `(^|[^0-9])${room}([^0-9]|$)` : '';
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '100', 10) || 100, 1), 500);

    const statuses = status.split(',').map(s => s.trim()).filter(s => VALID_STATUS.includes(s));
    const scope = getWorkDeptScope(user);

    const rows = await sql`
      select t.*
      from fixhub.tickets_full t
      where 1=1
        ${userBranches.length > 0 ? sql`and t.branch_code = any(${userBranches})` : sql`and false`}
        ${scope ? sql`and (t.reporter_id = ${user.id} or t.reporter_department = ${scope})` : sql``}
        ${statuses.length > 0 ? sql`and t.status = any(${statuses})` : sql``}
        ${branch ? sql`and t.branch_code = ${branch}` : sql``}
        ${department ? sql`and t.reporter_department = ${department === 'MAINTENANCE' ? 'MAINT' : department}` : sql``}
        ${deptType ? sql`and t.dept_type = ${deptType === 'ช่าง' ? 'MAINTENANCE' : deptType === 'ไอที' ? 'IT' : deptType}` : sql``}
        ${room ? (roomRe ? sql`and (t.room_no = ${room.toUpperCase()} or (t.room_no is null and t.location_detail ~ ${roomRe}))` : (ROOM_RE.test(room.toUpperCase()) ? sql`and t.room_no = ${room.toUpperCase()}` : sql`and t.location_detail ilike ${'%' + room + '%'}`)) : sql``}
        ${q ? sql`and (t.ticket_number ilike ${'%' + q + '%'} or t.location_detail ilike ${'%' + q + '%'} or t.description ilike ${'%' + q + '%'})` : sql``}
      order by t.ticket_id desc
      limit ${limit}`;

    const ticketIds = rows.map((r: any) => r.ticket_id);
    const imageMap: Record<number, string[]> = {};
    if (ticketIds.length > 0) {
      const images = await sql`
        select ticket_id, image_url from fixhub.ticket_images
        where ticket_id = any(${ticketIds}) order by uploaded_at asc`;
      for (const img of images) {
        (imageMap[img.ticket_id] ||= []).push(img.image_url);
      }
    }
    const result = rows.map((r: any) => ({ ...r, images: imageMap[r.ticket_id] || [] }));
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[Tickets] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

const ROOM_RE = /^[0-9]{2,5}[A-Z]?$/;

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { branch_code, category_id, description, images } = body;
    // ── ตำแหน่ง: ห้องพัก = เบอร์ห้องบังคับเป็นตัวเลข · พื้นที่ส่วนกลาง = ชื่อพื้นที่ ──
    const note = String(body.location_note || '').trim().slice(0, 100);
    let location_detail = String(body.location_detail || '').trim();
    let roomNo: string | null = null;
    if (body.location_kind === 'room') {
      roomNo = String(body.room_no || '').trim().toUpperCase();
      if (!ROOM_RE.test(roomNo)) return NextResponse.json({ error: 'เบอร์ห้องต้องเป็นตัวเลข 2–5 หลัก (เช่น 305, 1201, 10502 หรือ 305A)' }, { status: 400 });
      location_detail = `ห้อง ${roomNo}${note ? ` · ${note}` : ''}`;
    } else if (body.location_kind === 'area') {
      const area = String(body.area_name || '').trim().slice(0, 60);
      if (!area) return NextResponse.json({ error: 'กรุณาเลือกพื้นที่' }, { status: 400 });
      if (area === 'อื่น ๆ' && !note) return NextResponse.json({ error: 'กรุณาระบุพื้นที่' }, { status: 400 });
      location_detail = area === 'อื่น ๆ' ? note : `${area}${note ? ` · ${note}` : ''}`;
    } else {
      // ช่องทางเดิม (AI ช่วยแจ้ง / แชต AI): ดึงเลขห้องจากข้อความถ้ามี
      const m = location_detail.match(/(?:^|[^0-9])([0-9]{2,5}[A-Za-z]?)(?:[^0-9A-Za-z]|$)/);
      roomNo = m ? m[1].toUpperCase() : null;
      if (roomNo && /^[0-9]{2,5}[A-Za-z]?$/.test(location_detail.trim())) location_detail = `ห้อง ${roomNo}`;
    }
    const priority = VALID_PRIORITY.includes(body.priority) ? body.priority : 'medium';
    const difficulty = VALID_DIFFICULTY.includes(body.difficulty) ? body.difficulty : 'medium';

    if (!branch_code || !category_id || !String(location_detail || '').trim() || !String(description || '').trim()) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
    }
    // จำกัดความยาว (ข้อความ LINE ยาวเกิน 5,000 ตัวอักษรจะส่งไม่ออก)
    if (String(location_detail).length > 200) return NextResponse.json({ error: 'ห้อง/ตำแหน่ง ยาวเกิน 200 ตัวอักษร' }, { status: 400 });
    if (String(description).length > 2000) return NextResponse.json({ error: 'รายละเอียดอาการยาวเกิน 2,000 ตัวอักษร' }, { status: 400 });

    // Branch must be one the user can access (admin/gm = all)
    const userBranches = await getUserBranches(user.id, user.role);
    if (!userBranches.includes(branch_code)) {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์แจ้งซ่อมสาขานี้' }, { status: 403 });
    }

    const cat = await sql`select dept_type from fixhub.categories where category_id = ${Number(category_id)}`;
    if (cat.length === 0) return NextResponse.json({ error: 'หมวดงานไม่ถูกต้อง' }, { status: 400 });
    const deptType: string = cat[0].dept_type;                 // MAINTENANCE | IT
    const deptCode = deptType === 'IT' ? 'IT' : 'EN';          // ticket number segment
    const reporterDept = body.reporter_department === 'IT' || deptType === 'IT' ? 'IT' : 'MAINT';

    const sla = await sql`select sla_minutes from fixhub.sla_config where priority = ${priority}`;
    const slaMinutes: number = sla[0]?.sla_minutes || 240;

    // ห้อง/อุปกรณ์จาก QR หรือที่เลือกในฟอร์ม — ต้องอยู่สาขาเดียวกับใบงาน
    let locationId: number | null = Number(body.location_id) || null;
    let assetId: number | null = Number(body.asset_id) || null;
    if (assetId) {
      const a = await sql`select location_id from fixhub.assets where asset_id = ${assetId} and branch_code = ${branch_code} and active`;
      if (!a.length) assetId = null; else if (!locationId) locationId = a[0].location_id;
    }
    if (locationId) {
      const l = await sql`select 1 from fixhub.locations where location_id = ${locationId} and branch_code = ${branch_code}`;
      if (!l.length) locationId = null;
    }

    const descriptionThai = await translateToThai(String(description).trim());

    const [created] = await sql`
      insert into fixhub.tickets
        (ticket_number, branch_code, category_id, reporter_id, reporter_department, location_detail, description,
         priority, difficulty, status, sla_deadline, location_id, asset_id, room_no)
      values
        (fixhub.next_ticket_number(${branch_code}, ${deptCode}), ${branch_code}, ${Number(category_id)}, ${user.id}, ${reporterDept},
         ${String(location_detail).trim()}, ${descriptionThai}, ${priority}, ${difficulty}, 'PENDING',
         now() + make_interval(mins => ${slaMinutes}), ${locationId}, ${assetId}, ${roomNo})
      returning ticket_id, ticket_number, created_at`;

    const ticketId: number = created.ticket_id;
    const ticketNumber: string = created.ticket_number;

    if (Array.isArray(images) && images.length > 0) {
      // รับเฉพาะรูปที่อัปโหลดผ่านระบบ (อยู่ใน Storage ของเรา) — กันลิงก์ภายนอก
      const allowedPrefix = `${SUPABASE_URL}/storage/v1/object/public/${IMAGE_BUCKET}/`;
      const rows = images.slice(0, 5).filter((u: any) => typeof u === 'string' && u.startsWith(allowedPrefix)).map((url: string) => ({
        ticket_id: ticketId, image_url: url, image_type: 'report', uploaded_by: user.id,
      }));
      if (rows.length) await sql`insert into fixhub.ticket_images ${sql(rows, 'ticket_id', 'image_url', 'image_type', 'uploaded_by')}`;
    }

    await sql`
      insert into fixhub.ticket_activity_log (ticket_id, action, old_status, new_status, action_by, action_by_name)
      values (${ticketId}, 'CREATED', null, 'PENDING', ${user.id}, ${user.full_name || user.username})`;

    // ---- duplicate & aircon-refill detection ----
    const alerts: string[] = [];
    // ห้องนี้ (หรือแอร์เครื่องนี้) เพิ่งถูกเติมน้ำยาแอร์ภายใน 15 วัน → บอกช่างตั้งแต่ตอนแจ้ง (นับจากธงที่ช่างติ๊ก ไม่เดาจากข้อความ)
    const isAircon = Number(category_id) === 1 || /แอร์|air ?con/i.test(descriptionThai);
    if (isAircon) {
      const refills = await sql`
        select ticket_number, resolved_at from fixhub.tickets
        where branch_code = ${branch_code}
          and ${assetId ? sql`asset_id = ${assetId}` : roomNo ? sql`room_no = ${roomNo}` : sql`location_detail = ${location_detail}`}
          and ticket_id <> ${ticketId} and refrigerant_refilled and status <> 'CANCELLED'
          and resolved_at >= now() - interval '15 days'
        order by resolved_at desc limit 1`;
      if (refills.length > 0) {
        const daysAgo = Math.max(0, Math.round((Date.now() - new Date(refills[0].resolved_at).getTime()) / 86400000));
        alerts.push(`⚠️ ห้อง ${location_detail} เพิ่งเติมน้ำยาแอร์เมื่อ ${daysAgo} วันที่แล้ว (${refills[0].ticket_number}) — ถ้าต้องเติมอีก อาจมีจุดรั่ว`);
      }
    }
    const dupes = await sql`
      select ticket_number, created_at from fixhub.tickets
      where branch_code = ${branch_code} and ${roomNo ? sql`room_no = ${roomNo}` : sql`location_detail = ${location_detail}`}
        and category_id = ${Number(category_id)} and ticket_id <> ${ticketId}
        and created_at >= now() - interval '1 day'
      order by created_at desc limit 1`;
    if (dupes.length > 0) {
      const hoursAgo = Math.round((Date.now() - new Date(dupes[0].created_at).getTime()) / 3600000);
      alerts.push(`🔄 งานซ้ำ: ห้อง ${location_detail} แจ้งปัญหาเดียวกันเมื่อ ${hoursAgo} ชม.ที่แล้ว (${dupes[0].ticket_number})`);
    }
    let assetLine: string | null = null;
    if (assetId) {
      const [a] = await sql`
        select a.asset_code, a.name, a.warranty_until,
               (select count(*)::int from fixhub.tickets t where t.asset_id = a.asset_id and t.ticket_id <> ${ticketId}
                  and t.status <> 'CANCELLED' and t.created_at > now() - interval '90 days') as n90
        from fixhub.assets a where a.asset_id = ${assetId}`;
      if (a) {
        assetLine = assetLineOf(a as any);
        if (a.n90 >= 2) alerts.push(`🔁 อุปกรณ์นี้ซ่อมไปแล้ว ${a.n90} ครั้งใน 90 วัน — ควรพิจารณาเปลี่ยนเครื่อง`);
      }
    }
    // LINE: ONE push per new ticket (duplicate / refrigerant alerts included in the same message)
    const lineText = formatNewTicketLine({
      priority, ticketNumber, branchCode: branch_code, locationDetail: location_detail, assetLine,
      description: descriptionThai, reporterName: user.full_name || user.username, reporter: user, alerts,
    });
    // แนบรูปที่ผู้แจ้งถ่าย (สูงสุด 4) ไปในครั้งเดียวกับข้อความ — ไม่เพิ่มโควตา LINE
    const reportImages = Array.isArray(images) ? images : [];
    const lineCfg = await getLineConfig();
    const autoLine = deptType === 'IT' ? lineCfg.autoIT : lineCfg.autoMaint;   // โหมดส่งต่อเอง → ไม่ต้องแปลงรูป
    const lineImages = autoLine && reportImages.length ? await toLineImageUrls(reportImages, ticketId) : [];
    const lineResult = await sendLineMessage(lineText, deptType, lineImages, { ticketEvent: true });
    console.log('[Tickets] LINE result:', JSON.stringify({ deptType, result: lineResult }));

    // แจ้งเตือนบนมือถือ (Web Push) ถึงช่าง/ไอทีของสาขานั้นที่เปิดรับไว้ — ฟรี ใช้คู่กับ LINE
    const pushTo = [
      ...await workersFor(branch_code, deptType === 'IT' ? 'IT' : 'MAINT', user.id).catch(() => [] as string[]),
      ...await gmsFor(branch_code, user.id).catch(() => [] as string[]),   // GM ได้ทุกใบของสาขาที่ดูแล
    ];
    const pushResult = await sendPushToUsers(pushTo, {
      title: `🔧 งานใหม่ ${branch_code} · ${location_detail}`.slice(0, 80),
      body: `${PRIORITY_LINE[priority] || ''} ${descriptionThai}`.trim().slice(0, 160),
      url: `/dashboard/${ticketId}`,
      tag: `ticket-${ticketId}`,
    });
    console.log('[Tickets] push result:', JSON.stringify({ to: pushTo.length, ...pushResult }));

    return NextResponse.json({
      success: true, ticket_number: ticketNumber, ticket_id: ticketId,
      alerts: alerts.length > 0 ? alerts : undefined,
    });
  } catch (err: any) {
    console.error('[Tickets] Create error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
