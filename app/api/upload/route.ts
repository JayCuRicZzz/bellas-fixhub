import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../lib/auth';
import { uploadImage } from '../../../lib/upload';
import pool from '../../../lib/db';

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('image') as File;
    const ticketId = formData.get('ticket_id')?.toString();
    const imageType = formData.get('image_type')?.toString() || 'report';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `upload-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const imageUrl = await uploadImage(buffer, filename, file.type);

    // Save to ticket_images if ticketId provided
    if (ticketId) {
      await pool.query(
        `INSERT INTO ticket_images (ticket_id, image_url, image_type, uploaded_by) VALUES (?, ?, ?, ?)`,
        [parseInt(ticketId), imageUrl, imageType, user.user_id || user.id]
      );
    }

    return NextResponse.json({ url: imageUrl, filename });
  } catch (err: any) {
    console.error('[Upload] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ticketId = req.nextUrl.searchParams.get('ticket_id');
  if (!ticketId) {
    return NextResponse.json({ error: 'ticket_id required' }, { status: 400 });
  }

  try {
    const [rows]: any = await pool.query(
      `SELECT ti.*, u.full_name as uploader_name
       FROM ticket_images ti
       LEFT JOIN users u ON ti.uploaded_by = u.user_id
       WHERE ti.ticket_id = ?
       ORDER BY ti.uploaded_at DESC`,
      [parseInt(ticketId)]
    );
    return NextResponse.json(rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
