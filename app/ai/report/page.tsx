'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../components/authprovider';
import { DailyReport, BRANCHES } from '../../../types';
import { FileText, Sparkles, Loader2, AlertCircle } from 'lucide-react';

export default function AIReportPage() {
  const { user, token } = useAuth();
  const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
  const shift = (d: string, n: number) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  const [branch, setBranch] = useState('');
  const [work, setWork] = useState('');   // '' ทั้งหมด · MAINTENANCE ช่าง · IT ไอที
  const scopeLabel = [branch ? `สาขา ${branch}` : 'ทุกสาขา', work === 'IT' ? 'งานไอที' : work === 'MAINTENANCE' ? 'งานช่าง' : 'ช่าง+ไอที'].join(' · ');
  const periodLabel0 = startDate === endDate ? `วันที่ ${fmt(startDate)}` : `${fmt(startDate)} – ${fmt(endDate)}`;
  const periodLabel = `${periodLabel0} (${scopeLabel})`;
  const authH: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  const [summary, setSummary] = useState('');
  const [report, setReport] = useState<DailyReport | null>(null);
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
      const s = startDate <= endDate ? startDate : endDate, e = startDate <= endDate ? endDate : startDate;
      const q = new URLSearchParams({ start_date: s, end_date: e });
      if (branch) q.set('branch', branch);
      if (work) q.set('work_type', work);
      const res = await fetch(`/api/reports/daily?${q}`, { headers: authH });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReport(data);
    } catch (err) {
      setError('ไม่สามารถโหลดข้อมูลรายงานได้');
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async () => {
    if (!report) return;
    setGenerating(true);
    setError('');

    try {
      const res = await fetch('/api/ai/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authH },
        body: JSON.stringify({ ...report, periodLabel }),
      });
      const data = await res.json();
      if (res.ok) {
        setSummary(data.summary);
      } else {
        setError('การสร้างรายงานไม่สำเร็จ');
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 fade-in">
      <div>
        <h2 className="text-2xl font-bold text-ink">AI รายงานวิเคราะห์</h2>
        <p className="text-gray-400 mt-1">สร้างรายงานสรุปด้วย AI จากข้อมูลการแจ้งซ่อม — เลือกวันหรือช่วงวันที่ได้</p>
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
            <option value="">ทุกสาขา</option>
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
        <div className="card">
          <div className="skeleton h-6 w-48 mb-4" />
          <div className="skeleton h-4 w-full mb-2" />
          <div className="skeleton h-4 w-3/4 mb-2" />
          <div className="skeleton h-4 w-5/6" />
        </div>
      ) : report ? (
        <>
          <div className="card">
            <h3 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gold-500" />
              ข้อมูล {periodLabel}
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">จำนวนงานทั้งหมด</p>
                <p className="text-2xl font-bold text-ink">{report.total}</p>
              </div>
              <div>
                <p className="text-gray-500">เสร็จสิ้น</p>
                <p className="text-2xl font-bold text-green-400">{report.completed}</p>
              </div>
              <div>
                <p className="text-gray-500">รอดำเนินการ</p>
                <p className="text-2xl font-bold text-yellow-400">{report.pending}</p>
              </div>
              <div>
                <p className="text-gray-500">กำลังดำเนินการ</p>
                <p className="text-2xl font-bold text-purple-400">{report.inProgress}</p>
              </div>
            </div>

            <button
              onClick={generateSummary}
              disabled={generating}
              className="btn-primary mt-6 flex items-center gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  กำลังสร้างรายงาน...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  สร้างรายงานด้วย AI
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {summary && (
            <div className="card border-gold-500/30 fade-in">
              <h3 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-gold-500" />
                AI รายงานสรุป
              </h3>
              <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                {summary}
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
