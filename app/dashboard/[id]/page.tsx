'use client';

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

export default function TicketDetailPage() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showPrintView, setShowPrintView] = useState(false);
  const [copied, setCopied] = useState(false);
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
        setError(data.error || 'ไม่พบข้อมูล');
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    setActionLoading(newStatus);
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchTicket();
      } else {
        setError(data.error || 'อัพเดทสถานะไม่สำเร็จ');
        setTimeout(() => setError(''), 3000);
      }
    } catch {
      setError('เกิดข้อผิดพลาด');
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
      }
    } catch (err) {
      console.error('Failed to rate:', err);
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
      }
    } catch (err) {
      console.error('Failed to set difficulty:', err);
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
      if (files[i].type.startsWith('image/') && files[i].size <= 5 * 1024 * 1024) {
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
        const formData = new FormData();
        formData.append('image', file);
        formData.append('ticket_id', id as string);
        formData.append('image_type', 'repair');
        await fetch('/api/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
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

  const handleCopyLine = async () => {
    if (!ticket) return;
    const branch = BRANCHES.find(b => b.branch_code === ticket.branch_code);
    const branchName = branch?.branch_name || ticket.branch_code;
    const text = `🔧 แจ้งซ่อม #${ticket.ticket_number}\n📍 สาขา: ${branchName} | ห้อง: ${ticket.location_detail}\n📝 ${ticket.description}\n🏷️ สถานะ: ${STATUS_LABELS[ticket.status] || ticket.status}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
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
        <p className="text-gray-400 text-lg">{error || 'ไม่พบใบงาน'}</p>
        <Link href="/dashboard" className="btn-secondary mt-4 inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> กลับแดชบอร์ด
        </Link>
      </div>
    );
  }

  const branch = BRANCHES.find(b => b.branch_code === ticket.branch_code);
  const createdDate = new Date(ticket.created_at).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  // Print-friendly content (shown in modal)
  const printContent = (
    <div className="space-y-4 text-black">
      <div className="text-center border-b pb-3 mb-3">
        <h2 className="text-lg font-bold">📋 ใบงานแจ้งซ่อม</h2>
        <p className="text-xl font-bold mt-1">{ticket.ticket_number}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-gray-500">สาขา:</span>{' '}
          <span className="font-medium">{branch?.branch_name || ticket.branch_code}</span>
        </div>
        <div>
          <span className="text-gray-500">สถานะ:</span>{' '}
          <span className="font-medium">{STATUS_LABELS[ticket.status] || ticket.status}</span>
        </div>
        <div>
          <span className="text-gray-500">แผนก:</span>{' '}
          <span className="font-medium">{ticket.dept_type || 'ทั่วไป'}</span>
        </div>
        <div>
          <span className="text-gray-500">ประเภท:</span>{' '}
          <span className="font-medium">{ticket.sub_th || ticket.main_th}</span>
        </div>
        <div>
          <span className="text-gray-500">ผู้แจ้ง:</span>{' '}
          <span className="font-medium">{ticket.reporter_name || 'ไม่ระบุ'}</span>
        </div>
        <div>
          <span className="text-gray-500">วันที่แจ้ง:</span>{' '}
          <span className="font-medium">{createdDate}</span>
        </div>
        <div>
          <span className="text-gray-500">ความเร่งด่วน:</span>{' '}
          <span className="font-medium">{ticket.priority || 'medium'}</span>
        </div>
        {ticket.difficulty && (
          <div>
            <span className="text-gray-500">ความยาก:</span>{' '}
            <span className="font-medium">{DIFFICULTY_LABELS[ticket.difficulty]?.th || ticket.difficulty}</span>
          </div>
        )}
        {ticket.kpi_rating && (
          <div>
            <span className="text-gray-500">คะแนน KPI:</span>{' '}
            <span className="font-medium">{'⭐'.repeat(ticket.kpi_rating)}</span>
          </div>
        )}
      </div>

      <div className="border-t pt-3">
        <p className="text-sm text-gray-500 mb-1">ตำแหน่งที่พบปัญหา:</p>
        <p className="font-medium">{ticket.location_detail}</p>
      </div>

      <div>
        <p className="text-sm text-gray-500 mb-1">อาการเสีย:</p>
        <p className="whitespace-pre-wrap">{ticket.description}</p>
      </div>

      {ticket.pending_reason && (
        <div>
          <p className="text-sm text-gray-500 mb-1">หมายเหตุ:</p>
          <p>{ticket.pending_reason}</p>
        </div>
      )}

      {/* SLA Info */}
      {(ticket.sla_deadline || ticket.sla_minutes) && (
        <div className="border-t pt-3">
          <p className="text-sm text-gray-500 mb-1">SLA:</p>
          {ticket.sla_deadline && (
            <p>⏰ กำหนดเสร็จ: {new Date(ticket.sla_deadline).toLocaleString('th-TH')}</p>
          )}
          {ticket.sla_minutes && (
            <p>⏱️ เวลาดำเนินการ: {ticket.sla_minutes} นาที</p>
          )}
          {ticket.sla_overdue && (
            <p className="text-red-600 font-medium">⚠️ เกินกำหนด SLA</p>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="border-t pt-3">
        <p className="text-sm text-gray-500 mb-2">ประวัติสถานะ:</p>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />
            <span>แจ้งซ่อม: {createdDate}</span>
          </div>
          {ticket.accepted_at && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              <span>รับงาน: {new Date(ticket.accepted_at).toLocaleString('th-TH')}</span>
            </div>
          )}
          {ticket.resolved_at && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              <span>ดำเนินการเสร็จ: {new Date(ticket.resolved_at).toLocaleString('th-TH')}</span>
            </div>
          )}
          {ticket.approved_at && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span>อนุมัติ: {new Date(ticket.approved_at).toLocaleString('th-TH')}</span>
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
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับแดชบอร์ด
        </Link>
        <div className="flex gap-2 no-print">
          <button
            onClick={() => setShowPrintView(true)}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            พิมพ์/ส่ง LINE
          </button>
          <button
            onClick={handleCopyLine}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'คัดลอกแล้ว!' : 'คัดลอก'}
          </button>
        </div>
      </div>

      {/* Print View Modal */}
      {showPrintView && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center pt-10 px-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 text-black">
            <div className="flex items-center justify-between mb-4 no-print">
              <h3 className="text-lg font-bold">📋 ตัวอย่างพิมพ์ / ส่ง LINE</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  🖨️ พิมพ์
                </button>
                <button
                  onClick={handleCopyLine}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-1"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'คัดลอกแล้ว!' : 'คัดลอก'}
                </button>
                <button
                  onClick={() => setShowPrintView(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-400"
                >
                  ปิด
                </button>
              </div>
            </div>
            <div className="border rounded-lg p-4 bg-gray-50 text-black">
              {printContent}
            </div>
          </div>
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Ticket Header */}
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">{ticket.ticket_number}</h1>
            <p className="text-gray-400 mt-1">{ticket.sub_th || ticket.main_th}</p>
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
            <span className="text-gray-500">สาขา:</span>
            <span className="text-white">{branch?.branch_name || ticket.branch_code}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Wrench className="w-4 h-4 text-gray-500" />
            <span className="text-gray-500">แผนก:</span>
            <span className="text-white">{ticket.dept_type || 'ทั่วไป'}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <User className="w-4 h-4 text-gray-500" />
            <span className="text-gray-500">ผู้แจ้ง:</span>
            <span className="text-white">{ticket.reporter_name || 'ไม่ระบุ'}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-gray-500">วันที่แจ้ง:</span>
            <span className="text-white">{createdDate}</span>
          </div>
        </div>

        {/* SLA Info */}
        {(ticket.sla_deadline || ticket.sla_minutes) && (
          <div className="mt-3 pt-3 border-t border-navy-700 flex flex-wrap gap-3 text-xs">
            {ticket.sla_deadline && (
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${ticket.sla_overdue ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                <Clock className="w-3.5 h-3.5" />
                SLA: {new Date(ticket.sla_deadline).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                {ticket.sla_overdue ? ' ⚠️ เกินกำหนด' : ' ✅ ทันเวลา'}
              </div>
            )}
            {ticket.sla_minutes && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-blue-500/10 text-blue-400">
                <Clock className="w-3.5 h-3.5" />
                ใช้เวลา: {ticket.sla_minutes} นาที
              </div>
            )}
          </div>
        )}
      </div>

      {/* Details */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-3">รายละเอียด</h3>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">ตำแหน่งที่พบปัญหา</p>
            <p className="text-white">{ticket.location_detail}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">อาการเสีย</p>
            <p className="text-gray-300 whitespace-pre-wrap">{ticket.description}</p>
          </div>
          {ticket.pending_reason && (
            <div>
              <p className="text-xs text-gray-500 mb-1">หมายเหตุ</p>
              <p className="text-yellow-400">{ticket.pending_reason}</p>
            </div>
          )}
          {kpiRating > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500 mr-2">คะแนน KPI:</span>
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
              รูปภาพประกอบ ({images.length})
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {images.map((img: any, i: number) => (
                <div key={i} className="relative group cursor-pointer" onClick={() => setEnlargedImage(img.image_url)}>
                  <img src={img.image_url} alt={`รูป ${i + 1}`}
                    className="w-full aspect-square object-cover rounded-lg border border-navy-600 hover:border-gold-500 transition-colors" />
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-black/60 text-white">
                    {img.image_type === 'repair' ? '🔧 ซ่อมแล้ว' : '📸 รายงาน'}
                  </span>
                  <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[10px] bg-black/60 text-gray-300">
                    {img.uploader_name || 'ไม่ระบุ'}
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
            <img src={enlargedImage} alt="ขยาย" className="max-w-full max-h-[90vh] rounded-lg object-contain" />
          </div>
        )}
      </div>

      {/* Repair Photo Upload (for technicians during/after repair) */}
      {['tech', 'it', 'sup', 'supit', 'admin', 'gm'].includes(user?.role || '') && 
       ticket.status !== 'CANCELLED' && ticket.status !== 'APPROVED' && (
        <div className="card no-print">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Camera className="w-5 h-5" />
            แนบรูปตอนซ่อม
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
                เลือกรูปตอนซ่อม
              </button>
            )}
            <input ref={repairFileRef} type="file" accept="image/*" multiple onChange={handleRepairFileSelect} className="hidden" />
            
            {repairImages.length > 0 && (
              <button onClick={uploadRepairImages} disabled={uploading}
                className="flex items-center gap-2 px-4 py-2.5 bg-gold-500 hover:bg-gold-600 text-navy-900 rounded-lg font-semibold text-sm">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? 'กำลังอัพโหลด...' : 'อัพโหลดรูป'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* KPI Rating (after APPROVED, only supervisor/admin/gm) */}
      {ticket.status === 'APPROVED' && canRate && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-3">ให้คะแนน KPI</h3>
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
                  title={`${star} ดาว`}
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
              {kpiRating > 0 ? `ให้ ${kpiRating} ดาวแล้ว` : 'เลือกคะแนน 1-5'}
            </span>
          </div>
        </div>
      )}

      {/* Timeline / Status History */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-3">สถานะ</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-gold-500" />
            <div>
              <p className="text-sm text-white">แจ้งซ่อม</p>
              <p className="text-xs text-gray-500">{createdDate}</p>
            </div>
          </div>
          {ticket.accepted_at && (
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <div>
                <p className="text-sm text-white">รับงาน
                  {ticket.accepted_by_name && <span className="text-xs text-gray-500 ml-2">โดย {ticket.accepted_by_name}</span>}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(ticket.accepted_at).toLocaleDateString('th-TH', {
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
                <p className="text-sm text-white">ดำเนินการเสร็จ
                  {ticket.resolved_by_name && <span className="text-xs text-gray-500 ml-2">โดย {ticket.resolved_by_name}</span>}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(ticket.resolved_at).toLocaleDateString('th-TH', {
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
                <p className="text-sm text-white">อนุมัติ
                  {ticket.approved_by_name && <span className="text-xs text-gray-500 ml-2">โดย {ticket.approved_by_name}</span>}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(ticket.approved_at).toLocaleDateString('th-TH', {
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
          <h3 className="text-lg font-semibold text-white mb-3">ระดับความยากของงาน</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'easy', label: '🟢 ง่าย' },
              { value: 'medium', label: '🔵 ปานกลาง' },
              { value: 'hard', label: '🟠 ยาก' },
              { value: 'very_hard', label: '🔴 ยากมาก' },
            ].map(d => (
              <button key={d.value}
                onClick={() => handleDifficultySet(d.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                  difficulty === d.value
                    ? 'bg-gold-500/20 border-gold-500 text-gold-400'
                    : 'bg-navy-700 border-navy-600 text-gray-400 hover:border-gray-400 hover:text-white'
                }`}>
                {d.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">หรือจะเลือกความยากตอนอนุมัติงานก็ได้</p>
        </div>
      )}

      {/* KPI Reminder — APPROVED but no rating */}
      {ticket.status === 'APPROVED' && !ticket.kpi_rating && (
        <div className="card border-2 border-gold-500 bg-gold-500/5 animate-pulse no-print">
          <div className="flex items-start gap-3">
            <span className="text-3xl">⭐</span>
            <div>
              <h3 className="text-lg font-bold text-gold-400">อย่าลืมให้คะแนน KPI!</h3>
              <p className="text-gray-300 text-sm">งานนี้ได้รับการอนุมัติแล้ว กรุณาให้คะแนน 1-5 ดาว</p>
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
                    title={`${star} ดาว`}>
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
            🚩 งานไม่เรียบร้อย — ต้องดำเนินการใหม่
          </h3>
          {ticket?.pending_reason && <p className="text-red-300 text-sm mt-1">{ticket.pending_reason}</p>}
        </div>
      )}

      {/* Activity Log */}
      {activityLogs.length > 0 && (
        <div className="card no-print">
          <h3 className="text-lg font-semibold text-white mb-3">📋 บันทึกการดำเนินการ</h3>
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
                  log.action === 'CANCELLED' ? 'bg-gray-500' :
                  'bg-navy-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <span className="text-white font-medium">{log.actionByName}</span>
                  <span className="text-gray-400 ml-1">
                    {log.action === 'ACCEPTED' ? 'รับงาน' :
                     log.action === 'START' ? 'เริ่มดำเนินการ' :
                     log.action === 'RESOLVED' ? 'ซ่อมเสร็จ' :
                     log.action === 'APPROVED' ? 'อนุมัติ' :
                     log.action === 'REJECTED' ? 'ตีกลับ' :
                     log.action === 'FLAGGED' ? 'แจ้งงานไม่เรียบร้อย' :
                     log.action === 'RATED' ? 'ให้คะแนน' :
                     log.action === 'CANCELLED' ? 'ยกเลิก' :
                     log.action}
                  </span>
                  {log.reason && <p className="text-yellow-400/80 text-xs mt-0.5">⚠️ {log.reason}</p>}
                </div>
                <span className="text-xs text-gray-500 flex-shrink-0">
                  {new Date(log.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="card no-print">
        <h3 className="text-lg font-semibold text-white mb-3">ดำเนินการ</h3>
        <div className="flex flex-wrap gap-2">
          {ticket.status === 'PENDING' && ['tech', 'it', 'sup', 'supit', 'admin'].includes(user?.role || '') && (
            <button
              onClick={() => handleStatusUpdate('ACCEPTED')}
              disabled={actionLoading === 'ACCEPTED'}
              className="btn-primary text-sm flex items-center gap-2"
            >
              {actionLoading === 'ACCEPTED' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              รับงาน
            </button>
          )}
          {(ticket.status === 'PENDING' || ticket.status === 'ACCEPTED') &&
           ['tech', 'it', 'sup', 'supit', 'admin', 'gm'].includes(user?.role || '') && (
            <button
              onClick={() => handleStatusUpdate('IN_PROGRESS')}
              disabled={actionLoading === 'IN_PROGRESS'}
              className="btn-primary text-sm flex items-center gap-2"
            >
              {actionLoading === 'IN_PROGRESS' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              เริ่มดำเนินการ
            </button>
          )}
          {(ticket.status === 'PENDING' || ticket.status === 'ACCEPTED' || ticket.status === 'IN_PROGRESS') &&
           ['tech', 'it', 'sup', 'supit', 'admin', 'gm'].includes(user?.role || '') && (
            <button
              onClick={() => handleStatusUpdate('RESOLVED')}
              disabled={actionLoading === 'RESOLVED'}
              className="btn-primary text-sm flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              {actionLoading === 'RESOLVED' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              ซ่อมเสร็จ
            </button>
          )}
          {ticket.status === 'RESOLVED' && ['sup', 'supit', 'admin', 'gm'].includes(user?.role || '') && (
            <button
              onClick={() => handleStatusUpdate('APPROVED')}
              disabled={actionLoading === 'APPROVED'}
              className="btn-primary text-sm flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              {actionLoading === 'APPROVED' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
              อนุมัติงาน
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
              ปฏิเสธ ส่งกลับช่าง
            </button>
          )}
          {/* FLAG — reporter says work not satisfactory */}
          {(ticket.status === 'RESOLVED' || ticket.status === 'APPROVED') &&
           ['front', 'house', 'admin', 'gm'].includes(user?.role || '') && (
            <button
              onClick={() => handleStatusUpdate('FLAGGED')}
              disabled={actionLoading === 'FLAGGED'}
              className="btn-danger text-sm flex items-center gap-2"
            >
              {actionLoading === 'FLAGGED' ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />}
              งานไม่เรียบร้อย
            </button>
          )}
          {ticket.status !== 'CANCELLED' && ticket.status !== 'APPROVED' &&
           ['sup', 'supit', 'admin', 'gm'].includes(user?.role || '') && (
            <button
              onClick={() => handleStatusUpdate('CANCELLED')}
              disabled={actionLoading === 'CANCELLED'}
              className="btn-danger text-sm flex items-center gap-2"
            >
              {actionLoading === 'CANCELLED' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              ยกเลิก
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
