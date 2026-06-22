import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { getUserFromRequest } from '../../../../lib/auth';

async function logActivity(pool: any, ticketId: string, action: string, oldStatus: string, newStatus: string, userId: number, userName: string, reason?: string) {
  try {
    await pool.query(
      `INSERT INTO ticket_activity_log (ticket_id, action, old_status, new_status, action_by, action_by_name, reason) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [ticketId, action, oldStatus, newStatus, userId, userName, reason || null]
    );
  } catch (e: any) {
    console.error('[Activity Log] Failed:', e.message);
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [rows]: any = await pool.query(
      `SELECT t.*, c.main_th, c.sub_th, c.dept_type,
              u.full_name as reporter_name,
              tu.full_name as technician_name,
              au.full_name as accepted_by_name,
              ru.full_name as resolved_by_name,
              apu.full_name as approved_by_name
       FROM tickets t
       JOIN categories c ON t.category_id = c.category_id
       LEFT JOIN users u ON t.reporter_id = u.user_id
       LEFT JOIN users tu ON t.technician_id = tu.user_id
       LEFT JOIN users au ON t.accepted_by = au.user_id
       LEFT JOIN users ru ON t.resolved_by = ru.user_id
       LEFT JOIN users apu ON t.approved_by = apu.user_id
       WHERE t.ticket_id = ?`,
      [params.id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบใบงาน' }, { status: 404 });
    }

    // Calculate SLA status
    const ticket = rows[0];
    if (ticket.sla_deadline) {
      const now = new Date();
      const deadline = new Date(ticket.sla_deadline);
      ticket.sla_overdue = ticket.status !== 'APPROVED' && ticket.status !== 'CANCELLED' && now > deadline;
    }

    return NextResponse.json(ticket);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function getSlaDeadline(priority: string): Promise<Date | null> {
  try {
    const [rows]: any = await pool.query(
      'SELECT sla_minutes FROM sla_config WHERE priority = ? LIMIT 1',
      [priority]
    );
    if (rows.length > 0 && rows[0].sla_minutes) {
      const d = new Date();
      d.setMinutes(d.getMinutes() + rows[0].sla_minutes);
      return d;
    }
  } catch (e) { /* ignore */ }
  return null;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { status, pending_reason, kpi_rating, difficulty } = body;
    const ticketId = params.id;
    const userId = user.user_id || user.id;

    // Get current ticket for SLA calculations
    const [currentRows]: any = await pool.query(
      'SELECT * FROM tickets WHERE ticket_id = ?',
      [ticketId]
    );

    if (currentRows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบใบงาน' }, { status: 404 });
    }

    const currentTicket = currentRows[0];
    let slaInfo: any = null;

    if (status === 'ACCEPTED') {
      // GM cannot accept work
      if (user.role === 'gm') {
        return NextResponse.json({ error: 'GM ไม่สามารถรับงานได้' }, { status: 403 });
      }
      // Calculate SLA deadline based on priority and sla_config
      const priority = currentTicket.priority || 'medium';
      const slaDeadline = await getSlaDeadline(priority);

      await pool.query(
        `UPDATE tickets SET status = 'IN_PROGRESS', technician_id = ?,
         accepted_at = NOW(), accepted_by = ?,
         sla_deadline = ?
         WHERE ticket_id = ?`,
        [userId, userId, slaDeadline, ticketId]
      );
      await logActivity(pool, ticketId, 'ACCEPTED', currentTicket.status, 'IN_PROGRESS', userId, user.full_name || user.username);

      slaInfo = {
        accepted_by: userId,
        sla_deadline: slaDeadline,
      };

    } else if (status === 'IN_PROGRESS') {
      await pool.query(
        `UPDATE tickets SET status = ?, technician_id = COALESCE(technician_id, ?),
         accepted_at = COALESCE(accepted_at, NOW()),
         accepted_by = COALESCE(accepted_by, ?)
         WHERE ticket_id = ?`,
        [status, userId, userId, ticketId]
      );
      await logActivity(pool, ticketId, 'START', currentTicket.status, 'IN_PROGRESS', userId, user.full_name || user.username);

    } else if (status === 'RESOLVED') {
      // Calculate sla_minutes before update (NOW() changes)
      let slaMinutes = null;
      if (currentTicket.accepted_at) {
        const [result]: any = await pool.query(
          'SELECT TIMESTAMPDIFF(MINUTE, ?, NOW()) as minutes',
          [currentTicket.accepted_at]
        );
        slaMinutes = result[0]?.minutes ?? null;
      }

      await pool.query(
        `UPDATE tickets SET status = ?, pending_reason = ?,
         resolved_at = NOW(), resolved_by = ?,
         sla_minutes = ?
         WHERE ticket_id = ?`,
        [status, pending_reason || null, userId, slaMinutes, ticketId]
      );
      await logActivity(pool, ticketId, 'RESOLVED', currentTicket.status, 'RESOLVED', userId, user.full_name || user.username);

      slaInfo = {
        resolved_by: userId,
        sla_minutes: slaMinutes,
      };

    } else if (status === 'APPROVED') {
      // Save difficulty if provided (supervisor sets during approval)
      if (difficulty && ['sup','supit','admin','gm'].includes(user.role)) {
        await pool.query('UPDATE tickets SET difficulty = ? WHERE ticket_id = ?', [difficulty, ticketId]);
      }

      await pool.query(
        `UPDATE tickets SET status = ?, approved_at = NOW(), approved_by = ?
         WHERE ticket_id = ?`,
        [status, userId, ticketId]
      );
      await logActivity(pool, ticketId, 'APPROVED', currentTicket.status, 'APPROVED', userId, user.full_name || user.username);

      slaInfo = {
        approved_by: userId,
        difficulty: difficulty || null,
      };

    } else if (status === 'REJECTED') {
      // Supervisor rejects → send back to technician
      await pool.query(
        `UPDATE tickets SET status = 'PENDING', pending_reason = ?, technician_id = NULL
         WHERE ticket_id = ?`,
        [pending_reason || 'หัวหน้าปฏิเสธงาน กรุณาดำเนินการใหม่', ticketId]
      );
      await logActivity(pool, ticketId, 'REJECTED', currentTicket.status, 'PENDING', userId, user.full_name || user.username, pending_reason || 'หัวหน้าตีกลับ');

      slaInfo = { rejected_by: userId, reason: pending_reason };
    } else if (status === 'FLAGGED') {
      // Reporter flags unsatisfactory work → notify supervisor
      await pool.query(
        `UPDATE tickets SET status = 'PENDING', pending_reason = ?
         WHERE ticket_id = ?`,
        [pending_reason || 'ผู้แจ้งแจ้งว่างานยังไม่เรียบร้อย', ticketId]
      );
      await logActivity(pool, ticketId, 'FLAGGED', currentTicket.status, 'PENDING', userId, user.full_name || user.username, pending_reason || 'งานไม่เรียบร้อย (ธงแดง)');

      slaInfo = { flagged_by: userId, reason: pending_reason };

    } else if (status === 'CANCELLED') {
      await pool.query(
        'UPDATE tickets SET status = ? WHERE ticket_id = ?',
        [status, ticketId]
      );
      await logActivity(pool, ticketId, 'CANCELLED', currentTicket.status, 'CANCELLED', userId, user.full_name || user.username);
    } else {
      // Difficulty update (supervisor only)
      const supervisorRoles = ['sup', 'supit', 'admin', 'gm'];
      if (difficulty !== undefined && supervisorRoles.includes(user.role)) {
        await pool.query(
          'UPDATE tickets SET difficulty = ? WHERE ticket_id = ?',
          [difficulty, ticketId]
        );
      }
      // KPI rating — reporter or supervisor can rate
      if (kpi_rating !== undefined && !status) {
        const canRateKpi = currentTicket.reporter_id === userId || ['sup','supit','admin','gm'].includes(user.role);
        if (!canRateKpi) {
          return NextResponse.json({ error: 'เฉพาะผู้แจ้งหรือหัวหน้าเท่านั้นที่ให้คะแนนได้' }, { status: 403 });
        }
        await pool.query(
          'UPDATE tickets SET kpi_rating = ? WHERE ticket_id = ?',
          [kpi_rating, ticketId]
        );
        await logActivity(pool, ticketId, 'RATED', currentTicket.status, currentTicket.status, userId, user.full_name || user.username, `ให้คะแนน ${kpi_rating} ดาว`);
      } else if (!difficulty && status) {
        await pool.query(
          'UPDATE tickets SET status = ? WHERE ticket_id = ?',
          [status, ticketId]
        );
      }
    }

    // Fetch updated ticket with SLA info
    const [updatedRows]: any = await pool.query(
      `SELECT t.*, c.main_th, c.sub_th, c.dept_type
       FROM tickets t
       JOIN categories c ON t.category_id = c.category_id
       WHERE t.ticket_id = ?`,
      [ticketId]
    );

    const ticket = updatedRows[0];
    if (ticket && ticket.sla_deadline) {
      const now = new Date();
      const deadline = new Date(ticket.sla_deadline);
      ticket.sla_overdue = ticket.status !== 'APPROVED' && ticket.status !== 'CANCELLED' && now > deadline;
    }

    return NextResponse.json({
      success: true,
      message: 'อัปเดตสถานะสำเร็จ',
      ticket,
      sla: slaInfo,
    });
  } catch (err: any) {
    console.error('[Tickets] Update error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
