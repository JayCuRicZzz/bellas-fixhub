var fs = require('fs');
var ai = fs.readFileSync('lib/ai.ts', 'utf8');

var oldCall = `async function callAIAPI(messages: any[]): Promise<string|null> {
  const apiUrl = process.env.AI_API_URL;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || 'gpt-3.5-turbo';
  if (!apiUrl || !apiKey) return null;
  try {
    const res = await fetch(apiUrl,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${apiKey}`},body:JSON.stringify({model,messages,max_tokens:1000,temperature:0.7})});
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch { return null; }
}`;

var newCall = `async function callAIAPI(messages: any[]): Promise<string|null> {
  const provider = process.env.AI_PROVIDER || 'openai';
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || 'gemini-2.0-flash';
  if (!apiKey) return null;

  try {
    if (provider === 'gemini') {
      const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + apiKey;
      const systemMsg = messages.find(function(m) { return m.role === 'system'; });
      var contents = messages
        .filter(function(m) { return m.role !== 'system'; })
        .map(function(m) {
          return {
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          };
        });
      var body = { contents: contents };
      if (systemMsg) {
        body.systemInstruction = { parts: [{ text: systemMsg.content }] };
      }
      body.generationConfig = { maxOutputTokens: 1000, temperature: 0.7 };

      var res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        console.error('[Gemini] Error:', res.status);
        return null;
      }
      var data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    }

    // OpenAI-compatible
    var apiUrl = process.env.AI_API_URL;
    if (!apiUrl) return null;
    var res = await fetch(apiUrl,{
      method:'POST',
      headers:{'Content-Type':'application/json',Authorization:'Bearer '+apiKey},
      body:JSON.stringify({model:model,messages:messages,max_tokens:1000,temperature:0.7})
    });
    if (!res.ok) return null;
    var data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch(e) { return null; }
}`;

ai = ai.split(oldCall).join(newCall);

fs.writeFileSync('lib/ai.ts', ai, 'utf8');
console.log('Patched callAIAPI for Gemini');
