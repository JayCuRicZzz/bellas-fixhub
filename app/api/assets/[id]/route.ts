import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../../lib/db';
import { getUserFromRequest, getUserBranches } from '../../../../lib/auth';
import { isAssetManager } from '../../../../lib/asset-types';

export const dynamic = 'force-dynamic';

const clip = (v: any, n: number) => (v == null || v === '' ? null : String(v).trim().slice(0, n));
const dateOrNull = (v: any) => (v && !isNaN(new Date(v).getTime()) ? String(v).slice(0, 10) : null);

async function loadAsset(id: number, branches: string[]) {
  const rows = await sql`
    select a.*, l.name as location_name, l.code as location_code
    from fixhub.assets a left join fixhub.locations l on l.location_id = a.location_id
    where a.asset_id = ${id} and a.branch_code = any(${branches})`;
  return rows[0] || null;
}

// GET → อุปกรณ์ + ประวัติซ่อม + อะไหล่ที่ใช้
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const branches = await getUserBranches(user.id, user.role);
  const asset = await loadAsset(Number(params.id), branches);
  if (!asset) return NextResponse.json({ error: 'ไม่พบอุปกรณ์' }, { status: 404 });
  const tickets = await sql`
    select ticket_id, ticket_number, status, description, created_at, resolved_at, technician_name, sla_overdue, main_th, sub_th
    from fixhub.tickets_full where asset_id = ${asset.asset_id} order by created_at desc limit 100`;
  const parts = await sql`
    select m.move_id, m.qty, m.unit_cost, m.kind, m.moved_at, p.name, p.unit, t.ticket_number
    from fixhub.part_moves m join fixhub.parts p on p.part_id = m.part_id
    join fixhub.tickets t on t.ticket_id = m.ticket_id
    where t.asset_id = ${asset.asset_id} order by m.moved_at desc limit 200`;
  return NextResponse.json({ asset, tickets, parts });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req);
  if (!user || !isAssetManager(user.role)) return NextResponse.json({ error: 'เฉพาะแอดมิน/หัวหน้าเท่านั้น' }, { status: 403 });
  const branches = await getUserBranches(user.id, user.role);
  const asset = await loadAsset(Number(params.id), branches);
  if (!asset) return NextResponse.json({ error: 'ไม่พบอุปกรณ์' }, { status: 404 });
  try {
    const b = await req.json();
    const locId = Number(b.location_id) || null;
    if (locId) {
      const ok = await sql`select 1 from fixhub.locations where location_id = ${locId} and branch_code = ${asset.branch_code}`;
      if (!ok.length) return NextResponse.json({ error: 'ห้อง/จุดไม่อยู่ในสาขาเดียวกับอุปกรณ์' }, { status: 400 });
    }
    await sql`
      update fixhub.assets set
        name = ${clip(b.name, 120) || asset.name}, location_id = ${locId},
        brand = ${clip(b.brand, 60)}, model = ${clip(b.model, 60)}, serial_no = ${clip(b.serial_no, 80)},
        install_date = ${dateOrNull(b.install_date)}, warranty_until = ${dateOrNull(b.warranty_until)},
        vendor = ${clip(b.vendor, 120)}, note = ${clip(b.note, 500)}, updated_at = now()
      where asset_id = ${asset.asset_id}`;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// DELETE = ปลดระวาง (เก็บประวัติซ่อมไว้)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req);
  if (!user || !isAssetManager(user.role)) return NextResponse.json({ error: 'เฉพาะแอดมิน/หัวหน้าเท่านั้น' }, { status: 403 });
  const branches = await getUserBranches(user.id, user.role);
  const rows = await sql`update fixhub.assets set active = false, updated_at = now()
                         where asset_id = ${Number(params.id)} and branch_code = any(${branches}) returning asset_id`;
  if (!rows.length) return NextResponse.json({ error: 'ไม่พบอุปกรณ์' }, { status: 404 });
  return NextResponse.json({ success: true });
}
