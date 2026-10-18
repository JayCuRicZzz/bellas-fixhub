'use client';
// อะไหล่ & สต็อก — รายการอะไหล่ · คงเหลือต่อสาขา · รับเข้า/ปรับยอด · ประวัติเคลื่อนไหว
//   ช่าง/ไอทีเบิกใช้จากหน้าใบงาน (ตัดสต็อกสาขาของใบงานอัตโนมัติ)
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../components/authprovider';
import { BRANCHES } from '../../../types';
import { isAssetManager } from '../../../lib/asset-types';
import { Plus, PackagePlus, History, Pencil, X, Loader2, Search, AlertTriangle } from 'lucide-react';

interface Part { part_id: number; part_code: string; name: string; unit: string; dept_type: string; min_stock: string; unit_cost: string; stock: number; used_30d: number; low: boolean }
const baht = (n: any) => Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 });
const KIND_TH: Record<string, string> = { IN: 'รับเข้า', USE: 'เบิกใช้', ADJUST: 'ปรับยอด', RETURN: 'คืน' };

export default function PartsPage() {
  const { user, token } = useAuth();
  const canManage = isAssetManager(user?.role);
  const auth = useMemo<Record<string, string>>(() => (token ? { Authorization: `Bearer ${token}` } : ({} as Record<string, string>)), [token]);
  const myBranches = useMemo(() => (user?.branches?.length ? BRANCHES.filter(b => user.branches!.includes(b.branch_code)) : BRANCHES), [user]);

  const [branch, setBranch] = useState('');
  const [dept, setDept] = useState('');
  const [q, setQ] = useState('');
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [move, setMove] = useState<any>(null);
  const [history, setHistory] = useState<{ part: Part; rows: any[] | null } | null>(null);

  useEffect(() => { if (!branch && myBranches.length) setBranch(user?.branch_code && myBranches.some(b => b.branch_code === user.branch_code) ? user.branch_code : myBranches[0].branch_code); }, [myBranches, user, branch]);

  const load = useCallback(async () => {
    if (!branch) return;
    setLoading(true);
    try {
      const d = await fetch(`/api/parts?branch=${branch}${dept ? `&dept=${dept}` : ''}`, { headers: auth }).then(r => r.json());
      setParts(Array.isArray(d) ? d : []);
    } catch { setErr('โหลดข้อมูลไม่สำเร็จ'); }
    finally { setLoading(false); }
  }, [branch, dept, auth]);
  useEffect(() => { load(); }, [load]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500); };
  const shown = parts.filter(p => !q || `${p.part_code} ${p.name}`.toLowerCase().includes(q.toLowerCase()));
  const lowCount = parts.filter(p => p.low && Number(p.min_stock) > 0).length;
  const stockValue = parts.reduce((s, p) => s + Math.max(0, p.stock) * Number(p.unit_cost), 0);

  const send = async (url: string, method: string, body: any, ok: string) => {
    setBusy(true); setErr('');
    try {
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...auth }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || 'ไม่สำเร็จ'); return false; }
      flash(ok); load(); return true;
    } finally { setBusy(false); }
  };

  const openHistory = async (p: Part) => {
    setHistory({ part: p, rows: null });
    const rows = await fetch(`/api/parts/moves?part_id=${p.part_id}&branch=${branch}`, { headers: auth }).then(r => r.json()).catch(() => []);
    setHistory({ part: p, rows: Array.isArray(rows) ? rows : [] });
  };

  return (
    <div className="space-y-5 fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-ink">📦 อะไหล่ & สต็อก</h2>
          <p className="text-gray-400 text-sm mt-1">คงเหลือต่อสาขา · ช่างเบิกใช้จากหน้าใบงาน · หัวหน้ารับเข้า/ปรับยอดที่นี่</p>
        </div>
        <select value={branch} onChange={e => setBranch(e.target.value)} className="select-field !w-auto">
          {myBranches.map(b => <option key={b.branch_code} value={b.branch_code}>{b.branch_code} · {b.branch_name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="card !p-4"><div className="text-xs text-gray-400">รายการอะไหล่</div><div className="text-2xl font-bold text-ink">{parts.length}</div></div>
        <div className="card !p-4"><div className="text-xs text-gray-400">ต่ำกว่าขั้นต่ำ</div><div className={`text-2xl font-bold ${lowCount ? 'text-red-400' : 'text-green-400'}`}>{lowCount}</div></div>
        <div className="card !p-4 col-span-2 sm:col-span-1"><div className="text-xs text-gray-400">มูลค่าคงคลัง ({branch})</div><div className="text-2xl font-bold text-ink">฿{baht(stockValue)}</div></div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหารหัส/ชื่ออะไหล่…" className="input-field !pl-9" />
        </div>
        <select value={dept} onChange={e => setDept(e.target.value)} className="select-field !w-auto">
          <option value="">ช่าง + ไอที</option><option value="MAINTENANCE">🔧 ช่าง</option><option value="IT">💻 ไอที</option>
        </select>
        {canManage && <button onClick={() => setForm({ name: '', part_code: '', unit: 'ชิ้น', dept_type: 'MAINTENANCE', min_stock: 0, unit_cost: 0 })}
          className="btn-primary text-sm inline-flex items-center gap-1.5"><Plus className="w-4 h-4" /> เพิ่มอะไหล่</button>}
      </div>

      {msg && <div className="px-4 py-2 rounded-lg bg-green-500/10 text-green-400 text-sm">{msg}</div>}
      {err && <div className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 text-sm flex justify-between">{err}<button onClick={() => setErr('')}><X className="w-4 h-4" /></button></div>}

      <div className="card !p-0 overflow-x-auto">
        {loading ? <div className="p-4 space-y-2">{[1, 2, 3].map(i => <div key={i} className="skeleton h-10" />)}</div>
          : shown.length === 0 ? <p className="text-gray-500 text-center py-10 text-sm">ยังไม่มีอะไหล่{canManage ? ' — กด "เพิ่มอะไหล่"' : ''}</p>
          : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-navy-700 text-left text-gray-500 text-xs">
                <th className="py-2.5 px-3">อะไหล่</th><th className="py-2.5 px-3 text-right">คงเหลือ</th><th className="py-2.5 px-3 text-right">ขั้นต่ำ</th>
                <th className="py-2.5 px-3 text-right">ใช้ 30 วัน</th><th className="py-2.5 px-3 text-right">ราคา/หน่วย</th><th className="py-2.5 px-3"></th>
              </tr></thead>
              <tbody>
                {shown.map(p => (
                  <tr key={p.part_id} className="border-b border-navy-700/50 hover:bg-navy-700/30">
                    <td className="py-2 px-3">
                      <div className="text-ink font-medium">{p.dept_type === 'IT' ? '💻' : '🔧'} {p.name}</div>
                      <div className="text-xs text-gray-500 font-mono">{p.part_code}</div>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span className={p.stock < 0 ? 'text-red-400 font-bold' : p.low && Number(p.min_stock) > 0 ? 'text-amber-400 font-semibold' : 'text-ink'}>
                        {p.low && Number(p.min_stock) > 0 && <AlertTriangle className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />}{baht(p.stock)}
                      </span> <span className="text-xs text-gray-500">{p.unit}</span>
                    </td>
                    <td className="py-2 px-3 text-right text-gray-400">{baht(p.min_stock)}</td>
                    <td className="py-2 px-3 text-right text-gray-300">{p.used_30d ? baht(p.used_30d) : '-'}</td>
                    <td className="py-2 px-3 text-right text-gray-300">฿{baht(p.unit_cost)}</td>
                    <td className="py-2 px-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openHistory(p)} title="ประวัติ" className="p-1.5 rounded hover:bg-navy-600 text-gray-400 hover:text-ink"><History className="w-4 h-4" /></button>
                        {canManage && <>
                          <button onClick={() => setMove({ part: p, kind: 'IN', qty: '', unit_cost: p.unit_cost, note: '' })} title="รับเข้า/ปรับยอด" className="p-1.5 rounded hover:bg-navy-600 text-gray-400 hover:text-ink"><PackagePlus className="w-4 h-4" /></button>
                          <button onClick={() => setForm({ ...p })} title="แก้ไข" className="p-1.5 rounded hover:bg-navy-600 text-gray-400 hover:text-ink"><Pencil className="w-4 h-4" /></button>
                        </>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {form && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4" onClick={() => setForm(null)}>
          <div className="bg-navy-800 border border-navy-600 rounded-xl w-full max-w-md p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-ink">{form.part_id ? 'แก้ไขอะไหล่' : 'เพิ่มอะไหล่'}</h3>
            <label className="text-sm text-gray-400 block">ชื่ออะไหล่ *<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field mt-1" placeholder="เช่น คาปาซิเตอร์แอร์ 35µF" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm text-gray-400 block">รหัส<input disabled={!!form.part_id} value={form.part_code} onChange={e => setForm({ ...form, part_code: e.target.value })} className="input-field mt-1" placeholder="อัตโนมัติ" /></label>
              <label className="text-sm text-gray-400 block">หน่วย<input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="input-field mt-1" /></label>
              <label className="text-sm text-gray-400 block">แผนก
                <select value={form.dept_type} onChange={e => setForm({ ...form, dept_type: e.target.value })} className="select-field mt-1"><option value="MAINTENANCE">ช่าง</option><option value="IT">ไอที</option></select>
              </label>
              <label className="text-sm text-gray-400 block">ขั้นต่ำ (แจ้งเตือน)<input type="number" min={0} value={form.min_stock} onChange={e => setForm({ ...form, min_stock: e.target.value })} className="input-field mt-1" /></label>
              <label className="text-sm text-gray-400 block col-span-2">ราคาต่อหน่วย (บาท)<input type="number" min={0} step="0.01" value={form.unit_cost} onChange={e => setForm({ ...form, unit_cost: e.target.value })} className="input-field mt-1" /></label>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setForm(null)} className="btn-secondary text-sm">ยกเลิก</button>
              <button disabled={busy || !form.name.trim()} className="btn-primary text-sm"
                onClick={async () => { if (await send(form.part_id ? `/api/parts/${form.part_id}` : '/api/parts', form.part_id ? 'PUT' : 'POST', form, 'บันทึกแล้ว')) setForm(null); }}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {move && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4" onClick={() => setMove(null)}>
          <div className="bg-navy-800 border border-navy-600 rounded-xl w-full max-w-md p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-ink">{move.part.name} — {branch}</h3>
            <p className="text-sm text-gray-400">คงเหลือตอนนี้ {baht(move.part.stock)} {move.part.unit}</p>
            <div className="flex gap-2">
              {[['IN', 'รับเข้า'], ['ADJUST', 'ปรับยอด (+/−)']].map(([k, l]) => (
                <button key={k} onClick={() => setMove({ ...move, kind: k })} className={`px-3 py-1.5 rounded-lg text-sm ${move.kind === k ? 'bg-gold-500 text-navy-900' : 'bg-navy-700 text-gray-300'}`}>{l}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm text-gray-400 block">จำนวน{move.kind === 'ADJUST' ? ' (ติดลบ = ลด)' : ''}<input type="number" step="any" value={move.qty} onChange={e => setMove({ ...move, qty: e.target.value })} className="input-field mt-1" /></label>
              {move.kind === 'IN' && <label className="text-sm text-gray-400 block">ราคา/หน่วย<input type="number" min={0} step="0.01" value={move.unit_cost} onChange={e => setMove({ ...move, unit_cost: e.target.value })} className="input-field mt-1" /></label>}
            </div>
            <label className="text-sm text-gray-400 block">หมายเหตุ<input value={move.note} onChange={e => setMove({ ...move, note: e.target.value })} className="input-field mt-1" placeholder={move.kind === 'IN' ? 'เลขที่ใบส่งของ / ร้านค้า' : 'เหตุผลที่ปรับยอด'} /></label>
            <div className="flex justify-end gap-2">
              <button onClick={() => setMove(null)} className="btn-secondary text-sm">ยกเลิก</button>
              <button disabled={busy || !Number(move.qty)} className="btn-primary text-sm"
                onClick={async () => { if (await send('/api/parts/moves', 'POST', { part_id: move.part.part_id, branch_code: branch, kind: move.kind, qty: Number(move.qty), unit_cost: move.unit_cost, note: move.note }, 'บันทึกสต็อกแล้ว')) setMove(null); }}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {history && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center pt-10 px-4 overflow-y-auto" onClick={() => setHistory(null)}>
          <div className="bg-navy-800 border border-navy-600 rounded-xl w-full max-w-lg p-5 space-y-3 mb-8" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between"><h3 className="text-lg font-bold text-ink">ประวัติ — {history.part.name} ({branch})</h3><button onClick={() => setHistory(null)} className="text-gray-400"><X className="w-5 h-5" /></button></div>
            {!history.rows ? <div className="skeleton h-20" /> : history.rows.length === 0 ? <p className="text-sm text-gray-500">ยังไม่มีความเคลื่อนไหว</p> : (
              <div className="space-y-1 text-sm max-h-96 overflow-y-auto">
                {history.rows.map((m: any) => (
                  <div key={m.move_id} className="flex justify-between gap-2 py-1.5 border-b border-navy-700/50">
                    <div>
                      <span className={Number(m.qty) > 0 ? 'text-green-400' : 'text-orange-400'}>{Number(m.qty) > 0 ? '+' : ''}{baht(m.qty)}</span>
                      <span className="text-gray-300"> {KIND_TH[m.kind] || m.kind}</span>
                      {m.ticket_number && <span className="text-gold-400 text-xs font-mono"> {m.ticket_number}</span>}
                      {m.note && <div className="text-xs text-gray-500">{m.note}</div>}
                    </div>
                    <div className="text-xs text-gray-500 text-right">{new Date(m.moved_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}<br />{m.moved_by_name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
