import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../lib/db';
import { getUserFromRequest, getUserBranches } from '../../../lib/auth';
import { isAssetManager } from '../../../lib/asset-types';

export const dynamic = 'force-dynamic';
const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

// GET /api/parts?branch=BV&dept= → รายการอะไหล่ + คงเหลือ (ของสาขาที่เลือก หรือรวมทุกสาขาที่เข้าถึงได้)
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const branch = req.nextUrl.searchParams.get('branch') || '';
  const dept = req.nextUrl.searchParams.get('dept') || '';
  const branches = await getUserBranches(user.id, user.role);
  const scope = branch && branches.includes(branch) ? [branch] : branches;
  try {
    const rows = await sql`
      select p.*,
             coalesce((select sum(s.qty) from fixhub.part_stock s where s.part_id = p.part_id and s.branch_code = any(${scope})), 0)::float as stock,
             coalesce((select json_object_agg(s.branch_code, s.qty::float) from fixhub.part_stock s
                        where s.part_id = p.part_id and s.branch_code = any(${scope}) and s.qty <> 0), '{}'::json) as stock_by_branch,
             coalesce((select sum(-m.qty) from fixhub.part_moves m where m.part_id = p.part_id and m.branch_code = any(${scope})
                        and m.kind in ('USE','RETURN') and m.moved_at > now() - interval '30 days'), 0)::float as used_30d
      from fixhub.parts p
      where p.active ${dept === 'IT' || dept === 'MAINTENANCE' ? sql`and p.dept_type = ${dept}` : sql``}
      order by p.dept_type, p.name`;
    return NextResponse.json(rows.map((r: any) => ({ ...r, low: Number(r.stock) <= Number(r.min_stock) })));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST สร้างอะไหล่ใหม่ (แอดมิน/หัวหน้า)
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || !isAssetManager(user.role)) return NextResponse.json({ error: 'เฉพาะแอดมิน/หัวหน้าเท่านั้น' }, { status: 403 });
  try {
    const b = await req.json();
    const name = String(b.name || '').trim().slice(0, 120);
    if (!name) return NextResponse.json({ error: 'กรุณาระบุชื่ออะไหล่' }, { status: 400 });
    const dept = b.dept_type === 'IT' ? 'IT' : 'MAINTENANCE';
    let code = String(b.part_code || '').trim().toUpperCase().replace(/[^A-Z0-9\-_.]/g, '').slice(0, 30);
    if (!code) {
      const [{ n }] = await sql`select count(*)::int + 1 as n from fixhub.parts`;
      code = `${dept === 'IT' ? 'IT' : 'MT'}-${String(n).padStart(4, '0')}`;
    }
    const [row] = await sql`
      insert into fixhub.parts (part_code, name, unit, dept_type, min_stock, unit_cost)
      values (${code}, ${name}, ${String(b.unit || 'ชิ้น').slice(0, 20)}, ${dept}, ${Math.max(0, num(b.min_stock))}, ${Math.max(0, num(b.unit_cost))})
      returning part_id, part_code`;
    return NextResponse.json({ success: true, ...row });
  } catch (err: any) {
    const dup = String(err.message).includes('duplicate');
    return NextResponse.json({ error: dup ? 'รหัสอะไหล่นี้มีอยู่แล้ว' : err.message }, { status: 400 });
  }
}
