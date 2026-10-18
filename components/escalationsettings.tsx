'use client';
// ตั้งค่าการเร่งงานอัตโนมัติ (หน้า LINE Bot) — แอดมินเท่านั้น
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface Cfg { enabled: boolean; acceptMinutes: number; nearMinutes: number; breached: boolean; quietStart: number; quietEnd: number }

export default function EscalationSettings({ token }: { token: string | null }) {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [busy, setBusy] = useState<'' | 'save' | 'run'>('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/admin/escalation', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.json()).then(d => { if (d && typeof d.enabled === 'boolean') setCfg(d); }).catch(() => {});
  }, [token]);

  const call = async (method: 'PUT' | 'POST') => {
    setBusy(method === 'PUT' ? 'save' : 'run'); setMsg('');
    try {
      const r = await fetch('/api/admin/escalation', {
        method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: method === 'PUT' ? JSON.stringify(cfg) : '{}',
      });
      const d = await r.json();
      if (!r.ok) setMsg(`❌ ${d.error || 'ไม่สำเร็จ'}`);
      else if (method === 'PUT') { setCfg(d.config); setMsg('✅ บันทึกแล้ว'); }
      else setMsg(d.skipped === 'disabled' ? 'ปิดการเร่งงานอยู่' : d.tickets ? `✅ แจ้งเตือน ${d.tickets} ใบงาน (${d.sent} กลุ่ม)` : '✅ ตอนนี้ไม่มีงานที่ต้องเร่ง');
    } catch { setMsg('❌ เชื่อมต่อไม่สำเร็จ'); }
    finally { setBusy(''); }
  };

  if (!cfg) return null;
  const num = (k: keyof Cfg, min: number, max: number) => (
    <input type="number" min={min} max={max} value={cfg[k] as number} className="input-field !py-1.5 w-24"
           onChange={e => setCfg({ ...cfg, [k]: Number(e.target.value) })} />
  );

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-ink">🚨 เร่งงานอัตโนมัติ (ตรวจทุก 10 นาที)</h3>
        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input type="checkbox" checked={cfg.enabled} onChange={e => setCfg({ ...cfg, enabled: e.target.checked })} /> เปิดใช้งาน
        </label>
      </div>
      <p className="text-xs text-gray-400">แจ้งเข้ากลุ่ม LINE ของแผนกนั้น · แต่ละใบงานแจ้งแต่ละระดับครั้งเดียว · หลายใบในรอบเดียวรวมเป็นข้อความเดียว</p>
      <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-300">
        <label className="flex items-center justify-between gap-2">⏳ ไม่มีคนรับงานเกิน (นาที) {num('acceptMinutes', 5, 1440)}</label>
        <label className="flex items-center justify-between gap-2">🟠 เตือนก่อนครบ SLA (นาที, 0 = ปิด) {num('nearMinutes', 0, 1440)}</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={cfg.breached} onChange={e => setCfg({ ...cfg, breached: e.target.checked })} /> 🔴 แจ้งเมื่อเลย SLA</label>
        <label className="flex items-center justify-between gap-2">🌙 ช่วงเงียบ (แจ้งเฉพาะงานด่วน/สูง)
          <span className="flex items-center gap-1">{num('quietStart', 0, 23)}–{num('quietEnd', 0, 23)} น.</span>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => call('PUT')} disabled={!!busy} className="btn-primary text-sm">
          {busy === 'save' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'บันทึกการตั้งค่า'}
        </button>
        <button type="button" onClick={() => call('POST')} disabled={!!busy} className="btn-secondary text-sm">
          {busy === 'run' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ตรวจตอนนี้'}
        </button>
        {msg && <span className="text-sm text-gray-300">{msg}</span>}
      </div>
    </div>
  );
}
