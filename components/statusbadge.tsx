'use client';

import { useI18n, tStatus } from '../lib/i18n/i18n';
import { Clock, CheckCircle2, Loader2, XCircle, Star } from 'lucide-react';

const statusConfig: Record<string, { icon: React.ReactNode; dotColor: string; bgClass: string; borderClass: string; textClass: string; animation: string }> = {
  PENDING: {
    icon: <Clock className="w-3.5 h-3.5" />,
    dotColor: 'bg-amber-400',
    bgClass: 'bg-amber-500/15',
    borderClass: 'border-amber-500/40',
    textClass: 'text-amber-300',
    animation: 'animate-pulse',
  },
  IN_PROGRESS: {
    icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
    dotColor: 'bg-blue-400',
    bgClass: 'bg-blue-500/15',
    borderClass: 'border-blue-500/40',
    textClass: 'text-blue-300',
    animation: '',
  },
  RESOLVED: {
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    dotColor: 'bg-green-400',
    bgClass: 'bg-green-500/15',
    borderClass: 'border-green-500/40',
    textClass: 'text-green-300',
    animation: '',
  },
  APPROVED: {
    icon: <Star className="w-3.5 h-3.5" />,
    dotColor: 'bg-emerald-400',
    bgClass: 'bg-emerald-500/15',
    borderClass: 'border-gold-500/50',
    textClass: 'text-emerald-300',
    animation: '',
  },
  CANCELLED: {
    icon: <XCircle className="w-3.5 h-3.5" />,
    dotColor: 'bg-gray-400',
    bgClass: 'bg-gray-500/10',
    borderClass: 'border-gray-500/30',
    textClass: 'text-gray-400',
    animation: '',
  },
};

export function StatusBadge({ status }: { status: string }) {
  const { lang } = useI18n();
  const config = statusConfig[status] || statusConfig.PENDING;
  const label = tStatus(status, lang);
  const isCancelled = status === 'CANCELLED';

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border shadow-sm transition-all duration-300 ${config.bgClass} ${config.borderClass} ${config.textClass} ${config.animation} ${isCancelled ? 'line-through' : ''}`}>
      <span className={`w-2 h-2 rounded-full ${config.dotColor} flex-shrink-0`} />
      {config.icon}
      {label}
    </span>
  );
}
