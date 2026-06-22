// Netlify Scheduled Function — Daily LINE Summary at 22:00 Bangkok time
// Sends separate MAINT and IT summaries to respective LINE groups
import mysql from 'mysql2/promise';

const BASE_URL = process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://bellas-fixhub.netlify.app';

function getDbConfig() {
  return {
    host: process.env.DB_HOST || process.env.MYSQLHOST || '',
    port: parseInt(process.env.DB_PORT || process.env.MYSQLPORT || '3306'),
    user: process.env.DB_USER || process.env.MYSQLUSER || '',
    password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
    database: process.env.DB_NAME || process.env.MYSQLDATABASE || '',
  };
}

async function getTodayStats(conn, reporterDept) {
  // Total today
  const [total] = await conn.query(
    `SELECT COUNT(*) as cnt FROM tickets WHERE reporter_department = ? AND DATE(created_at) = CURDATE()`,
    [reporterDept]
  );
  // Pending
  const [pending] = await conn.query(
    `SELECT COUNT(*) as cnt FROM tickets WHERE reporter_department = ? AND status = 'PENDING' AND DATE(created_at) = CURDATE()`,
    [reporterDept]
  );
  // In Progress
  const [inProgress] = await conn.query(
    `SELECT COUNT(*) as cnt FROM tickets WHERE reporter_department = ? AND status IN ('ACCEPTED','IN_PROGRESS') AND DATE(created_at) = CURDATE()`,
    [reporterDept]
  );
  // Completed (Approved)
  const [completed] = await conn.query(
    `SELECT COUNT(*) as cnt FROM tickets WHERE reporter_department = ? AND status = 'APPROVED' AND DATE(created_at) = CURDATE()`,
    [reporterDept]
  );
  // Resolved
  const [resolved] = await conn.query(
    `SELECT COUNT(*) as cnt FROM tickets WHERE reporter_department = ? AND status = 'RESOLVED' AND DATE(created_at) = CURDATE()`,
    [reporterDept]
  );
  return {
    total: total[0].cnt,
    pending: pending[0].cnt,
    inProgress: inProgress[0].cnt,
    completed: completed[0].cnt,
    resolved: resolved[0].cnt,
  };
}

async function sendLine(token, targetId, message) {
  if (!token || !targetId) {
    console.log(`[LINE] Skipping — no token or target ID`);
    return false;
  }
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: targetId,
      messages: [{ type: 'text', text: message }],
    }),
  });
  if (res.ok) {
    console.log(`[LINE] Sent to ${targetId}`);
    return true;
  }
  console.error(`[LINE] Failed: ${res.status} ${await res.text()}`);
  return false;
}

export const handler = async function () {
  let conn;
  try {
    const dbConfig = getDbConfig();
    console.log(`[Cron] Connecting to DB: ${dbConfig.host}/${dbConfig.database}`);

    conn = await mysql.createConnection(dbConfig);

    const today = new Date().toLocaleDateString('th-TH', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
    });

    // MAINT stats
    const maint = await getTodayStats(conn, 'MAINT');
    const maintMsg = [
      `📊 สรุปงานช่าง — ${today}`,
      ``,
      `📝 แจ้งใหม่วันนี้: ${maint.total} รายการ`,
      `⏳ รอดำเนินการ: ${maint.pending} รายการ`,
      `🔧 กำลังดำเนินการ: ${maint.inProgress} รายการ`,
      `✅ แก้ไขแล้ว: ${maint.resolved} รายการ`,
      `✔️ ปิดงาน: ${maint.completed} รายการ`,
      ``,
      `🔗 ${BASE_URL}/dashboard`,
    ].join('\n');

    // IT stats
    const it = await getTodayStats(conn, 'IT');
    const itMsg = [
      `📊 สรุปงานไอที — ${today}`,
      ``,
      `📝 แจ้งใหม่วันนี้: ${it.total} รายการ`,
      `⏳ รอดำเนินการ: ${it.pending} รายการ`,
      `🔧 กำลังดำเนินการ: ${it.inProgress} รายการ`,
      `✅ แก้ไขแล้ว: ${it.resolved} รายการ`,
      `✔️ ปิดงาน: ${it.completed} รายการ`,
      ``,
      `🔗 ${BASE_URL}/dashboard`,
    ].join('\n');

    const lineToken = process.env.LINE_ACCESS_TOKEN || '';
    const targetMaint = process.env.LINE_TARGET_ID_MAINT || '';
    const targetIT = process.env.LINE_TARGET_ID_IT || '';

    const maintSent = await sendLine(lineToken, targetMaint, maintMsg);
    const itSent = await sendLine(lineToken, targetIT, itMsg);

    console.log(`[Cron] MAINT: ${maintSent ? '✅' : '❌'}, IT: ${itSent ? '✅' : '❌'}`);
    await conn.end();

    return {
      statusCode: 200,
      body: JSON.stringify({
        maint: maint,
        it: it,
        maintSent,
        itSent,
      }),
    };
  } catch (err) {
    console.error(`[Cron] Error: ${err.message}`);
    if (conn) await conn.end();
    return { statusCode: 500, body: err.message };
  }
};
