'use client';
import { useX } from '../../lib/i18n/extra';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../components/authprovider';
import { useI18n } from '../../lib/i18n/i18n';
import FilterBar from '../../components/filterbar';
import TicketCard from '../../components/ticketcard';
import { Ticket } from '../../types';
import { LayoutDashboard, Clock, Wrench, CheckCircle2, AlertTriangle, PlusCircle, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import PushToggle from '../../components/pushtoggle';

// แผนกงานที่ผู้ใช้ดูแล (ตรงกับ getWorkDeptScope ฝั่งเซิร์ฟเวอร์) — ช่างเห็นแค่งานช่าง ไอทีเห็นแค่งานไอที
function workScope(u: any): 'MAINTENANCE' | 'IT' | '' {
  if (!u || ['admin', 'gm'].includes(u.role)) return '';
  if (u.department === 'MAINT' || u.department === 'MAINTENANCE') return 'MAINTENANCE';
  if (u.department === 'IT') return 'IT';
  if (['it', 'supit'].includes(u.role)) return 'IT';
  if (['tech', 'sup', 'front', 'house'].includes(u.role)) return 'MAINTENANCE';
  return '';
}
const todayBkk = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

export default function DashboardPage() {
  const { user, token } = useAuth();
  const { t } = useI18n();
  const x = useX();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, completed: 0 });
  const [todayStats, setTodayStats] = useState({ total: 0, pending: 0, inProgress: 0, completed: 0 });
  const [deptStats, setDeptStats] = useState<{ name: string; count: number }[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const scope = workScope(user);
  const [deptFilter, setDeptFilter] = useState<string>(scope);
  useEffect(() => { setDeptFilter(scope); }, [scope]);
  // ช่วงวันที่ ('' = ทุกวัน)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const today = todayBkk();
  const isToday = startDate === today && endDate === today;
  const dateParams = (p: URLSearchParams) => {
    if (startDate || endDate) {
      p.set('start_date', startDate || endDate);
      p.set('end_date', endDate || startDate);
    }
  };

  // Active stat card
  const [activeCard, setActiveCard] = useState<'total' | 'pending' | 'inProgress' | 'completed' | null>(null);

  const fetchTickets = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (branchFilter) params.set('branch', branchFilter);
      if (deptFilter) params.set('department', deptFilter);
      dateParams(params);

      const res = await fetch(`/api/tickets?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, statusFilter, branchFilter, deptFilter, startDate, endDate]);

  const fetchStats = useCallback(async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const base = () => {
        const p = new URLSearchParams();
        if (branchFilter) p.set('branch', branchFilter);
        return p;
      };
      // การ์ดตัวเลข: ตามแผนก + ช่วงวันที่ที่เลือก (ไม่เลือก = ทั้งหมด)
      const pMain = base();
      if (deptFilter) pMain.set('department', deptFilter);
      if (startDate || endDate) dateParams(pMain); else pMain.set('period', 'all');
      // ตัวเลขบนแท็บ ช่าง/ไอที: ช่วงวันที่เดียวกันแต่ไม่กรองแผนก
      const pTabs = base();
      if (startDate || endDate) dateParams(pTabs); else pTabs.set('period', 'all');
      const pToday = base();
      if (deptFilter) pToday.set('department', deptFilter);
      pToday.set('period', 'today');

      const [all, tabs, td] = await Promise.all([pMain, pTabs, pToday].map(p =>
        fetch(`/api/reports/daily?${p.toString()}`, { headers }).then(r => r.json()).catch(() => ({}))));
      setStats({ total: all.total || 0, pending: all.pending || 0, inProgress: all.inProgress || 0, completed: all.completed || 0 });
      setDeptStats(Array.isArray(tabs.byDepartment) ? tabs.byDepartment : []);
      setTodayStats({ total: td.total || 0, pending: td.pending || 0, inProgress: td.inProgress || 0, completed: td.completed || 0 });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, branchFilter, deptFilter, startDate, endDate]);

  useEffect(() => {
    fetchTickets();
    fetchStats();
  }, [fetchTickets, fetchStats]);

  // Handle stat card click → set filter
  const handleCardClick = (cardType: 'total' | 'pending' | 'inProgress' | 'completed') => {
    setActiveCard(cardType);
    switch (cardType) {
      case 'total':
        setStatusFilter('');
        setBranchFilter('');
        setDeptFilter(scope);
        break;
      case 'pending':
        setStatusFilter('PENDING');
        break;
      case 'inProgress':
        setStatusFilter('IN_PROGRESS');
        break;
      case 'completed':
        setStatusFilter('APPROVED');
        break;
    }
  };

  // Client-side search filter
  const filteredTickets = Array.isArray(tickets) ? tickets.filter(t => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.ticket_number?.toLowerCase().includes(q) ||
      t.location_detail?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.branch_code?.toLowerCase().includes(q)
    );
  }) : [];

  const statCards = [
    { key: 'total' as const, label: t.dashboard.total, value: stats.total, icon: LayoutDashboard, color: 'text-blue-400', bg: 'bg-blue-500/10', activeBg: 'bg-blue-500/20', activeBorder: 'border-blue-500/50' },
    { key: 'pending' as const, label: t.dashboard.pending, value: stats.pending, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10', activeBg: 'bg-yellow-500/20', activeBorder: 'border-yellow-500/50' },
    { key: 'inProgress' as const, label: t.dashboard.inProgress, value: stats.inProgress, icon: Wrench, color: 'text-purple-400', bg: 'bg-purple-500/10', activeBg: 'bg-purple-500/20', activeBorder: 'border-purple-500/50' },
    { key: 'completed' as const, label: t.dashboard.completed, value: stats.completed, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10', activeBg: 'bg-green-500/20', activeBorder: 'border-green-500/50' },
  ];

  const userName = user?.full_name || user?.username || '';

  return (
    <div className="space-y-6 fade-in">
      {/* Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink">
            {x('welcome')}, <span className="text-gold-500">{userName}</span> 👋
          </h2>
          <p className="text-gray-400 mt-1">{x('dashSub')}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/create" className="btn-primary text-sm inline-flex items-center gap-2 shadow-lg shadow-gold-500/20">
            <PlusCircle className="w-4 h-4" />
            {x('newTicket')}
          </Link>
          <Link href="/dashboard/reports" className="btn-secondary text-sm inline-flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            {x('viewReports')}
          </Link>
        </div>
      </div>

      {/* แจ้งเตือนบนมือถือ — ทุกตำแหน่ง (ข้อความต่างกันตามหน้าที่) */}
      {user && <PushToggle token={token} role={user.role} />}

      {/* Stats Cards - Clickable */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {statCards.map(stat => {
          const Icon = stat.icon;
          const isActive = activeCard === stat.key;
          return (
            <button
              key={stat.key}
              onClick={() => handleCardClick(stat.key)}
              title={t.dashboard.filterByStatus}
              className={`card-hover text-left w-full cursor-pointer transition-all duration-200 ${
                isActive
                  ? `border-2 ${stat.activeBorder} ${stat.activeBg} ring-1 ring-${stat.key === 'total' ? 'blue' : stat.key === 'pending' ? 'yellow' : stat.key === 'inProgress' ? 'purple' : 'green'}-500/30`
                  : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-gray-500 text-xs sm:text-sm truncate">{stat.label}</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-xl sm:text-3xl font-bold text-ink mt-0.5 sm:mt-1">{stat.value}</p>
                  </div>
                  {todayStats[stat.key] !== undefined && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {x('today')}: <span className="text-gold-400 font-medium">{todayStats[stat.key]}</span>
                    </p>
                  )}
                </div>
                <div className={`p-2 sm:p-3 rounded-xl flex-shrink-0 ${isActive ? stat.activeBg : stat.bg}`}>
                  <Icon className={`w-4 h-4 sm:w-6 sm:h-6 ${stat.color}`} />
                </div>
              </div>
              {isActive && (
                <div className={`mt-1.5 text-xs font-medium ${stat.color}`}>
                  ● {t.dashboard.filterByStatus}
                </div>
              )}
            </button>
          );
        })}
      </div>


      {/* แผนกงาน — มีแค่ ช่าง / ไอที (แผนกอื่นไม่ได้รับงานซ่อม) · ช่างเห็นแค่งานช่าง ไอทีเห็นแค่งานไอที */}
      <div className="flex gap-2 flex-wrap" data-t="dept-tabs">
        {(scope
          ? [{ value: scope, label: scope === 'IT' ? x('dashIT') : x('dashMaint') }]
          : [
              { value: '', label: '🏢 ' + x('all') },
              { value: 'MAINTENANCE', label: x('dashMaint') },
              { value: 'IT', label: x('dashIT') },
            ]
        ).map(tab => {
          const count = tab.value
            ? (deptStats.find(d => d.name === tab.value)?.count || 0)
            : deptStats.reduce((n, d) => n + (d.name === 'MAINTENANCE' || d.name === 'IT' ? d.count : 0), 0);
          const active = deptFilter === tab.value;
          return (
            <button
              key={tab.value || 'all'}
              onClick={() => !scope && setDeptFilter(tab.value)}
              data-t={`dept-tab-${tab.value || 'ALL'}`}
              className={`px-3 sm:px-4 py-2 rounded-xl border text-sm font-medium transition-all flex items-center gap-1.5 ${
                active ? 'bg-gold-500/20 border-gold-500 text-gold-400 shadow-lg' : 'border-navy-600 text-gray-400 hover:border-gray-400 hover:text-ink'
              } ${scope ? 'cursor-default' : ''}`}
            >
              {tab.label}
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-navy-900/80 text-xs font-bold text-gold-500">{count}</span>
            </button>
          );
        })}
      </div>

      {/* วันที่: ใบงานวันนี้ / ทุกวัน / เลือกช่วง ตั้งแต่–ถึง */}
      <div className="card p-3 flex flex-wrap items-end gap-2" data-t="date-filter">
        <button onClick={() => { setStartDate(today); setEndDate(today); }} data-t="date-today"
          className={`px-3 py-2 rounded-lg border text-sm font-medium min-h-[40px] ${isToday ? 'bg-gold-500/20 border-gold-500 text-gold-400' : 'border-navy-600 text-gray-300 hover:text-ink'}`}>
          {x('dashToday')}
        </button>
        <button onClick={() => { setStartDate(''); setEndDate(''); }} data-t="date-all"
          className={`px-3 py-2 rounded-lg border text-sm font-medium min-h-[40px] ${!startDate && !endDate ? 'bg-gold-500/20 border-gold-500 text-gold-400' : 'border-navy-600 text-gray-300 hover:text-ink'}`}>
          {x('dashAllDates')}
        </button>
        <label className="flex flex-col text-xs text-gray-400">
          {x('dashFrom')}
          <input type="date" value={startDate} max={endDate || undefined} data-t="date-from"
            onChange={e => { setStartDate(e.target.value); if (!endDate) setEndDate(e.target.value); }}
            className="input-field mt-1 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col text-xs text-gray-400">
          {x('dashTo')}
          <input type="date" value={endDate} min={startDate || undefined} data-t="date-to"
            onChange={e => { setEndDate(e.target.value); if (!startDate) setStartDate(e.target.value); }}
            className="input-field mt-1 py-1.5 text-sm" />
        </label>
      </div>

      {/* Filters */}
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusChange={(v) => { setStatusFilter(v); setActiveCard(null); }}
        branchFilter={branchFilter}
        onBranchChange={setBranchFilter}
      />

      {/* Ticket List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="card">
              <div className="skeleton h-4 w-24 mb-3" />
              <div className="skeleton h-5 w-48 mb-2" />
              <div className="skeleton h-4 w-full mb-1" />
              <div className="skeleton h-4 w-3/4 mb-3" />
              <div className="flex gap-2">
                <div className="skeleton h-3 w-20" />
                <div className="skeleton h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="card text-center py-12">
          <AlertTriangle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 text-lg">{t.dashboard.noTickets}</p>
          <p className="text-gray-600 text-sm mt-1">{x('noTickets')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTickets.map(ticket => (
            <TicketCard key={ticket.ticket_id} ticket={ticket} />
          ))}
        </div>
      )}
    </div>
  );
}
