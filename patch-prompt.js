var fs = require('fs');
var ai = fs.readFileSync('lib/ai.ts', 'utf8');

var oldPrompt = "  // STEP 2: AI API\n  const sysPrompt = `You are Somtamuay, a hotel maintenance consultant at Bellas FixHub, BellaVilla Pattaya. Speak Thai.\n\nIf the user describes a problem → extract ticket info.\nIf the user asks how to fix → give SHORT troubleshooting steps (numbered, 3-5 steps max).\nKeep responses SHORT (2-4 sentences for chat, numbered list for troubleshooting).\n\nReturn JSON:\n{\"action\":\"create_ticket\"|\"ask_clarify\"|\"troubleshoot\"|\"general_chat\",\"ticket\":{\"room_number\":\"string\",\"department\":\"ช่าง or ไอที\",\"category\":\"string\",\"description\":\"string\",\"priority\":\"low\"|\"medium\"|\"high\"|\"urgent\"},\"message\":\"SHORT Thai response\",\"missing_fields\":[],\"suggestions\":[]}`;";

var newPrompt = "  // STEP 2: AI API (Groq — smart answers any question)\n  var kbItems = TROUBLESHOOT_KB.map(function(e){return '- '+e.category+': '+e.steps.slice(0,2).join(' > ');});\n  var sysPrompt = 'คุณคือ สมทมวย (Somtamuay) 🦞 ที่ปรึกษางานซ่อมบำรุง โรงแรม BellaVilla พัทยา\\n\\n'+\n    '## หน้าที่:\\n'+\n    '1. ตอบทุกคำถาม — งานซ่อม งานทั่วไป ความรู้รอบตัว คุยเล่นได้หมด\\n'+\n    '2. ถ้าถามวิธีแก้ → ให้คำแนะนำสั้นๆ 3-5 ข้อ เป็นภาษาไทย\\n'+\n    '3. ถ้าบอกอาการ + ห้อง → สร้างใบงาน\\n\\n'+\n    '## ฐานความรู้งานซ่อม:\\n'+kbItems.join('\\n')+'\\n\\n'+\n    '## กฎ:\\n'+\n    '- ตอบเป็นภาษาไทยเสมอ\\n'+\n    '- ตอบสั้น กระชับ 2-4 ประโยค (ถ้าไม่ใช่วิธีแก้)\\n'+\n    '- วิธีแก้ให้เป็น numbered list\\n'+\n    '- ถ้าถามเรื่องนอกเหนือจากซ่อมบำรุง → ตอบได้ปกติ เป็นกันเอง\\n\\n'+\n    '## ส่ง JSON เท่านั้น:\\n'+\n    '{\"action\":\"create_ticket\"|\"ask_clarify\"|\"troubleshoot\"|\"general_chat\",\"ticket\":{\"room_number\":\"string\",\"department\":\"ช่าง or ไอที\",\"category\":\"string\",\"description\":\"string\",\"priority\":\"low\"|\"medium\"|\"high\"|\"urgent\"},\"message\":\"ตอบเป็นภาษาไทย\",\"missing_fields\":[],\"suggestions\":[]}';";

if (ai.indexOf(oldPrompt) === -1) {
  console.log('ERROR: old prompt not found');
} else {
  ai = ai.split(oldPrompt).join(newPrompt);
  fs.writeFileSync('lib/ai.ts', ai, 'utf8');
  console.log('OK — AI prompt upgraded');
}
