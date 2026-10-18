import { getLineConfig } from './line-config';

export type LineDept = 'IT' | 'MAINT' | 'MAINTENANCE' | 'ไอที' | 'ช่าง' | string | undefined;

function isIT(department?: string) {
  return department === 'IT' || department === 'ไอที';
}

export async function pushLineText(to: string, text: string, accessToken: string) {
  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ to, messages: [{ type: 'text', text: text.length > 4900 ? text.slice(0, 4900) + '…' : text }] }),
  });
  const result = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, result };
}

/** Send a text message to the Maintenance or IT LINE group. Never throws. */
export async function sendLineMessage(messageText: string, department?: LineDept) {
  const { accessToken, targetIdMaint, targetIdIT } = await getLineConfig();
  const it = isIT(department);
  const targetId = it ? targetIdIT : targetIdMaint;
  const groupLabel = it ? 'ไอที' : 'ช่าง';

  if (!accessToken || !targetId) {
    console.log(`[LINE] ${groupLabel} group not configured (missing token or target ID)`);
    return { success: false, message: `LINE ${groupLabel} group not configured` };
  }

  try {
    const r = await pushLineText(targetId, `[${groupLabel}] ${messageText}`, accessToken);
    if (r.ok) return { success: true, group: groupLabel };
    console.error(`[LINE] Failed to send to ${groupLabel}:`, r.result);
    return { success: false, error: r.result };
  } catch (err: any) {
    console.error('[LINE] Error:', err.message);
    return { success: false, error: err.message };
  }
}
