interface AIClassificationResult {
  department: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  room_number: string | null;
  summary: string;
  confidence: number;
}

interface AIChatResult {
  action: 'create_ticket' | 'ask_clarify' | 'general_chat';
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

// Rule-based ticket creation parser
function parseTicketFromText(text: string, branchCode: string): AIChatResult {
  const textLower = text.toLowerCase();
  const textThai = text;

  // Extract room number
  let roomNumber: string | null = null;
  const roomMatches = text.match(/ห้อง\s*(\d+[a-zA-Z]?)/i) || text.match(/room\s*(\d+[a-zA-Z]?)/i) || text.match(/(\d{3,4})/);
  if (roomMatches) roomNumber = roomMatches[1];

  // Determine department
  let department = 'ช่าง';
  const itKeywords = [
    'ไอที', 'it', 'เน็ต', 'net', 'internet', 'computer', 'คอม', 'wifi', 'wi-fi', 'software',
    'ซอฟต์แวร์', 'โปรแกรม', 'printer', 'เครื่องพิมพ์', 'พิมพ์', 'network', 'เน็ตเวิร์ค',
    'server', 'เซิร์ฟเวอร์', 'email', 'อีเมล', 'password', 'รหัสผ่าน', 'login', 'virus', 'ไวรัส',
    'notebook', 'laptop', 'โน๊ตบุ๊ค', 'monitor', 'จอ', 'keyboard', 'คีย์บอร์ด', 'mouse', 'เมาส์',
    'router', 'เราเตอร์', 'access point', 'pabx', 'โทรศัพท์', 'phone system',
  ];
  const itFound = itKeywords.some(kw => textLower.includes(kw));
  if (itFound) department = 'ไอที';

  // Determine category
  let category = '';
  const maintCategories: Record<string, string> = {
    'ไฟ': 'ไฟฟ้า', 'ไฟฟ้า': 'ไฟฟ้า', 'หลอด': 'ไฟฟ้า', 'light': 'ไฟฟ้า', 'lamp': 'ไฟฟ้า', 'switch': 'ไฟฟ้า', 'สวิตช์': 'ไฟฟ้า', 'ปลั๊ก': 'ไฟฟ้า', 'plug': 'ไฟฟ้า',
    'น้ำ': 'ประปา', 'ประปา': 'ประปา', 'ท่อ': 'ประปา', 'pipe': 'ประปา', 'leak': 'ประปา', 'รั่ว': 'ประปา', 'ก๊อก': 'ประปา', 'ซิงค์': 'ประปา', 'sink': 'ประปา', 'toilet': 'ประปา', 'ห้องน้ำ': 'ประปา',
    'แอร์': 'แอร์', 'air': 'แอร์', 'ac': 'แอร์', 'เครื่องปรับอากาศ': 'แอร์', 'เย็น': 'แอร์', 'cool': 'แอร์', 'ร้อน': 'แอร์',
    'โครงสร้าง': 'โครงสร้าง', 'structure': 'โครงสร้าง', 'wall': 'โครงสร้าง', 'ผนัง': 'โครงสร้าง', 'เพดาน': 'โครงสร้าง', 'ceiling': 'โครงสร้าง', 'door': 'โครงสร้าง', 'ประตู': 'โครงสร้าง', 'หน้าต่าง': 'โครงสร้าง', 'window': 'โครงสร้าง', 'floor': 'โครงสร้าง', 'พื้น': 'โครงสร้าง',
  };
  const itCategories: Record<string, string> = {
    'เน็ต': 'เน็ตเวิร์ค', 'net': 'เน็ตเวิร์ค', 'network': 'เน็ตเวิร์ค', 'wifi': 'เน็ตเวิร์ค', 'internet': 'เน็ตเวิร์ค', 'router': 'เน็ตเวิร์ค', 'access point': 'เน็ตเวิร์ค',
    'คอม': 'คอมพิวเตอร์', 'computer': 'คอมพิวเตอร์', 'pc': 'คอมพิวเตอร์', 'notebook': 'คอมพิวเตอร์', 'laptop': 'คอมพิวเตอร์', 'โน๊ตบุ๊ค': 'คอมพิวเตอร์', 'monitor': 'คอมพิวเตอร์', 'keyboard': 'คอมพิวเตอร์', 'mouse': 'คอมพิวเตอร์', 'printer': 'คอมพิวเตอร์',
    'software': 'ซอฟต์แวร์', 'ซอฟต์แวร์': 'ซอฟต์แวร์', 'program': 'ซอฟต์แวร์', 'โปรแกรม': 'ซอฟต์แวร์', 'virus': 'ซอฟต์แวร์', 'error': 'ซอฟต์แวร์', 'bug': 'ซอฟต์แวร์', 'window': 'ซอฟต์แวร์', 'password': 'ซอฟต์แวร์', 'email': 'ซอฟต์แวร์',
  };

  const catMap = department === 'ไอที' ? itCategories : maintCategories;
  for (const [key, val] of Object.entries(catMap)) {
    if (textLower.includes(key)) {
      category = val;
      break;
    }
  }
  if (!category) category = department === 'ไอที' ? 'เน็ตเวิร์ค' : 'ไฟฟ้า';

  // Determine priority
  let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
  const urgentKeywords = ['ด่วน', 'urgent', 'emergency', 'immediate', 'asap', 'ทันที', 'ตอนนี้', 'now', 'ด่วนมาก'];
  const highKeywords = ['high', 'สำคัญ', 'important', 'critical', 'พัง', 'broke', 'เสียหาย', 'damage'];
  const lowKeywords = ['low', 'เล็กน้อย', 'minor', 'เล็ก', 'น้อย', 'small', 'cosmetic'];

  if (urgentKeywords.some(k => textLower.includes(k))) priority = 'urgent';
  else if (highKeywords.some(k => textLower.includes(k))) priority = 'high';
  else if (lowKeywords.some(k => textLower.includes(k))) priority = 'low';

  // Check for missing critical fields
  const missingFields: string[] = [];
  if (!roomNumber) missingFields.push('room_number');
  if (text.length < 10) missingFields.push('description');

  if (missingFields.length > 0 && !roomNumber) {
    return {
      action: 'ask_clarify',
      message: 'กรุณาระบุข้อมูลเพิ่มเติม:\n- หมายเลขห้องที่พบปัญหา\n- รายละเอียดอาการเสีย',
      missing_fields: missingFields,
      suggestions: ['ห้อง 301 แอร์ไม่เย็น', 'ห้อง 205 ไฟเสีย', 'ห้อง 1102 เน็ตใช้ไม่ได้'],
    };
  }

  return {
    action: 'create_ticket',
    ticket: {
      branch_code: branchCode,
      room_number: roomNumber || '',
      department,
      category,
      description: text,
      priority,
    },
    message: `ตรวจพบข้อมูลการแจ้งซ่อม:\n• ห้อง: ${roomNumber || 'ไม่ระบุ'}\n• แผนก: ${department}\n• หมวดหมู่: ${category}\n• ระดับความสำคัญ: ${priority.toUpperCase()}\n\nกรุณาตรวจสอบและยืนยัน`,
    suggestions: undefined,
  };
}

// AI-assisted classification
function classifyRequest(text: string): AIClassificationResult {
  const result = parseTicketFromText(text, '');
  
  return {
    department: result.ticket?.department || 'ช่าง',
    category: result.ticket?.category || 'ไฟฟ้า',
    priority: result.ticket?.priority || 'medium',
    room_number: result.ticket?.room_number || null,
    summary: text.substring(0, 100),
    confidence: result.action === 'create_ticket' ? 0.85 : 0.5,
  };
}

// Generate daily report
interface ReportData {
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  byDepartment: { name: string; count: number }[];
  byBranch: { name: string; count: number }[];
  byCategory: { name: string; count: number }[];
}

function generateReportSummary(data: ReportData): string {
  const date = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  const completionRate = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;

  let summary = `📊 **รายงานประจำวันที่ ${date}**\n\n`;
  summary += `**สรุปภาพรวม**\n`;
  summary += `• งานแจ้งซ่อมทั้งหมด: ${data.total} รายการ\n`;
  summary += `• ดำเนินการเสร็จแล้ว: ${data.completed} รายการ (${completionRate}%)\n`;
  summary += `• อยู่ระหว่างดำเนินการ: ${data.inProgress} รายการ\n`;
  summary += `• รอดำเนินการ: ${data.pending} รายการ\n\n`;

  if (data.byDepartment.length > 0) {
    summary += `**แยกตามแผนก:**\n`;
    data.byDepartment.forEach(d => {
      summary += `• ${d.name}: ${d.count} รายการ\n`;
    });
  }

  if (data.byBranch.length > 0) {
    summary += `\n**แยกตามสาขา:**\n`;
    data.byBranch.forEach(b => {
      summary += `• ${b.name}: ${b.count} รายการ\n`;
    });
  }

  if (completionRate >= 80) {
    summary += `\n✅ **สรุป:** ผลการดำเนินงานวันนี้อยู่ในเกณฑ์ดีมาก อัตราการซ่อมสำเร็จสูงถึง ${completionRate}%`;
  } else if (completionRate >= 50) {
    summary += `\n⚠️ **สรุป:** ผลการดำเนินงานอยู่ในเกณฑ์ปานกลาง ควรเร่งดำเนินการงานที่ค้างอยู่`;
  } else if (data.total > 0) {
    summary += `\n🔴 **สรุป:** มีงานค้างจำนวนมาก ควรจัดลำดับความสำคัญและเพิ่มกำลังคน`;
  } else {
    summary += `\n✅ **สรุป:** วันนี้ยังไม่มีรายการแจ้งซ่อม`;
  }

  return summary;
}

// OpenAI-compatible API client
async function callAIAPI(messages: any[]): Promise<string | null> {
  const apiUrl = process.env.AI_API_URL;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || 'gpt-3.5-turbo';

  if (!apiUrl || !apiKey) return null;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.error('[AI] API call failed:', err);
    return null;
  }
}

export async function chatWithAI(
  message: string,
  branchCode: string,
  history: { role: 'user' | 'assistant'; content: string }[]
): Promise<AIChatResult> {
  // Try AI API first
  const systemPrompt = `You are a hotel maintenance assistant. Analyze the user's message and extract maintenance ticket information.
Return a JSON response with this format:
{
  "action": "create_ticket" | "ask_clarify" | "general_chat",
  "ticket": {
    "room_number": "string or null",
    "department": "ช่าง or ไอที",
    "category": "string (one of: ไฟฟ้า, ประปา, แอร์, โครงสร้าง, เน็ตเวิร์ค, คอมพิวเตอร์, ซอฟต์แวร์)",
    "description": "string",
    "priority": "low" | "medium" | "high" | "urgent"
  },
  "message": "Thai language response to user",
  "missing_fields": ["field names if any"],
  "suggestions": ["3 suggested example queries"]
}`;

  const apiResult = await callAIAPI([
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: message },
  ]);

  if (apiResult) {
    try {
      const parsed = JSON.parse(apiResult);
      if (parsed.ticket) {
        parsed.ticket.branch_code = branchCode;
      }
      return parsed;
    } catch {
      // Fall through to rule-based
    }
  }

  // Rule-based fallback
  return parseTicketFromText(message, branchCode);
}

export async function classifyRequestAI(text: string): Promise<AIClassificationResult> {
  // Try AI API
  const systemPrompt = `Classify this maintenance request. Return JSON:
{
  "department": "ช่าง or ไอที",
  "category": "string",
  "priority": "low" | "medium" | "high" | "urgent",
  "room_number": "string or null",
  "summary": "brief summary",
  "confidence": 0.0-1.0
}`;

  const apiResult = await callAIAPI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: text },
  ]);

  if (apiResult) {
    try {
      return JSON.parse(apiResult);
    } catch {
      // Fall through
    }
  }

  return classifyRequest(text);
}

export async function generateAIReport(data: ReportData): Promise<string> {
  // Try AI API
  const systemPrompt = `Generate a daily maintenance report summary in Thai language. Be professional and concise.`;

  const apiResult = await callAIAPI([
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Generate a report summary for: Total: ${data.total}, Completed: ${data.completed}, Pending: ${data.pending}, In Progress: ${data.inProgress}, By Department: ${JSON.stringify(data.byDepartment)}, By Branch: ${JSON.stringify(data.byBranch)}`,
    },
  ]);

  if (apiResult) return apiResult;
  return generateReportSummary(data);
}
