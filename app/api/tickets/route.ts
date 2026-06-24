import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';
import { getUserFromRequest, getUserBranches } from '../../../lib/auth';
import { translateToThai } from '../../../lib/translate';
import { sendLineMessage } from '../../../lib/line';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = user.user_id || user.id;
    const userBranches = await getUserBranches(userId, user.role);

    const { searchParams } = new URL(req.url);
    const deptType = searchParams.get('dept_type') || '';
    const status = searchParams.get('status');
    const branch = searchParams.get('branch');
    const department = searchParams.get('department');

    let query = `
      SELECT t.*, c.main_th, c.sub_th, c.dept_type, t.reporter_department,
             u.full_name as reporter_name,
             tu.full_name as technician_name
      FROM tickets t
      JOIN categories c ON t.category_id = c.category_id
      LEFT JOIN users u ON t.reporter_id = u.user_id
      LEFT JOIN users tu ON t.technician_id = tu.user_id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Multi-branch scoping: filter by user's accessible branches
    if (userBranches.length > 0) {
      query += ` AND t.branch_code IN (${userBranches.map(() => '?').join(',')})`;
      params.push(...userBranches);
    }

    // Department-based scope: non-supervisor users see ALL tickets in their department
    const supervisorRoles = ['admin', 'gm'];
    if (!supervisorRoles.includes(user.role)) {
      // Map role/department to ticket department filter
      const deptByRole: Record<string, string> = {
        'tech': 'MAINT',
        'sup': 'MAINT',
        'it': 'IT',
        'supit': 'IT',
        'front': 'MAINT',
        'house': 'MAINT',
      };
      const userDept = user.department || deptByRole[user.role] || '';
      if (userDept === 'MAINT' || userDept === 'IT') {
        query += ' AND (t.reporter_id = ? OR t.reporter_department = ?)';
        params.push(userId, userDept);
      }
    }

    // Handle multi-status filter (comma-separated)
    if (status) {
      const statuses = status.split(',').map(s => s.trim());
      if (statuses.length === 1) {
        query += ' AND t.status = ?';
        params.push(statuses[0]);
      } else {
        query += ` AND t.status IN (${statuses.map(() => '?').join(',')})`;
        params.push(...statuses);
      }
    }

    if (branch) {
      query += ' AND t.branch_code = ?';
      params.push(branch);
    }

    if (department) {
      query += ' AND t.reporter_department = ?';
      params.push(department);
    }

    if (deptType) {
      query += ' AND c.dept_type = ?';
      params.push(deptType);
    }

    query += ' ORDER BY t.ticket_id DESC LIMIT 100';

    const [rows]: any = await pool.query(query, params);

    // Attach image URLs to each ticket
    const ticketIds = rows.map((r: any) => r.ticket_id);
    if (ticketIds.length > 0) {
      const [images]: any = await pool.query(
        `SELECT ticket_id, image_url, image_type FROM ticket_images WHERE ticket_id IN (${ticketIds.map(() => '?').join(',')}) ORDER BY uploaded_at ASC`,
        ticketIds
      );
      // Group images by ticket_id
      const imageMap: Record<number, string[]> = {};
      for (const img of images) {
        if (!imageMap[img.ticket_id]) imageMap[img.ticket_id] = [];
        imageMap[img.ticket_id].push(img.image_url);
      }
      for (const row of rows) {
        row.images = imageMap[row.ticket_id] || [];
      }
    }

    return NextResponse.json(rows);
  } catch (err: any) {
    console.error('[Tickets] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { branch_code, category_id, location_detail, description, priority, difficulty, reporter_department, images } = await req.json();

    if (!branch_code || !category_id || !location_detail || !description) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }

    // Get category dept_type for ticket numbering
    const [catRows]: any = await pool.query(
      'SELECT dept_type FROM categories WHERE category_id = ?',
      [category_id]
    );
    const deptType = catRows[0]?.dept_type || 'MAINT';
    const deptCode = deptType === 'IT' ? 'IT' : 'EN';

    // Auto ticket numbering: {BRANCH}-{DEPT}-{YEAR}-{MONTH}-{5-digit-seq}
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `${branch_code}-${deptCode}-${year}-${month}-`;

    // Find the highest existing number for this branch/dept/month prefix
    const [existingRows]: any = await pool.query(
      `SELECT MAX(ticket_number) as max_num FROM tickets WHERE ticket_number LIKE ?`,
      [`${prefix}%`]
    );

    let seq = 1;
    if (existingRows[0]?.max_num) {
      const lastNum = existingRows[0].max_num;
      const seqPart = lastNum.slice(-5);
      seq = parseInt(seqPart, 10) + 1;
    }
    const ticketNumber = `${prefix}${String(seq).padStart(5, '0')}`;

    const reporterId = user.user_id || user.id;
    const difficultyVal = difficulty || 'medium';

    // Calculate SLA deadline from sla_config
    const [slaRows]: any = await pool.query(
      'SELECT sla_minutes FROM sla_config WHERE priority = ?',
      [priority || 'medium']
    );
    const slaMinutes = slaRows[0]?.sla_minutes || 240;
    const slaDeadline = new Date(now.getTime() + slaMinutes * 60 * 1000);

    const descriptionThai = await translateToThai(description);

    const [result]: any = await pool.query(
      `INSERT INTO tickets (ticket_number, branch_code, category_id, reporter_id, reporter_department, location_detail, description, priority, difficulty, status, sla_deadline)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)`,
      [ticketNumber, branch_code, category_id, reporterId, reporter_department || null, location_detail, descriptionThai, priority || 'medium', difficultyVal, slaDeadline]
    );

    const ticketId = result.insertId;

    // Save uploaded images
    if (images && images.length > 0) {
      for (const url of images) {
        await pool.query(
          `INSERT INTO ticket_images (ticket_id, image_url, image_type, uploaded_by) VALUES (?, ?, 'report', ?)`,
          [ticketId, url, reporterId]
        );
      }
    }

    // Send LINE notification — route to correct group by work type
    const { sendLineMessage } = await import('../../../lib/line');
    const lineResult = await sendLineMessage(
      `📢 มีงานแจ้งซ่อมใหม่!\n🔢 ${ticketNumber}\n🏨 ${branch_code}\n📍 ${location_detail}\n📝 ${descriptionThai}`,
      deptType
    );
    console.log('[Tickets] LINE result:', JSON.stringify({deptType, result: lineResult}));

    // --- Duplicate & Aircon Refill Detection ---
    const alerts: string[] = [];

    // (A) Aircon refrigerant refill alert (14 days) — ONLY if this ticket is actually about refrigerant
    const isRefrigerantTicket = descriptionThai.includes('น้ำยา') || descriptionThai.includes('เติมน้ำยา');
    if (isRefrigerantTicket) {
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const [refillDupes]: any = await pool.query(
        `SELECT t.ticket_number, t.location_detail, t.created_at
         FROM tickets t
         WHERE t.branch_code = ?
           AND t.location_detail = ?
           AND t.ticket_id != ?
           AND t.created_at >= ?
           AND (t.description LIKE '%น้ำยา%' OR t.description LIKE '%เติมน้ำยา%')
         ORDER BY t.created_at DESC`,
        [branch_code, location_detail, ticketId, fourteenDaysAgo]
      );
      if (refillDupes.length > 0) {
        const lastRefill = refillDupes[0];
        const daysAgo = Math.round((now.getTime() - new Date(lastRefill.created_at).getTime()) / (24 * 60 * 60 * 1000));
        alerts.push(`⚠️ น้ำยาแอร์ซ้ำ: ห้อง ${location_detail} เคยเติมน้ำยาแอร์เมื่อ ${daysAgo} วันที่แล้ว (${lastRefill.ticket_number}) — ภายใน 14 วัน อาจมีแอร์รั่ว!`);
      }
    }

    // (B) Same issue within 1 day
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const [sameIssueDupes]: any = await pool.query(
      `SELECT t.ticket_number, t.description, t.created_at
       FROM tickets t
       WHERE t.branch_code = ?
         AND t.location_detail = ?
         AND t.category_id = ?
         AND t.ticket_id != ?
         AND t.created_at >= ?
       ORDER BY t.created_at DESC`,
      [branch_code, location_detail, category_id, ticketId, oneDayAgo]
    );
    if (sameIssueDupes.length > 0) {
      const lastIssue = sameIssueDupes[0];
      const hoursAgo = Math.round((now.getTime() - new Date(lastIssue.created_at).getTime()) / (60 * 60 * 1000));
      alerts.push(`🔄 งานซ้ำ: ห้อง ${location_detail} แจ้งปัญหาเดียวกันเมื่อ ${hoursAgo} ชม.ที่แล้ว (${lastIssue.ticket_number})`);
    }

    // Send alerts
    if (alerts.length > 0) {
      const alertMsg = `🚨 แจ้งเตือนอัตโนมัติ
📋 ${ticketNumber} (${branch_code})
📍 ${location_detail}

${alerts.join('\n')}`;
      const { sendLineMessage: sendAlert } = await import('../../../lib/line');
      sendAlert(alertMsg, deptType).catch(() => {});
    }

    return NextResponse.json({ success: true, ticket_number: ticketNumber, ticket_id: ticketId, alerts: alerts.length > 0 ? alerts : undefined });
  } catch (err: any) {
    console.error('[Tickets] Create error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
