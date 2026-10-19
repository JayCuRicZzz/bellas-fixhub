'use client';
import { uploadImageFile } from '../lib/image-client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from './authprovider';
import { useI18n } from '../lib/i18n/i18n';
import { BRANCHES, Category, DEPARTMENTS } from '../types';
import { assetTypeOf } from '../lib/asset-types';
import { AlertCircle, Send, Loader2, Camera, X, ImagePlus, Clock } from 'lucide-react';

interface SlaConfig {
  [priority: string]: { sla_hours: number; sla_minutes: number };
}

// พื้นที่ส่วนกลาง (เลือกจากรายการ → ค้นและสรุปได้ตรงกัน) · ตัวสุดท้าย = อื่น ๆ ต้องพิมพ์ระบุ
const AREAS = ['ล็อบบี้', 'ฟร้อนท์', 'ทางเดิน / บันได', 'ลิฟต์', 'สระว่ายน้ำ', 'ห้องอาหาร / บาร์', 'ครัว', 'ห้องประชุม',
  'ลานจอดรถ', 'สวน / ภายนอกอาคาร', 'ดาดฟ้า', 'ห้องเครื่อง / ห้องปั๊ม', 'ห้องพนักงาน / ออฟฟิศ', 'ห้องเก็บของ / Store', 'อื่น ๆ'];

export default function TicketForm() {
  const { user, token } = useAuth();
  const { t, lang } = useI18n();
  const [branchCode, setBranchCode] = useState(user?.branches?.length === 1 ? user.branches[0] : (user?.branch_code || ''));
  const [department, setDepartment] = useState('MAINTENANCE');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  // ตำแหน่ง: ห้องพัก (เบอร์ห้องบังคับเป็นตัวเลข) หรือ พื้นที่ส่วนกลาง (เลือกจากรายการ) + รายละเอียดเพิ่ม
  const [locKind, setLocKind] = useState<'room' | 'area'>('room');
  const [roomNo, setRoomNo] = useState('');
  const [areaName, setAreaName] = useState('');
  const [locNote, setLocNote] = useState('');
  const roomOk = /^[0-9]{2,4}[A-Za-z]?$/.test(roomNo.trim());
  const isOtherArea = locKind === 'area' && areaName === 'อื่น ๆ';
  const locationDetail = isOtherArea ? locNote.trim()
    : (locKind === 'room' ? (roomNo.trim() ? `ห้อง ${roomNo.trim().toUpperCase()}` : '') : areaName) + (locNote.trim() ? ` · ${locNote.trim()}` : '');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'non_urgent' | 'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [slaConfig, setSlaConfig] = useState<SlaConfig>({});
  const [createdTicket, setCreatedTicket] = useState<{ticket_number:string; branch_code:string; location_detail:string; description:string; priority:string; department:string} | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // ── สแกน QR ห้อง/อุปกรณ์ (/r/<token> → ?qr=<token>) ──
  const [qr, setQr] = useState<any>(null);
  const [qrError, setQrError] = useState('');
  const [locationId, setLocationId] = useState<number | null>(null);
  const [assetId, setAssetId] = useState<number | null>(null);

  const applyAsset = (a: any) => {
    setAssetId(a ? a.asset_id : null);
    if (!a) return;
    const t = assetTypeOf(a.asset_type);
    const dept = (a.dept_type || t?.dept) === 'IT' ? 'IT' : 'MAINTENANCE';
    setDepartment(dept);
    setCategoryId(t?.cat ? String(t.cat) : '');
  };

  useEffect(() => {
    const qrToken = new URLSearchParams(window.location.search).get('qr');
    if (!qrToken) return;
    fetch(`/api/qr/${encodeURIComponent(qrToken)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(async r => ({ ok: r.ok, d: await r.json() }))
      .then(({ ok, d }) => {
        if (!ok) { setQrError(d.error || 'QR ไม่ถูกต้อง'); return; }
        setQr(d);
        setBranchCode(d.branch_code);
        if (d.location) {
          setLocationId(d.location.location_id);
          if (d.location.kind === 'room' || /^[0-9]{2,4}[A-Za-z]?$/.test(d.location.code || '')) { setLocKind('room'); setRoomNo(d.location.code); }
          else { setLocKind('area'); setAreaName(d.location.name); }
        } else if (d.asset) { setLocKind('area'); setAreaName(AREAS[AREAS.length - 1]); setLocNote(d.asset.name); }
        if (d.asset) applyAsset(d.asset);
      })
      .catch(() => setQrError('โหลดข้อมูล QR ไม่สำเร็จ'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!branchCode && user?.branches?.length === 1) setBranchCode(user.branches[0]);
    else if (!branchCode && user?.branch_code && user.branches?.includes(user.branch_code)) setBranchCode(user.branch_code);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch('/api/sla')
      .then(res => res.json())
      .then(data => setSlaConfig(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (department) {
      fetch(`/api/categories?dept_type=${encodeURIComponent(department)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          setCategories(Array.isArray(data) ? data : []);
          if (data.length > 0 && !categoryId) {
            setCategoryId(String(data[0].category_id));
          }
        })
        .catch(() => setCategories([]));
    }
  }, [department, token]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newImages: { file: File; preview: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      if (files[i].type.startsWith('image/') && files[i].size <= 10 * 1024 * 1024) {
        newImages.push({ file: files[i], preview: URL.createObjectURL(files[i]) });
      }
    }
    setImages(prev => [...prev, ...newImages].slice(0, 5));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const getSlaLabel = (p: string) => {
    const s = slaConfig[p];
    if (!s) return null;
    return `${s.sla_hours} ${lang === 'th' ? 'ชม.' : 'h'}`;
  };

  // Filter branches to only those the user has access to
  const userBranches = user?.branches;
  const accessibleBranches = userBranches && userBranches.length > 0
    ? BRANCHES.filter(b => userBranches.includes(b.branch_code))
    : BRANCHES;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (locKind === 'room' && !roomOk) { setError('เบอร์ห้องต้องเป็นตัวเลข 2–4 หลัก (เช่น 305, 1201)'); return; }
    if (locKind === 'area' && !areaName) { setError('กรุณาเลือกพื้นที่'); return; }
    setLoading(true);
    setUploadingImages(true);

    try {
      const uploadedUrls: string[] = [];
      for (const img of images) {
        const up = await uploadImageFile(img.file, {}, token);
        if (!up.ok) {
          setUploadingImages(false);
          setLoading(false);
          setError(up.error || 'อัปโหลดรูปไม่สำเร็จ');
          return;
        }
        uploadedUrls.push(up.url!);
      }
      setUploadingImages(false);

      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          branch_code: branchCode,
          category_id: Number(categoryId),
          location_kind: locKind,
          room_no: locKind === 'room' ? roomNo.trim() : undefined,
          area_name: locKind === 'area' ? areaName : undefined,
          location_note: locNote.trim() || undefined,
          description,
          priority,
          reporter_department: department,
          images: uploadedUrls,
          location_id: locationId,
          asset_id: assetId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setCreatedTicket({ ticket_number: data.ticket_number, branch_code: branchCode, location_detail: locationDetail, description, priority, department });
        if (!qr?.location) { setRoomNo(''); setAreaName(''); }  // สแกน QR มา → แจ้งเรื่องอื่นของห้องเดิมต่อได้
        setLocNote('');
        if (!qr?.location) setLocationId(null);
        setDescription('');
        setImages([]);
      } else {
        setError(data.error || (lang === 'th' ? 'เกิดข้อผิดพลาด' : 'Error occurred'));
      }
    } catch {
      setError(lang === 'th' ? 'เกิดข้อผิดพลาดในการเชื่อมต่อ' : 'Connection error');
    } finally {
      setLoading(false);
      setUploadingImages(false);
    }
  };

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-5">
      {qrError && <div className="px-4 py-3 rounded-lg bg-red-500/10 text-red-400 text-sm">⚠️ {qrError}</div>}
      {qr && (
        <div className="px-4 py-3 rounded-lg bg-gold-500/10 border border-gold-500/30 text-sm space-y-2">
          <div className="text-ink font-medium">
            📷 แจ้งซ่อมจาก QR: {qr.location?.name || ''}{qr.asset ? ` · ${assetTypeOf(qr.asset.asset_type)?.icon || '🧰'} ${qr.asset.name} (${qr.asset.asset_code})` : ''}
          </div>
          {qr.asset?.warranty_until && new Date(qr.asset.warranty_until) >= new Date() && (
            <div className="text-amber-400 text-xs">🛡️ อุปกรณ์นี้ยังอยู่ในประกันถึง {new Date(qr.asset.warranty_until).toLocaleDateString('th-TH')} — ช่างควรติดต่อผู้ขายก่อนซ่อมเอง</div>
          )}
          {!qr.asset && qr.assets?.length > 0 && (
            <label className="block text-xs text-gray-400">อุปกรณ์ที่เสีย (ถ้ารู้)
              <select value={assetId || ''} onChange={e => applyAsset(qr.assets.find((a: any) => a.asset_id === Number(e.target.value)) || null)} className="select-field mt-1">
                <option value="">— ไม่ระบุ / อื่น ๆ —</option>
                {qr.assets.map((a: any) => <option key={a.asset_id} value={a.asset_id}>{assetTypeOf(a.asset_type)?.icon} {a.name} ({a.asset_code})</option>)}
              </select>
            </label>
          )}
          {qr.open_tickets?.length > 0 && (
            <div className="text-xs text-orange-400">
              ⏳ จุดนี้มีงานค้างอยู่แล้ว {qr.open_tickets.length} ใบ — ตรวจก่อนแจ้งซ้ำ:
              {qr.open_tickets.map((t: any) => (
                <a key={t.ticket_id} href={`/dashboard/${t.ticket_id}`} className="block text-gray-300 hover:text-gold-400 truncate">• {t.ticket_number} {t.description}</a>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">{t.ticket.branch} <span className="text-red-400">*</span></label>
          <select value={branchCode} onChange={e => setBranchCode(e.target.value)} className="select-field" required>
            <option value="">{lang === 'th' ? 'เลือกสาขา' : 'Select branch'}</option>
            {accessibleBranches.map(b => (
              <option key={b.branch_code} value={b.branch_code}>
                {b.branch_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className="block text-sm font-medium text-gray-300 mb-1.5">{lang === 'th' ? 'ตำแหน่งที่เสีย' : 'Location'} <span className="text-red-400">*</span></span>
          <div className="flex gap-1.5 mb-2" role="radiogroup" aria-label="ประเภทตำแหน่ง">
            {([['room', lang === 'th' ? '🛏️ ห้องพัก' : 'Guest room'], ['area', lang === 'th' ? '📍 พื้นที่ส่วนกลาง' : 'Common area']] as const).map(([k, l]) => (
              <button key={k} type="button" role="radio" aria-checked={locKind === k}
                onClick={() => { setLocKind(k); setLocationId(null); }}
                className={`flex-1 px-3 py-2 rounded-lg text-sm border ${locKind === k ? 'border-gold-500 bg-gold-500/10 text-gold-400 font-medium' : 'border-navy-600 bg-navy-800 text-gray-400'}`}>{l}</button>
            ))}
          </div>
          {locKind === 'room' ? (
            <>
              <input type="text" inputMode="numeric" value={roomNo} maxLength={5} aria-label="เบอร์ห้อง"
                onChange={e => { setRoomNo(e.target.value.replace(/[^0-9A-Za-z]/g, '')); setLocationId(null); }}
                pattern="[0-9]{2,4}[A-Za-z]?" title="ตัวเลข 2–4 หลัก เช่น 305 หรือ 1201"
                className="input-field" placeholder={lang === 'th' ? 'เบอร์ห้อง เช่น 305' : 'Room no. e.g. 305'} required />
              {roomNo && !roomOk && <p className="text-xs text-red-400 mt-1">เบอร์ห้องต้องเป็นตัวเลข 2–4 หลัก (เช่น 305, 1201)</p>}
            </>
          ) : (
            <select value={areaName} onChange={e => { setAreaName(e.target.value); setLocationId(null); }} className="select-field" required aria-label="พื้นที่">
              <option value="">{lang === 'th' ? '— เลือกพื้นที่ —' : '— Select area —'}</option>
              {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          )}
          <input type="text" value={locNote} onChange={e => setLocNote(e.target.value)} maxLength={100}
            className="input-field mt-2" required={locKind === 'area' && areaName === AREAS[AREAS.length - 1]}
            placeholder={locKind === 'room' ? (lang === 'th' ? 'จุดในห้อง (ไม่บังคับ) เช่น ห้องน้ำ, ระเบียง' : 'Spot in room (optional)') : (areaName === AREAS[AREAS.length - 1] ? 'ระบุพื้นที่ *' : 'ระบุเพิ่ม (ไม่บังคับ) เช่น ชั้น 4, หน้าลิฟต์')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            {lang === 'th' ? 'ประเภทงาน' : 'Work Type'} <span className="text-red-400">*</span>
          </label>
          <select value={department} onChange={e => { setDepartment(e.target.value); setCategoryId(''); }} className="select-field" required>
            <option value="">{lang === 'th' ? 'เลือกประเภทงาน' : 'Select work type'}</option>
            <option value="MAINTENANCE">🔧 {lang === 'th' ? 'งานช่าง' : 'Maintenance'}</option>
            <option value="IT">💻 {lang === 'th' ? 'งานไอที' : 'IT'}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">{t.ticket.category} <span className="text-red-400">*</span></label>
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="select-field" required>
            {categories.map(c => (
              <option key={c.category_id} value={c.category_id}>
                {lang === 'th' ? c.main_th : c.main_en} {lang === 'th' ? (c.sub_th ? `- ${c.sub_th}` : '') : (c.sub_en ? `- ${c.sub_en}` : '')}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">{t.ticket.priority}</label>
          <select value={priority} onChange={e => setPriority(e.target.value as any)} className="select-field">
            <option value="non_urgent">{lang === 'th' ? '⚪ ไม่เร่งด่วน' : 'Non-urgent'}{getSlaLabel('non_urgent') ? ` - ${getSlaLabel('non_urgent')}` : ''}</option>
            <option value="low">{lang === 'th' ? '🟢 ต่ำ' : 'Low'}{getSlaLabel('low') ? ` - ${getSlaLabel('low')}` : ''}</option>
            <option value="medium">{lang === 'th' ? '🔵 ปานกลาง' : 'Medium'}{getSlaLabel('medium') ? ` - ${getSlaLabel('medium')}` : ''}</option>
            <option value="high">{lang === 'th' ? '🟠 สูง' : 'High'}{getSlaLabel('high') ? ` - ${getSlaLabel('high')}` : ''}</option>
            <option value="urgent">{lang === 'th' ? '🔴 ด่วนมาก' : 'Urgent'}{getSlaLabel('urgent') ? ` - ${getSlaLabel('urgent')}` : ''}</option>
          </select>
          {slaConfig[priority] && (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              <span>SLA: {getSlaLabel(priority)}</span>
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">{t.ticket.description} <span className="text-red-400">*</span></label>
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          className="input-field min-h-[120px] resize-y" placeholder={t.ticket.descriptionPlaceholder} required />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-1.5">
          <Camera className="w-4 h-4" />
          {lang === 'th' ? 'แนบรูปภาพ (ไม่เกิน 5 รูป)' : 'Attach Photos (max 5)'}
        </label>
        {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-3">
            {images.map((img, i) => (
              <div key={i} className="relative group rounded-lg overflow-hidden bg-navy-800 border border-navy-600 aspect-square">
                <img src={img.preview} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 p-1 bg-red-600/80 hover:bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        {images.length < 5 && (
          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-navy-500 hover:border-gold-500 rounded-lg text-gray-400 hover:text-gold-400 transition-colors text-sm">
            <ImagePlus className="w-5 h-5" />
            {lang === 'th' ? 'แตะเพื่อเลือกรูปภาพ' : 'Tap to select photos'}
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{error}
        </div>
      )}

      <button type="submit" disabled={loading || success} className="btn-primary flex items-center gap-2">
        {loading ? (
          <><Loader2 className="w-5 h-5 animate-spin" />{uploadingImages ? (lang === 'th' ? 'กำลังอัพโหลดรูป...' : 'Uploading photos...') : t.ticket.submitting}</>
        ) : (
          <><Send className="w-5 h-5" />{t.ticket.submit}</>
        )}
      </button>
    </form>

    {/* Success Modal */}
    {success && createdTicket && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm fade-in" onClick={() => { setSuccess(false); setCreatedTicket(null); }}>
        <div className="bg-gradient-to-br from-navy-800 to-navy-900 border-2 border-gold-500/50 rounded-2xl overflow-hidden shadow-2xl shadow-gold-500/10 max-w-md w-full" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="bg-gradient-to-r from-gold-600 to-gold-500 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-3xl">✅</span>
              <div>
                <p className="text-ink font-bold">{lang === 'th' ? 'แจ้งซ่อมสำเร็จ' : 'Ticket Submitted'}</p>
                <p className="text-navy-900/80 text-xs">{new Date().toLocaleString(lang === 'th' ? 'th-TH' : 'en-US')}</p>
              </div>
            </div>
            <span className="bg-navy-900/30 text-ink px-3 py-1 rounded-full text-xs font-mono font-bold">
              {createdTicket.ticket_number}
            </span>
          </div>

          {/* Body */}
          <div className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500 text-xs">{t.ticket.branch}</span>
                <p className="text-ink font-medium">🏨 {BRANCHES.find(b=>b.branch_code===createdTicket.branch_code)?.branch_name || createdTicket.branch_code}</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs">{lang === 'th' ? 'แผนกผู้แจ้ง' : 'Reporter Dept'}</span>
                <p className="text-ink font-medium">{DEPARTMENTS.find(d=>d.code===createdTicket.department)?.icon} {lang === 'th' ? DEPARTMENTS.find(d=>d.code===createdTicket.department)?.name_th : DEPARTMENTS.find(d=>d.code===createdTicket.department)?.name_en}</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs">{t.ticket.locationDetail}</span>
                <p className="text-ink">📍 {createdTicket.location_detail}</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs">{t.ticket.priority}</span>
                <p className="text-ink">{
                  ({urgent:'🔴 ด่วนมาก',high:'🟠 ด่วน',medium:'🔵 ปานกลาง',low:'🟢 ต่ำ',non_urgent:'⚪ ทั่วไป'} as any)[createdTicket.priority] || createdTicket.priority
                }</p>
              </div>
            </div>
            <div>
              <span className="text-gray-500 text-xs">{t.ticket.description}</span>
              <p className="text-gray-300 text-sm mt-0.5 bg-navy-950/50 rounded-lg p-2.5 border border-navy-700/50">{createdTicket.description}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="px-5 pb-5 flex gap-2">
            <button
              onClick={async (e) => {
                e.stopPropagation();
                const lineText = `📢 แจ้งซ่อมใหม่\n🔢 ${createdTicket.ticket_number}\n🏨 ${BRANCHES.find(b=>b.branch_code===createdTicket.branch_code)?.branch_name || createdTicket.branch_code}\n📍 ${createdTicket.location_detail}\n📝 ${createdTicket.description}\n⏱️ ความเร่งด่วน: ${createdTicket.priority}\n━━━━━━━━━━━━\n🏨 Hotel Fix Desk`;
                await navigator.clipboard.writeText(lineText);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="flex-1 bg-green-600 hover:bg-green-500 text-white rounded-lg py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2"
            >
              {copied ? '✅ ' + (lang === 'th' ? 'คัดลอกแล้ว' : 'Copied!') : '📋 ' + (lang === 'th' ? 'คัดลอกส่ง LINE' : 'Copy for LINE')}
            </button>
            <button
              onClick={() => { setSuccess(false); setCreatedTicket(null); }}
              className="px-4 py-2.5 bg-navy-700 hover:bg-navy-600 text-gray-300 rounded-lg text-sm font-medium transition-all"
            >
              {lang === 'th' ? 'แจ้งใหม่' : 'New Ticket'}
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  );
}
