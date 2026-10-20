'use client';

// ล้างใบงานทดสอบก่อนเริ่มใช้งานจริง — แสดงเฉพาะแอดมิน และหายไปเองหลังกดสำเร็จ 1 ครั้ง
import { useEffect, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';

const PHRASE = 'ล้างใบงาน';

export default function GoLiveReset({ token }: { token?: string | null }) {
  const [st, setSt] = useState<any>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  const load = async () => {
    const r = await fetch('/api/admin/golive-reset', { headers });
    if (r.ok) setSt(await r.json());
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [token]);

  if (!st) return null;

  if (st.done) {
    return (
      <div className="card p-4 text-sm border border-green-700/50" data-t="golive-done">
        ✅ ล้างใบงานทดสอบแล้ว {st.done.tickets} ใบ โดย {st.done.done_by_name} เมื่อ {new Date(st.done.done_at).toLocaleString('th-TH')} · ตอนนี้มีใบงาน {st.tickets} ใบ
        {msg && <p className="text-gray-400 mt-1">{msg}</p>}
      </div>
    );
  }

  const run = async () => {
    if (text.trim() !== PHRASE) return;
    if (!window.confirm(`ยืนยันล้างใบงานทั้งหมด ${st.tickets} ใบ?\nเลขใบงานจะเริ่มนับ 00001 ใหม่ · ระบบเก็บสำรองไว้ก่อนลบ · กดได้ครั้งเดียว`)) return;
    setBusy(true); setMsg('');
    const r = await fetch('/api/admin/golive-reset', { method: 'POST', headers, body: JSON.stringify({ confirm: text.trim() }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setMsg(d.error || `ไม่สำเร็จ (${r.status})`); return; }
    setMsg(`ล้างแล้ว ${d.tickets} ใบ`);
    load();
  };

  return (
    <div className="card p-4 sm:p-5 border border-red-700/50 space-y-3" data-t="golive-reset">
      <div>
        <h3 className="text-lg font-bold text-ink">🚀 ล้างใบงานทดสอบก่อนเริ่มใช้งานจริง</h3>
        <p className="text-sm text-gray-400 mt-1">
          ตอนนี้มีใบงาน <b className="text-ink">{st.tickets}</b> ใบ · รูป {st.images} · บันทึก {st.logs} — กดแล้วลบทั้งหมด เลขใบงานเริ่ม 00001 ใหม่
          · บัญชีผู้ใช้ สาขา ทรัพย์สิน อะไหล่ ตาราง PM ไม่ถูกแตะ · ระบบเก็บสำรองทุกแถวไว้ก่อนลบ · <b>กดได้ครั้งเดียว</b>
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input className="input-field flex-1" placeholder={`พิมพ์คำว่า ${PHRASE}`} value={text} onChange={e => setText(e.target.value)} data-t="golive-input" />
        <button onClick={run} disabled={busy || text.trim() !== PHRASE} className="btn-danger text-sm inline-flex items-center justify-center gap-2" data-t="golive-run">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} ล้างใบงานทั้งหมด
        </button>
      </div>
      {msg && <p className="text-sm text-red-300">{msg}</p>}
    </div>
  );
}
