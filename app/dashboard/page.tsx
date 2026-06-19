'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/authprovider';
import { useI18n } from '@/lib/i18n/i18n';
import FilterBar from '@/components/filterbar';
import TicketCard from '@/components/ticketcard';
import { Ticket, DEPARTMENTS } from '@/types';
import { LayoutDashboard, Clock, Wrench, CheckCircle2, AlertTriangle, PlusCircle, BarChart3 } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, token } = useAuth();
  const { t, lang } = useI18n();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, completed: 0 });
  const [todayStats, setTodayStats] = useState({ total: 0, pending: 0, inProgress: 0, completed: 0 });
  const [deptStats, setDeptStats] = useState<{ name: string; count: number }[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Active stat card
  const [activeCard, setActiveCard] = useState<'total' | 'pending' | 'inProgress' | 'completed' | null>(null);

  const fetchTickets = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (branchFilter) params.set('branch', branchFilter);
      if (deptFilter) params.set('department', deptFilter);

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
  }, [token, statusFilter, branchFilter, deptFilter]);

  const fetchStats = useCallback(async () => {
    try {
      // All-time stats
      const resAll = await fetch('/api/reports/daily?period=month', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const all = await resAll.json();
      setStats({
        total: all.total || 0,
        pending: all.pending || 0,
        inProgress: all.inProgress || 0,
        completed: all.completed || 0,
      });
      if (all.byDepartment) setDeptStats(all.byDepartment);

      // Today stats
      const resToday = await fetch('/api/reports/daily?period=today', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const today = await resToday.json();
      setTodayStats({
        total: today.total || 0,
        pending: today.pending || 0,
        inProgress: today.inProgress || 0,
        completed: today.completed || 0,
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [token]);

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
        setDeptFilter('');
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
          <h2 className="text-2xl font-bold text-white">
            {lang === 'th' ? 'ยินดีต้อนรับ' : 'Welcome'}, <span className="text-gold-500">{userName}</span> 👋
          </h2>
          <p className="text-gray-400 mt-1">{lang === 'th' ? 'ภาพรวมการแจ้งซ่อมและสถานะงาน' : 'Overview of repair tickets and status'}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/create" className="btn-primary text-sm inline-flex items-center gap-2 shadow-lg shadow-gold-500/20">
            <PlusCircle className="w-4 h-4" />
            {lang === 'th' ? 'แจ้งซ่อมใหม่' : 'New Ticket'}
          </Link>
          <Link href="/dashboard/reports" className="btn-secondary text-sm inline-flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            {lang === 'th' ? 'ดูรายงาน' : 'View Reports'}
          </Link>
        </div>
      </div>

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
                    <p className="text-xl sm:text-3xl font-bold text-white mt-0.5 sm:mt-1">{stat.value}</p>
                  </div>
                  {todayStats[stat.key] !== undefined && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {lang === 'th' ? 'วันนี้' : 'Today'}: <span className="text-gold-400 font-medium">{todayStats[stat.key]}</span>
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


      {/* Department Tabs — กรองตามแผนกผู้แจ้ง */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: '', label: 'ทั้งหมด', labelEn: 'All', icon: '🏢', count: stats.total, color: 'border-gray-500 text-gray-300', activeColor: 'bg-gray-500/20 border-gray-400 text-white' },
          ...DEPARTMENTS.map(dept => ({
            value: dept.code,
            label: (lang === 'th' ? dept.name_th : dept.name_en),
            labelEn: dept.name_en,
            icon: dept.icon,
            count: deptStats.find(d => d.name === dept.code)?.count || 0,
            color: 'border-navy-600 text-gray-400',
            activeColor: 'bg-gold-500/20 border-gold-500 text-gold-400',
          })),
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setDeptFilter(tab.value)}
            className={`px-3 sm:px-4 py-2 rounded-xl border text-sm font-medium transition-all flex items-center gap-1.5 ${
              deptFilter === tab.value ? tab.activeColor + ' shadow-lg' : tab.color + ' hover:border-gray-400 hover:text-white'
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            {lang === 'th' ? tab.label : tab.labelEn}
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-navy-900/80 text-xs font-bold text-gold-500">{tab.count}</span>
          </button>
        ))}
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
          <p className="text-gray-600 text-sm mt-1">{lang === 'th' ? 'ยังไม่มีรายการแจ้งซ่อมที่ตรงกับเงื่อนไข' : 'No repair tickets match your filter criteria'}</p>
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
