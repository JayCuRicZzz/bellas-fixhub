import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../../lib/db';
import { getUserFromRequest, getUserBranches } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/qr/<token> → ห้อง/จุด หรือ อุปกรณ์ที่ QR ชี้ + งานที่ยังค้างของจุดนั้น (กันแจ้งซ้ำ)
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const token = String(params.token || '').replace(/[^a-z0-9]/gi, '').slice(0, 64);
  if (!token) return NextResponse.json({ error: 'QR ไม่ถูกต้อง' }, { status: 404 });

  const asset = (await sql`
    select a.asset_id, a.asset_code, a.name, a.asset_type, a.dept_type, a.branch_code, a.location_id,
           a.brand, a.model, a.warranty_until, l.name as location_name, l.code as location_code
    from fixhub.assets a left join fixhub.locations l on l.location_id = a.location_id
    where a.qr_token = ${token} and a.active`)[0];
  const loc: any = asset ? null : (await sql`
    select location_id, code, name, kind, branch_code from fixhub.locations where qr_token = ${token} and active`)[0];
  if (!asset && !loc) return NextResponse.json({ error: 'ไม่พบ QR นี้ในระบบ (อาจถูกยกเลิกแล้ว)' }, { status: 404 });

  const branch = (asset || loc).branch_code;
  const branches = await getUserBranches(user.id, user.role);
  if (!branches.includes(branch)) return NextResponse.json({ error: 'QR นี้เป็นของสาขาที่คุณไม่มีสิทธิ์แจ้ง' }, { status: 403 });

  const locationId = asset ? asset.location_id : loc.location_id;
  const open = await sql`
    select ticket_id, ticket_number, status, description, created_at, asset_name
    from fixhub.tickets_full
    where status in ('PENDING','ACCEPTED','IN_PROGRESS','PAUSED')
      and (${asset ? sql`asset_id = ${asset.asset_id}` : sql`false`} or ${locationId ? sql`location_id = ${locationId}` : sql`false`})
    order by created_at desc limit 10`;
  const assets = locationId ? await sql`
    select asset_id, asset_code, name, asset_type, dept_type from fixhub.assets
    where location_id = ${locationId} and active order by asset_type, asset_code` : [];

  return NextResponse.json({
    type: asset ? 'asset' : 'location',
    branch_code: branch,
    location: asset ? (asset.location_id ? { location_id: asset.location_id, name: asset.location_name, code: asset.location_code } : null)
                    : { location_id: loc.location_id, name: loc.name, code: loc.code, kind: loc.kind },
    asset: asset || null,
    assets,
    open_tickets: open,
  });
}
