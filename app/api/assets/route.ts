import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../lib/db';
import { getUserFromRequest, getUserBranches } from '../../../lib/auth';
import { assetTypeOf, isAssetManager } from '../../../lib/asset-types';

export const dynamic = 'force-dynamic';

const clip = (v: any, n: number) => (v == null || v === '' ? null : String(v).trim().slice(0, n));
const dateOrNull = (v: any) => (v && !isNaN(new Date(v).getTime()) ? String(v).slice(0, 10) : null);

// GET /api/assets?branch=&type=&location_id=&q=&dept=
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sp = req.nextUrl.searchParams;
  const branch = sp.get('branch') || '';
  const type = sp.get('type') || '';
  const dept = sp.get('dept') || '';
  const locationId = Number(sp.get('location_id')) || 0;
  const q = (sp.get('q') || '').trim();
  const branches = await getUserBranches(user.id, user.role);
  try {
    const rows = await sql`
      select a.*, l.name as location_name, l.code as location_code,
             (select count(*)::int from fixhub.tickets t where t.asset_id = a.asset_id and t.status <> 'CANCELLED') as repair_count,
             (select count(*)::int from fixhub.tickets t where t.asset_id = a.asset_id and t.status <> 'CANCELLED'
                and t.created_at > now() - interval '90 days') as repairs_90d,
             (select count(*)::int from fixhub.tickets t where t.asset_id = a.asset_id
                and t.status in ('PENDING','ACCEPTED','IN_PROGRESS','PAUSED')) as open_tickets,
             (select max(t.created_at) from fixhub.tickets t where t.asset_id = a.asset_id and t.status <> 'CANCELLED') as last_repair_at,
             (select coalesce(sum(-m.qty * m.unit_cost), 0)::numeric(12,2) from fixhub.part_moves m
                join fixhub.tickets t on t.ticket_id = m.ticket_id where t.asset_id = a.asset_id and m.kind in ('USE','RETURN')) as parts_cost
      from fixhub.assets a
      left join fixhub.locations l on l.location_id = a.location_id
      where a.active and a.branch_code = any(${branches})
        ${branch ? sql`and a.branch_code = ${branch}` : sql``}
        ${type ? sql`and a.asset_type = ${type}` : sql``}
        ${dept === 'IT' || dept === 'MAINTENANCE' ? sql`and a.dept_type = ${dept}` : sql``}
        ${locationId ? sql`and a.location_id = ${locationId}` : sql``}
        ${q ? sql`and (a.asset_code ilike ${'%' + q + '%'} or a.name ilike ${'%' + q + '%'} or a.brand ilike ${'%' + q + '%'}
                       or a.model ilike ${'%' + q + '%'} or a.serial_no ilike ${'%' + q + '%'} or l.name ilike ${'%' + q + '%'})` : sql``}
      order by a.branch_code, l.code nulls last, a.asset_code
      limit 1000`;
    return NextResponse.json(rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST สร้างอุปกรณ์ (แอดมิน/หัวหน้า) — รหัสทรัพย์สินสร้างอัตโนมัติ
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || !isAssetManager(user.role)) return NextResponse.json({ error: 'เฉพาะแอดมิน/หัวหน้าเท่านั้น' }, { status: 403 });
  try {
    const b = await req.json();
    const branches = await getUserBranches(user.id, user.role);
    if (!b.branch_code || !branches.includes(b.branch_code)) return NextResponse.json({ error: 'ไม่มีสิทธิ์สาขานี้' }, { status: 403 });
    const t = assetTypeOf(b.asset_type);
    if (!t) return NextResponse.json({ error: 'ประเภทอุปกรณ์ไม่ถูกต้อง' }, { status: 400 });
    const name = clip(b.name, 120) || t.th;
    const qty = Math.min(Math.max(parseInt(b.quantity, 10) || 1, 1), 200);  // เพิ่มทีละหลายเครื่อง (เช่น แอร์ทุกห้อง)
    const locationIds: number[] = Array.isArray(b.location_ids) && b.location_ids.length
      ? b.location_ids.map(Number).filter(Boolean).slice(0, 500)
      : [Number(b.location_id) || 0];
    if (locationIds.some(id => id)) {
      const ok = await sql`select count(*)::int as n from fixhub.locations where location_id = any(${locationIds.filter(Boolean)}) and branch_code = ${b.branch_code}`;
      if (ok[0].n !== locationIds.filter(Boolean).length) return NextResponse.json({ error: 'ห้อง/จุดไม่อยู่ในสาขานี้' }, { status: 400 });
    }
    const created: string[] = [];
    await sql.begin(async (tx) => {
      for (const locId of locationIds) {
        for (let i = 0; i < (locationIds.length > 1 ? 1 : qty); i++) {
          const [r] = await tx`
            insert into fixhub.assets (asset_code, branch_code, location_id, dept_type, asset_type, name, brand, model, serial_no,
                                       install_date, warranty_until, vendor, note, created_by)
            values (fixhub.next_asset_code(${b.branch_code}, ${t.code}), ${b.branch_code}, ${locId || null}, ${t.dept}, ${t.code}, ${name},
                    ${clip(b.brand, 60)}, ${clip(b.model, 60)}, ${locationIds.length > 1 || qty > 1 ? null : clip(b.serial_no, 80)},
                    ${dateOrNull(b.install_date)}, ${dateOrNull(b.warranty_until)}, ${clip(b.vendor, 120)}, ${clip(b.note, 500)}, ${user.id})
            returning asset_code`;
          created.push(r.asset_code);
        }
      }
    });
    return NextResponse.json({ success: true, created });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
