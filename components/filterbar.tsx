'use client';

import { useState, useEffect } from 'react';
import { BRANCHES } from '@/types';
import { useI18n, tStatus } from '@/lib/i18n/i18n';
import { useAuth } from '@/components/AuthProvider';
import { Search } from 'lucide-react';

interface FilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusChange: (v: string) => void;
  branchFilter: string;
  onBranchChange: (v: string) => void;
}

const STATUSES = ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'APPROVED', 'CANCELLED'];

export default function FilterBar({
  search, onSearchChange, statusFilter, onStatusChange,
  branchFilter, onBranchChange,
}: FilterBarProps) {
  const { t, lang } = useI18n();
  const { token, user } = useAuth();
  const [branchCounts, setBranchCounts] = useState<Record<string, number>>({});

  // Fetch branch ticket counts
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await fetch('/api/reports/daily', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const counts: Record<string, number> = {};
        if (data.byBranch) {
          for (const item of data.byBranch) {
            counts[item.name] = item.count;
          }
        }
        setBranchCounts(counts);
      } catch (e) {
        // ignore
      }
    };
    if (token) fetchCounts();
  }, [token]);

  const selectClass = "bg-navy-800 border border-navy-600 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-gold-500 cursor-pointer transition-all";
  const activeSelectClass = "bg-navy-800 border-gold-500 rounded-lg px-3 py-2 text-sm text-gold-400 focus:outline-none cursor-pointer transition-all ring-1 ring-gold-500/30";

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={t.dashboard.search}
          className="input-field pl-10"
        />
      </div>

      {/* Filter drops */}
      <div className="flex flex-wrap gap-2">
        <select
          value={statusFilter}
          onChange={e => onStatusChange(e.target.value)}
          className={statusFilter ? activeSelectClass : selectClass}
        >
          <option value="">{t.dashboard.allStatus}</option>
          {STATUSES.map(s => (
            <option key={s} value={s}>{tStatus(s, lang)}</option>
          ))}
        </select>

        <select
          value={branchFilter}
          onChange={e => onBranchChange(e.target.value)}
          className={branchFilter ? activeSelectClass : selectClass}
        >
          <option value="">{t.dashboard.allBranches}</option>
          {BRANCHES.filter(b => !user?.branches || user.branches.length === 0 || user.branches.includes(b.branch_code)).map(b => {
            const count = branchCounts[b.branch_code] || 0;
            return (
              <option key={b.branch_code} value={b.branch_code}>
                {lang === 'th' ? b.branch_name : b.branch_name_en} ({count})
              </option>
            );
          })}
        </select>

      </div>
    </div>
  );
}
