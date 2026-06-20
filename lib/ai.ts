interface AIClassificationResult {
  department: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  room_number: string | null;
  summary: string;
  confidence: number;
}

interface AIChatResult {
  action: 'create_ticket' | 'ask_clarify' | 'general_chat' | 'troubleshoot';
  ticket?: {
    branch_code: string;
    room_number: string;
    department: string;
    category: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
  };
  message: string;
  suggestions?: string[];
  missing_fields?: string[];
}

// ============================================================
// TROUBLESHOOTING KNOWLEDGE BASE
// ============================================================

interface TroubleshootEntry {
  keywords: string[];
  category: string;
  steps: string[];
}

const TROUBLESHOOT_KB: TroubleshootEntry[] = [
  {
    keywords: ['แอร์ไม่เย็น','แอร์ไม่ติด','แอร์','ac','air','เครื่องปรับอากาศ','แอร์ร้อน','แอร์ดัง'],
    category: 'แอร์',
    steps: [
      'ตรวจสอบรีโมท — ตั้งอุณหภูมิ 24-25°C และโหมด COOL',
      'ตรวจสอบเบรกเกอร์ — ถ้าสับลงให้สับขึ้น',
      'เช็คฟิลเตอร์ — ถ้าสกปรก ถอดมาล้างน้ำเปล่า ผึ่งให้แห้งใส่กลับ',
      'ดูท่อน้ำทิ้ง — ตรวจว่ามีน้ำหยดหรือตันไหม',
      'ถ้ายังไม่หาย → แจ้งช่างผ่านระบบ',
    ],
  },
  {
    keywords: ['ไฟดับ','ไฟกระพริบ','ไฟไม่ติด','ไฟ','ไฟฟ้า','หลอด','light','lamp','ไฟเสีย','ปลั๊ก','plug','สวิตช์','switch','เบรกเกอร์','ไม่ติด','เปิดไม่ติด'],
    category: 'ไฟฟ้า',
    steps: [
      'ตรวจสอบเบรกเกอร์ที่ตู้ไฟ — สับขึ้นถ้าสับลง',
      'ลองเปลี่ยนหลอดไฟ — อาจแค่หลอดขาด',
      'เช็คปลั๊ก — เสียบแน่นไหม ขาปลั๊กงอหรือเปล่า',
      'ลองเสียบกับปลั๊กอื่น — แยกว่าปัญหาที่ปลั๊กหรืออุปกรณ์',
      'ถ้าหลายจุดเสียพร้อมกัน → แจ้งช่างผ่านระบบ',
    ],
  },
  {
    keywords: ['น้ำรั่ว','น้ำ','ประปา','น้ำไม่ไหล','ท่อ','pipe','leak','รั่ว','ก๊อก','faucet','sink','ซิงค์','toilet','ห้องน้ำ','ชักโครก','ฝักบัว','water','น้ำซึม','น้ำหยด'],
    category: 'ประปา',
    steps: [
      'ปิดวาล์วน้ำที่ใกล้ที่สุด — กันน้ำกระจายเพิ่ม',
      'ตรวจสอบรอยรั่ว — เช็ดให้แห้ง สังเกตจุดที่น้ำซึม',
      'เช็คก๊อก — ปิดสนิทไหม ลองหมุนให้แน่น',
      'เช็คชักโครก — กดแล้วน้ำไหลตลอดไหม (ยางในเสื่อม)',
      'ใช้ถัง/ผ้ารองน้ำไว้ก่อน → แจ้งช่างผ่านระบบ',
    ],
  },
  {
    keywords: ['wifi','wi-fi','เน็ต','internet','net','เน็ตเวิร์ค','network','router','เราเตอร์','สัญญาณ','signal','เชื่อมต่อ','connect','อ่อน','หลุด','disconnect'],
    category: 'WiFi/เน็ตเวิร์ค',
    steps: [
      'รีสตาร์ทเราเตอร์ — ถอดปลั๊ก 30 วิ แล้วเสียบใหม่',
      'ลองลืม WiFi แล้วเชื่อมต่อใหม่ — ใส่รหัสผ่านใหม่',
      'ลองเชื่อมต่ออุปกรณ์อื่น — แยกว่าปัญหาที่อุปกรณ์หรือเน็ต',
      'เช็คสาย LAN — ที่เสียบเราเตอร์หลวมหรือเปล่า',
      'ถ้าทั้งชั้น/ตึกใช้ไม่ได้ → แจ้งไอทีผ่านระบบ',
    ],
  },
  {
    keywords: ['ทีวี','tv','television','จอ','ภาพ','เสียง','รีโมท','remote','ช่อง'],
    category: 'ทีวี',
    steps: [
      'เช็คปลั๊กทีวี — เสียบแน่นไหม',
      'ลองเปลี่ยนถ่านรีโมท — รีโมทอาจถ่านหมด',
      'เช็คสาย HDMI/สายอากาศ — หลวมหรือเปล่า',
      'รีเซ็ตทีวี — ถอดปลั๊ก 1 นาที แล้วเสียบใหม่',
      'ถ้ายังไม่ติด → แจ้งไอทีผ่านระบบ',
    ],
  },
  {
    keywords: ['คอม','computer','pc','notebook','laptop','โน๊ตบุ๊ค','เครื่อง','เปิดไม่ติด','จอฟ้า','blue screen','ค้าง','hang','ช้า','slow','โปรแกรม','keyboard','mouse','เมาส์','คีย์บอร์ด'],
    category: 'คอมพิวเตอร์',
    steps: [
      'รีสตาร์ทเครื่อง — กดปุ่ม Power ค้าง 10 วิ แล้วเปิดใหม่',
      'เช็คสายไฟ/อแดปเตอร์ — เสียบแน่นไหม ไฟติดไหม',
      'ถ้าจอฟ้า — จด error code ที่ขึ้น แล้วรีสตาร์ท',
      'ถ้าเครื่องช้า — ปิดโปรแกรมที่ไม่ใช้, ลบไฟล์ขยะ',
      'ถ้ายังใช้ไม่ได้ → แจ้งไอทีผ่านระบบ',
    ],
  },
  {
    keywords: ['ปริ้น','printer','print','เครื่องพิมพ์','พิมพ์','กระดาษ','หมึก','ink','toner'],
    category: 'ปริ้นเตอร์',
    steps: [
      'เช็คกระดาษ — ใส่กระดาษ, เอากระดาษติดออก',
      'เช็คหมึก/โทนเนอร์ — เปลี่ยนถ้าหมด',
      'รีสตาร์ทปริ้นเตอร์ — ปิด-เปิดใหม่',
      'เช็คสาย USB/เน็ตเวิร์ค — เสียบแน่นไหม',
      'ลองพิมพ์ Test Page จากคอม → ถ้าไม่ได้แจ้งไอทีผ่านระบบ',
    ],
  },
  {
    keywords: ['ตู้เย็น','fridge','refrigerator','freezer','ช่องแข็ง','เย็น','ไม่เย็น','น้ำแข็ง','ice'],
    category: 'เครื่องใช้ไฟฟ้า',
    steps: [
      'เช็คปลั๊ก — เสียบแน่นไหม',
      'ปรับอุณหภูมิ — ตั้งให้เย็นขึ้น (เลขต่ำ = เย็นมาก)',
      'เช็คขอบยางประตู — ปิดสนิทไหม',
      'ละลายน้ำแข็ง — ถ้าน้ำแข็งเกาะหนา ให้ละลายก่อน',
      'ถ้ายังไม่เย็น → แจ้งช่างผ่านระบบ',
    ],
  },
  {
    keywords: ['ประตู','door','หน้าต่าง','window','ลูกบิด','กุญแจ','key','lock','ล็อค','ปิดไม่สนิท','บานพับ','hinge','เลื่อน'],
    category: 'โครงสร้าง',
    steps: [
      'ตรวจสอบบานพับ — หยอดน้ำมันหล่อลื่นถ้าฝืด',
      'เช็คลูกบิด/มือจับ — ขันสกรูให้แน่น',
      'เช็คกุญแจ — ลองใช้กุญแจสำรอง',
      'ถ้าบัตรคีย์การ์ด — ทำความสะอาดแถบแม่เหล็ก/ช่องเสียบ',
      'ถ้ายังปิดไม่ได้ → แจ้งช่างผ่านระบบ',
    ],
  },
  {
    keywords: ['กลิ่น','smell','เหม็น','เสียงดัง','noise','เสียง','ดัง','รบกวน','แปลก','ผิดปกติ'],
    category: 'ทั่วไป',
    steps: [
      'ระบุแหล่งที่มา — กลิ่น/เสียงมาจากไหน (แอร์, ห้องน้ำ, หน้าต่าง)',
      'ถ้ากลิ่น — เปิดหน้าต่างระบายอากาศ, เช็คท่อระบายน้ำ',
      'ถ้าเสียง — มาจากอุปกรณ์ไฟฟ้าไหม, ปิด-เปิดทดสอบ',
      'แจ้งรายละเอียดให้ชัด — ห้องไหน, เสียง/กลิ่นแบบไหน',
      'แจ้งแผนกที่เกี่ยวข้องผ่านระบบ',
    ],
  },
];

function matchTroubleshoot(text: string): TroubleshootEntry | null {
  const lower = text.toLowerCase();
  let bestMatch: TroubleshootEntry | null = null;
  let bestScore = 0;
  for (const entry of TROUBLESHOOT_KB) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (lower.includes(kw.toLowerCase())) score += 1;
    }
    if (score > bestScore) { bestScore = score; bestMatch = entry; }
  }
  return bestScore >= 1 ? bestMatch : null;
}

function isAskingForHelp(text: string): boolean {
  const helpPhrases = [
    'ทำไง','ทำยังไง','วิธี','แก้','แก้ไข','ซ่อม','ช่วย','แนะนำ','บอก','how','fix','help',
    'ต้องทำ','ควรทำ','ลอง','เช็ค','ตรวจ','ดู','เป็นอะไร','เกิดจาก','สาเหตุ','ทำไม','why',
    'ไม่รู้','ไม่ทราบ','สงสัย','ถาม','question','ปัญหา','problem',
  ];
  const lower = text.toLowerCase();
  return helpPhrases.some(p => lower.includes(p));
}

function parseTicketFromText(text: string, branchCode: string): AIChatResult {
  const textLower = text.toLowerCase();
  let roomNumber: string | null = null;
  const rm = text.match(/ห้อง\s*(\d+[a-zA-Z]?)/i) || text.match(/room\s*(\d+[a-zA-Z]?)/i) || text.match(/(\d{3,4})/);
  if (rm) roomNumber = rm[1];

  let department = 'ช่าง';
  const itKw = ['ไอที','it','เน็ต','net','internet','computer','คอม','wifi','wi-fi','software','printer','เครื่องพิมพ์','พิมพ์','network','เน็ตเวิร์ค','server','email','อีเมล','password','รหัสผ่าน','login','virus','notebook','laptop','โน๊ตบุ๊ค','monitor','จอ','keyboard','mouse','เมาส์','router','เราเตอร์','โทรศัพท์','phone'];
  if (itKw.some(kw => textLower.includes(kw))) department = 'ไอที';

  const maintCat: Record<string,string> = {
    'ไฟ':'ไฟฟ้า','ไฟฟ้า':'ไฟฟ้า','หลอด':'ไฟฟ้า','light':'ไฟฟ้า','lamp':'ไฟฟ้า','switch':'ไฟฟ้า','สวิตช์':'ไฟฟ้า','ปลั๊ก':'ไฟฟ้า','plug':'ไฟฟ้า',
    'น้ำ':'ประปา','ประปา':'ประปา','ท่อ':'ประปา','pipe':'ประปา','leak':'ประปา','รั่ว':'ประปา','ก๊อก':'ประปา','sink':'ประปา','toilet':'ประปา','ห้องน้ำ':'ประปา',
    'แอร์':'แอร์','air':'แอร์','ac':'แอร์','เครื่องปรับอากาศ':'แอร์','เย็น':'แอร์',
    'โครงสร้าง':'โครงสร้าง','wall':'โครงสร้าง','ผนัง':'โครงสร้าง','เพดาน':'โครงสร้าง','ceiling':'โครงสร้าง','door':'โครงสร้าง','ประตู':'โครงสร้าง','หน้าต่าง':'โครงสร้าง','window':'โครงสร้าง','พื้น':'โครงสร้าง','floor':'โครงสร้าง',
    'ตู้เย็น':'เครื่องใช้ไฟฟ้า','fridge':'เครื่องใช้ไฟฟ้า',
  };
  const itCat: Record<string,string> = {
    'เน็ต':'เน็ตเวิร์ค','net':'เน็ตเวิร์ค','network':'เน็ตเวิร์ค','wifi':'เน็ตเวิร์ค','internet':'เน็ตเวิร์ค','router':'เน็ตเวิร์ค',
    'คอม':'คอมพิวเตอร์','computer':'คอมพิวเตอร์','pc':'คอมพิวเตอร์','notebook':'คอมพิวเตอร์','laptop':'คอมพิวเตอร์','monitor':'คอมพิวเตอร์',
    'printer':'ปริ้นเตอร์','เครื่องพิมพ์':'ปริ้นเตอร์','ปริ้น':'ปริ้นเตอร์','tv':'ทีวี','ทีวี':'ทีวี','โทรศัพท์':'โทรศัพท์',
  };
  const catMap = department === 'ไอที' ? itCat : maintCat;
  let category = '';
  for (const [k,v] of Object.entries(catMap)) { if (textLower.includes(k)) { category = v; break; } }
  if (!category) category = department === 'ไอที' ? 'เน็ตเวิร์ค' : 'ไฟฟ้า';

  let priority: 'low'|'medium'|'high'|'urgent' = 'medium';
  if (['ด่วน','urgent','emergency','immediate','asap','ทันที','ตอนนี้','now','ด่วนมาก'].some(k=>textLower.includes(k))) priority='urgent';
  else if (['high','สำคัญ','important','critical','พัง','broke','เสียหาย','damage'].some(k=>textLower.includes(k))) priority='high';
  else if (['low','เล็กน้อย','minor','เล็ก','น้อย','small'].some(k=>textLower.includes(k))) priority='low';

  if (!roomNumber) {
    return { action:'ask_clarify', message:'กรุณาระบุหมายเลขห้องที่พบปัญหาครับ', missing_fields:['room_number'], suggestions:['ห้อง 301 แอร์ไม่เย็น','ห้อง 205 ไฟเสีย','ห้อง 1102 เน็ตใช้ไม่ได้'] };
  }
  if (text.length < 10) {
    return { action:'ask_clarify', message:'ช่วยอธิบายอาการเสียเพิ่มอีกนิดนะครับ', missing_fields:['description'] };
  }
  return {
    action:'create_ticket',
    ticket:{ branch_code:branchCode, room_number:roomNumber, department, category, description:text, priority },
    message:`ตรวจพบข้อมูลการแจ้งซ่อม:\n• ห้อง: ${roomNumber}\n• แผนก: ${department}\n• หมวดหมู่: ${category}\n• ระดับความสำคัญ: ${priority.toUpperCase()}\n\nต้องการยืนยันสร้างใบงานไหมครับ?`,
  };
}

function classifyRequest(text: string): AIClassificationResult {
  const r = parseTicketFromText(text, '');
  return { department:r.ticket?.department||'ช่าง', category:r.ticket?.category||'ไฟฟ้า', priority:r.ticket?.priority||'medium', room_number:r.ticket?.room_number||null, summary:text.substring(0,100), confidence:r.action==='create_ticket'?0.85:0.5 };
}

interface ReportData { total:number; completed:number; pending:number; inProgress:number; byDepartment:{name:string;count:number}[]; byBranch:{name:string;count:number}[]; byCategory:{name:string;count:number}[]; }

function generateReportSummary(data: ReportData): string {
  const d = new Date().toLocaleDateString('th-TH',{year:'numeric',month:'long',day:'numeric',weekday:'long'});
  const rate = data.total>0?Math.round((data.completed/data.total)*100):0;
  let s = `📊 **รายงานประจำวันที่ ${d}**\n\n**สรุปภาพรวม**\n• งานทั้งหมด: ${data.total} รายการ\n• เสร็จแล้ว: ${data.completed} (${rate}%)\n• กำลังทำ: ${data.inProgress}\n• รอ: ${data.pending}\n`;
  if (data.byDepartment.length>0) { s+=`\n**แยกตามแผนก:**\n`; data.byDepartment.forEach(x=>{s+=`• ${x.name}: ${x.count}\n`;}); }
  if (rate>=80) s+=`\n✅ อยู่ในเกณฑ์ดีมาก`;
  else if (rate>=50) s+=`\n⚠️ อยู่ในเกณฑ์ปานกลาง`;
  else if (data.total>0) s+=`\n🔴 มีงานค้างจำนวนมาก`;
  else s+=`\n✅ ยังไม่มีรายการแจ้งซ่อม`;
  return s;
}

async function callAIAPI(messages: any[]): Promise<string|null> {
  var provider = process.env.AI_PROVIDER || 'openai';
  var apiKey = process.env.AI_API_KEY;
  var model = process.env.AI_MODEL || 'gemini-2.0-flash';
  if (!apiKey) return null;

  try {
    if (provider === 'gemini') {
      var apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + apiKey;
      var systemMsg = messages.find(function(m) { return m.role === 'system'; });
      var contents = messages
        .filter(function(m) { return m.role !== 'system'; })
        .map(function(m) {
          return {
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          };
        });
      var body: any = { contents: contents, generationConfig: { maxOutputTokens: 1000, temperature: 0.7 } };
      if (systemMsg) body.systemInstruction = { parts: [{ text: systemMsg.content }] };

      var gRes = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!gRes.ok) { console.error('[Gemini] Status:', gRes.status); return null; }
      var gData = await gRes.json();
      return gData.candidates?.[0]?.content?.parts?.[0]?.text || null;
    }

    var oaiUrl = process.env.AI_API_URL;
    if (!oaiUrl) return null;
    var res = await fetch(oaiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify({ model: model, messages: messages, max_tokens: 1000, temperature: 0.7 })
    });
    if (!res.ok) return null;
    var data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch(e) { return null; }
}
export async function chatWithAI(
  message: string,
  branchCode: string,
  history: { role: 'user' | 'assistant'; content: string }[]
): Promise<AIChatResult> {
  // STEP 1: Always check troubleshooting KB first
  const ts = matchTroubleshoot(message);
  if (ts) {
    const steps = ts.steps.map((s,i)=>`${i+1}. ${s}`).join('\n');
    return {
      action:'troubleshoot',
      message:`🔧 **${ts.category} — แก้ไขเบื้องต้น:**\n\n${steps}\n\n💡 ทำตามแล้วยังไม่หาย — พิมพ์ "แจ้งซ่อม ห้อง XXX" เพื่อสร้างใบงานครับ`,
    };
  }

  // STEP 2: AI API (Groq — smart answers any question)
  var kbItems = TROUBLESHOOT_KB.map(function(e){return '- '+e.category+': '+e.steps.slice(0,2).join(' > ');});
  var sysPrompt = 'คุณคือ สมทมวย (Somtamuay) 🦞 ที่ปรึกษางานซ่อมบำรุง โรงแรม BellaVilla พัทยา\n\n'+
    '## หน้าที่:\n'+
    '1. ตอบทุกคำถาม — งานซ่อม งานทั่วไป ความรู้รอบตัว คุยเล่นได้หมด\n'+
    '2. ถ้าถามวิธีแก้ → ให้คำแนะนำสั้นๆ 3-5 ข้อ เป็นภาษาไทย\n'+
    '3. ถ้าบอกอาการ + ห้อง → สร้างใบงาน\n\n'+
    '## ฐานความรู้งานซ่อม:\n'+kbItems.join('\n')+'\n\n'+
    '## กฎ:\n'+
    '- ตอบเป็นภาษาไทยเสมอ\n'+
    '- ตอบสั้น กระชับ 2-4 ประโยค (ถ้าไม่ใช่วิธีแก้)\n'+
    '- วิธีแก้ให้เป็น numbered list\n'+
    '- ถ้าถามเรื่องนอกเหนือจากซ่อมบำรุง → ตอบได้ปกติ เป็นกันเอง\n\n'+
    '## ส่ง JSON เท่านั้น:\n'+
    '{"action":"create_ticket"|"ask_clarify"|"troubleshoot"|"general_chat","ticket":{"room_number":"string","department":"ช่าง or ไอที","category":"string","description":"string","priority":"low"|"medium"|"high"|"urgent"},"message":"ตอบเป็นภาษาไทย","missing_fields":[],"suggestions":[]}';

  const aiRes = await callAIAPI([{role:'system',content:sysPrompt},...history.slice(-6),{role:'user',content:message}]);
  if (aiRes) {
    try {
      const parsed = JSON.parse(aiRes);
      if (parsed.ticket) parsed.ticket.branch_code = branchCode;
      return parsed;
    } catch {}
  }

  // STEP 3: Rule-based fallback — parse ticket from text
  return parseTicketFromText(message, branchCode);
}

export async function classifyRequestAI(text: string): Promise<AIClassificationResult> {
  const sys = 'Classify maintenance request. Return JSON:{"department":"ช่าง or ไอที","category":"string","priority":"low"|"medium"|"high"|"urgent","room_number":"string or null","summary":"brief","confidence":0.0-1.0}';
  const r = await callAIAPI([{role:'system',content:sys},{role:'user',content:text}]);
  if (r) { try { return JSON.parse(r); } catch {} }
  return classifyRequest(text);
}

export async function generateAIReport(data: ReportData): Promise<string> {
  const r = await callAIAPI([{role:'system',content:'Generate a daily maintenance report in Thai. Professional and concise.'},{role:'user',content:`Report: Total=${data.total}, Done=${data.completed}`}]);
  return r || generateReportSummary(data);
}
