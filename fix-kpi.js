var fs = require('fs');
var f = 'app/dashboard/[id]/page.tsx';
var p = fs.readFileSync(f,'utf8');

// Add activityLogs state
p = p.replace(
  "const [difficulty, setDifficulty] = useState<string>('');\r\n  const [activityLogs, setActivityLogs] = useState<any[]>([]);\r\n  const repairFileRef = useRef<HTMLInputElement>(null);\r\n\r\n  // Check if ticket was flagged as unsatisfactory\r\n  const isFlagged = ticket?.pending_reason && ticket.pending_reason.includes('ไม่เรียบร้อย');",
  "const [difficulty, setDifficulty] = useState<string>('');\r\n  const [activityLogs, setActivityLogs] = useState<any[]>([]);\r\n  const repairFileRef = useRef<HTMLInputElement>(null);\r\n\r\n  // Check if ticket was flagged as unsatisfactory\r\n  const isFlagged = !!(ticket?.pending_reason && ticket.pending_reason.includes('ไม่เรียบร้อย'));\r\n\r\n  const fetchActivityLogs = async () => {\r\n    try {\r\n      const res = await fetch(`/api/tickets/log/${id}`, { headers: { Authorization: `Bearer ${token}` } });\r\n      if (res.ok) setActivityLogs(await res.json());\r\n    } catch {}\r\n  };"
);

// Add fetchActivityLogs call after fetchTicket
p = p.replace(
  "        setDifficulty(data.difficulty || '');",
  "        setDifficulty(data.difficulty || '');\r\n        fetchActivityLogs();"
);

// Add red flag banner + activity log section before Action Buttons
p = p.replace(
  "      {/* Action Buttons */}",
  "      {/* Red Flag — งานไม่เรียบร้อย */}\r\n      {isFlagged && (\r\n        <div className=\"card border-2 border-red-500 bg-red-500/10 animate-pulse no-print\">\r\n          <h3 className=\"text-lg font-bold text-red-400 flex items-center gap-2\">\r\n            🚩 งานไม่เรียบร้อย — ต้องดำเนินการใหม่\r\n          </h3>\r\n          {ticket?.pending_reason && <p className=\"text-red-300 text-sm mt-1\">{ticket.pending_reason}</p>}\r\n        </div>\r\n      )}\r\n\r\n      {/* Activity Log */}\r\n      {activityLogs.length > 0 && (\r\n        <div className=\"card no-print\">\r\n          <h3 className=\"text-lg font-semibold text-white mb-3\">📋 บันทึกการดำเนินการ</h3>\r\n          <div className=\"space-y-2 max-h-64 overflow-y-auto\">\r\n            {activityLogs.map((log: any, i: number) => (\r\n              <div key={i} className=\"flex items-start gap-3 text-sm py-1.5 border-b border-navy-700/50 last:border-0\">\r\n                <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${\r\n                  log.action === 'APPROVED' ? 'bg-emerald-500' :\r\n                  log.action === 'RATED' ? 'bg-gold-500' :\r\n                  log.action === 'RESOLVED' ? 'bg-green-500' :\r\n                  log.action === 'ACCEPTED' ? 'bg-blue-500' :\r\n                  log.action === 'START' ? 'bg-purple-500' :\r\n                  log.action === 'FLAGGED' ? 'bg-red-500' :\r\n                  log.action === 'REJECTED' ? 'bg-orange-500' :\r\n                  log.action === 'CANCELLED' ? 'bg-gray-500' :\r\n                  'bg-navy-500'\r\n                }`} />\r\n                <div className=\"flex-1 min-w-0\">\r\n                  <span className=\"text-white font-medium\">{log.actionByName}</span>\r\n                  <span className=\"text-gray-400 ml-1\">\r\n                    {log.action === 'ACCEPTED' ? 'รับงาน' :\r\n                     log.action === 'START' ? 'เริ่มดำเนินการ' :\r\n                     log.action === 'RESOLVED' ? 'ซ่อมเสร็จ' :\r\n                     log.action === 'APPROVED' ? 'อนุมัติ' :\r\n                     log.action === 'REJECTED' ? 'ตีกลับ' :\r\n                     log.action === 'FLAGGED' ? 'แจ้งงานไม่เรียบร้อย' :\r\n                     log.action === 'RATED' ? 'ให้คะแนน' :\r\n                     log.action === 'CANCELLED' ? 'ยกเลิก' :\r\n                     log.action}\r\n                  </span>\r\n                  {log.reason && <p className=\"text-yellow-400/80 text-xs mt-0.5\">⚠️ {log.reason}</p>}\r\n                </div>\r\n                <span className=\"text-xs text-gray-500 flex-shrink-0\">\r\n                  {new Date(log.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}\r\n                </span>\r\n              </div>\r\n            ))}\r\n          </div>\r\n        </div>\r\n      )}\r\n\r\n      {/* Action Buttons */}"
);

fs.writeFileSync(f,p,'utf8');
console.log('Patched ticket detail page');
