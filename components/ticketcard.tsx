'use client';

import { Ticket, BRANCHES, DEPARTMENTS, getDepartmentByCode, DIFFICULTY_LABELS, DIFFICULTY_COLORS } from '@/types';
import { StatusBadge } from './StatusBadge';
import { useI18n } from '@/lib/i18n/i18n';
import { Calendar, MapPin, Wrench, ImageIcon } from 'lucide-react';
import Link from 'next/link';

export default function TicketCard({ ticket }: { ticket: Ticket }) {
  const { lang } = useI18n();
  const branch = BRANCHES.find(b => b.branch_code === ticket.branch_code);
  const branchName = lang === 'th' ? branch?.branch_name : branch?.branch_name_en || ticket.branch_code;

  // Get reporter's department info
  const departmentCode = ticket.reporter_department || ticket.dept_type || 'MAINTENANCE';
  const dept = getDepartmentByCode(departmentCode);
  const deptDisplay = dept
    ? `${dept.icon} ${lang === 'th' ? dept.name_th : dept.name_en}`
    : ticket.dept_type;

  // Get difficulty display
  const diff = ticket.difficulty || 'medium';
  const diffLabel = DIFFICULTY_LABELS[diff];
  const diffColorClass = DIFFICULTY_COLORS[diff] || DIFFICULTY_COLORS.medium;

  const date = new Date(ticket.created_at).toLocaleDateString(
    lang === 'th' ? 'th-TH' : 'en-US',
    { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
  );

  return (
    <Link
      href={`/dashboard/${ticket.ticket_id}`}
      className="card-hover block group"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-mono text-gold-500">{ticket.ticket_number}</span>
            <StatusBadge status={ticket.status} />
          </div>
          <h3 className="text-white font-medium group-hover:text-gold-400 transition-colors line-clamp-1">
            {ticket.sub_th || ticket.main_th || ticket.location_detail}
          </h3>
        </div>
      </div>

      <p className="text-gray-400 text-sm line-clamp-2 mb-3">
        {ticket.description || ticket.location_detail}
      </p>

      {/* Image thumbnails */}
      {ticket.images && ticket.images.length > 0 && (
        <div className="flex gap-1 mb-3">
          {ticket.images.slice(0, 3).map((url, i) => (
            <img key={i} src={url} alt=""
              className="w-10 h-10 object-cover rounded border border-navy-600" />
          ))}
          {ticket.images.length > 3 && (
            <div className="w-10 h-10 flex items-center justify-center rounded border border-navy-600 bg-navy-800 text-xs text-gray-500">
              +{ticket.images.length - 3}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" />
          {branchName}
        </span>
        <span className="flex items-center gap-1" title={departmentCode}>
          <Wrench className="w-3.5 h-3.5" />
          {deptDisplay}
        </span>
        {diffLabel && (
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${diffColorClass}`}>
            {lang === 'th' ? diffLabel.th : diffLabel.en}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {date}
        </span>
      </div>
    </Link>
  );
}
