import { getLineConfig } from './line-config';

export type LineDept = 'IT' | 'MAINT' | 'MAINTENANCE' | 'ไอที' | 'ช่าง' | string | undefined;

function isIT(department?: string) {
  return department === 'IT' || department === 'ไอที';
}

function textMsg(text: string) {
  return { type: 'text', text: text.length > 4900 ? text.slice(0, 4900) + '…' : text };
}

/** ส่ง 1 ครั้ง (ข้อความ + รูปได้รวมไม่เกิน 5 ชิ้น) — LINE นับโควตาเป็น "ครั้งที่ส่ง × จำนวนคนในกลุ่ม" ไม่ได้นับตามจำนวนชิ้น */
export async function pushLine(to: string, messages: any[], accessToken: string) {
  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ to, messages: messages.slice(0, 5) }),
  });
  const result = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, result };
}

export async function pushLineText(to: string, text: string, accessToken: string) {
  return pushLine(to, [textMsg(text)], accessToken);
}

/** Send a text message (+ up to 4 JPEG/PNG image URLs, same push) to the Maintenance or IT LINE group. Never throws. */
export async function sendLineMessage(messageText: string, department?: LineDept, imageUrls: string[] = []) {
  const { accessToken, targetIdMaint, targetIdIT } = await getLineConfig();
  const it = isIT(department);
  const targetId = it ? targetIdIT : targetIdMaint;
  const groupLabel = it ? 'ไอที' : 'ช่าง';

  if (!accessToken || !targetId) {
    console.log(`[LINE] ${groupLabel} group not configured (missing token or target ID)`);
    return { success: false, message: `LINE ${groupLabel} group not configured` };
  }

  try {
    const text = textMsg(`[${groupLabel}] ${messageText}`);
    const imgs = imageUrls.slice(0, 4).map(u => ({ type: 'image', originalContentUrl: u, previewImageUrl: u }));
    let r = await pushLine(targetId, [text, ...imgs], accessToken);
    // รูปมีปัญหา LINE จะปฏิเสธทั้งครั้ง → ส่งข้อความอย่างเดียวซ้ำ ให้งานใหม่ไปถึงกลุ่มเสมอ
    // (ครั้งที่ถูกปฏิเสธไม่ถูกนับโควตา)
    if (!r.ok && imgs.length && r.status === 400) {
      console.error(`[LINE] push with images rejected, retry text only:`, r.result);
      r = await pushLine(targetId, [text], accessToken);
      if (r.ok) return { success: true, group: groupLabel, images: 0, imageError: true };
    }
    if (r.ok) return { success: true, group: groupLabel, images: imgs.length };
    console.error(`[LINE] Failed to send to ${groupLabel}:`, r.result);
    return { success: false, error: r.result };
  } catch (err: any) {
    console.error('[LINE] Error:', err.message);
    return { success: false, error: err.message };
  }
}
