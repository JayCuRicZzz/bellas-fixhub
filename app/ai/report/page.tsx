'use client';

// AI รายงานสรุป — แยก 2 ก้อนชัดเจน: งานที่แจ้งในช่วงที่เลือก / งานค้างยกมาจากวันก่อน
// ครบทุกสถานะ (รอรับ · กำลังทำ · พักงาน · รออนุมัติ · ปิดงาน · ยกเลิก) · เลือก "ทุกสาขา" = แยกแถวรายสาขา
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../components/authprovider';
import { BRANCHES } from '../../../types';
import { FileText, Sparkles, Loader2, AlertCircle } from 'lucide-react';

const COLS_PERIOD: [string, string][] = [
  ['total', 'ทั้งหมด'], ['pending', 'รอรับ'], ['in_progress', 'กำลังทำ'], ['paused', 'พักงาน'],
  ['resolved', 'ซ่อมเสร็จรออนุมัติ'], ['approved', 'ปิดงาน'], ['cancelled', 'ยกเลิก'],
];
const COLS_CARRIED: [string, string][] = [
  ['total', 'ค้างทั้งหมด'], ['pending', 'รอรับ'], ['in_progress', 'กำลังทำ'], ['paused', 'พักงาน'],
  ['resolved', 'รออนุมัติ'], ['oldest_days', 'ค้างนานสุด (วัน)'], ['closed_in_period', 'ปิดงานเก่าได้ช่วงนี้'],
];

function Table({ cols, data, branches, showBranches, overdue }: {
  cols: [string, string][]; data: any; branches: string[]; showBranches: boolean; overdue?: Record<string, number> & { _total?: number };
}) {
  const rows = showBranches ? branches.filter(b => data.byBranch[b]) : [];
  const cell = (row: any, k: string) => {
    const v = row?.[k] || 0;
    const hot = (k === 'pending' || k === 'paused' || k === 'cancelled') && v > 0;
    return <td key={k} className={`py-1.5 px-2 text-center tabular-nums ${k === 'total' ? 'font-bold text-ink' : hot ? 'text-amber-400 font-semibold' : v ? 'text-gray-200' : 'text-gray-600'}`}>{v}</td>;
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 border-b border-navy-600">
            <th className="text-left py-1.5 px-2">สาขา</th>
            {cols.map(([k, l]) => <th key={k} className="py-1.5 px-2 font-medium whitespace-nowrap">{l}</th>)}
            {overdue && <th className="py-1.5 px-2 font-medium whitespace-nowrap text-red-400">เกิน SLA</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(b => (
            <tr key={b} className="border-b border-navy-700/50">
              <td className="py-1.5 px-2 font-semibold text-ink">{b}</td>
              {cols.map(([k]) => cell(data.byBranch[b], k))}
              {overdue && <td className={`py-1.5 px-2 text-center ${overdue[b] ? 'text-red-400 font-bold' : 'text-gray-600'}`}>{overdue[b] || 0}</td>}
            </tr>
          ))}
          <tr className="bg-gold-500/10">
            <td className="py-2 px-2 font-bold text-gold-400">รวม</td>
            {cols.map(([k]) => cell(data.total, k))}
            {overdue && <td className={`py-2 px-2 text-center ${overdue._total ? 'text-red-400 font-bold' : 'text-gray-600'}`}>{overdue._total || 0}</td>}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function AIReportPage() {
  const { user, token } = useAuth();
  const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
  const shift = (d: string, n: number) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  const [branch, setBranch] = useState('');
  const [work, setWork] = useState('');   // '' ทั้งหมด · MAINTENANCE ช่าง · IT ไอที
  const s0 = startDate <= endDate ? startDate : endDate, e0 = startDate <= endDate ? endDate : startDate;
  const scopeLabel = [branch ? `สาขา ${branch}` : 'ทุกสาขา', work === 'IT' ? 'งานไอที' : work === 'MAINTENANCE' ? 'งานช่าง' : 'ช่าง+ไอที'].join(' · ');
  const periodLabel0 = s0 === e0 ? (s0 === today() ? `วันนี้ (${fmt(s0)})` : `วันที่ ${fmt(s0)}`) : `${fmt(s0)} – ${fmt(e0)}`;
  const periodLabel = `${periodLabel0} (${scopeLabel})`;
  const authH: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  const [summary, setSummary] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token, startDate, endDate, branch, work]);

  const fetchReport = async () => {
    setLoading(true); setSummary(''); setError('');
    try {
      const q = new URLSearchParams({ start_date: s0, end_date: e0 });
      if (branch) q.set('branch', branch);
      if (work) q.set('work_type', work);
      const res = await fetch(`/api/reports/breakdown?${q}`, { headers: authH });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'โหลดไม่สำเร็จ');
      setData(d);
    } catch (err: any) {
      setData(null);
      setError('ไม่สามารถโหลดข้อมูลรายงานได้: ' + (err?.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async () => {
    if (!data) return;
    setGenerating(true); setError('');
    try {
      const res = await fetch('/api/ai/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authH },
        body: JSON.stringify({ breakdown: data, periodLabel, allBranches: !branch, startLabel: fmt(s0) }),
      });
      const d = await res.json();
      if (res.ok) setSummary(d.summary);
      else setError(d.error || 'การสร้างรายงานไม่สำเร็จ');
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setGenerating(false);
    }
  };

  const od = data ? { ...data.overdue.byBranch, _total: data.overdue.total } : undefined;

  return (
    <div className="max-w-5xl mx-auto space-y-5 fade-in">
      <div>
        <h2 className="text-2xl font-bold text-ink">AI รายงานวิเคราะห์</h2>
        <p className="text-gray-400 mt-1">แยกงานที่แจ้งในช่วงที่เลือก กับงานค้างยกมาจากวันก่อน · ครบทุกสถานะ · เลือกทุกสาขาจะแยกรายสาขาให้</p>
      </div>

      <div className="card p-3 flex flex-wrap items-end gap-2" data-t="ai-date">
        {[
          { label: 'วันนี้', s: today(), e: today() },
          { label: 'เมื่อวาน', s: shift(today(), -1), e: shift(today(), -1) },
          { label: '7 วัน', s: shift(today(), -6), e: today() },
          { label: '30 วัน', s: shift(today(), -29), e: today() },
          { label: 'เดือนนี้', s: today().slice(0, 8) + '01', e: today() },
        ].map(q => (
          <button key={q.label} onClick={() => { setStartDate(q.s); setEndDate(q.e); }}
            className={`px-3 py-2 rounded-lg border text-sm font-medium min-h-[40px] ${startDate === q.s && endDate === q.e ? 'bg-gold-500/20 border-gold-500 text-gold-400' : 'border-navy-600 text-gray-300 hover:text-ink'}`}>
            {q.label}
          </button>
        ))}
        <label className="flex flex-col text-xs text-gray-400">สาขา
          <select value={branch} onChange={e => setBranch(e.target.value)} className="select-field mt-1 py-1.5 text-sm" data-t="ai-branch">
            <option value="">ทุกสาขา (แยกรายสาขา)</option>
            {BRANCHES.map(b => <option key={b.branch_code} value={b.branch_code}>{b.branch_code} — {b.branch_name}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-xs text-gray-400">แผนก
          <select value={work} onChange={e => setWork(e.target.value)} className="select-field mt-1 py-1.5 text-sm" data-t="ai-work">
            <option value="">🏢 ช่าง + ไอที</option>
            <option value="MAINTENANCE">🔧 ช่าง</option>
            <option value="IT">💻 ไอที</option>
          </select>
        </label>
        <label className="flex flex-col text-xs text-gray-400">ตั้งแต่
          <input type="date" value={startDate} max={today()} onChange={e => e.target.value && setStartDate(e.target.value)} className="input-field mt-1 py-1.5 text-sm" data-t="ai-from" />
        </label>
        <label className="flex flex-col text-xs text-gray-400">ถึง
          <input type="date" value={endDate} max={today()} onChange={e => e.target.value && setEndDate(e.target.value)} className="input-field mt-1 py-1.5 text-sm" data-t="ai-to" />
        </label>
      </div>

      {loading ? (
        <div className="card flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-gold-500" /></div>
      ) : data ? (
        <>
          {/* 1) งานที่แจ้งในช่วงที่เลือก */}
          <div className="card" data-t="sec-period">
            <h3 className="text-lg font-semibold text-ink mb-1 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gold-500" /> 📅 งานที่แจ้งเข้ามา {periodLabel0}
            </h3>
            <p className="text-xs text-gray-500 mb-3">{scopeLabel} · สถานะ ณ ตอนนี้</p>
            <Table cols={COLS_PERIOD} data={data.period} branches={data.branches} showBranches={!branch} />
          </div>

          {/* 2) งานค้างยกมาจากวันก่อน */}
          <div className="card" data-t="sec-carried">
            <h3 className="text-lg font-semibold text-ink mb-1">📦 งานค้างยกมา (แจ้งก่อน {fmt(s0)} และยังไม่ปิด)</h3>
            <p className="text-xs text-gray-500 mb-3">“เกิน SLA” = งานที่ยังไม่ปิดและเลยเวลาแล้ว (ทั้งของช่วงนี้และค้างเก่า)</p>
            <Table cols={COLS_CARRIED} data={data.carried} branches={data.branches} showBranches={!branch} overdue={od} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 3) งานที่พักอยู่ */}
            <div className="card" data-t="sec-paused">
              <h3 className="font-semibold text-ink mb-2">⏸️ งานที่พักอยู่ ({data.paused.length})</h3>
              {data.paused.length === 0 ? <p className="text-gray-500 text-sm">ไม่มี</p> : (
                <ul className="space-y-1.5 text-sm max-h-72 overflow-y-auto">
                  {data.paused.map((t: any) => (
                    <li key={t.ticket_id}>
                      <Link href={`/dashboard/${t.ticket_id}`} className="text-gold-400 hover:underline font-mono">{t.ticket_number}</Link>
                      <span className="text-gray-300"> · {t.branch_code} · {t.location_detail}</span>
                      <p className="text-xs text-orange-400">รอบที่ {t.rounds || 1} · {t.paused_reason} · ครบ {t.due ? fmt(t.due) : '-'}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {/* 4) ใบที่ถูกยกเลิกในช่วงนี้ */}
            <div className="card" data-t="sec-cancelled">
              <h3 className="font-semibold text-ink mb-2">❌ ใบงานที่ถูกยกเลิกในช่วงนี้ ({data.cancelled.length})</h3>
              {data.cancelled.length === 0 ? <p className="text-gray-500 text-sm">ไม่มี</p> : (
                <ul className="space-y-1.5 text-sm max-h-72 overflow-y-auto">
                  {data.cancelled.map((t: any) => (
                    <li key={t.ticket_id}>
                      <Link href={`/dashboard/${t.ticket_id}`} className="text-gold-400 hover:underline font-mono">{t.ticket_number}</Link>
                      <span className="text-gray-300"> · {t.branch_code} · {t.location_detail}</span>
                      <p className="text-xs text-gray-400">{t.reason || 'ไม่ระบุเหตุผล'}{t.by_name ? ` — ${t.by_name}` : ''}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <button onClick={generateSummary} disabled={generating} className="btn-primary flex items-center gap-2" data-t="ai-generate">
            {generating ? <><Loader2 className="w-5 h-5 animate-spin" /> กำลังสร้างรายงาน...</> : <><Sparkles className="w-5 h-5" /> สร้างรายงานด้วย AI</>}
          </button>

          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          {summary && (
            <div className="card border-gold-500/30 fade-in">
              <h3 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-gold-500" /> AI รายงานสรุป · {periodLabel}
              </h3>
              <div className="text-gray-300 whitespace-pre-wrap leading-relaxed" data-t="ai-summary">
                {/* แสดง **ตัวหนา** ของ AI เป็นตัวหนาจริง (ไม่โชว์ดอกจัน) */}
                {summary.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
                  part.startsWith('**') && part.endsWith('**')
                    ? <strong key={i} className="text-ink">{part.slice(2, -2)}</strong>
                    : <span key={i}>{part}</span>)}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="card text-center py-12">
          <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500">{error || 'ไม่มีข้อมูลรายงาน'}</p>
        </div>
      )}
    </div>
  );
}
