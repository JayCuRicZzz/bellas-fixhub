'use client';
// อะไหล่ที่ใช้ในใบงาน — ช่าง/ไอทีบันทึกระหว่างทำงาน (ตัดสต็อกสาขาของใบงาน) · คืนได้ก่อนอนุมัติ
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Package, Plus, Undo2, Loader2 } from 'lucide-react';

interface Move { move_id: number; part_id: number; name: string; unit: string; qty: string; unit_cost: string; kind: string; moved_by: string; moved_by_name: string | null; note: string | null }
interface Part { part_id: number; name: string; unit: string; part_code: string; stock: number; dept_type: string }

export default function TicketParts({ ticketId, status, branch, deptType, user, token }: {
  ticketId: number; status: string; branch: string; deptType?: string; user: any; token: string | null;
}) {
  const auth = useMemo<Record<string, string>>(() => (token ? { Authorization: `Bearer ${token}` } : ({} as Record<string, string>)), [token]);
  const [moves, setMoves] = useState<Move[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [adding, setAdding] = useState(false);
  const [partId, setPartId] = useState('');
  const [qty, setQty] = useState('1');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const isWorker = ['tech', 'it', 'sup', 'supit', 'admin'].includes(user?.role);
  const editable = isWorker && ['IN_PROGRESS', 'PAUSED', 'RESOLVED'].includes(status);

  const load = useCallback(() => {
    fetch(`/api/tickets/${ticketId}/parts`, { headers: auth }).then(r => r.json()).then(d => setMoves(Array.isArray(d) ? d : [])).catch(() => {});
  }, [ticketId, auth]);
  useEffect(load, [load]);
  useEffect(() => {
    if (!adding || parts.length) return;
    const dept = deptType === 'IT' ? 'IT' : 'MAINTENANCE';
    fetch(`/api/parts?branch=${branch}&dept=${dept}`, { headers: auth }).then(r => r.json()).then(d => setParts(Array.isArray(d) ? d : [])).catch(() => {});
  }, [adding, parts.length, branch, deptType, auth]);

  // ยอดสุทธิ: USE ที่ถูกคืนแล้วไม่ต้องแสดงปุ่มคืนซ้ำ
  const returned = new Set(moves.filter(m => m.kind === 'RETURN').map(m => Number(String(m.note || '').replace('คืน #', ''))));
  const used = moves.filter(m => m.kind === 'USE');
  const total = moves.reduce((s, m) => s + -Number(m.qty) * Number(m.unit_cost), 0);

  const add = async () => {
    setBusy(true); setMsg('');
    try {
      const r = await fetch(`/api/tickets/${ticketId}/parts`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...auth }, body: JSON.stringify({ part_id: Number(partId), qty: Number(qty) }) });
      const d = await r.json();
      if (!r.ok) setMsg(`❌ ${d.error}`);
      else { setMsg(d.warning ? `⚠️ ${d.warning}` : '✅ บันทึกแล้ว'); setPartId(''); setQty('1'); setAdding(false); setParts([]); load(); }
    } finally { setBusy(false); }
  };
  const undo = async (m: Move) => {
    if (!confirm(`คืน ${m.name} ${Math.abs(Number(m.qty))} ${m.unit} เข้าสต็อก?`)) return;
    const r = await fetch(`/api/tickets/${ticketId}/parts?move_id=${m.move_id}`, { method: 'DELETE', headers: auth });
    const d = await r.json().catch(() => ({}));
    setMsg(r.ok ? '✅ คืนเข้าสต็อกแล้ว' : `❌ ${d.error || 'ไม่สำเร็จ'}`); load();
  };

  if (!used.length && !editable) return null;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-ink flex items-center gap-2"><Package className="w-5 h-5 text-gold-500" /> อะไหล่ที่ใช้</h3>
        {total > 0 && <span className="text-sm text-gray-400">รวม ฿{total.toLocaleString('th-TH', { maximumFractionDigits: 0 })}</span>}
      </div>
      {used.length === 0 ? <p className="text-sm text-gray-500">ยังไม่ได้บันทึกอะไหล่</p> : (
        <div className="space-y-1.5">
          {used.map(m => (
            <div key={m.move_id} className={`flex items-center justify-between gap-2 text-sm ${returned.has(m.move_id) ? 'opacity-50 line-through' : ''}`}>
              <span className="text-gray-300">{m.name} × {Math.abs(Number(m.qty))} {m.unit} <span className="text-xs text-gray-500">· {m.moved_by_name}</span></span>
              {editable && !returned.has(m.move_id) && (m.moved_by === user?.id || ['sup', 'supit', 'admin'].includes(user?.role)) && (
                <button onClick={() => undo(m)} className="text-xs text-gray-400 hover:text-orange-400 inline-flex items-center gap-1"><Undo2 className="w-3.5 h-3.5" /> คืน</button>
              )}
            </div>
          ))}
        </div>
      )}
      {editable && (adding ? (
        <div className="mt-3 flex flex-wrap gap-2 items-center">
          <select value={partId} onChange={e => setPartId(e.target.value)} className="select-field flex-1 min-w-[180px]">
            <option value="">— เลือกอะไหล่ —</option>
            {parts.map(p => <option key={p.part_id} value={p.part_id}>{p.name} (เหลือ {p.stock} {p.unit})</option>)}
          </select>
          <input type="number" min={0.01} step="any" value={qty} onChange={e => setQty(e.target.value)} className="input-field !w-24" />
          <button onClick={add} disabled={busy || !partId || !(Number(qty) > 0)} className="btn-primary text-sm">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'บันทึก'}</button>
          <button onClick={() => setAdding(false)} className="btn-secondary text-sm">ยกเลิก</button>
          {parts.length === 0 && <p className="text-xs text-gray-500 w-full">ยังไม่มีรายการอะไหล่ — ให้หัวหน้าเพิ่มที่เมนู "อะไหล่ & สต็อก"</p>}
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="mt-3 btn-secondary text-sm inline-flex items-center gap-1.5"><Plus className="w-4 h-4" /> บันทึกอะไหล่ที่ใช้</button>
      ))}
      {msg && <p className="text-sm mt-2 text-gray-300">{msg}</p>}
    </div>
  );
}
