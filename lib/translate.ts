// Auto-translate English text to Thai using Groq AI
export async function translateToThai(text: string): Promise<string> {
  // Quick check: if mostly Thai or no English letters, skip
  const englishPattern = /[a-zA-Z]{3,}/;
  if (!englishPattern.test(text)) return text;

  const apiKey = process.env.AI_API_KEY;
  const provider = process.env.AI_PROVIDER || 'groq';
  if (!apiKey) return text;

  try {
    let res;
    if (provider === 'openai' || provider === 'groq') {
      const url = provider === 'groq'
        ? 'https://api.groq.com/openai/v1/chat/completions'
        : (process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions');
      const model = process.env.AI_MODEL || 'llama-3.3-70b-versatile';
      
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: 'คุณคือนักแปล แปลข้อความต่อไปนี้เป็นภาษาไทยเท่านั้น ห้ามเพิ่มคำอธิบายใดๆ ตอบเฉพาะคำแปลเท่านั้น'
            },
            { role: 'user', content: text }
          ],
          max_tokens: 500,
          temperature: 0.1,
        }),
      });
    } else {
      return text; // unsupported provider
    }

    if (!res.ok) return text;
    const data = await res.json();
    const translated = data.choices?.[0]?.message?.content?.trim();
    if (translated && translated.length > 5) return translated;
    return text;
  } catch {
    return text;
  }
}
