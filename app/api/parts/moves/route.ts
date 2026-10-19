import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../../lib/db';
import { getUserFromRequest, getUserBranches } from '../../../../lib/auth';
import { isAssetManager } from '../../../../lib/asset-types';

export const dynamic = 'force-dynamic';

// GET /api/parts/moves?part_id=&branch= → ประวัติรับเข้า/เบิกใช้ (ล่าสุด 200 รายการ)
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role === 'gm') return NextResponse.json({ error: 'ไม่มีสิทธิ์' }, { status: 403 });  // GM ไม่เห็นทรัพย์สิน/อะไหล่
  const partId = Number(req.nextUrl.searchParams.get('part_id')) || 0;
  const branch = req.nextUrl.searchParams.get('branch') || '';
  const branches = await getUserBranches(user.id, user.role);
  const rows = await sql`
    select m.*, p.name as part_name, p.unit, pr.full_name as moved_by_name, t.ticket_number
    from fixhub.part_moves m
    join fixhub.parts p on p.part_id = m.part_id
    left join fixhub.profiles pr on pr.user_id = m.moved_by
    left join fixhub.tickets t on t.ticket_id = m.ticket_id
    where m.branch_code = any(${branches})
      ${partId ? sql`and m.part_id = ${partId}` : sql``}
      ${branch ? sql`and m.branch_code = ${branch}` : sql``}
    order by m.moved_at desc limit 200`;
  return NextResponse.json(rows);
}

// POST { part_id, branch_code, kind: 'IN'|'ADJUST', qty, unit_cost, note } — รับเข้า/ปรับยอด (แอดมิน/หัวหน้า)
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || !isAssetManager(user.role)) return NextResponse.json({ error: 'เฉพาะแอดมิน/หัวหน้าเท่านั้น' }, { status: 403 });
  try {
    const b = await req.json();
    const branches = await getUserBranches(user.id, user.role);
    if (!branches.includes(b.branch_code)) return NextResponse.json({ error: 'ไม่มีสิทธิ์สาขานี้' }, { status: 403 });
    const kind = b.kind === 'ADJUST' ? 'ADJUST' : 'IN';
    const qty = Number(b.qty);
    if (!Number.isFinite(qty) || qty === 0 || (kind === 'IN' && qty < 0) || Math.abs(qty) > 100000) {
      return NextResponse.json({ error: 'จำนวนไม่ถูกต้อง' }, { status: 400 });
    }
    const [part] = await sql`select part_id, unit_cost from fixhub.parts where part_id = ${Number(b.part_id)} and active`;
    if (!part) return NextResponse.json({ error: 'ไม่พบอะไหล่' }, { status: 404 });
    const cost = Number(b.unit_cost) >= 0 && b.unit_cost !== '' && b.unit_cost != null ? Number(b.unit_cost) : Number(part.unit_cost);
    await sql.begin(async (tx) => {
      await tx`insert into fixhub.part_moves (part_id, branch_code, qty, unit_cost, kind, note, moved_by)
               values (${part.part_id}, ${b.branch_code}, ${qty}, ${cost}, ${kind}, ${b.note ? String(b.note).slice(0, 300) : null}, ${user.id})`;
      if (kind === 'IN' && cost > 0) await tx`update fixhub.parts set unit_cost = ${cost} where part_id = ${part.part_id}`;
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
