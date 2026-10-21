'use client';

// สวิตช์ "แจ้งงานใหม่เข้า LINE อัตโนมัติ" แยกกลุ่มช่าง / ไอที
// ปิด = โหมดส่งต่อเอง (กดปุ่ม “ส่งต่อ LINE” ในใบงาน) · สรุป 22:00 และเตือนเร่งงาน ยังส่งตามปกติ
import { useEffect, useState } from 'react';

export default function LineAutoMode({ token }: { token?: string | null }) {
  const [cfg, setCfg] = useState<{ autoMaint: boolean; autoIT: boolean } | null>(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  useEffect(() => {
    fetch('/api/admin/line-config', { headers }).then(r => r.json())
      .then(d => setCfg({ autoMaint: d.autoMaint !== false, autoIT: d.autoIT !== false })).catch(() => setMsg('โหลดค่าไม่สำเร็จ'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const save = async (key: 'autoMaint' | 'autoIT', value: boolean) => {
    setBusy(key); setMsg('');
    try {
      const r = await fetch('/api/admin/line-config', { method: 'POST', headers, body: JSON.stringify({ [key]: value }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || `บันทึกไม่สำเร็จ (${r.status})`);
      setCfg({ autoMaint: d.autoMaint !== false, autoIT: d.autoIT !== false });
      setMsg(`บันทึกแล้ว ✓ กลุ่ม${key === 'autoIT' ? 'ไอที' : 'ช่าง'}: ${value ? 'ส่งอัตโนมัติ' : 'ส่งต่อเอง'}`);
    } catch (e: any) { setMsg(e?.message || 'บันทึกไม่สำเร็จ'); }
    finally { setBusy(''); }
  };

  if (!cfg) return <div className="card text-sm text-gray-400">{msg || 'กำลังโหลด…'}</div>;

  const Row = ({ k, label }: { k: 'autoMaint' | 'autoIT'; label: string }) => (
    <div className="flex items-center justify-between gap-3 py-3 border-t border-navy-700 first:border-t-0">
      <div>
        <p className="text-ink font-medium">{label}</p>
        <p className="text-xs text-gray-400">{cfg[k] ? '🟢 ส่งงานใหม่เข้ากลุ่มอัตโนมัติ' : '✋ ส่งต่อเอง — ระบบไม่ส่งงานใหม่เข้ากลุ่ม'}</p>
      </div>
      <div className="flex rounded-lg overflow-hidden border border-navy-600 shrink-0">
        <button type="button" disabled={!!busy} onClick={() => save(k, true)} data-t={`${k}-on`}
          className={`px-3 py-1.5 text-sm ${cfg[k] ? 'bg-gold-500 text-navy-900 font-semibold' : 'bg-navy-800 text-gray-400'}`}>อัตโนมัติ</button>
        <button type="button" disabled={!!busy} onClick={() => save(k, false)} data-t={`${k}-off`}
          className={`px-3 py-1.5 text-sm ${!cfg[k] ? 'bg-gold-500 text-navy-900 font-semibold' : 'bg-navy-800 text-gray-400'}`}>ส่งต่อเอง</button>
      </div>
    </div>
  );

  return (
    <div className="card space-y-2" data-t="line-auto-mode">
      <h3 className="text-ink font-semibold">📨 การส่งงานใหม่เข้า LINE</h3>
      <p className="text-xs text-gray-400">
        “ส่งต่อเอง” = ระบบไม่ส่งงานใหม่ / งานไม่เรียบร้อย / งาน PM เข้ากลุ่ม · ใช้ปุ่ม <b>📤 ส่งต่อ LINE</b> ในใบงานแทน (ไม่กินโควตา LINE)
        · <b>สรุปประจำวัน 22:00</b> และ<b>เตือนเร่งงาน</b> ยังส่งอัตโนมัติตามปกติ · ช่างยังได้แจ้งเตือนบนมือถือเหมือนเดิม
      </p>
      <Row k="autoMaint" label="🔧 กลุ่มช่าง" />
      <Row k="autoIT" label="💻 กลุ่มไอที" />
      {msg && <p className="text-sm text-gray-300">{msg}</p>}
    </div>
  );
}
