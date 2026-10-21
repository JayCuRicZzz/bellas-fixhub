'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../components/authprovider';
import { useI18n } from '../../../lib/i18n/i18n';
import RoomHistory from '../../../components/roomhistory';
import { DEPARTMENTS, BRANCHES, DailyReport } from '../../../types';
import {
  BarChart3, Calendar, TrendingUp, Printer, Loader2, AlertTriangle,
  Clock, CheckCircle2, XCircle, Wrench, Star, Building2, Users
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-500',
  ACCEPTED: 'bg-blue-500',
  IN_PROGRESS: 'bg-purple-500',
  RESOLVED: 'bg-green-500',
  APPROVED: 'bg-emerald-500',
  CANCELLED: 'bg-gray-500',
};

export default function ReportsPage() {
  const { user, token } = useAuth();
  const { t, lang } = useI18n();
  const [data, setData] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [deptFilter, setDeptFilter] = useState('');
  const [workTypeFilter, setWorkTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [techData, setTechData] = useState<any[]>([]);
  const [branchFilter, setBranchFilter] = useState('');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');                       // ค่าที่ส่งค้นหาจริง (หน่วง 400ms)
  const [showAll, setShowAll] = useState(false);
  // รูปรายงานรายสาขา
  const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
  const [imgBranch, setImgBranch] = useState('');
  const [imgDept, setImgDept] = useState<'MAINT' | 'IT' | 'ALL'>(user?.role === 'supit' ? 'IT' : 'MAINT');
  const [imgDate, setImgDate] = useState(todayKey);
  const [imgUrl, setImgUrl] = useState('');
  const [imgLoading, setImgLoading] = useState(false);
  useEffect(() => { const h = setTimeout(() => setQ(search.trim()), 400); return () => clearTimeout(h); }, [search]);

  useEffect(() => {
    fetchData();
    fetchTechPerformance();
  }, [period, startDate, endDate, deptFilter, workTypeFilter, branchFilter, q]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (period === 'custom' && startDate && endDate) {
        params.set('start_date', startDate);
        params.set('end_date', endDate);
      } else {
        params.set('period', period);
      }
      if (deptFilter) params.set('department', deptFilter);
      if (workTypeFilter) params.set('work_type', workTypeFilter);
      if (branchFilter) params.set('branch', branchFilter);
      if (q) params.set('q', q);

      const res = await fetch(`/api/reports/daily?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTechPerformance = async () => {
    try {
      const params = new URLSearchParams();
      if (period === 'custom' && startDate && endDate) {
        params.set('start_date', startDate);
        params.set('end_date', endDate);
      } else {
        params.set('period', period);
      }
      if (deptFilter) params.set('department', deptFilter);
      if (workTypeFilter) params.set('work_type', workTypeFilter);
      if (branchFilter) params.set('branch', branchFilter);
      if (q) params.set('q', q);

      const res = await fetch(`/api/reports/tech-performance?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setTechData(await res.json());
    } catch (err) {
      console.error('Failed to fetch tech performance:', err);
    }
  };

  const getDepartmentName = (code: string) => {
    const dept = DEPARTMENTS.find(d => d.code === code);
    return dept ? (lang === 'th' ? dept.name_th : dept.name_en) : code;
  };

  const getDepartmentIcon = (code: string) => {
    const dept = DEPARTMENTS.find(d => d.code === code);
    return dept ? dept.icon : '📋';
  };

  const getBranchName = (code: string) => {
    const branch = BRANCHES.find(b => b.branch_code === code);
    return branch ? (lang === 'th' ? branch.branch_name : branch.branch_name_en) : code;
  };

  const statusLabels: Record<string, string> = {
    PENDING: lang === 'th' ? 'รอดำเนินการ' : 'Pending',
    ACCEPTED: lang === 'th' ? 'รับงานแล้ว' : 'Accepted',
    IN_PROGRESS: lang === 'th' ? 'กำลังดำเนินการ' : 'In Progress',
    RESOLVED: lang === 'th' ? 'เสร็จสิ้น' : 'Resolved',
    APPROVED: lang === 'th' ? 'อนุมัติแล้ว' : 'Approved',
    CANCELLED: lang === 'th' ? 'ยกเลิก' : 'Cancelled',
    PAUSED: lang === 'th' ? 'พักงาน' : 'Paused',
    REJECTED: lang === 'th' ? 'ถูกตีกลับ' : 'Rejected',
    FLAGGED: lang === 'th' ? 'งานไม่เรียบร้อย' : 'Flagged',
  };

  const statusIcons: Record<string, React.ReactNode> = {
    PENDING: <Clock className="w-4 h-4" />,
    ACCEPTED: <CheckCircle2 className="w-4 h-4" />,
    IN_PROGRESS: <Wrench className="w-4 h-4" />,
    RESOLVED: <CheckCircle2 className="w-4 h-4" />,
    APPROVED: <Star className="w-4 h-4" />,
    CANCELLED: <XCircle className="w-4 h-4" />,
  };


  const slaCompliance = data?.slaCompliance;
  const slaTotal = slaCompliance?.total || 0;
  const slaOnTime = slaCompliance?.on_time || 0;
  const slaOverdue = slaCompliance?.overdue || 0;
  const slaPercent = slaTotal > 0 ? Math.round((slaOnTime / slaTotal) * 100) : 0;

  // Max count for bar chart normalization
  const maxByStatus = data?.byStatus?.length
    ? Math.max(...data.byStatus.map(s => s.count), 1)
    : 1;

  const periodOptions = [
    { value: 'today' as const, label: lang === 'th' ? 'วันนี้' : 'Today' },
    { value: 'week' as const, label: lang === 'th' ? 'สัปดาห์นี้' : 'This Week' },
    { value: 'month' as const, label: lang === 'th' ? 'เดือนนี้' : 'This Month' },
    { value: 'custom' as const, label: lang === 'th' ? 'กำหนดเอง' : 'Custom' },
  ];

  if (loading && !data) {
    return (
      <div className="space-y-6 fade-in">
        <div className="skeleton h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="card"><div className="skeleton h-16" /></div>)}
        </div>
        <div className="card"><div className="skeleton h-64" /></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card text-center py-12">
        <AlertTriangle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400 text-lg">{t.reports.noData}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-gold-500" />
            {t.reports.title}
          </h2>
          <p className="text-gray-400 mt-1">
            {lang === 'th' ? 'รายงานสรุปและสถิติงานซ่อมบำรุง' : 'Maintenance repair summary and statistics'}
          </p>
        </div>

        {/* Period selector + Print */}
        <div className="flex flex-wrap items-center gap-2 no-print">
          <div className="flex rounded-lg overflow-hidden border border-navy-600">
            {periodOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                  period === opt.value
                    ? 'bg-gold-500 text-navy-900'
                    : 'bg-navy-800 text-gray-400 hover:bg-navy-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => window.print()}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            {lang === 'th' ? 'พิมพ์รายงาน' : 'Print Report'}
          </button>
        </div>
      </div>

      {/* ตัวกรอง: งานช่าง/ไอที · สาขา · ค้นหา */}
      <div className="card p-3 sm:p-4 flex flex-col lg:flex-row lg:items-center gap-3 no-print" data-t="report-filters">
        <div className="flex gap-2 flex-wrap">
          {[
            { value: '', label: 'ทั้งหมด', labelEn: 'All', icon: '🏢' },
            { value: 'MAINTENANCE', label: 'งานช่าง', labelEn: 'Maintenance', icon: '🔧' },
            { value: 'IT', label: 'งานไอที', labelEn: 'IT', icon: '💻' },
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => setWorkTypeFilter(tab.value)}
              className={`px-3 py-1.5 rounded-xl border text-sm font-medium transition-all flex items-center gap-1.5 ${
                workTypeFilter === tab.value
                  ? 'bg-gold-500/20 border-gold-500 text-gold-400 shadow-lg'
                  : 'border-navy-600 text-gray-400 hover:border-gray-400 hover:text-ink'
              }`}
            >
              <span>{tab.icon}</span>
              {lang === 'th' ? tab.label : tab.labelEn}
              {tab.value === workTypeFilter && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-navy-900/80 text-xs font-bold text-gold-500">{data?.total ?? 0}</span>
              )}
            </button>
          ))}
        </div>
        <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className="select-field lg:w-64" aria-label="สาขา" data-t="report-branch">
          <option value="">🏨 {lang === 'th' ? 'ทุกสาขา' : 'All branches'}</option>
          {BRANCHES.filter(b => !user?.branches?.length || user.branches.includes(b.branch_code)).map(b => (
            <option key={b.branch_code} value={b.branch_code}>{b.branch_code} · {lang === 'th' ? b.branch_name : b.branch_name_en}</option>
          ))}
        </select>
        <input value={search} onChange={e => setSearch(e.target.value)} className="input-field lg:flex-1" data-t="report-search"
          placeholder={lang === 'th' ? '🔍 ค้นหา เลขใบงาน · ห้อง · อาการ · ช่าง · ผู้แจ้ง' : '🔍 Search ticket no. · room · problem · technician · reporter'} />
      </div>

      {/* Custom date range */}
      {period === 'custom' && (
        <div className="card flex flex-wrap items-end gap-3 no-print">
          <div>
            <label className="block text-xs text-gray-500 mb-1">{lang === 'th' ? 'วันที่เริ่ม' : 'Start Date'}</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="input-field py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{lang === 'th' ? 'วันที่สิ้นสุด' : 'End Date'}</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="input-field py-2 text-sm" />
          </div>
        </div>
      )}

      {/* รายการใบงาน (ผลค้นหา) */}
      <div className="card" data-t="report-tickets">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-ink">📋 {lang === 'th' ? 'รายการใบงาน' : 'Tickets'} <span className="text-gold-500">({data.tickets?.length ?? 0}{(data.tickets?.length ?? 0) >= 200 ? '+' : ''})</span></h3>
          {q && <span className="text-xs text-gray-400">{lang === 'th' ? 'ค้นหา' : 'Search'}: “{q}”</span>}
        </div>
        {!data.tickets?.length ? (
          <p className="text-sm text-gray-500">{lang === 'th' ? 'ไม่พบใบงานตามเงื่อนไข' : 'No tickets match'}</p>
        ) : (
          <div className="divide-y divide-navy-700">
            {(showAll ? data.tickets! : data.tickets!.slice(0, 10)).map((tk: any) => (
              <a key={tk.ticket_id} href={`/dashboard/${tk.ticket_id}`} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 py-2.5 hover:bg-navy-800/50 rounded px-2">
                <span className="font-mono text-xs text-gold-400 sm:w-44 shrink-0">{tk.ticket_number}</span>
                <span className="text-sm text-ink flex-1 min-w-0 truncate">{tk.location_detail} · {tk.description}</span>
                <span className="text-xs text-gray-400 shrink-0">{tk.technician_name || '—'}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${tk.sla_overdue ? 'bg-red-500/15 text-red-400' : 'bg-navy-700 text-gray-300'}`}>{statusLabels[tk.status] || tk.status}</span>
                <span className="text-xs text-gray-500 shrink-0 sm:w-28 sm:text-right">{new Date(tk.created_at).toLocaleString(lang === 'th' ? 'th-TH' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </a>
            ))}
          </div>
        )}
        {(data.tickets?.length ?? 0) > 10 && (
          <button onClick={() => setShowAll(v => !v)} className="btn-secondary text-sm mt-3">
            {showAll ? (lang === 'th' ? 'ย่อ' : 'Show less') : (lang === 'th' ? `แสดงทั้งหมด ${(data.tickets?.length ?? 0)} ใบ` : `Show all ${(data.tickets?.length ?? 0)}`)}
          </button>
        )}
      </div>

      {/* รูปรายงานประจำวัน — เลือกสาขา/วัน (แบบเดียวกับที่ส่ง LINE 22:00) */}
      {['admin', 'gm', 'sup', 'supit'].includes(user?.role || '') && (
        <div className="card space-y-3 no-print" data-t="report-image">
          <h3 className="text-lg font-semibold text-ink">🖼️ {lang === 'th' ? 'รูปรายงานประจำวัน' : 'Daily report image'}</h3>
          <p className="text-sm text-gray-400">{lang === 'th'
            ? 'เลือกสาขา → ได้งานทุกใบของวันนั้นพร้อมรายละเอียด ยอดแจ้ง/เสร็จ และค้างรวม · ถ้าเลือก “ทุกสาขา” จะได้รูปสรุปแบบที่ส่ง 22:00'
            : 'Pick a branch to get every ticket of that day, totals and open jobs · “All branches” gives the 22:00 summary'}</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <select value={imgBranch} onChange={e => setImgBranch(e.target.value)} className="select-field sm:w-64" data-t="img-branch">
              <option value="">🏨 {lang === 'th' ? 'ทุกสาขา (สรุป 24 ชม.)' : 'All branches (24h summary)'}</option>
              {BRANCHES.filter(b => !user?.branches?.length || user.branches.includes(b.branch_code)).map(b => (
                <option key={b.branch_code} value={b.branch_code}>{b.branch_code} · {lang === 'th' ? b.branch_name : b.branch_name_en}</option>
              ))}
            </select>
            {['admin', 'gm'].includes(user?.role || '') && (
              <select value={imgDept} onChange={e => setImgDept(e.target.value as any)} className="select-field sm:w-44" data-t="img-dept">
                <option value="MAINT">🔧 {lang === 'th' ? 'งานช่าง' : 'Maintenance'}</option>
                <option value="IT">💻 {lang === 'th' ? 'งานไอที' : 'IT'}</option>
                {imgBranch && <option value="ALL">🏢 {lang === 'th' ? 'ช่าง + ไอที' : 'Both'}</option>}
              </select>
            )}
            {imgBranch && (
              <input type="date" value={imgDate} max={todayKey} onChange={e => setImgDate(e.target.value || todayKey)} className="input-field sm:w-44" data-t="img-date" />
            )}
            <button className="btn-primary text-sm" data-t="img-make" onClick={() => {
              const dept = imgDept === 'ALL' && !imgBranch ? 'MAINT' : imgDept;
              const p = new URLSearchParams({ dept });
              if (imgBranch) { p.set('branch', imgBranch); p.set('date', imgDate); }
              p.set('t', String(Date.now()));
              setImgLoading(true); setImgUrl(`/api/reports/daily-image?${p.toString()}`);
            }}>{imgLoading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : '🖼️'} {lang === 'th' ? 'สร้างรูป' : 'Make image'}</button>
          </div>
          {imgUrl && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <a href={imgUrl} target="_blank" rel="noopener" className="btn-secondary text-sm">{lang === 'th' ? 'เปิดรูปเต็ม' : 'Open full size'}</a>
                <a href={imgUrl} download={`fixhub-${imgBranch || 'all'}-${imgBranch ? imgDate : todayKey}.png`} className="btn-secondary text-sm">{lang === 'th' ? 'ดาวน์โหลด' : 'Download'}</a>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgUrl} alt="daily report" className="w-full max-w-2xl rounded-lg border border-navy-600"
                onLoad={() => setImgLoading(false)} onError={() => { setImgLoading(false); alert(lang === 'th' ? 'สร้างรูปไม่สำเร็จ' : 'Could not create the image'); }} />
            </div>
          )}
        </div>
      )}

      {/* ประวัติซ่อมตามเบอร์ห้อง */}
      <RoomHistory token={token} branches={user?.branches} />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4">
        {[
          { label: t.dashboard.total, value: data.total, icon: BarChart3, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: t.dashboard.pending, value: data.pending, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: t.dashboard.inProgress, value: data.inProgress, icon: Wrench, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: t.dashboard.completed, value: data.completed, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10' },
          { label: lang === 'th' ? 'SLA ทันเวลา' : 'SLA On Time', value: `${slaPercent}%`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="card card-hover cursor-default">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-xs truncate">{card.label}</p>
                  <p className="text-xl sm:text-2xl font-bold text-ink mt-1">{card.value}</p>
                </div>
                <div className={`p-2 rounded-xl ${card.bg}`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Status Distribution */}
      <div className="card">
        <h3 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-gold-500" />
          {lang === 'th' ? 'การกระจายตามสถานะ' : 'Status Distribution'}
        </h3>
        {data.byStatus && data.byStatus.length > 0 ? (
          <div className="space-y-3">
            {data.byStatus.map((s: any) => {
              const pct = data.total > 0 ? Math.round((s.count / data.total) * 100) : 0;
              return (
                <div key={s.name} className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 w-32 flex-shrink-0">
                    <span className="text-gray-400">{statusIcons[s.name]}</span>
                    <span className="text-sm text-gray-300">{statusLabels[s.name] || s.name}</span>
                  </div>
                  <div className="flex-1">
                    <div className="h-5 bg-navy-700 rounded-full overflow-hidden shadow-inner">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${STATUS_COLORS[s.name] || 'bg-gray-500'} flex items-center justify-end pr-2`}
                        style={{ width: `${Math.max((s.count / maxByStatus) * 100, 2)}%` }}
                      >
                        <span className="text-xs font-bold text-ink drop-shadow-sm">{s.count}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 w-10 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">{t.reports.noData}</p>
        )}
      </div>

      {/* Two-column layout for tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Department Breakdown */}
        <div className="card">
          <h3 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-gold-500" />
            {lang === 'th' ? 'รายละเอียดตามแผนก' : 'Department Breakdown'}
          </h3>
          {data.byDepartment && data.byDepartment.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-700">
                    <th className="text-left py-2 text-gray-500 font-medium">{lang === 'th' ? 'แผนก' : 'Department'}</th>
                    <th className="text-right py-2 text-gray-500 font-medium">{lang === 'th' ? 'จำนวน' : 'Count'}</th>
                    <th className="text-right py-2 text-gray-500 font-medium">%</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byDepartment.map((d: any) => {
                    const pct = data.total > 0 ? Math.round((d.count / data.total) * 100) : 0;
                    return (
                      <tr key={d.name} className="border-b border-navy-700/50">
                        <td className="py-2.5 text-gray-300">
                          <span className="mr-1.5">{getDepartmentIcon(d.name)}</span>
                          {getDepartmentName(d.name)}
                        </td>
                        <td className="py-2.5 text-right text-ink font-medium">{d.count}</td>
                        <td className="py-2.5 text-right text-gray-500">{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">{t.reports.noData}</p>
          )}
        </div>

        {/* Branch Breakdown */}
        <div className="card">
          <h3 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gold-500" />
            {lang === 'th' ? 'รายละเอียดตามสาขา' : 'Branch Breakdown'}
          </h3>
          {data.byBranch && data.byBranch.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-700">
                    <th className="text-left py-2 text-gray-500 font-medium">{lang === 'th' ? 'สาขา' : 'Branch'}</th>
                    <th className="text-right py-2 text-gray-500 font-medium">{lang === 'th' ? 'จำนวน' : 'Count'}</th>
                    <th className="text-right py-2 text-gray-500 font-medium">%</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byBranch.map((d: any) => {
                    const pct = data.total > 0 ? Math.round((d.count / data.total) * 100) : 0;
                    return (
                      <tr key={d.name} className="border-b border-navy-700/50">
                        <td className="py-2.5 text-gray-300">🏨 {getBranchName(d.name)}</td>
                        <td className="py-2.5 text-right text-ink font-medium">{d.count}</td>
                        <td className="py-2.5 text-right text-gray-500">{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">{t.reports.noData}</p>
          )}
        </div>
      </div>

      {/* SLA Performance */}
      {slaCompliance && slaTotal > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gold-500" />
            {lang === 'th' ? 'ประสิทธิภาพ SLA' : 'SLA Performance'}
          </h3>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Circular progress */}
            <div className="relative w-32 h-32 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8"
                  className="text-navy-700" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8"
                  strokeLinecap="round"
                  className={slaPercent >= 80 ? 'text-emerald-500' : slaPercent >= 50 ? 'text-amber-500' : 'text-red-500'}
                  strokeDasharray={`${slaPercent * 2.64} 264`}
                  style={{ transition: 'stroke-dasharray 0.8s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-ink">{slaPercent}%</span>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                  {lang === 'th' ? 'ทันเวลา' : 'On Time'}
                </span>
                <span className="text-sm font-medium text-emerald-400">{slaOnTime}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                  {lang === 'th' ? 'เกินกำหนด' : 'Overdue'}
                </span>
                <span className="text-sm font-medium text-red-400">{slaOverdue}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-navy-700">
                <span className="text-sm text-gray-400 font-medium">{lang === 'th' ? 'รวม SLA' : 'Total SLA'}</span>
                <span className="text-sm font-bold text-ink">{slaTotal}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Technician Performance */}
      {techData.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-gold-500" />
            {lang === 'th' ? 'ผลงานช่างรายบุคคล' : 'Technician Performance'}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-700">
                  <th className="text-left py-2 text-gray-500 font-medium">{lang === 'th' ? 'ชื่อช่าง' : 'Technician'}</th>
                  <th className="text-center py-2 text-gray-500 font-medium">{lang === 'th' ? 'รับงาน' : 'Accepted'}</th>
                  <th className="text-center py-2 text-gray-500 font-medium">{lang === 'th' ? 'ปิดงาน' : 'Closed'}</th>
                  <th className="text-center py-2 text-gray-500 font-medium">SLA</th>
                  <th className="text-center py-2 text-gray-500 font-medium">{lang === 'th' ? 'ค้าง' : 'Backlog'}</th>
                  <th className="text-center py-2 text-gray-500 font-medium">⭐</th>
                </tr>
              </thead>
              <tbody>
                {techData.map((tech: any) => (
                  <tr key={tech.user_id} className="border-b border-navy-700/50 hover:bg-navy-800/30 transition-colors">
                    <td className="py-2.5 text-ink font-medium">
                      <span className="mr-2">👤</span>{tech.full_name}
                      <span className="text-xs text-gray-500 ml-2">({lang === 'th' ? (tech.department === 'IT' ? 'ไอที' : 'ช่าง') : tech.department})</span>
                    </td>
                    <td className="py-2.5 text-center text-blue-400 font-medium">{tech.accepted || 0}</td>
                    <td className="py-2.5 text-center text-green-400 font-medium">{tech.completed || 0}</td>
                    <td className={`py-2.5 text-center font-medium ${tech.sla_percent >= 80 ? 'text-green-400' : tech.sla_percent >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                      {tech.sla_percent != null ? `${tech.sla_percent}%` : '-'}
                    </td>
                    <td className="py-2.5 text-center text-orange-400 font-medium">{tech.backlog || 0}</td>
                    <td className="py-2.5 text-center text-gold-400 font-medium">
                      {tech.avg_rating ? `${tech.avg_rating}/5` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Print-only footer */}
      <div className="hidden print:block text-center text-xs text-gray-500 mt-8 pt-4 border-t">
        <p>Generated by Hotel Fix Desk · {new Date().toLocaleString(lang === 'th' ? 'th-TH' : 'en-US')}</p>
      </div>
    </div>
  );
}
