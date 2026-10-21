// LINE configuration — persisted in fixhub.app_settings (key = 'line'), env as fallback.
// Previously this lived in process memory and was lost on every serverless cold start.
import sql from './db';

export interface LineConfig {
  accessToken: string;
  targetIdMaint: string;
  targetIdIT: string;
  /** แจ้งงานใหม่ (และงานไม่เรียบร้อย / PM) เข้ากลุ่มอัตโนมัติ — ปิดได้ เพื่อให้ส่งต่อเองด้วยมือ · สรุป 22:00 ไม่เกี่ยว */
  autoMaint: boolean;
  autoIT: boolean;
}

let cache: { value: LineConfig; expires: number } | null = null;
const TTL = 60_000;

function fromEnv(): LineConfig {
  return {
    accessToken: process.env.LINE_ACCESS_TOKEN || '',
    targetIdMaint: process.env.LINE_TARGET_ID_MAINT || process.env.LINE_TARGET_ID || '',
    targetIdIT: process.env.LINE_TARGET_ID_IT || process.env.LINE_TARGET_ID || '',
    autoMaint: true,
    autoIT: true,
  };
}

export async function getLineConfig(): Promise<LineConfig> {
  if (cache && cache.expires > Date.now()) return cache.value;
  const env = fromEnv();
  let value = env;
  try {
    const rows = await sql`select value from fixhub.app_settings where key = 'line'`;
    if (rows.length > 0) {
      const v: any = rows[0].value || {};
      value = {
        accessToken: v.accessToken || env.accessToken,
        targetIdMaint: v.targetIdMaint ?? env.targetIdMaint,
        targetIdIT: v.targetIdIT ?? env.targetIdIT,
        autoMaint: v.autoMaint !== false,
        autoIT: v.autoIT !== false,
      };
    }
  } catch (e: any) {
    console.error('[LINE config] read failed:', e.message);
  }
  cache = { value, expires: Date.now() + TTL };
  return value;
}

export async function setLineConfig(
  patch: Partial<LineConfig>,
  updatedBy?: string
): Promise<LineConfig> {
  const current = await getLineConfig();
  const next: LineConfig = {
    accessToken: patch.accessToken && patch.accessToken !== 'undefined' && !patch.accessToken.startsWith('sk-***')
      ? patch.accessToken : current.accessToken,
    targetIdMaint: patch.targetIdMaint !== undefined ? patch.targetIdMaint : current.targetIdMaint,
    targetIdIT: patch.targetIdIT !== undefined ? patch.targetIdIT : current.targetIdIT,
    autoMaint: typeof patch.autoMaint === 'boolean' ? patch.autoMaint : current.autoMaint,
    autoIT: typeof patch.autoIT === 'boolean' ? patch.autoIT : current.autoIT,
  };
  await sql`
    insert into fixhub.app_settings (key, value, updated_by, updated_at)
    values ('line', ${sql.json(next as any)}, ${updatedBy ?? null}, now())
    on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now()`;
  cache = { value: next, expires: Date.now() + TTL };
  return next;
}
