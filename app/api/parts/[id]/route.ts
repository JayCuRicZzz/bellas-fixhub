import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../../lib/db';
import { getUserFromRequest } from '../../../../lib/auth';
import { isAssetManager } from '../../../../lib/asset-types';

export const dynamic = 'force-dynamic';
const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req);
  if (!user || !isAssetManager(user.role)) return NextResponse.json({ error: 'เฉพาะแอดมิน/หัวหน้าเท่านั้น' }, { status: 403 });
  try {
    const b = await req.json();
    const rows = await sql`
      update fixhub.parts set
        name = coalesce(${b.name ? String(b.name).trim().slice(0, 120) : null}, name),
        unit = coalesce(${b.unit ? String(b.unit).slice(0, 20) : null}, unit),
        dept_type = coalesce(${b.dept_type === 'IT' || b.dept_type === 'MAINTENANCE' ? b.dept_type : null}, dept_type),
        min_stock = ${Math.max(0, num(b.min_stock))}, unit_cost = ${Math.max(0, num(b.unit_cost))}
      where part_id = ${Number(params.id)} returning part_id`;
    if (!rows.length) return NextResponse.json({ error: 'ไม่พบอะไหล่' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req);
  if (!user || !isAssetManager(user.role)) return NextResponse.json({ error: 'เฉพาะแอดมิน/หัวหน้าเท่านั้น' }, { status: 403 });
  await sql`update fixhub.parts set active = false where part_id = ${Number(params.id)}`;
  return NextResponse.json({ success: true });
}
