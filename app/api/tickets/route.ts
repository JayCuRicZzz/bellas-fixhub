import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../lib/db';
import { getUserFromRequest, getUserBranches, getWorkDeptScope } from '../../../lib/auth';
import { translateToThai } from '../../../lib/translate';
import { sendLineMessage } from '../../../lib/line';

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

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { branch_code, category_id, location_detail, description, images } = body;
    const priority = VALID_PRIORITY.includes(body.priority) ? body.priority : 'medium';
    const difficulty = VALID_DIFFICULTY.includes(body.difficulty) ? body.difficulty : 'medium';

    if (!branch_code || !category_id || !location_detail || !description) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
    }

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

    const descriptionThai = await translateToThai(String(description).trim());

    const [created] = await sql`
      insert into fixhub.tickets
        (ticket_number, branch_code, category_id, reporter_id, reporter_department, location_detail, description,
         priority, difficulty, status, sla_deadline)
      values
        (fixhub.next_ticket_number(${branch_code}, ${deptCode}), ${branch_code}, ${Number(category_id)}, ${user.id}, ${reporterDept},
         ${String(location_detail).trim()}, ${descriptionThai}, ${priority}, ${difficulty}, 'PENDING',
         now() + make_interval(mins => ${slaMinutes}))
      returning ticket_id, ticket_number, created_at`;

    const ticketId: number = created.ticket_id;
    const ticketNumber: string = created.ticket_number;

    if (Array.isArray(images) && images.length > 0) {
      const rows = images.slice(0, 5).filter((u: any) => typeof u === 'string' && u).map((url: string) => ({
        ticket_id: ticketId, image_url: url, image_type: 'report', uploaded_by: user.id,
      }));
      if (rows.length) await sql`insert into fixhub.ticket_images ${sql(rows, 'ticket_id', 'image_url', 'image_type', 'uploaded_by')}`;
    }

    await sql`
      insert into fixhub.ticket_activity_log (ticket_id, action, old_status, new_status, action_by, action_by_name)
      values (${ticketId}, 'CREATED', null, 'PENDING', ${user.id}, ${user.full_name || user.username})`;

    // LINE: new ticket → MAINT or IT group
    const lineResult = await sendLineMessage(
      `📢 มีงานแจ้งซ่อมใหม่!\n🔢 ${ticketNumber}\n🏨 ${branch_code}\n📍 ${location_detail}\n📝 ${descriptionThai}\n👤 ${user.full_name || user.username}`,
      deptType
    );
    console.log('[Tickets] LINE result:', JSON.stringify({ deptType, result: lineResult }));

    // ---- duplicate & aircon-refill detection ----
    const alerts: string[] = [];
    const isRefrigerant = descriptionThai.includes('น้ำยา');
    if (isRefrigerant) {
      const refills = await sql`
        select ticket_number, created_at from fixhub.tickets
        where branch_code = ${branch_code} and location_detail = ${location_detail}
          and ticket_id <> ${ticketId} and created_at >= now() - interval '14 days'
          and description like '%น้ำยา%'
        order by created_at desc limit 1`;
      if (refills.length > 0) {
        const daysAgo = Math.round((Date.now() - new Date(refills[0].created_at).getTime()) / 86400000);
        alerts.push(`⚠️ น้ำยาแอร์ซ้ำ: ห้อง ${location_detail} เคยเติมน้ำยาแอร์เมื่อ ${daysAgo} วันที่แล้ว (${refills[0].ticket_number}) — ภายใน 14 วัน อาจมีแอร์รั่ว!`);
      }
    }
    const dupes = await sql`
      select ticket_number, created_at from fixhub.tickets
      where branch_code = ${branch_code} and location_detail = ${location_detail}
        and category_id = ${Number(category_id)} and ticket_id <> ${ticketId}
        and created_at >= now() - interval '1 day'
      order by created_at desc limit 1`;
    if (dupes.length > 0) {
      const hoursAgo = Math.round((Date.now() - new Date(dupes[0].created_at).getTime()) / 3600000);
      alerts.push(`🔄 งานซ้ำ: ห้อง ${location_detail} แจ้งปัญหาเดียวกันเมื่อ ${hoursAgo} ชม.ที่แล้ว (${dupes[0].ticket_number})`);
    }
    if (alerts.length > 0) {
      sendLineMessage(`🚨 แจ้งเตือนอัตโนมัติ\n📋 ${ticketNumber} (${branch_code})\n📍 ${location_detail}\n\n${alerts.join('\n')}`, deptType).catch(() => {});
    }

    return NextResponse.json({
      success: true, ticket_number: ticketNumber, ticket_id: ticketId,
      alerts: alerts.length > 0 ? alerts : undefined,
    });
  } catch (err: any) {
    console.error('[Tickets] Create error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
