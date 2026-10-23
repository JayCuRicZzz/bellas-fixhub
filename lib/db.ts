// Postgres connection (Supabase) via postgres.js
// Uses the Supabase connection pooler (Supavisor, transaction mode) — safe for serverless.
// All tables live in schema `fixhub` and are referenced fully-qualified: fixhub.tickets etc.
//
// ⚠ บทเรียน 23 ต.ค. 2569 (ระบบค้าง 15:42–15:52): Vercel Fluid ส่งหลายคำขอเข้า instance เดียว
//   ถ้าการเชื่อมต่อในพูลค้างกลางคำสั่ง (ฐานข้อมูลรอข้อมูลจากฝั่งแอปตลอด) ทุกคำขอใน instance นั้นจะต่อคิว
//   จนครบ 300 วินาที → ทั้งระบบหน่วง/ค้าง ทั้งที่ฐานข้อมูลว่าง (CPU ~5%)
//   แก้ 3 ชั้น: (1) พูลใหญ่ขึ้น ไม่ให้ 1–2 สายที่ค้างลากทั้ง instance
//               (2) คำสั่งไหนเกิน QUERY_TIMEOUT_MS → ตัดทิ้ง + เปลี่ยนพูลใหม่ทันที (คำขอถัดไปได้สายใหม่)
//               (3) maxDuration ของ API สั้นลง (vercel.json) — ล้มเร็วดีกว่าค้าง 5 นาที
import postgres from 'postgres';

const QUERY_TIMEOUT_MS = 15_000;

function createSql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set (Supabase → Project Settings → Database → Connection string, Transaction pooler, port 6543)');
  }
  return postgres(url, {
    prepare: false,          // required for Supavisor transaction mode
    max: 8,                  // Fluid compute: หลายคำขอใช้ instance เดียวกัน — 3 สายน้อยไป
    idle_timeout: 15,
    max_lifetime: 60 * 10,   // สายเก่าเกิน 10 นาทีเปลี่ยนใหม่ (กันสายที่ตายเงียบ ๆ ค้างในพูล)
    connect_timeout: 8,
    keep_alive: 15,
    ssl: 'require',
    transform: { undefined: null },
  });
}

type Sql = ReturnType<typeof postgres>;
let current: Sql | null = null;
const pool = (): Sql => (current ??= createSql());

/** ทิ้งพูลที่มีสายค้าง แล้วเริ่มพูลใหม่ — คำสั่งที่กำลังรออยู่ในพูลเก่าจะถูกปิด */
function resetPool(reason: string, owner?: Sql) {
  if (owner && owner !== current) return;   // พูลนี้ถูกเปลี่ยนไปแล้ว (คำสั่งอื่นตัดไปก่อน) — ไม่ต้องตัดซ้ำ
  const old = current;
  current = null;
  console.error('[db] pool reset:', reason);
  old?.end({ timeout: 2 }).catch(() => {});
}

/** ใส่นาฬิกาจับเวลาให้คำสั่งตอนถูก await เท่านั้น — fragment (`sql\`and ...\``) ที่ไม่ได้ await ไม่โดนแตะ */
function withTimeout<T>(q: T, owner: Sql): T {
  const anyQ = q as any;
  if (!anyQ || typeof anyQ.then !== 'function' || anyQ.__fhTimed) return q;
  const origThen = anyQ.then.bind(anyQ);
  let raced: Promise<any> | null = null;
  anyQ.__fhTimed = true;
  anyQ.then = (onOk?: any, onErr?: any) => {
    if (!raced) {
      raced = new Promise((resolve, reject) => {
        const t = setTimeout(() => {
          try { anyQ.cancel?.(); } catch { /* ignore */ }
          resetPool(`query > ${QUERY_TIMEOUT_MS} ms: ${String(anyQ.strings?.join('?') || '').replace(/\s+/g, ' ').slice(0, 80)}`, owner);
          reject(new Error('ฐานข้อมูลตอบช้าเกินไป กรุณาลองใหม่อีกครั้ง (DB_TIMEOUT)'));
        }, QUERY_TIMEOUT_MS);
        origThen((v: any) => { clearTimeout(t); resolve(v); }, (e: any) => { clearTimeout(t); reject(e); });
      });
    }
    return raced.then(onOk, onErr);
  };
  anyQ.catch = (onErr?: any) => anyQ.then(undefined, onErr);
  anyQ.finally = (f?: any) => anyQ.then((v: any) => { f?.(); return v; }, (e: any) => { f?.(); throw e; });
  return q;
}

// ตัวแทนของ postgres.js — หน้าตาเหมือนเดิมทุกอย่าง (sql`...`, sql(rows, ...), sql.json, sql.begin, ...)
const sql = new Proxy(function () {} as unknown as Sql, {
  apply(_t, _this, args: any[]) {
    const p = pool();
    return withTimeout((p as any)(...args), p);
  },
  get(_t, prop) {
    const p = pool() as any;
    const v = p[prop];
    return typeof v === 'function' ? v.bind(p) : v;
  },
}) as Sql;

export default sql;
export { sql };
