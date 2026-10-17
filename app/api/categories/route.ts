import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../lib/db';
import { getUserFromRequest } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const deptType = new URL(req.url).searchParams.get('dept_type') || '';
    const dbDept = deptType === 'ช่าง' || deptType === 'MAINT' ? 'MAINTENANCE' : deptType === 'ไอที' ? 'IT' : deptType;
    const rows = await sql`
      select * from fixhub.categories
      where active ${dbDept ? sql`and dept_type = ${dbDept}` : sql``}
      order by category_id`;
    return NextResponse.json(rows);
  } catch (err: any) {
    console.error('[Categories] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
