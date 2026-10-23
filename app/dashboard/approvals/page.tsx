'use client';

// รออนุมัติ — งานที่ช่าง/ไอทีกด "ซ่อมเสร็จ" แล้ว เรียงเป็นคิว: อนุมัติใบนี้ → ใบถัดไปขึ้นมาเองทันที
// หัวหน้าช่างเห็นงานช่าง · หัวหน้าไอทีเห็นงานไอที · GM/แอดมินเลือกได้ทั้งสองแผนก
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, RotateCcw, SkipForward, ExternalLink } from 'lucide-react';
import { useAuth } from '../../../components/authprovider';
import { useCat } from '../../../lib/i18n/extra';

const APPROVERS = ['sup', 'supit', 'admin', 'gm'];
const PRIO: Record<string, string> = { urgent: '🔴 ด่วนมาก', high: '🟠 สูง', medium: '🔵 ปานกลาง', low: '⚪ น้อย', non_urgent: '⚫ ไม่เร่งด่วน' };
const DIFF = [
  { v: 'easy', l: '🟢 ง่าย' }, { v: 'medium', l: '🔵 ปานกลาง' }, { v: 'hard', l: '🟠 ยาก' }, { v: 'very_hard', l: '🔴 ยากมาก' },
];
const fmt = (d?: string | null) => d ? new Date(d).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-';
const dur = (m?: number | null) => m == null ? '-' : m < 60 ? `${m} นาที` : `${Math.floor(m / 60)} ชม. ${m % 60} นาที`;

export default function ApprovalsPage() {
  const { user, token } = useAuth();
  const cat = useCat();
  const role = user?.role || '';
  const lockedDept = role === 'sup' ? 'MAINTENANCE' : role === 'supit' ? 'IT' : '';
  const [dept, setDept] = useState<'MAINTENANCE' | 'IT'>('MAINTENANCE');
  useEffect(() => { if (lockedDept) setDept(lockedDept as any); }, [lockedDept]);
  const authH: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const [items, setItems] = useState<any[] | null>(null);
  const [counts, setCounts] = useState<{ MAINTENANCE: number; IT: number }>({ MAINTENANCE: 0, IT: 0 });
  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [diff, setDiff] = useState('');
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason] = useState('');
  const [doneCount, setDoneCount] = useState(0);
  const [zoom, setZoom] = useState<string | null>(null);

  const load = async () => {
    try {
      const get = (d: string) => fetch(`/api/tickets?status=RESOLVED&dept_type=${d}&limit=200`, { headers: authH, cache: 'no-store' }).then(r => r.json());
      const [m, i] = await Promise.all([get('MAINTENANCE'), get('IT')]);
      const sortQ = (a: any[]) => (Array.isArray(a) ? a : []).sort((x, y) => String(x.resolved_at || '').localeCompare(String(y.resolved_at || '')));
      const mm = sortQ(m), ii = sortQ(i);
      setCounts({ MAINTENANCE: mm.length, IT: ii.length });
      setItems(dept === 'IT' ? ii : mm);
      setIdx(0);
    } catch { setItems([]); }
  };
  useEffect(() => { if (user && APPROVERS.includes(role)) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user, token, dept]);

  const t = items && items.length ? items[Math.min(idx, items.length - 1)] : null;
  useEffect(() => { setDiff(t?.difficulty || ''); setRejectMode(false); setReason(''); }, [t?.ticket_id]);
  const ownWork = t && t.resolved_by === user?.id && !['admin', 'gm'].includes(role);
  const before = useMemo(() => (t?.image_items || []).filter((p: any) => p.type === 'report'), [t]);
  const after = useMemo(() => (t?.image_items || []).filter((p: any) => p.type !== 'report'), [t]);

  // อนุมัติ/ตีกลับแล้ว เอาใบนั้นออกจากคิว → ใบถัดไปขึ้นมาแทนที่ตำแหน่งเดิมทันที
  const removeCurrent = () => {
    const next = (items || []).filter(x => x.ticket_id !== t.ticket_id);
    setItems(next);
    setIdx(i => Math.min(i, Math.max(0, next.length - 1)));
    setCounts(c => ({ ...c, [dept]: Math.max(0, c[dept] - 1) }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const act = async (status: 'APPROVED' | 'REJECTED') => {
    if (!t) return;
    setBusy(true); setMsg(null);
    try {
      const body: any = { status };
      if (status === 'APPROVED' && diff) body.difficulty = diff;
      if (status === 'REJECTED') body.pending_reason = reason.trim();
      const r = await fetch(`/api/tickets/${t.ticket_id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authH }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        setDoneCount(n => n + 1);
        setMsg({ ok: true, t: `${status === 'APPROVED' ? '✅ อนุมัติแล้ว' : '↩️ ตีกลับแล้ว'} ${t.ticket_number}` });
        removeCurrent();
      } else if (r.status === 409) {
        setMsg({ ok: false, t: `${t.ticket_number}: ${d.error || 'สถานะเปลี่ยนไปแล้ว'} — ข้ามไปใบถัดไป` });
        removeCurrent();
      } else {
        setMsg({ ok: false, t: d.error || 'ทำรายการไม่สำเร็จ' });
      }
    } catch { setMsg({ ok: false, t: 'เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้ง' }); }
    finally { setBusy(false); }
  };

  if (user && !APPROVERS.includes(role)) {
    return <div className="card text-center text-gray-400 py-10">หน้านี้สำหรับหัวหน้าช่าง หัวหน้าไอที GM และแอดมิน</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4 fade-in" data-t="approvals-page">
      <div>
        <h2 className="text-2xl font-bold text-ink">✅ รออนุมัติงานซ่อม</h2>
        <p className="text-gray-400 text-sm mt-1">งานที่ช่าง/ไอทีกด “ซ่อมเสร็จ” แล้ว · เก่าสุดขึ้นก่อน · กดอนุมัติแล้วใบถัดไปขึ้นมาเอง</p>
      </div>

      <div className="flex gap-2" data-t="approval-tabs">
        {(['MAINTENANCE', 'IT'] as const).filter(d => !lockedDept || d === lockedDept).map(d => (
          <button key={d} onClick={() => setDept(d)} data-t={`approval-tab-${d}`}
            className={`px-4 py-2 rounded-xl border text-sm font-semibold min-h-[44px] ${dept === d ? 'bg-gold-500/20 border-gold-500 text-gold-400' : 'border-navy-600 text-gray-400'}`}>
            {d === 'IT' ? '💻 ไอที' : '🔧 ช่าง'}
            <span className="ml-2 px-2 py-0.5 rounded-full bg-navy-900/80 text-xs text-gold-500">{counts[d]}</span>
          </button>
        ))}
      </div>

      {msg && (
        <div className={`rounded-lg px-4 py-2 text-sm ${msg.ok ? 'bg-green-600/15 text-green-500 border border-green-600/40' : 'bg-red-600/15 text-red-400 border border-red-600/40'}`} data-t="approval-msg">
          {msg.t}{msg.ok && items ? ` · เหลือ ${items.length} ใบ` : ''}
        </div>
      )}

      {items == null ? (
        <div className="card flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-gold-500" /></div>
      ) : !t ? (
        <div className="card text-center py-12" data-t="approval-empty">
          <p className="text-4xl">🎉</p>
          <p className="text-ink font-semibold mt-2">ไม่มีงานรออนุมัติ{dept === 'IT' ? 'ของไอที' : 'ของช่าง'}แล้ว</p>
          {doneCount > 0 && <p className="text-gray-400 text-sm mt-1">รอบนี้จัดการไป {doneCount} ใบ</p>}
        </div>
      ) : (
        <div className="card space-y-4" data-t="approval-card" key={t.ticket_id}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-gray-400">ใบที่ {idx + 1} จาก {items.length}</p>
              <p className="font-mono text-lg font-bold text-gold-400" data-t="approval-number">{t.ticket_number}</p>
              <p className="text-ink font-semibold">{t.branch_code} · {t.location_detail}</p>
              <p className="text-gray-400 text-sm">{cat(t)[0]} · {PRIO[t.priority] || t.priority}</p>
            </div>
            <Link href={`/dashboard/${t.ticket_id}`} className="btn-secondary text-xs inline-flex items-center gap-1 shrink-0">
              <ExternalLink className="w-3.5 h-3.5" /> เปิดใบงาน
            </Link>
          </div>

          <div className="rounded-lg bg-navy-900/40 p-3 text-sm space-y-1">
            <p className="text-gray-400">อาการที่แจ้ง</p>
            <p className="text-ink">{t.description}</p>
            <p className="text-xs text-gray-500">แจ้งโดย {t.reporter_name || '-'} · {fmt(t.created_at)}</p>
          </div>

          <div className="rounded-lg border border-green-600/40 bg-green-600/10 p-3 text-sm space-y-1">
            <p className="text-green-500 font-semibold">🔧 ช่างบันทึกว่าซ่อมแล้ว</p>
            <p className="text-ink">{t.pending_reason || <span className="text-gray-500">— ไม่ได้เขียนบันทึก —</span>}</p>
            <p className="text-xs text-gray-400">
              โดย {t.resolved_by_name || t.technician_name || '-'} · เสร็จ {fmt(t.resolved_at)} · ใช้เวลา {dur(t.sla_minutes)}
              {' · '}{t.sla_overdue ? <span className="text-red-400 font-semibold">เกิน SLA</span> : <span className="text-green-500">ทัน SLA</span>}
            </p>
            {t.refrigerant_refilled && <p className="text-xs text-sky-400">🧊 เติมน้ำยาแอร์{t.refrigerant_type && t.refrigerant_type !== 'OTHER' ? ' ' + t.refrigerant_type : ''}{t.refrigerant_repeat_of ? ` · 🚨 เติมซ้ำใน ${t.refrigerant_repeat_days} วัน` : ''}</p>}
          </div>

          {(before.length > 0 || after.length > 0) && (
            <div className="grid grid-cols-2 gap-3">
              {[['📸 ก่อนซ่อม', before], ['🔧 หลังซ่อม', after]].map(([label, arr]: any) => (
                <div key={label}>
                  <p className="text-xs text-gray-400 mb-1">{label} ({arr.length})</p>
                  <div className="grid grid-cols-2 gap-1">
                    {arr.length === 0 ? <p className="text-xs text-gray-600 col-span-2">ไม่มีรูป</p> : arr.slice(0, 4).map((p: any) => (
                      <button key={p.url} onClick={() => setZoom(p.url)} className="aspect-square overflow-hidden rounded-md bg-navy-900">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div>
            <p className="text-xs text-gray-400 mb-1">ระดับความยาก (ไม่บังคับ)</p>
            <div className="flex flex-wrap gap-2">
              {DIFF.map(d => (
                <button key={d.v} onClick={() => setDiff(diff === d.v ? '' : d.v)}
                  className={`px-3 py-1.5 rounded-lg border text-sm ${diff === d.v ? 'border-gold-500 bg-gold-500/20 text-gold-400 font-semibold' : 'border-navy-600 text-gray-400'}`}>
                  {d.l}
                </button>
              ))}
            </div>
          </div>

          {ownWork && <p className="text-sm text-amber-500">⚠️ ใบนี้คุณเป็นคนซ่อมเอง — ให้หัวหน้าคนอื่น / GM / แอดมินอนุมัติ</p>}

          {rejectMode ? (
            <div className="space-y-2" data-t="reject-box">
              <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} maxLength={500} placeholder="เหตุผลที่ตีกลับ เช่น ยังไม่เรียบร้อย / ไม่มีรูปหลังซ่อม"
                className="w-full px-3 py-2 bg-navy-700 border border-navy-500 rounded-lg text-ink text-sm" />
              <div className="flex gap-2">
                <button onClick={() => act('REJECTED')} disabled={busy || reason.trim().length < 3} data-t="reject-confirm"
                  className="flex-1 min-h-[48px] rounded-xl bg-orange-600 text-white font-semibold disabled:opacity-40">↩️ ยืนยันตีกลับให้ช่างทำใหม่</button>
                <button onClick={() => setRejectMode(false)} className="px-4 min-h-[48px] rounded-xl bg-navy-700 text-gray-300">ปิด</button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-[1fr_auto_auto] gap-2">
              <button onClick={() => act('APPROVED')} disabled={busy || !!ownWork} data-t="approve-btn"
                className="min-h-[56px] rounded-xl bg-green-600 hover:bg-green-500 text-white text-lg font-bold flex items-center justify-center gap-2 disabled:opacity-40">
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />} อนุมัติ
              </button>
              <button onClick={() => setRejectMode(true)} disabled={busy} data-t="reject-btn"
                className="px-4 min-h-[56px] rounded-xl border border-orange-500/60 text-orange-400 font-semibold flex items-center gap-1">
                <RotateCcw className="w-4 h-4" /> ตีกลับ
              </button>
              <button onClick={() => setIdx(i => (items.length ? (i + 1) % items.length : 0))} disabled={busy || items.length < 2} data-t="skip-btn"
                className="px-4 min-h-[56px] rounded-xl border border-navy-600 text-gray-400 flex items-center gap-1 disabled:opacity-40">
                <SkipForward className="w-4 h-4" /> ข้าม
              </button>
            </div>
          )}
        </div>
      )}

      {/* คิวที่เหลือ — กดเลือกใบได้ */}
      {items && items.length > 1 && (
        <div className="card" data-t="approval-queue">
          <p className="text-sm text-gray-400 mb-2">คิวรออนุมัติ ({items.length})</p>
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {items.map((q, i) => (
              <button key={q.ticket_id} onClick={() => { setIdx(i); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex justify-between gap-2 ${i === idx ? 'bg-gold-500/15 text-gold-400' : 'hover:bg-navy-700/50 text-gray-300'}`}>
                <span className="truncate">{q.ticket_number} · {q.branch_code} · {q.location_detail}</span>
                <span className="text-xs text-gray-500 shrink-0">{fmt(q.resolved_at)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {zoom && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4" onClick={() => setZoom(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </div>
  );
}
