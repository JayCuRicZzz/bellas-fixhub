import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../../lib/db';
import { getUserFromRequest } from '../../../../lib/auth';
import { FREQ_UNITS } from '../../../../lib/pm';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  try {
    const id = parseInt(params.id, 10);
    const b = await req.json();
    const freqVal = b.frequency_value !== undefined ? parseInt(b.frequency_value, 10) : null;
    if (b.frequency_unit && !FREQ_UNITS.includes(b.frequency_unit)) return NextResponse.json({ error: 'frequency_unit ไม่ถูกต้อง' }, { status: 400 });
    await sql`
      update fixhub.pm_schedules set
        title = coalesce(${b.title ?? null}, title),
        description = coalesce(${b.description ?? null}, description),
        branch_code = coalesce(${b.branch_code ?? null}, branch_code),
        category_id = coalesce(${b.category_id ? Number(b.category_id) : null}, category_id),
        frequency_value = coalesce(${freqVal}, frequency_value),
        frequency_unit = coalesce(${b.frequency_unit ?? null}, frequency_unit),
        next_run = coalesce(${b.next_run ? new Date(b.next_run) : null}, next_run),
        active = coalesce(${typeof b.active === 'boolean' ? b.active : null}, active)
      where id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  try {
    const id = parseInt(params.id, 10);
    await sql`update fixhub.pm_schedules set active = false where id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
