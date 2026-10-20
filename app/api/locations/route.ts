import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../lib/db';
import { getUserFromRequest, getUserBranches } from '../../../lib/auth';
import { isAssetManager } from '../../../lib/asset-types';

export const dynamic = 'force-dynamic';

/** "301-310, 401, LOBBY" → ['301',…,'310','401','LOBBY'] (สูงสุด 500 รายการ) */
function expandCodes(input: string): string[] {
  const out: string[] = [];
  for (const raw of String(input || '').split(/[,\n]/)) {
    const part = raw.trim();
    if (!part) continue;
    const m = part.match(/^([A-Za-z]*)(\d+)\s*-\s*([A-Za-z]*)(\d+)$/);
    if (m && m[1] === m[3]) {
      const a = parseInt(m[2], 10), b = parseInt(m[4], 10), w = m[2].length;
      if (b >= a && b - a < 500) {
        for (let i = a; i <= b; i++) out.push(m[1] + String(i).padStart(w, '0'));
        continue;
      }
    }
    out.push(part.slice(0, 40));
  }
  return Array.from(new Set(out)).slice(0, 500);
}

// GET /api/locations?branch=BV  → ห้อง/จุด ของสาขาที่ผู้ใช้เข้าถึงได้ + จำนวนงานค้าง/อุปกรณ์
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role === 'gm') return NextResponse.json({ error: 'ไม่มีสิทธิ์' }, { status: 403 });  // GM ไม่เห็นทรัพย์สิน/อะไหล่
  const branch = req.nextUrl.searchParams.get('branch') || '';
  const branches = await getUserBranches(user.id, user.role);
  try {
    const rows = await sql`
      select l.*, b.branch_name,
             (select count(*)::int from fixhub.assets a where a.location_id = l.location_id and a.active) as asset_count,
             (select count(*)::int from fixhub.tickets t where t.location_id = l.location_id
                and t.status in ('PENDING','ACCEPTED','IN_PROGRESS','PAUSED')) as open_tickets,
             (select count(*)::int from fixhub.tickets t where t.location_id = l.location_id
                and t.created_at > now() - interval '90 days' and t.status <> 'CANCELLED') as tickets_90d
      from fixhub.locations l join fixhub.branches b on b.branch_code = l.branch_code
      where l.active and l.branch_code = any(${branches})
        ${branch ? sql`and l.branch_code = ${branch}` : sql``}
      order by l.branch_code, l.kind, length(l.code), l.code`;
    return NextResponse.json(rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST { branch_code, codes: "301-320, LOBBY", kind, name_prefix } → เพิ่มหลายจุดในครั้งเดียว
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || !isAssetManager(user.role)) return NextResponse.json({ error: 'เฉพาะแอดมิน/หัวหน้าเท่านั้น' }, { status: 403 });
  try {
    const { branch_code, codes, kind, name_prefix, floor } = await req.json();
    const branches = await getUserBranches(user.id, user.role);
    if (!branch_code || !branches.includes(branch_code)) return NextResponse.json({ error: 'ไม่มีสิทธิ์สาขานี้' }, { status: 403 });
    const k = kind === 'area' ? 'area' : 'room';
    const list = expandCodes(codes);
    if (!list.length) return NextResponse.json({ error: 'กรุณาระบุเลขห้อง/จุด' }, { status: 400 });
    const prefix = typeof name_prefix === 'string' ? name_prefix.trim().slice(0, 30) : (k === 'room' ? 'ห้อง' : '');
    const rows = list.map(code => ({
      branch_code, code, kind: k, floor: floor ? String(floor).slice(0, 10) : (k === 'room' && /^\d{3,5}$/.test(code) ? code.slice(0, code.length - 2) : null),
      name: (prefix ? `${prefix} ${code}` : code).slice(0, 80),
    }));
    const inserted = await sql`
      insert into fixhub.locations ${sql(rows, 'branch_code', 'code', 'kind', 'floor', 'name')}
      on conflict (branch_code, code) do update set active = true
      returning location_id`;
    return NextResponse.json({ success: true, count: inserted.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// PUT { location_id, name, kind, floor } · DELETE ?id= (ปิดการใช้งาน ไม่ลบประวัติ)
export async function PUT(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || !isAssetManager(user.role)) return NextResponse.json({ error: 'เฉพาะแอดมิน/หัวหน้าเท่านั้น' }, { status: 403 });
  try {
    const { location_id, name, kind, floor } = await req.json();
    const branches = await getUserBranches(user.id, user.role);
    const rows = await sql`
      update fixhub.locations set
        name = coalesce(${name ? String(name).slice(0, 80) : null}, name),
        kind = coalesce(${kind === 'area' || kind === 'room' ? kind : null}, kind),
        floor = ${floor ? String(floor).slice(0, 10) : null}
      where location_id = ${Number(location_id)} and branch_code = any(${branches})
      returning location_id`;
    if (!rows.length) return NextResponse.json({ error: 'ไม่พบข้อมูล' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || !isAssetManager(user.role)) return NextResponse.json({ error: 'เฉพาะแอดมิน/หัวหน้าเท่านั้น' }, { status: 403 });
  const id = Number(req.nextUrl.searchParams.get('id'));
  const branches = await getUserBranches(user.id, user.role);
  const rows = await sql`update fixhub.locations set active = false where location_id = ${id} and branch_code = any(${branches}) returning location_id`;
  if (!rows.length) return NextResponse.json({ error: 'ไม่พบข้อมูล' }, { status: 404 });
  return NextResponse.json({ success: true });
}
