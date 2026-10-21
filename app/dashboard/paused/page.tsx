'use client';

// งานที่พักอยู่ — เหตุผล · พักเมื่อ · ครบวันไหน · พักรอบที่เท่าไร · ช่าง
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../components/authprovider';
import { useX, useDateLocale } from '../../../lib/i18n/extra';
import { BRANCHES } from '../../../types';

const REASON_KEY: Record<string, string> = {
  'อะไหล่ไม่มี/รอสั่งซื้อ': 'pr_parts', 'รอผู้เชี่ยวชาญ': 'pr_expert', 'ส่งช่างนอก': 'pr_vendor', 'สภาพอากาศ': 'pr_weather',
};

export default function PausedPage() {
  const { user, token } = useAuth();
  const x = useX();
  const dl = useDateLocale();
  const [items, setItems] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  const [branch, setBranch] = useState('');

  const load = async () => {
    setError('');
    try {
      const r = await fetch(`/api/tickets/paused?branch=${encodeURIComponent(branch)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || x('error'));
      setItems(d.items || []);
    } catch (e: any) { setError(e.message || x('error')); setItems([]); }
  };
  useEffect(() => { if (user) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user, token, branch]);

  const dueLabel = (n: number | null) =>
    n == null ? '-' : n > 0 ? x('ps_daysLeft').replace('{n}', String(n)) : n === 0 ? x('ps_dueToday') : x('ps_overdue').replace('{n}', String(-n));

  return (
    <div className="space-y-5 fade-in" data-t="paused-page">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-ink">{x('ps_title')}{items ? ` (${items.length})` : ''}</h2>
          <p className="text-gray-400 text-sm mt-1">{x('ps_sub')}</p>
        </div>
        <button onClick={load} className="btn-secondary text-sm flex items-center gap-2"><RefreshCw className="w-4 h-4" /></button>
      </div>

      <select value={branch} onChange={e => setBranch(e.target.value)} className="select-field max-w-xs">
        <option value="">🏢 {x('all')}</option>
        {BRANCHES.map(b => <option key={b.branch_code} value={b.branch_code}>{b.branch_code} — {b.branch_name}</option>)}
      </select>

      {error && <div className="card text-red-400 text-sm">{error}</div>}
      {items == null ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-gold-500" /></div>
      ) : items.length === 0 ? (
        <div className="card text-center text-gray-500 py-10">{x('ps_none')}</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {items.map(t => {
            const late = t.days_left != null && t.days_left <= 0;
            return (
              <Link key={t.ticket_id} href={`/dashboard/${t.ticket_id}`} data-t="paused-item"
                className={`card-hover block border-2 ${late ? 'border-red-500/60' : 'border-orange-500/50'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-sm text-gold-400">{t.ticket_number}</p>
                    <p className="text-ink font-semibold mt-0.5">{t.branch_code} · {t.location_detail}</p>
                    <p className="text-gray-400 text-sm truncate">{t.main_th} — {t.description}</p>
                  </div>
                  <div className="text-center shrink-0 rounded-xl bg-orange-500/15 border border-orange-500/50 px-3 py-1.5">
                    <p className="text-[11px] text-orange-400 leading-tight">{x('ps_round')}</p>
                    <p className="text-3xl font-black text-orange-500 leading-none" data-t="paused-round">{t.pause_round}</p>
                  </div>
                </div>
                <div className="mt-3 rounded-lg bg-navy-900/40 p-3 text-sm space-y-1">
                  <p className="text-orange-300 font-medium">⏸️ {REASON_KEY[t.paused_reason] ? x(REASON_KEY[t.paused_reason]) : t.paused_reason}</p>
                  <p className="text-gray-400">{x('ps_pausedAt')}: {t.paused_at ? new Date(t.paused_at).toLocaleString(dl, { dateStyle: 'medium', timeStyle: 'short' }) : '-'}</p>
                  <p className="text-gray-400">{x('d_expected')}: {t.paused_expected_end ? new Date(t.paused_expected_end).toLocaleDateString(dl, { dateStyle: 'medium' }) : '-'}
                    {' '}<span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${late ? 'bg-red-600 text-white' : 'bg-orange-500/20 text-orange-400'}`}>{dueLabel(t.days_left)}</span>
                  </p>
                  {t.technician_name && <p className="text-gray-400">{x('ps_tech')}: <span className="text-ink">{t.technician_name}</span></p>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
