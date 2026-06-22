import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../../lib/db';
import { getUserFromRequest } from '../../../../../lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [rows]: any = await pool.query(
      `SELECT al.*, u.full_name as action_by_name_display
       FROM ticket_activity_log al
       LEFT JOIN users u ON al.action_by = u.user_id
       WHERE al.ticket_id = ?
       ORDER BY al.created_at DESC`,
      [params.id]
    );

    const logs = rows.map((r: any) => ({
      ...r,
      actionByName: r.action_by_name_display || r.action_by_name || 'ระบบ',
    }));

    return NextResponse.json(logs);
  } catch (err: any) {
    console.error('[ActivityLog] Error:', err.message);
    // Table might not exist yet
    return NextResponse.json([]);
  }
}
