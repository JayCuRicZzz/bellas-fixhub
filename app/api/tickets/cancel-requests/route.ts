import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getUserBranches } from '../../../../lib/auth';
import { listCancelRequests, CANCEL_APPROVER_ROLES } from '../../../../lib/cancel-request';

export const dynamic = 'force-dynamic';

// GM/Admin: คำขอยกเลิกที่รออนุมัติในสาขาที่ดูแล
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!CANCEL_APPROVER_ROLES.includes(user.role)) return NextResponse.json({ items: [] });
  try {
    const branches = await getUserBranches(user.id, user.role);
    return NextResponse.json({ items: await listCancelRequests(branches) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
