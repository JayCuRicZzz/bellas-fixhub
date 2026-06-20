var fs = require('fs');

// 1. Update AI page header
var p = fs.readFileSync('app/ai/page.tsx', 'utf8');
p = p.replace('AI Maintenance Assistant', 'ที่ปรึกษางานซ่อม 🦞');
p = p.replace('แจ้งซ่อมด้วยภาษาธรรมชาติ - AI ช่วยจัดการให้', 'ถามวิธีแก้ไขเบื้องต้น — หรือแจ้งซ่อมด้วยข้อความ');
fs.writeFileSync('app/ai/page.tsx', p, 'utf8');
console.log('Updated app/ai/page.tsx');

// 2. Update AIChat welcome message
var c = fs.readFileSync('components/aichat.tsx', 'utf8');
var oldWelcome = 'ผมคือ AI ผู้ช่วยแจ้งซ่อม คุณสามารถบอกปัญหาให้ผมฟังได้เลย เช่น "ห้อง 301 แอร์ไม่เย็น" และผมจะช่วยสร้างใบแจ้งซ่อมให้คุณโดยอัตโนมัติ';
var newWelcome = 'ผมคือที่ปรึกษางานซ่อม 🦞 — ถามวิธีแก้ไขเบื้องต้น หรือบอกปัญหาให้ผมช่วยสร้างใบงานให้';
c = c.split(oldWelcome).join(newWelcome);

var oldHint = '🤖 AI จะช่วยแยกประเภทงานและสร้างใบแจ้งซ่อมให้อัตโนมัติ';
var newHint = '🔧 ถามวิธีซ่อมง่ายๆ — หรือบอกปัญหาเพื่อสร้างใบงาน';
c = c.split(oldHint).join(newHint);

fs.writeFileSync('components/aichat.tsx', c, 'utf8');
console.log('Updated components/aichat.tsx');

console.log('Done');
