import { getLineConfig } from './line-config';

export async function sendLineMessage(messageText: string, department?: string) {
  const { accessToken, targetIdMaint, targetIdIT } = getLineConfig();

  // Choose target group based on department
  const targetId = (department === 'IT' || department === 'ไอที') ? targetIdIT : targetIdMaint;

  if (!accessToken || !targetId) {
    const group = department === 'IT' ? 'IT' : 'Maintenance';
    console.log(`[LINE] ${group} group not configured (missing token or target ID)`);
    return { success: false, message: `LINE ${group} group not configured` };
  }

  const groupLabel = department === 'IT' || department === 'ไอที' ? 'ไอที' : 'ช่าง';

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        to: targetId,
        messages: [{ type: 'text', text: `[${groupLabel}] ${messageText}` }],
      }),
    });

    const result = await response.json();
    if (response.ok) {
      console.log(`[LINE] Message sent to ${groupLabel} group successfully`);
      return { success: true, group: groupLabel };
    } else {
      console.error(`[LINE] Failed to send to ${groupLabel}:`, result);
      return { success: false, error: result };
    }
  } catch (err: any) {
    console.error('[LINE] Error:', err.message);
    return { success: false, error: err.message };
  }
}
