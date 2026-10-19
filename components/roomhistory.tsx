'use client';
// ประวัติซ่อมตามเบอร์ห้อง/จุด — พิมพ์เลขห้อง → เห็นทุกงานของห้องนั้น (วันที่ อาการ หมวด สถานะ ช่าง)
//   เลขห้องตรงทั้งตัว (305 ไม่ติด 1305) · ใช้สิทธิ์เดียวกับรายการใบงาน (สาขา/แผนกของผู้ใช้)
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Loader2, Printer, X } from 'lucide-react';
import { BRANCHES, STATUS_LABELS } from '../types';

interface Row {
  ticket_id: number; ticket_number: string; branch_code: string; location_detail: string; description: string;
  status: string; created_at: string; resolved_at: string | null; technician_name: string | null;
  main_th: string | null; sub_th: string | null; dept_type: string | null; reporter_name: string | null; sla_overdue?: boolean;
}

const OPEN = ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'PAUSED'];
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-');
const STATUS_TONE: Record<string, string> = {
  PENDING: 'text-amber-400', ACCEPTED: 'text-blue-400', IN_PROGRESS: 'text-purple-400', PAUSED: 'text-orange-400',
  RESOLVED: 'text-green-400', APPROVED: 'text-emerald-400', CANCELLED: 'text-gray-500',
};

export default function RoomHistory({ token, branches }: { token: string | null; branches?: string[] }) {
  const myBranches = useMemo(() => (branches?.length ? BRANCHES.filter(b => branches.includes(b.branch_code)) : BRANCHES), [branches]);
  const [room, setRoom] = useState('');
  const [branch, setBranch] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [searched, setSearched] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [showCancelled, setShowCancelled] = useState(false);

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const r = room.trim();
    if (!r) return;
    setLoading(true); setErr('');
    try {
      const p = new URLSearchParams({ room: r, limit: '500' });
      if (branch) p.set('branch', branch);
      const res = await fetch(`/api/tickets?${p}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const d = await res.json();
      if (!res.ok || !Array.isArray(d)) { setErr(d?.error || 'ค้นหาไม่สำเร็จ'); setRows(null); return; }
      setRows(d); setSearched(r);
    } catch { setErr('เชื่อมต่อไม่สำเร็จ'); }
    finally { setLoading(false); }
  };

  const shown = (rows || []).filter(t => showCancelled || t.status !== 'CANCELLED');
  const real = (rows || []).filter(t => t.status !== 'CANCELLED');
  const openCount = real.filter(t => OPEN.includes(t.status)).length;
  const topCats = Object.entries(real.reduce<Record<string, number>>((m, t) => { const k = t.main_th || 'อื่น ๆ'; m[k] = (m[k] || 0) + 1; return m; }, {}))
    .sort((a, b) => b[1] - a[1]).slice(0, 3);
  const last90 = real.filter(t => Date.now() - new Date(t.created_at).getTime() < 90 * 86400000).length;

  return (
    <div className="card space-y-4">
      <form onSubmit={search} className="flex flex-wrap items-center gap-2 no-print">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={room} onChange={e => setRoom(e.target.value)} inputMode="search"
                 placeholder="ประวัติซ่อมตามเบอร์ห้อง / จุด เช่น 305, ล็อบบี้" aria-label="เบอร์ห้องหรือจุด"
                 className="input-field !pl-9" />
        </div>
        {myBranches.length > 1 && (
          <select value={branch} onChange={e => setBranch(e.target.value)} className="select-field !w-auto" aria-label="สาขา">
            <option value="">ทุกสาขา</option>
            {myBranches.map(b => <option key={b.branch_code} value={b.branch_code}>{b.branch_code}</option>)}
          </select>
        )}
        <button type="submit" disabled={loading || !room.trim()} className="btn-primary text-sm inline-flex items-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} ค้นหา
        </button>
        <button type="button" onClick={() => window.print()} className="btn-secondary text-sm inline-flex items-center gap-2">
          <Printer className="w-4 h-4" /> พิมพ์ / PDF
        </button>
      </form>

      {err && <p className="text-sm text-red-400">{err}</p>}

      {rows && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-ink">
              ประวัติซ่อม “{searched}”{branch ? ` · ${branch}` : ''} — {real.length} ครั้ง
            </h3>
            <button onClick={() => { setRows(null); setRoom(''); }} className="text-gray-400 hover:text-ink no-print" aria-label="ล้างผลค้นหา"><X className="w-4 h-4" /></button>
          </div>
          {real.length > 0 && (
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="px-3 py-1 rounded-full bg-navy-700 text-gray-300">ค้างอยู่ <b className={openCount ? 'text-orange-400' : 'text-ink'}>{openCount}</b></span>
              <span className="px-3 py-1 rounded-full bg-navy-700 text-gray-300">ใน 90 วัน <b className={last90 >= 3 ? 'text-red-400' : 'text-ink'}>{last90}</b> ครั้ง</span>
              {topCats.map(([k, n]) => <span key={k} className="px-3 py-1 rounded-full bg-navy-700 text-gray-300">{k} <b className="text-ink">{n}</b></span>)}
            </div>
          )}
          {shown.length === 0 ? (
            <p className="text-sm text-gray-500">ไม่พบงานซ่อมของ “{searched}”{(rows.length > 0) ? ' (มีแต่ใบที่ยกเลิก)' : ''}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-700 text-left text-gray-500 text-xs">
                    <th className="py-2 px-2">วันที่แจ้ง</th><th className="py-2 px-2">ห้อง/จุด</th><th className="py-2 px-2">หมวด · อาการ</th>
                    <th className="py-2 px-2">สถานะ</th><th className="py-2 px-2">ช่าง</th><th className="py-2 px-2">ซ่อมเสร็จ</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map(t => (
                    <tr key={t.ticket_id} className="border-b border-navy-700/50 align-top hover:bg-navy-700/30">
                      <td className="py-2 px-2 whitespace-nowrap">
                        <div className="text-gray-300">{fmt(t.created_at)}</div>
                        <Link href={`/dashboard/${t.ticket_id}`} className="font-mono text-xs text-gold-400 hover:underline">{t.ticket_number}</Link>
                      </td>
                      <td className="py-2 px-2 text-gray-300">{t.branch_code} · {t.location_detail}</td>
                      <td className="py-2 px-2 min-w-[220px]">
                        <div className="text-xs text-gray-500">{t.dept_type === 'IT' ? 'ไอที' : 'ช่าง'} · {t.main_th || '-'}</div>
                        <div className="text-ink">{t.description}</div>
                      </td>
                      <td className={`py-2 px-2 whitespace-nowrap ${STATUS_TONE[t.status] || 'text-gray-300'}`}>
                        {STATUS_LABELS[t.status] || t.status}{t.sla_overdue ? <span className="block text-xs text-red-400">เกิน SLA</span> : null}
                      </td>
                      <td className="py-2 px-2 text-gray-300">{t.technician_name || '-'}</td>
                      <td className="py-2 px-2 text-gray-300 whitespace-nowrap">{fmt(t.resolved_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {rows.some(t => t.status === 'CANCELLED') && (
            <label className="flex items-center gap-2 text-xs text-gray-400 no-print cursor-pointer">
              <input type="checkbox" checked={showCancelled} onChange={e => setShowCancelled(e.target.checked)} /> แสดงใบที่ยกเลิกด้วย
            </label>
          )}
        </div>
      )}
    </div>
  );
}
