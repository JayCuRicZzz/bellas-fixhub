import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../lib/auth';
import { uploadImage, safeImageFilename, MAX_IMAGE_BYTES } from '../../../lib/upload';
import sql from '../../../lib/db';

export const dynamic = 'force-dynamic';

const IMAGE_TYPES = ['report', 'repair', 'other'];

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get('image') as File | null;
    const ticketId = parseInt(formData.get('ticket_id')?.toString() || '', 10);
    const imageTypeRaw = formData.get('image_type')?.toString() || 'report';
    const imageType = IMAGE_TYPES.includes(imageTypeRaw) ? imageTypeRaw : 'report';

    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = safeImageFilename(file.name);
    const folder = ticketId ? `tickets/${ticketId}` : 'tickets/new';
    const { url, path } = await uploadImage(buffer, filename, file.type, folder);

    if (ticketId) {
      await sql`
        insert into fixhub.ticket_images (ticket_id, image_url, storage_path, image_type, uploaded_by)
        values (${ticketId}, ${url}, ${path}, ${imageType}, ${user.id})`;
      await sql`
        insert into fixhub.ticket_activity_log (ticket_id, action, old_status, new_status, action_by, action_by_name, reason)
        values (${ticketId}, 'IMAGE', null, null, ${user.id}, ${user.full_name || user.username}, ${`แนบรูป (${imageType})`})`.catch(() => {});
    }

    return NextResponse.json({ url, filename, path });
  } catch (err: any) {
    console.error('[Upload] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ticketId = parseInt(req.nextUrl.searchParams.get('ticket_id') || '', 10);
  if (!ticketId) return NextResponse.json({ error: 'ticket_id required' }, { status: 400 });

  try {
    const rows = await sql`
      select ti.*, p.full_name as uploader_name
      from fixhub.ticket_images ti
      left join fixhub.profiles p on p.user_id = ti.uploaded_by
      where ti.ticket_id = ${ticketId}
      order by ti.uploaded_at desc`;
    return NextResponse.json(rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
