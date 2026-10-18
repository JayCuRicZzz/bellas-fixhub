import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../lib/auth';
import { ticketAccess } from '../../../lib/ticket-access';
import { uploadImage, safeImageFilename, processImage, MAX_IMAGE_BYTES, MAX_IMAGES_PER_TICKET } from '../../../lib/upload';
import sql from '../../../lib/db';

export const dynamic = 'force-dynamic';

const IMAGE_TYPES = ['report', 'repair', 'other'];

/** 404 if missing, 403 if outside the user's branch/department or the ticket is already closed. */
async function ticketAccessDenied(user: any, ticketId: number, forWrite = false) {
  const acc = await ticketAccess(user, ticketId);
  if (acc === 'notfound') return NextResponse.json({ error: 'ไม่พบใบงาน' }, { status: 404 });
  if (acc === 'denied') return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึงใบงานนี้' }, { status: 403 });
  if (forWrite && ['APPROVED', 'CANCELLED'].includes(acc.status)) return NextResponse.json({ error: 'ใบงานนี้ปิดแล้ว แนบรูปเพิ่มไม่ได้' }, { status: 409 });
  return null;
}

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
    if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: 'ไฟล์ใหญ่เกินไป (สูงสุด 10MB)' }, { status: 400 });

    if (ticketId) {
      const denied = await ticketAccessDenied(user, ticketId, true);
      if (denied) return denied;
      const [{ n }] = await sql`select count(*)::int as n from fixhub.ticket_images where ticket_id = ${ticketId}`;
      if (n >= MAX_IMAGES_PER_TICKET) {
        return NextResponse.json({ error: `แนบรูปได้สูงสุด ${MAX_IMAGES_PER_TICKET} รูปต่อใบงาน` }, { status: 400 });
      }
    }

    let processed;
    try {
      processed = await processImage(Buffer.from(await file.arrayBuffer()));
    } catch (e: any) {
      return NextResponse.json({ error: 'ไม่สามารถอ่านไฟล์รูปได้' }, { status: 400 });
    }
    const filename = safeImageFilename(processed.ext);
    const folder = ticketId ? `tickets/${ticketId}` : 'tickets/new';
    const { url, path } = await uploadImage(processed.buffer, filename, processed.contentType, folder);

    if (ticketId) {
      await sql`
        insert into fixhub.ticket_images (ticket_id, image_url, storage_path, image_type, uploaded_by)
        values (${ticketId}, ${url}, ${path}, ${imageType}, ${user.id})`;
      await sql`
        insert into fixhub.ticket_activity_log (ticket_id, action, old_status, new_status, action_by, action_by_name, reason)
        values (${ticketId}, 'IMAGE', null, null, ${user.id}, ${user.full_name || user.username}, ${`แนบรูป (${imageType})`})`.catch(() => {});
    }

    return NextResponse.json({ url, filename, path, width: processed.width, height: processed.height, bytes: processed.buffer.length, original_bytes: file.size });
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
    const denied = await ticketAccessDenied(user, ticketId);
    if (denied) return denied;
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
