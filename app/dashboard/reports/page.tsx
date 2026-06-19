'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/authprovider';
import { useI18n } from '@/lib/i18n/i18n';
import { DEPARTMENTS, BRANCHES, DailyReport } from '@/types';
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

  useEffect(() => {
    fetchData();
  }, [period, startDate, endDate, deptFilter, workTypeFilter]);

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

  if (loading) {
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
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
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

      {/* Department Tabs — กรองตามแผนกผู้แจ้ง */}
      <div className="flex gap-2 flex-wrap no-print">
        {[
          { value: '', label: 'ทั้งหมด', labelEn: 'All', icon: '🏢' },
          ...DEPARTMENTS.map(dept => ({
            value: dept.code,
            label: (lang === 'th' ? dept.name_th : dept.name_en),
            labelEn: dept.name_en,
            icon: dept.icon,
          })),
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setDeptFilter(tab.value)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all flex items-center gap-1.5 ${
              deptFilter === tab.value
                ? 'bg-gold-500/20 border-gold-500 text-gold-400 shadow-lg'
                : 'border-navy-600 text-gray-400 hover:border-gray-400 hover:text-white'
            }`}
          >
            <span className="text-base">{tab.icon}</span>
            {lang === 'th' ? tab.label : tab.labelEn}
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-navy-900/80 text-xs font-bold text-gold-500">
              {data ? (tab.value === '' ? data.total : data.byDepartment?.find((d: any) => d.name === tab.value)?.count || 0) : 0}
            </span>
          </button>
        ))}
      </div>

      {/* Work Type Tabs — ช่าง / ไอที */}
      <div className="flex gap-2 no-print">
        {[
          { value: '', label: 'ทุกประเภท', labelEn: 'All Types', icon: '🏗️' },
          { value: 'MAINTENANCE', label: 'งานช่าง', labelEn: 'Maintenance', icon: '🔧' },
          { value: 'IT', label: 'งานไอที', labelEn: 'IT', icon: '💻' },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setWorkTypeFilter(tab.value)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5 ${
              workTypeFilter === tab.value
                ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-lg'
                : 'border-navy-600 text-gray-500 hover:border-gray-500 hover:text-gray-400'
            }`}
          >
            <span className="text-sm">{tab.icon}</span>
            {lang === 'th' ? tab.label : tab.labelEn}
          </button>
        ))}
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
                  <p className="text-xl sm:text-2xl font-bold text-white mt-1">{card.value}</p>
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
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
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
                        <span className="text-xs font-bold text-white drop-shadow-sm">{s.count}</span>
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
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
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
                        <td className="py-2.5 text-right text-white font-medium">{d.count}</td>
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
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
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
                        <td className="py-2.5 text-right text-white font-medium">{d.count}</td>
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
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
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
                <span className="text-2xl font-bold text-white">{slaPercent}%</span>
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
                <span className="text-sm font-bold text-white">{slaTotal}</span>
              </div>
            </div>
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
