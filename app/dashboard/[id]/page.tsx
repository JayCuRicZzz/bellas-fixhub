'use client';
import { useX, useDateLocale, useCat } from '../../../lib/i18n/extra';
import { uploadImageFile } from '../../../lib/image-client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '../../../components/authprovider';
import { Ticket, BRANCHES, STATUS_LABELS, DIFFICULTY_LABELS, DIFFICULTY_COLORS } from '../../../types';
import { StatusBadge } from '../../../components/statusbadge';
import {
  ArrowLeft,
  MapPin,
  Wrench,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
  Star,
  Printer,
  Copy,
  Check,
  Camera,
  ImageIcon,
  Upload,
  X,
} from 'lucide-react';
import Link from 'next/link';
import TicketParts from '../../../components/ticketparts';

export default function TicketDetailPage() {
  const x = useX();
  const dl = useDateLocale();
  const cat = useCat();
  const { id } = useParams();
  const { user, token } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showPrintView, setShowPrintView] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lineText, setLineText] = useState('');
  const [kpiRating, setKpiRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [images, setImages] = useState<any[]>([]);
  const [repairImages, setRepairImages] = useState<File[]>([]);
  const [repairPreviews, setRepairPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<string>('');
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const repairFileRef = useRef<HTMLInputElement>(null);

  // Check if ticket was flagged as unsatisfactory
  const isFlagged = !!(ticket?.pending_reason && ticket.pending_reason.includes('ไม่เรียบร้อย'));

  // Pause work modal
  const [showPause, setShowPause] = useState(false);
  const [showResolve, setShowResolve] = useState(false);
  const [resolveNote, setResolveNote] = useState('');
  const [pauseReason, setPauseReason] = useState('อะไหล่ไม่มี/รอสั่งซื้อ');
  const [pauseEndDate, setPauseEndDate] = useState('');
  const [pauseCustomReason, setPauseCustomReason] = useState('');
  const PAUSE_REASONS = [
    { value: 'อะไหล่ไม่มี/รอสั่งซื้อ', label: x('pr_parts') },
    { value: 'รอผู้เชี่ยวชาญ', label: x('pr_expert') },
    { value: 'ส่งช่างนอก', label: x('pr_vendor') },
    { value: 'สภาพอากาศ', label: x('pr_weather') },
    { value: 'อื่นๆ', label: x('pr_other') },
  ];

  const handlePause = async () => {
    const reason = pauseReason === 'อื่นๆ' ? (pauseCustomReason || 'อื่นๆ') : pauseReason;
    if (!pauseEndDate) {
      setError(x('e_pauseDate'));
      setTimeout(() => setError(''), 3000);
      return;
    }
    if (pauseReason === 'อื่นๆ' && !pauseCustomReason) {
      setError(x('e_pauseMore'));
      setTimeout(() => setError(''), 3000);
      return;
    }
    setActionLoading('PAUSED');
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ status: 'PAUSED', paused_reason: reason, paused_expected_end: pauseEndDate }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowPause(false);
        setPauseCustomReason('');
        setPauseReason('อะไหล่ไม่มี/รอสั่งซื้อ');
        fetchTicket();
      } else {
        const errMsg = data.error || x('e_failed');
        console.error('[Pause] API Error:', res.status, errMsg);
        setError(errMsg);
        setTimeout(() => setError(''), 5000);
      }
    } catch (err: any) {
      console.error('[Pause] Network Error:', err.message);
      setError(x('error') + ': ' + (err.message || ''));
      setTimeout(() => setError(''), 5000);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async () => {
    setActionLoading('RESUME');
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchTicket();
      } else {
        setError(data.error || x('e_failed'));
        setTimeout(() => setError(''), 3000);
      }
    } catch {
      setError(x('error'));
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionLoading(null);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      const res = await fetch(`/api/tickets/log/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setActivityLogs(await res.json());
    } catch {}
  };

  useEffect(() => {
    fetchTicket();
    fetchImages();
  }, [id]);

  const fetchTicket = async () => {
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setTicket(data);
        setKpiRating(data.kpi_rating || 0);
        setDifficulty(data.difficulty || '');
        fetchActivityLogs();
      } else {
        setError(data.error || x('d_notFound'));
      }
    } catch {
      setError(x('e_load'));
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string, extra: Record<string, any> = {}) => {
    setActionLoading(newStatus);
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus, ...extra }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchTicket();
      } else {
        setError(data.error || x('e_failed'));
        setTimeout(() => setError(''), 4000);
        if (res.status === 409) fetchTicket(); // คนอื่นเปลี่ยนสถานะไปแล้ว → โหลดสถานะล่าสุด
      }
    } catch {
      setError(x('error'));
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionLoading(null);
    }
  };

  const handleKpiRate = async (rating: number) => {
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ kpi_rating: rating }),
      });
      if (res.ok) {
        setKpiRating(rating);
        fetchTicket();
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || x('e_failed')); setTimeout(() => setError(''), 4000);
      }
    } catch (err) {
      setError(x('error')); setTimeout(() => setError(''), 4000);
    }
  };

  const handleDifficultySet = async (level: string) => {
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ difficulty: level }),
      });
      if (res.ok) {
        setDifficulty(level);
        fetchTicket();
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || x('e_failed')); setTimeout(() => setError(''), 4000);
      }
    } catch (err) {
      setError(x('error')); setTimeout(() => setError(''), 4000);
    }
  };

  const fetchImages = async () => {
    try {
      const res = await fetch(`/api/upload?ticket_id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setImages(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch images:', err);
    }
  };

  const handleRepairFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles: File[] = [];
    const newPreviews: string[] = [];
    for (let i = 0; i < files.length; i++) {
      if (files[i].type.startsWith('image/') && files[i].size <= 10 * 1024 * 1024) {
        newFiles.push(files[i]);
        newPreviews.push(URL.createObjectURL(files[i]));
      }
    }
    setRepairImages(prev => [...prev, ...newFiles].slice(0, 5));
    setRepairPreviews(prev => [...prev, ...newPreviews].slice(0, 5));
    if (repairFileRef.current) repairFileRef.current.value = '';
  };

  const removeRepairImage = (index: number) => {
    URL.revokeObjectURL(repairPreviews[index]);
    setRepairImages(prev => prev.filter((_, i) => i !== index));
    setRepairPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadRepairImages = async () => {
    if (repairImages.length === 0) return;
    setUploading(true);
    try {
      for (const file of repairImages) {
        const up = await uploadImageFile(file, { ticket_id: String(id), image_type: 'repair' }, token);
        if (!up.ok) { alert(up.error); break; }
      }
      setRepairImages([]);
      setRepairPreviews([]);
      fetchImages();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  // ข้อความเดียวกับที่ระบบส่งเข้า LINE อัตโนมัติ (สร้างที่เซิร์ฟเวอร์ด้วยฟังก์ชันเดียวกัน)
  // โหลดไว้ก่อน เพื่อให้ตอนกดปุ่มคัดลอกได้ทันที — Safari บนมือถือไม่ยอมคัดลอกถ้ารอโหลดหลังกด
  const loadLineText = async (): Promise<string> => {
    const res = await fetch(`/api/tickets/${id}/line-text`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.text) throw new Error(data.error || x('e_load'));
    setLineText(data.text);
    return data.text;
  };

  useEffect(() => {
    if (ticket?.ticket_id) loadLineText().catch(() => setLineText(''));
  }, [ticket?.ticket_id, ticket?.status]);

  const handleCopyLine = async () => {
    if (!ticket) return;
    try {
      const text = lineText || await loadLineText();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err: any) {
      console.error('Copy failed:', err);
      alert(x('e_copy') + ': ' + (err?.message || ''));
    }
  };

  const canRate = ticket?.status === 'APPROVED' && (
    user?.id === ticket?.reporter_id ||
    ['sup', 'supit', 'admin', 'gm'].includes(user?.role || '')
  );
  const canPrint = !!ticket;

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="skeleton h-6 w-32" />
        <div className="card">
          <div className="skeleton h-8 w-64 mb-4" />
          <div className="skeleton h-4 w-full mb-2" />
          <div className="skeleton h-4 w-3/4 mb-2" />
          <div className="skeleton h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400 text-lg">{error || x('d_notFound')}</p>
        <Link href="/dashboard" className="btn-secondary mt-4 inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> {x('d_back')}
        </Link>
      </div>
    );
  }

  const branch = BRANCHES.find(b => b.branch_code === ticket.branch_code);
  const createdDate = new Date(ticket.created_at).toLocaleDateString(dl, {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  // Print-friendly content (shown in modal)
  const printContent = (
    <div className="space-y-4 text-black">
      <div className="text-center border-b pb-3 mb-3">
        <h2 className="text-lg font-bold">{x('d_printTitle')}</h2>
        <p className="text-xl font-bold mt-1">{ticket.ticket_number}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-gray-500">{x('d_branch')}:</span>{' '}
          <span className="font-medium">{branch?.branch_name || ticket.branch_code}</span>
        </div>
        <div>
          <span className="text-gray-500">{x('d_status')}:</span>{' '}
          <span className="font-medium">{STATUS_LABELS[ticket.status] || ticket.status}</span>
        </div>
        <div>
          <span className="text-gray-500">{x('d_dept')}:</span>{' '}
          <span className="font-medium">{ticket.dept_type || x('d_general')}</span>
        </div>
        <div>
          <span className="text-gray-500">{x('d_category')}:</span>{' '}
          <span className="font-medium">{cat(ticket)[1] || cat(ticket)[0]}</span>
        </div>
        <div>
          <span className="text-gray-500">{x('d_reporter')}:</span>{' '}
          <span className="font-medium">{ticket.reporter_name || x('d_unknown')}</span>
        </div>
        <div>
          <span className="text-gray-500">{x('d_reportedAt')}:</span>{' '}
          <span className="font-medium">{createdDate}</span>
        </div>
        <div>
          <span className="text-gray-500">{x('d_priority')}:</span>{' '}
          <span className="font-medium">{ticket.priority || 'medium'}</span>
        </div>
        {ticket.difficulty && (
          <div>
            <span className="text-gray-500">{x('d_difficulty')}:</span>{' '}
            <span className="font-medium">{DIFFICULTY_LABELS[ticket.difficulty]?.th || ticket.difficulty}</span>
          </div>
        )}
        {ticket.kpi_rating && (
          <div>
            <span className="text-gray-500">{x('d_kpi')}:</span>{' '}
            <span className="font-medium">{'⭐'.repeat(ticket.kpi_rating)}</span>
          </div>
        )}
      </div>

      <div className="border-t pt-3">
        <p className="text-sm text-gray-500 mb-1">{x('d_location')}:</p>
        <p className="font-medium">{ticket.location_detail}</p>
      </div>

      <div>
        <p className="text-sm text-gray-500 mb-1">{x('d_symptom')}:</p>
        <p className="whitespace-pre-wrap">{ticket.description}</p>
      </div>

      {ticket.pending_reason && (
        <div>
          <p className="text-sm text-gray-500 mb-1">{x('d_note')}:</p>
          <p>{ticket.pending_reason}</p>
        </div>
      )}

      {/* SLA Info */}
      {(ticket.sla_deadline || (ticket.sla_minutes != null && ticket.sla_minutes > 0)) && (
        <div className="border-t pt-3">
          <p className="text-sm text-gray-500 mb-1">SLA:</p>
          {ticket.sla_deadline && (
            <p>⏰ {x('d_due')}: {new Date(ticket.sla_deadline).toLocaleString(dl)}</p>
          )}
          {ticket.sla_minutes != null && ticket.sla_minutes > 0 && (
            <p>⏱️ {x('d_duration')}: {ticket.sla_minutes} {x('d_minutes')}</p>
          )}
          {ticket.sla_overdue && (
            <p className="text-red-600 font-medium">{x('d_overdueSla')}</p>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="border-t pt-3">
        <p className="text-sm text-gray-500 mb-2">{x('d_history')}:</p>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />
            <span>{x('s_reported')}: {createdDate}</span>
          </div>
          {ticket.accepted_at && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              <span>{x('s_accepted')}: {new Date(ticket.accepted_at).toLocaleString(dl)}</span>
            </div>
          )}
          {ticket.resolved_at && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              <span>{x('s_resolved')}: {new Date(ticket.resolved_at).toLocaleString(dl)}</span>
            </div>
          )}
          {ticket.approved_at && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span>{x('s_approved')}: {new Date(ticket.approved_at).toLocaleString(dl)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 fade-in">
      {/* Back button + Print/Copy */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {x('d_back')}
        </Link>
        <div className="flex gap-2 no-print">
          <button
            onClick={() => setShowPrintView(true)}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            {x('d_printLine')}
          </button>
          <button
            onClick={handleCopyLine}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            {copied ? x('d_copied') : x('d_copy')}
          </button>
        </div>
      </div>

      {/* Print View Modal */}
      {showPrintView && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center pt-10 px-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 text-black">
            <div className="flex items-center justify-between mb-4 no-print">
              <h3 className="text-lg font-bold">{x('d_printPreview')}</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  {x('d_print')}
                </button>
                <button
                  onClick={handleCopyLine}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-1"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? x('d_copied') : x('d_copy')}
                </button>
                <button
                  onClick={() => setShowPrintView(false)}
                  className="px-4 py-2 bg-[#d1d5db] text-[#374151] rounded-lg text-sm font-medium hover:bg-[#9ca3af]"
                >
                  {x('d_close')}
                </button>
              </div>
            </div>
            <div className="border rounded-lg p-4 bg-[#f9fafb] text-black">
              {printContent}
            </div>
          </div>
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div role="alert" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md bg-red-600 text-white shadow-xl px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Ticket Header */}
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-bold text-ink">{ticket.ticket_number}</h1>
            <p className="text-gray-400 mt-1">{cat(ticket)[1] || cat(ticket)[0]}</p>
          </div>
          <div className="flex gap-2">
            <StatusBadge status={ticket.status} />
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
              ticket.priority === 'urgent' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
              ticket.priority === 'high' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' :
              ticket.priority === 'low' ? 'bg-gray-500/10 text-gray-400 border-gray-500/30' :
              'bg-blue-500/10 text-blue-400 border-blue-500/30'
            }`}>
              {ticket.priority || 'medium'}
            </span>
            {ticket.difficulty && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${DIFFICULTY_COLORS[ticket.difficulty] || DIFFICULTY_COLORS.medium}`}>
                {DIFFICULTY_LABELS[ticket.difficulty]?.th || ticket.difficulty}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-gray-400">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span className="text-gray-500">{x('d_branch')}:</span>
            <span className="text-ink">{branch?.branch_name || ticket.branch_code}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Wrench className="w-4 h-4 text-gray-500" />
            <span className="text-gray-500">{x('d_dept')}:</span>
            <span className="text-ink">{ticket.dept_type || x('d_general')}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <User className="w-4 h-4 text-gray-500" />
            <span className="text-gray-500">{x('d_reporter')}:</span>
            <span className="text-ink">{ticket.reporter_name || x('d_unknown')}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-gray-500">{x('d_reportedAt')}:</span>
            <span className="text-ink">{createdDate}</span>
          </div>
        </div>

        {/* SLA Info */}
        {(ticket.sla_deadline || (ticket.sla_minutes != null && ticket.sla_minutes > 0)) && (
          <div className="mt-3 pt-3 border-t border-navy-700 flex flex-wrap gap-3 text-xs">
            {ticket.sla_deadline && (
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${ticket.sla_overdue ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                <Clock className="w-3.5 h-3.5" />
                SLA: {new Date(ticket.sla_deadline).toLocaleString(dl, { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                {ticket.sla_overdue ? ' ' + x('d_overdue') : ' ' + x('d_onTime')}
              </div>
            )}
            {ticket.sla_minutes != null && ticket.sla_minutes > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-blue-500/10 text-blue-400">
                <Clock className="w-3.5 h-3.5" />
                {x('d_usedTime')}: {ticket.sla_minutes} {x('d_minutes')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Details */}
      <div className="card">
        <h3 className="text-lg font-semibold text-ink mb-3">{x('d_details')}</h3>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">{x('d_location')}</p>
            <p className="text-ink">{ticket.location_detail}</p>
          </div>
          {(ticket as any).asset_code && (
            <div>
              <p className="text-xs text-gray-500 mb-1">{x('d_equipment')}</p>
              <p className="text-ink">🧰 {(ticket as any).asset_name} <span className="text-xs text-gray-500 font-mono">{(ticket as any).asset_code}</span></p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500 mb-1">{x('d_symptom')}</p>
            <p className="text-gray-300 whitespace-pre-wrap">{ticket.description}</p>
          </div>
          {ticket.pending_reason && (
            <div>
              <p className="text-xs text-gray-500 mb-1">{x('d_note')}</p>
              <p className="text-yellow-400">{ticket.pending_reason}</p>
            </div>
          )}
          {kpiRating > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500 mr-2">{x('d_kpi')}:</span>
              {[1, 2, 3, 4, 5].map(star => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${star <= kpiRating ? 'text-gold-500 fill-gold-500' : 'text-gray-600'}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Image Gallery */}
        {images.length > 0 && (
          <div className="mt-4 pt-4 border-t border-navy-700">
            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
              <ImageIcon className="w-3.5 h-3.5" />
              {x('d_photos')} ({images.length})
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {images.map((img: any, i: number) => (
                <div key={i} className="relative group cursor-pointer" onClick={() => setEnlargedImage(img.image_url)}>
                  <img src={img.image_url} alt={`${x('d_photo')} ${i + 1}`}
                    className="w-full aspect-square object-cover rounded-lg border border-navy-600 hover:border-gold-500 transition-colors" />
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-black/60 text-white">
                    {img.image_type === 'repair' ? x('d_photoRepair') : x('d_photoReport')}
                  </span>
                  <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[10px] bg-black/60 text-gray-300">
                    {img.uploader_name || x('d_unknown')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Enlarged image modal */}
        {enlargedImage && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setEnlargedImage(null)}>
            <button className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/70">
              <X className="w-6 h-6" />
            </button>
            <img src={enlargedImage} alt="" className="max-w-full max-h-[90vh] rounded-lg object-contain" />
          </div>
        )}
      </div>

      {/* Repair Photo Upload (for technicians during/after repair) */}
      {['tech', 'it', 'sup', 'supit', 'admin', 'gm'].includes(user?.role || '') && 
       ticket.status !== 'CANCELLED' && ticket.status !== 'APPROVED' && (
        <div className="card no-print">
          <h3 className="text-lg font-semibold text-ink mb-3 flex items-center gap-2">
            <Camera className="w-5 h-5" />
            {x('d_attachRepair')}
          </h3>
          
          {repairPreviews.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-3">
              {repairPreviews.map((preview, i) => (
                <div key={i} className="relative group rounded-lg overflow-hidden bg-navy-800 border border-navy-600 aspect-square">
                  <img src={preview} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeRepairImage(i)}
                    className="absolute top-1 right-1 p-1 bg-red-600/80 hover:bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {repairImages.length < 5 && (
              <button type="button" onClick={() => repairFileRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-navy-500 hover:border-gold-500 rounded-lg text-gray-400 hover:text-gold-400 transition-colors text-sm">
                <Upload className="w-4 h-4" />
                {x('d_chooseRepair')}
              </button>
            )}
            <input ref={repairFileRef} type="file" accept="image/*" multiple onChange={handleRepairFileSelect} className="hidden" />
            
            {repairImages.length > 0 && (
              <button onClick={uploadRepairImages} disabled={uploading}
                className="flex items-center gap-2 px-4 py-2.5 bg-gold-500 hover:bg-gold-600 text-navy-900 rounded-lg font-semibold text-sm">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? x('uploading') : x('d_upload')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* KPI Rating (after APPROVED, only supervisor/admin/gm) */}
      {ticket.status === 'APPROVED' && canRate && (
        <div className="card">
          <h3 className="text-lg font-semibold text-ink mb-3">{x('d_rateTitle')}</h3>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map(star => {
              const filled = star <= (hoverRating || kpiRating);
              return (
                <button
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => handleKpiRate(star)}
                  className="p-1 transition-transform hover:scale-125"
                  title={`${star} ${x('d_stars')}`}
                >
                  <Star
                    className={`w-8 h-8 ${
                      filled ? 'text-gold-500 fill-gold-500' : 'text-gray-600'
                    } transition-colors`}
                  />
                </button>
              );
            })}
            <span className="ml-3 text-sm text-gray-400">
              {kpiRating > 0 ? `${x('d_rated')} ${kpiRating} ${x('d_stars')}` : x('d_pickRating')}
            </span>
          </div>
        </div>
      )}

      {/* Parts used */}
      <TicketParts ticketId={ticket.ticket_id} status={ticket.status} branch={ticket.branch_code} deptType={ticket.dept_type} user={user} token={token} />

      {/* Timeline / Status History */}
      <div className="card">
        <h3 className="text-lg font-semibold text-ink mb-3">{x('d_status')}</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-gold-500" />
            <div>
              <p className="text-sm text-ink">{x('s_reported')}</p>
              <p className="text-xs text-gray-500">{createdDate}</p>
            </div>
          </div>
          {ticket.accepted_at && (
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <div>
                <p className="text-sm text-ink">{x('s_accepted')}
                  {ticket.accepted_by_name && <span className="text-xs text-gray-500 ml-2">{x('d_by')} {ticket.accepted_by_name}</span>}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(ticket.accepted_at).toLocaleDateString(dl, {
                    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          )}
          {ticket.resolved_at && (
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <div>
                <p className="text-sm text-ink">{x('s_resolved')}
                  {ticket.resolved_by_name && <span className="text-xs text-gray-500 ml-2">{x('d_by')} {ticket.resolved_by_name}</span>}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(ticket.resolved_at).toLocaleDateString(dl, {
                    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          )}
          {ticket.approved_at && (
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <div>
                <p className="text-sm text-ink">{x('s_approved')}
                  {ticket.approved_by_name && <span className="text-xs text-gray-500 ml-2">{x('d_by')} {ticket.approved_by_name}</span>}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(ticket.approved_at).toLocaleDateString(dl, {
                    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Difficulty Setting (supervisors only — during/resolve status) */}
      {['sup', 'supit', 'admin', 'gm'].includes(user?.role || '') && ticket.status !== 'APPROVED' && ticket.status !== 'CANCELLED' && (
        <div className="card no-print">
          <h3 className="text-lg font-semibold text-ink mb-3">{x('d_difficultyTitle')}</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'easy', label: x('df_easy') },
              { value: 'medium', label: x('df_medium') },
              { value: 'hard', label: x('df_hard') },
              { value: 'very_hard', label: x('df_very_hard') },
            ].map(d => (
              <button key={d.value}
                onClick={() => handleDifficultySet(d.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                  difficulty === d.value
                    ? 'bg-gold-500/20 border-gold-500 text-gold-400'
                    : 'bg-navy-700 border-navy-600 text-gray-400 hover:border-gray-400 hover:text-ink'
                }`}>
                {d.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">{x('d_diffLater')}</p>
        </div>
      )}

      {/* KPI Reminder — APPROVED but no rating */}
      {ticket.status === 'APPROVED' && !ticket.kpi_rating && (
        <div className="card border-2 border-gold-500 bg-gold-500/5 animate-pulse no-print">
          <div className="flex items-start gap-3">
            <span className="text-3xl">⭐</span>
            <div>
              <h3 className="text-lg font-bold text-gold-400">{x('d_rateReminder')}</h3>
              <p className="text-gray-300 text-sm">{x('d_rateReminderSub')}</p>
            </div>
          </div>
          {canRate && (
            <div className="flex items-center gap-1 mt-3">
              {[1, 2, 3, 4, 5].map(star => {
                const filled = star <= (hoverRating || kpiRating);
                return (
                  <button key={star}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => handleKpiRate(star)}
                    className="p-1.5 transition-transform hover:scale-125"
                    title={`${star} ${x('d_stars')}`}>
                    <Star className={`w-10 h-10 ${filled ? 'text-gold-500 fill-gold-500' : 'text-gray-600'} transition-colors`} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Red Flag — งานไม่เรียบร้อย */}
      {isFlagged && (
        <div className="card border-2 border-red-500 bg-red-500/10 animate-pulse no-print">
          <h3 className="text-lg font-bold text-red-400 flex items-center gap-2">
            {x('d_flagged')}
          </h3>
          {ticket?.pending_reason && <p className="text-red-300 text-sm mt-1">{ticket.pending_reason}</p>}
        </div>
      )}

      {/* PAUSED Banner */}
      {ticket?.status === 'PAUSED' && (
        <div className="card border-2 border-orange-500 bg-orange-500/10 no-print">
          <h3 className="text-lg font-bold text-orange-400 flex items-center gap-2">
            {x('d_pausedTitle')}
          </h3>
          {ticket.paused_reason && (
            <p className="text-orange-300 text-sm mt-1">{x('d_reason')}: {PAUSE_REASONS.find(r => r.value === ticket.paused_reason)?.label || ticket.paused_reason}</p>
          )}
          {ticket.paused_at && (
            <p className="text-gray-400 text-xs mt-1">{x('d_pausedAt')}: {new Date(ticket.paused_at).toLocaleString(dl, { dateStyle: 'long', timeStyle: 'short' })}</p>
          )}
          {ticket.paused_expected_end && (
            <p className="text-gray-400 text-xs">{x('d_expected')}: {new Date(ticket.paused_expected_end).toLocaleDateString(dl, { dateStyle: 'long' })}</p>
          )}
        </div>
      )}

      {/* Activity Log */}
      {activityLogs.length > 0 && (
        <div className="card no-print">
          <h3 className="text-lg font-semibold text-ink mb-3">{x('d_log')}</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {activityLogs.map((log: any, i: number) => (
              <div key={i} className="flex items-start gap-3 text-sm py-1.5 border-b border-navy-700/50 last:border-0">
                <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  log.action === 'APPROVED' ? 'bg-emerald-500' :
                  log.action === 'RATED' ? 'bg-gold-500' :
                  log.action === 'RESOLVED' ? 'bg-green-500' :
                  log.action === 'ACCEPTED' ? 'bg-blue-500' :
                  log.action === 'START' ? 'bg-purple-500' :
                  log.action === 'FLAGGED' ? 'bg-red-500' :
                  log.action === 'REJECTED' ? 'bg-orange-500' :
                  log.action === 'PAUSED' ? 'bg-orange-500' :
                  log.action === 'RESUME' ? 'bg-blue-500' :
                  log.action === 'CANCELLED' ? 'bg-gray-500' :
                  log.action === 'CREATED' ? 'bg-yellow-500' :
                  'bg-navy-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <span className="text-ink font-medium">{log.actionByName}</span>
                  <span className="text-gray-400 ml-1">
                    {(x('a_' + log.action) !== 'a_' + log.action) ? x('a_' + log.action) : log.action}
                  </span>
                  {log.reason && <p className="text-yellow-400/80 text-xs mt-0.5">⚠️ {log.reason}</p>}
                </div>
                <span className="text-xs text-gray-500 flex-shrink-0">
                  {new Date(log.created_at).toLocaleTimeString(dl, { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="card no-print">
        <h3 className="text-lg font-semibold text-ink mb-3">{x('d_actions')}</h3>
        <div className="flex flex-wrap gap-2">
          {ticket.status === 'PENDING' && ['tech', 'it', 'sup', 'supit', 'admin'].includes(user?.role || '') && (
            <button
              onClick={() => handleStatusUpdate('ACCEPTED')}
              disabled={actionLoading === 'ACCEPTED'}
              className="btn-primary text-sm flex items-center gap-2"
            >
              {actionLoading === 'ACCEPTED' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {x('b_accept')}
            </button>
          )}
          {(ticket.status === 'PENDING' || ticket.status === 'ACCEPTED') &&
           ['tech', 'it', 'sup', 'supit', 'admin'].includes(user?.role || '') && (
            <button
              onClick={() => handleStatusUpdate('IN_PROGRESS')}
              disabled={actionLoading === 'IN_PROGRESS'}
              className="btn-primary text-sm flex items-center gap-2"
            >
              {actionLoading === 'IN_PROGRESS' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {x('b_start')}
            </button>
          )}
          {/* PAUSE — technician pauses work */}
          {(ticket.status === 'ACCEPTED' || ticket.status === 'IN_PROGRESS') &&
           ['tech', 'it', 'sup', 'supit', 'admin'].includes(user?.role || '') && (
            <button
              onClick={() => {
                const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
                setPauseEndDate(tomorrow.toLocaleDateString('sv-SE'));
                setShowPause(true);
              }}
              disabled={actionLoading === 'PAUSED'}
              className="btn-primary text-sm flex items-center gap-2 bg-orange-600 hover:bg-orange-700"
            >
              {x('b_pause')}
            </button>
          )}
          {/* RESUME — continue paused work */}
          {ticket.status === 'PAUSED' &&
           ['tech', 'it', 'sup', 'supit', 'admin'].includes(user?.role || '') && (
            <button
              onClick={handleResume}
              disabled={actionLoading === 'RESUME'}
              className="btn-primary text-sm flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {actionLoading === 'RESUME' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {x('b_resume')}
            </button>
          )}
          {(ticket.status === 'PENDING' || ticket.status === 'ACCEPTED' || ticket.status === 'IN_PROGRESS') &&
           ['tech', 'it', 'sup', 'supit', 'admin'].includes(user?.role || '') && (
            <button
              onClick={() => { setResolveNote(''); setShowResolve(true); }}
              disabled={actionLoading === 'RESOLVED'}
              className="btn-primary text-sm flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              {actionLoading === 'RESOLVED' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {x('b_resolve')}
            </button>
          )}
          {ticket.status === 'RESOLVED' && ['sup', 'supit', 'admin', 'gm'].includes(user?.role || '') &&
           (ticket.resolved_by !== user?.id || ['admin', 'gm'].includes(user?.role || '')) && (
            <button
              onClick={() => handleStatusUpdate('APPROVED')}
              disabled={actionLoading === 'APPROVED'}
              className="btn-primary text-sm flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              {actionLoading === 'APPROVED' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
              {x('b_approve')}
            </button>
          )}
          {/* REJECT — supervisor sends back to technician */}
          {(ticket.status === 'RESOLVED' || ticket.status === 'IN_PROGRESS') &&
           ['sup', 'supit', 'admin', 'gm'].includes(user?.role || '') && (
            <button
              onClick={() => handleStatusUpdate('REJECTED')}
              disabled={actionLoading === 'REJECTED'}
              className="btn-danger text-sm flex items-center gap-2"
            >
              {actionLoading === 'REJECTED' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              {x('b_reject')}
            </button>
          )}
          {/* FLAG — reporter says work not satisfactory */}
          {(ticket.status === 'RESOLVED' || ticket.status === 'APPROVED') &&
           (ticket.reporter_id === user?.id || ['sup', 'supit', 'admin', 'gm'].includes(user?.role || '')) && (
            <button
              onClick={() => handleStatusUpdate('FLAGGED')}
              disabled={actionLoading === 'FLAGGED'}
              className="btn-danger text-sm flex items-center gap-2"
            >
              {actionLoading === 'FLAGGED' ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />}
              {x('b_flag')}
            </button>
          )}
          {ticket.status !== 'CANCELLED' && ticket.status !== 'APPROVED' &&
           (['sup', 'supit', 'admin', 'gm'].includes(user?.role || '') ||
            (ticket.reporter_id === user?.id && ticket.status === 'PENDING')) && (
            <button
              onClick={() => handleStatusUpdate('CANCELLED')}
              disabled={actionLoading === 'CANCELLED'}
              className="btn-danger text-sm flex items-center gap-2"
            >
              {actionLoading === 'CANCELLED' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              {x('b_cancel')}
            </button>
          )}
        </div>
      </div>

      {/* Pause Work Modal */}
      {/* ซ่อมเสร็จ — บันทึกสิ่งที่ทำ (แสดงในใบงานเป็นหมายเหตุ · ใส่คำว่า "น้ำยา" ระบบนับในรายงานน้ำยาแอร์) */}
      {showResolve && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-navy-800 border border-navy-600 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-ink mb-1">{x('r_title')}</h3>
            <p className="text-gray-400 text-sm mb-4">{x('r_sub')}</p>
            <label htmlFor="resolve-note" className="block text-sm text-gray-300 mb-2">{x('r_label')}</label>
            <textarea id="resolve-note" value={resolveNote} onChange={e => setResolveNote(e.target.value)} rows={3} maxLength={1000}
              placeholder={x('r_ph')}
              className="w-full px-4 py-2.5 bg-navy-700 border border-navy-500 rounded-lg text-ink placeholder-gray-500 focus:border-gold-500 focus:outline-none mb-2" />
            <p className="text-xs text-gray-500 mb-5">{x('r_hint')}</p>
            <div className="flex gap-3">
              <button
                onClick={async () => { setShowResolve(false); await handleStatusUpdate('RESOLVED', resolveNote.trim() ? { pending_reason: resolveNote.trim() } : {}); }}
                disabled={actionLoading === 'RESOLVED'}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-semibold text-sm"
              >
                {x('r_confirm')}
              </button>
              <button onClick={() => setShowResolve(false)} className="flex-1 py-2.5 bg-navy-700 hover:bg-navy-600 text-gray-300 rounded-lg text-sm">
                {x('b_cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPause && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-navy-800 border border-navy-600 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-ink mb-1">{x('p_title')}</h3>
            <p className="text-gray-400 text-sm mb-4">{x('p_sub')}</p>
            
            <label className="block text-sm text-gray-300 mb-2">{x('p_reason')}</label>
            <div className="space-y-2 mb-4">
              {PAUSE_REASONS.map(r => (
                <label key={r.value} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  pauseReason === r.value
                    ? 'border-gold-500 bg-gold-500/10 text-gold-400'
                    : 'border-navy-600 bg-navy-700/50 text-gray-300 hover:border-gray-500'
                }`}>
                  <input
                    type="radio"
                    name="pauseReason"
                    value={r.value}
                    checked={pauseReason === r.value}
                    onChange={(e) => setPauseReason(e.target.value)}
                    className="accent-gold-500 w-4 h-4"
                  />
                  <span className="text-sm">{r.label}</span>
                </label>
              ))}
            </div>

            {pauseReason === 'อื่นๆ' && (
              <div className="mb-4">
                <label className="block text-sm text-gray-300 mb-2">{x('p_more')}</label>
                <input
                  type="text"
                  value={pauseCustomReason}
                  onChange={(e) => setPauseCustomReason(e.target.value)}
                  placeholder={x('p_morePh')}
                  className="w-full px-4 py-2.5 bg-navy-700 border border-navy-500 rounded-lg text-ink placeholder-gray-500 focus:border-gold-500 focus:outline-none"
                />
              </div>
            )}

            <label className="block text-sm text-gray-300 mb-2">{x('p_date')}</label>
            <input
              type="date"
              value={pauseEndDate}
              onChange={(e) => setPauseEndDate(e.target.value)}
              min={new Date().toLocaleDateString('sv-SE')}
              className="w-full px-4 py-2.5 bg-navy-700 border border-navy-500 rounded-lg text-ink focus:border-gold-500 focus:outline-none mb-5"
            />

            <div className="flex gap-3">
              <button
                onClick={handlePause}
                disabled={actionLoading === 'PAUSED' || !pauseEndDate}
                className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg font-semibold text-sm"
              >
                {actionLoading === 'PAUSED' ? x('saving') : x('p_confirm')}
              </button>
              <button
                onClick={() => setShowPause(false)}
                className="flex-1 py-2.5 bg-navy-700 hover:bg-navy-600 text-gray-300 rounded-lg text-sm"
              >
                {x('b_cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
