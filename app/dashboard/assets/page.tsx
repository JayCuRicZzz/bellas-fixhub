'use client';
// ทะเบียนทรัพย์สิน + ห้อง/จุด และ QR
//   แท็บ "อุปกรณ์": รายการ/ค้นหา/เพิ่ม/แก้ไข · ประวัติซ่อม · ค่าอะไหล่ · ประกัน · ซ่อมบ่อย
//   แท็บ "ห้อง/จุด": เพิ่มทีละช่วง (301-320) · พิมพ์ QR ติดห้อง
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../components/authprovider';
import { BRANCHES } from '../../../types';
import { ASSET_TYPES, assetTypeOf, isAssetManager } from '../../../lib/asset-types';
import { Plus, Search, QrCode, X, Loader2, Pencil, Trash2, History, Printer } from 'lucide-react';

interface Location { location_id: number; branch_code: string; code: string; name: string; kind: string; floor: string | null; qr_token: string; asset_count: number; open_tickets: number; tickets_90d: number }
interface Asset {
  asset_id: number; asset_code: string; branch_code: string; location_id: number | null; location_name: string | null; dept_type: string;
  asset_type: string; name: string; brand: string | null; model: string | null; serial_no: string | null; install_date: string | null;
  warranty_until: string | null; vendor: string | null; note: string | null; qr_token: string;
  repair_count: number; repairs_90d: number; open_tickets: number; last_repair_at: string | null; parts_cost: string;
}

const STATUS_TH: Record<string, string> = { PENDING: 'รอรับงาน', ACCEPTED: 'รับงานแล้ว', IN_PROGRESS: 'กำลังทำ', PAUSED: 'พักงาน', RESOLVED: 'ซ่อมเสร็จ', APPROVED: 'อนุมัติแล้ว', CANCELLED: 'ยกเลิก' };
const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : '-');
const baht = (n: any) => Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 });

export default function AssetsPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  useEffect(() => { if (user?.role === 'gm') router.replace('/dashboard'); }, [user, router]);  // GM ไม่เห็นหน้านี้
  const canManage = isAssetManager(user?.role);
  const auth = useMemo<Record<string, string>>(() => (token ? { Authorization: `Bearer ${token}` } : ({} as Record<string, string>)), [token]);
  const myBranches = useMemo(() => (user?.branches?.length ? BRANCHES.filter(b => user.branches!.includes(b.branch_code)) : BRANCHES), [user]);

  const [tab, setTab] = useState<'assets' | 'locations'>('assets');
  const [branch, setBranch] = useState('');
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => { if (!branch && myBranches.length) setBranch(user?.branch_code && myBranches.some(b => b.branch_code === user.branch_code) ? user.branch_code : myBranches[0].branch_code); }, [myBranches, user, branch]);

  const load = useCallback(async () => {
    if (!branch) return;
    setLoading(true);
    try {
      const [a, l] = await Promise.all([
        fetch(`/api/assets?branch=${branch}${type ? `&type=${type}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}`, { headers: auth }).then(r => r.json()),
        fetch(`/api/locations?branch=${branch}`, { headers: auth }).then(r => r.json()),
      ]);
      setAssets(Array.isArray(a) ? a : []);
      setLocations(Array.isArray(l) ? l : []);
    } catch { setErr('โหลดข้อมูลไม่สำเร็จ'); }
    finally { setLoading(false); }
  }, [branch, type, q, auth]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => { setSelected(new Set()); }, [tab, branch]);
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500); };

  // ── ฟอร์มอุปกรณ์ ──────────────────────────────────────────────────────
  const empty = { asset_type: 'AC', name: '', location_id: '', location_ids: [] as number[], quantity: 1, brand: '', model: '', serial_no: '', install_date: '', warranty_until: '', vendor: '', note: '' };
  const [form, setForm] = useState<any>(null);       // null = ปิด · {asset_id?} = แก้ไข
  const [saving, setSaving] = useState(false);
  const saveAsset = async () => {
    setSaving(true); setErr('');
    try {
      const editing = !!form.asset_id;
      const r = await fetch(editing ? `/api/assets/${form.asset_id}` : '/api/assets', {
        method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify({ ...form, branch_code: branch }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || 'บันทึกไม่สำเร็จ'); return; }
      flash(editing ? 'บันทึกแล้ว' : `เพิ่มแล้ว ${d.created?.length || 1} รายการ${d.created?.length ? ` (${d.created[0]}${d.created.length > 1 ? ' …' : ''})` : ''}`);
      setForm(null); load();
    } finally { setSaving(false); }
  };
  const retire = async (a: Asset) => {
    if (!confirm(`ปลดระวาง ${a.asset_code} ${a.name}? (ประวัติซ่อมยังเก็บไว้)`)) return;
    const r = await fetch(`/api/assets/${a.asset_id}`, { method: 'DELETE', headers: auth });
    if (r.ok) { flash('ปลดระวางแล้ว'); load(); }
  };

  // ── ประวัติอุปกรณ์ ───────────────────────────────────────────────────
  const [detail, setDetail] = useState<any>(null);
  const openDetail = async (a: Asset) => {
    setDetail({ asset: a, loading: true });
    const d = await fetch(`/api/assets/${a.asset_id}`, { headers: auth }).then(r => r.json()).catch(() => null);
    setDetail(d && d.asset ? d : { asset: a, tickets: [], parts: [] });
  };

  // ── ห้อง/จุด ─────────────────────────────────────────────────────────
  const [locForm, setLocForm] = useState<{ codes: string; kind: string; name_prefix: string } | null>(null);
  const saveLocations = async () => {
    setSaving(true); setErr('');
    try {
      const r = await fetch('/api/locations', { method: 'POST', headers: { 'Content-Type': 'application/json', ...auth }, body: JSON.stringify({ ...locForm, branch_code: branch }) });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || 'บันทึกไม่สำเร็จ'); return; }
      flash(`เพิ่ม/เปิดใช้ ${d.count} จุด`); setLocForm(null); load();
    } finally { setSaving(false); }
  };
  const removeLocation = async (l: Location) => {
    if (!confirm(`ปิดใช้งาน ${l.name}? QR ของจุดนี้จะใช้ไม่ได้`)) return;
    const r = await fetch(`/api/locations?id=${l.location_id}`, { method: 'DELETE', headers: auth });
    if (r.ok) { flash('ปิดใช้งานแล้ว'); load(); }
  };

  const toggle = (id: number) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const printHref = (kind: 'location' | 'asset') => `/print/qr?kind=${kind}&branch=${branch}${selected.size ? `&ids=${Array.from(selected).join(',')}` : ''}`;

  const warrantyBadge = (d: string | null) => {
    if (!d) return null;
    const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
    if (days < 0) return <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-500/15 text-gray-400">หมดประกัน</span>;
    return <span className={`text-[10px] px-1.5 py-0.5 rounded ${days <= 60 ? 'bg-amber-500/15 text-amber-400' : 'bg-green-500/15 text-green-400'}`}>ประกันถึง {fmtDate(d)}</span>;
  };

  return (
    <div className="space-y-5 fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-ink">🧰 ทรัพย์สิน & QR</h2>
          <p className="text-gray-400 text-sm mt-1">ทะเบียนอุปกรณ์ · ประวัติซ่อม · ห้อง/จุดพร้อม QR สำหรับสแกนแจ้งซ่อม</p>
        </div>
        <select value={branch} onChange={e => setBranch(e.target.value)} className="select-field !w-auto">
          {myBranches.map(b => <option key={b.branch_code} value={b.branch_code}>{b.branch_code} · {b.branch_name}</option>)}
        </select>
      </div>

      <div className="flex gap-2">
        {([['assets', `อุปกรณ์ (${assets.length})`], ['locations', `ห้อง/จุด (${locations.length})`]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === k ? 'bg-gold-500 text-navy-900' : 'bg-navy-800 text-gray-400 hover:text-ink'}`}>{label}</button>
        ))}
      </div>

      {msg && <div className="px-4 py-2 rounded-lg bg-green-500/10 text-green-400 text-sm">{msg}</div>}
      {err && <div className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 text-sm flex justify-between">{err}<button onClick={() => setErr('')}><X className="w-4 h-4" /></button></div>}

      {tab === 'assets' ? (
        <>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหารหัส ชื่อ ยี่ห้อ รุ่น S/N ห้อง…" className="input-field !pl-9" />
            </div>
            <select value={type} onChange={e => setType(e.target.value)} className="select-field !w-auto">
              <option value="">ทุกประเภท</option>
              {ASSET_TYPES.map(t => <option key={t.code} value={t.code}>{t.icon} {t.th}</option>)}
            </select>
            <a href={printHref('asset')} target="_blank" rel="noopener" className="btn-secondary text-sm inline-flex items-center gap-1.5">
              <Printer className="w-4 h-4" /> พิมพ์ QR {selected.size ? `(${selected.size})` : 'ทั้งหมด'}
            </a>
            {canManage && <button onClick={() => setForm({ ...empty })} className="btn-primary text-sm inline-flex items-center gap-1.5"><Plus className="w-4 h-4" /> เพิ่มอุปกรณ์</button>}
          </div>

          <div className="card !p-0 overflow-x-auto">
            {loading ? <div className="p-4 space-y-2">{[1, 2, 3].map(i => <div key={i} className="skeleton h-10" />)}</div>
              : assets.length === 0 ? <p className="text-gray-500 text-center py-10 text-sm">ยังไม่มีอุปกรณ์ในสาขานี้{canManage ? ' — กด "เพิ่มอุปกรณ์"' : ''}</p>
              : (
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-navy-700 text-left text-gray-500 text-xs">
                    <th className="py-2.5 px-3 w-8"></th><th className="py-2.5 px-3">อุปกรณ์</th><th className="py-2.5 px-3">ห้อง/จุด</th>
                    <th className="py-2.5 px-3 text-center">ซ่อม 90 วัน</th><th className="py-2.5 px-3 text-right">ค่าอะไหล่</th><th className="py-2.5 px-3"></th>
                  </tr></thead>
                  <tbody>
                    {assets.map(a => {
                      const t = assetTypeOf(a.asset_type);
                      return (
                        <tr key={a.asset_id} className="border-b border-navy-700/50 hover:bg-navy-700/30">
                          <td className="px-3"><input type="checkbox" checked={selected.has(a.asset_id)} onChange={() => toggle(a.asset_id)} /></td>
                          <td className="py-2 px-3">
                            <div className="text-ink font-medium">{t?.icon} {a.name}</div>
                            <div className="text-xs text-gray-500 flex flex-wrap gap-x-2 items-center">
                              <span className="font-mono">{a.asset_code}</span>
                              {[a.brand, a.model].filter(Boolean).join(' ')}
                              {warrantyBadge(a.warranty_until)}
                              {a.open_tickets > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400">งานค้าง {a.open_tickets}</span>}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-gray-300">{a.location_name || '-'}</td>
                          <td className="py-2 px-3 text-center">
                            <span className={a.repairs_90d >= 3 ? 'text-red-400 font-bold' : a.repairs_90d >= 2 ? 'text-amber-400 font-semibold' : 'text-gray-300'}>{a.repairs_90d}</span>
                            <span className="text-gray-500 text-xs"> / {a.repair_count}</span>
                          </td>
                          <td className="py-2 px-3 text-right text-gray-300">{Number(a.parts_cost) > 0 ? `฿${baht(a.parts_cost)}` : '-'}</td>
                          <td className="py-2 px-3">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => openDetail(a)} title="ประวัติซ่อม" className="p-1.5 rounded hover:bg-navy-600 text-gray-400 hover:text-ink"><History className="w-4 h-4" /></button>
                              <Link href={`/dashboard/create?qr=${a.qr_token}`} title="แจ้งซ่อมอุปกรณ์นี้" className="p-1.5 rounded hover:bg-navy-600 text-gray-400 hover:text-ink"><Plus className="w-4 h-4" /></Link>
                              {canManage && <>
                                <button onClick={() => setForm({ ...a, location_id: a.location_id || '', install_date: a.install_date?.slice(0, 10) || '', warranty_until: a.warranty_until?.slice(0, 10) || '' })} title="แก้ไข" className="p-1.5 rounded hover:bg-navy-600 text-gray-400 hover:text-ink"><Pencil className="w-4 h-4" /></button>
                                <button onClick={() => retire(a)} title="ปลดระวาง" className="p-1.5 rounded hover:bg-red-900/30 text-gray-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                              </>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
          </div>
          <p className="text-xs text-gray-500">ตัวเลข "ซ่อม 90 วัน" สีแดง = ซ่อม 3 ครั้งขึ้นไปใน 90 วัน ควรพิจารณาเปลี่ยนเครื่อง · ตัวเลขหลัง / = ซ่อมทั้งหมด</p>
        </>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 items-center">
            <a href={printHref('location')} target="_blank" rel="noopener" className="btn-secondary text-sm inline-flex items-center gap-1.5">
              <Printer className="w-4 h-4" /> พิมพ์ QR ติดห้อง {selected.size ? `(${selected.size})` : 'ทั้งหมด'}
            </a>
            {canManage && <button onClick={() => setLocForm({ codes: '', kind: 'room', name_prefix: 'ห้อง' })} className="btn-primary text-sm inline-flex items-center gap-1.5"><Plus className="w-4 h-4" /> เพิ่มห้อง/จุด</button>}
          </div>
          <div className="card !p-0 overflow-x-auto">
            {loading ? <div className="p-4 space-y-2">{[1, 2].map(i => <div key={i} className="skeleton h-10" />)}</div>
              : locations.length === 0 ? <p className="text-gray-500 text-center py-10 text-sm">ยังไม่มีห้อง/จุดในสาขานี้{canManage ? ' — กด "เพิ่มห้อง/จุด" แล้วพิมพ์เช่น 101-120, 201-220, LOBBY' : ''}</p>
              : (
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-navy-700 text-left text-gray-500 text-xs">
                    <th className="py-2.5 px-3 w-8"><input type="checkbox" checked={selected.size === locations.length} onChange={e => setSelected(e.target.checked ? new Set(locations.map(l => l.location_id)) : new Set())} /></th>
                    <th className="py-2.5 px-3">ห้อง/จุด</th><th className="py-2.5 px-3 text-center">อุปกรณ์</th>
                    <th className="py-2.5 px-3 text-center">งานค้าง</th><th className="py-2.5 px-3 text-center">แจ้ง 90 วัน</th><th className="py-2.5 px-3"></th>
                  </tr></thead>
                  <tbody>
                    {locations.map(l => (
                      <tr key={l.location_id} className="border-b border-navy-700/50 hover:bg-navy-700/30">
                        <td className="px-3"><input type="checkbox" checked={selected.has(l.location_id)} onChange={() => toggle(l.location_id)} /></td>
                        <td className="py-2 px-3"><span className="text-ink font-medium">{l.name}</span> <span className="text-xs text-gray-500">{l.kind === 'area' ? 'พื้นที่ส่วนกลาง' : l.floor ? `ชั้น ${l.floor}` : ''}</span></td>
                        <td className="py-2 px-3 text-center text-gray-300">{l.asset_count || '-'}</td>
                        <td className="py-2 px-3 text-center">{l.open_tickets ? <span className="text-orange-400 font-semibold">{l.open_tickets}</span> : <span className="text-gray-500">-</span>}</td>
                        <td className="py-2 px-3 text-center"><span className={l.tickets_90d >= 5 ? 'text-red-400 font-bold' : 'text-gray-300'}>{l.tickets_90d || '-'}</span></td>
                        <td className="py-2 px-3">
                          <div className="flex justify-end gap-1">
                            <a href={`/print/qr?kind=location&branch=${branch}&ids=${l.location_id}`} target="_blank" rel="noopener" title="QR" className="p-1.5 rounded hover:bg-navy-600 text-gray-400 hover:text-ink"><QrCode className="w-4 h-4" /></a>
                            <Link href={`/dashboard/create?qr=${l.qr_token}`} title="แจ้งซ่อมห้องนี้" className="p-1.5 rounded hover:bg-navy-600 text-gray-400 hover:text-ink"><Plus className="w-4 h-4" /></Link>
                            {canManage && <button onClick={() => removeLocation(l)} title="ปิดใช้งาน" className="p-1.5 rounded hover:bg-red-900/30 text-gray-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
        </>
      )}

      {/* ── ฟอร์มอุปกรณ์ ── */}
      {form && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center pt-8 px-4 overflow-y-auto" onClick={() => setForm(null)}>
          <div className="bg-navy-800 border border-navy-600 rounded-xl w-full max-w-2xl p-5 space-y-4 mb-8" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-ink">{form.asset_id ? `แก้ไข ${form.asset_code}` : 'เพิ่มอุปกรณ์'}</h3>
              <button onClick={() => setForm(null)} className="text-gray-400 hover:text-ink"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="text-sm text-gray-400">ประเภท
                <select disabled={!!form.asset_id} value={form.asset_type} onChange={e => setForm({ ...form, asset_type: e.target.value })} className="select-field mt-1">
                  {ASSET_TYPES.map(t => <option key={t.code} value={t.code}>{t.icon} {t.th} ({t.dept === 'IT' ? 'ไอที' : 'ช่าง'})</option>)}
                </select>
              </label>
              <label className="text-sm text-gray-400">ชื่อเรียก
                <input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={assetTypeOf(form.asset_type)?.th} className="input-field mt-1" />
              </label>
              {!form.asset_id && (
                <label className="text-sm text-gray-400 sm:col-span-2">ติดตั้งที่ห้อง/จุด (เลือกได้หลายห้อง = เพิ่มห้องละ 1 เครื่อง)
                  <select multiple value={form.location_ids.map(String)} onChange={e => setForm({ ...form, location_ids: Array.from(e.target.selectedOptions).map(o => Number(o.value)) })}
                          className="select-field mt-1 !h-32">
                    {locations.map(l => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}
                  </select>
                  <span className="text-xs text-gray-500">ไม่เลือก = ไม่ระบุห้อง · กด Ctrl/⌘ หรือลากเพื่อเลือกหลายห้อง · เลือกแล้ว {form.location_ids.length} ห้อง</span>
                </label>
              )}
              {form.asset_id && (
                <label className="text-sm text-gray-400">ห้อง/จุด
                  <select value={form.location_id || ''} onChange={e => setForm({ ...form, location_id: e.target.value })} className="select-field mt-1">
                    <option value="">— ไม่ระบุ —</option>
                    {locations.map(l => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}
                  </select>
                </label>
              )}
              {!form.asset_id && form.location_ids.length <= 1 && (
                <label className="text-sm text-gray-400">จำนวนเครื่อง
                  <input type="number" min={1} max={200} value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} className="input-field mt-1" />
                </label>
              )}
              <label className="text-sm text-gray-400">ยี่ห้อ<input value={form.brand || ''} onChange={e => setForm({ ...form, brand: e.target.value })} className="input-field mt-1" /></label>
              <label className="text-sm text-gray-400">รุ่น<input value={form.model || ''} onChange={e => setForm({ ...form, model: e.target.value })} className="input-field mt-1" /></label>
              <label className="text-sm text-gray-400">Serial No.<input value={form.serial_no || ''} onChange={e => setForm({ ...form, serial_no: e.target.value })} className="input-field mt-1" /></label>
              <label className="text-sm text-gray-400">ผู้ขาย/ผู้รับประกัน<input value={form.vendor || ''} onChange={e => setForm({ ...form, vendor: e.target.value })} className="input-field mt-1" /></label>
              <label className="text-sm text-gray-400">วันที่ติดตั้ง<input type="date" value={form.install_date || ''} onChange={e => setForm({ ...form, install_date: e.target.value })} className="input-field mt-1" /></label>
              <label className="text-sm text-gray-400">ประกันถึง<input type="date" value={form.warranty_until || ''} onChange={e => setForm({ ...form, warranty_until: e.target.value })} className="input-field mt-1" /></label>
              <label className="text-sm text-gray-400 sm:col-span-2">หมายเหตุ<textarea value={form.note || ''} onChange={e => setForm({ ...form, note: e.target.value })} rows={2} className="input-field mt-1" /></label>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setForm(null)} className="btn-secondary text-sm">ยกเลิก</button>
              <button onClick={saveAsset} disabled={saving} className="btn-primary text-sm">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'บันทึก'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ฟอร์มห้อง/จุด ── */}
      {locForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4" onClick={() => setLocForm(null)}>
          <div className="bg-navy-800 border border-navy-600 rounded-xl w-full max-w-md p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-ink">เพิ่มห้อง/จุด — {branch}</h3>
            <label className="text-sm text-gray-400 block">ประเภท
              <select value={locForm.kind} onChange={e => setLocForm({ ...locForm, kind: e.target.value, name_prefix: e.target.value === 'room' ? 'ห้อง' : '' })} className="select-field mt-1">
                <option value="room">ห้องพัก</option><option value="area">พื้นที่ส่วนกลาง (ล็อบบี้ สระ ห้องเครื่อง ฯลฯ)</option>
              </select>
            </label>
            <label className="text-sm text-gray-400 block">เลขห้อง/รหัสจุด
              <textarea value={locForm.codes} onChange={e => setLocForm({ ...locForm, codes: e.target.value })} rows={3} className="input-field mt-1"
                        placeholder={locForm.kind === 'room' ? '101-120, 201-220, 301' : 'ล็อบบี้, สระว่ายน้ำ, ห้องเครื่อง'} />
              <span className="text-xs text-gray-500">คั่นด้วย , หรือขึ้นบรรทัดใหม่ · ใส่ช่วงได้ เช่น 101-120</span>
            </label>
            <label className="text-sm text-gray-400 block">คำนำหน้าชื่อ
              <input value={locForm.name_prefix} onChange={e => setLocForm({ ...locForm, name_prefix: e.target.value })} className="input-field mt-1" placeholder="ห้อง" />
            </label>
            <div className="flex justify-end gap-2">
              <button onClick={() => setLocForm(null)} className="btn-secondary text-sm">ยกเลิก</button>
              <button onClick={saveLocations} disabled={saving || !locForm.codes.trim()} className="btn-primary text-sm">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'เพิ่ม'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ประวัติอุปกรณ์ ── */}
      {detail && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center pt-8 px-4 overflow-y-auto" onClick={() => setDetail(null)}>
          <div className="bg-navy-800 border border-navy-600 rounded-xl w-full max-w-2xl p-5 space-y-4 mb-8" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start gap-3">
              <div>
                <h3 className="text-lg font-bold text-ink">{assetTypeOf(detail.asset.asset_type)?.icon} {detail.asset.name}</h3>
                <p className="text-xs text-gray-400 font-mono">{detail.asset.asset_code}</p>
                <p className="text-sm text-gray-400 mt-1">
                  {[detail.asset.brand, detail.asset.model, detail.asset.serial_no && `S/N ${detail.asset.serial_no}`].filter(Boolean).join(' · ') || '-'}
                  {detail.asset.location_name ? ` · 📍 ${detail.asset.location_name}` : ''}
                </p>
                <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-400">
                  {detail.asset.install_date && <span>ติดตั้ง {fmtDate(detail.asset.install_date)}</span>}
                  {warrantyBadge(detail.asset.warranty_until)}
                  {detail.asset.vendor && <span>ผู้ขาย: {detail.asset.vendor}</span>}
                </div>
              </div>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-ink"><X className="w-5 h-5" /></button>
            </div>
            {detail.loading ? <div className="skeleton h-24" /> : (
              <>
                <div>
                  <h4 className="text-sm font-semibold text-ink mb-2">ประวัติซ่อม ({detail.tickets?.length || 0})</h4>
                  {!detail.tickets?.length ? <p className="text-sm text-gray-500">ยังไม่มีประวัติซ่อม</p> : (
                    <div className="space-y-1.5 max-h-72 overflow-y-auto">
                      {detail.tickets.map((t: any) => (
                        <Link key={t.ticket_id} href={`/dashboard/${t.ticket_id}`} className="block px-3 py-2 rounded-lg bg-navy-700/50 hover:bg-navy-700 text-sm">
                          <div className="flex justify-between gap-2">
                            <span className="font-mono text-gold-400 text-xs">{t.ticket_number}</span>
                            <span className="text-xs text-gray-400">{fmtDate(t.created_at)} · {STATUS_TH[t.status] || t.status}</span>
                          </div>
                          <div className="text-gray-300 line-clamp-1">{t.description}</div>
                          {t.technician_name && <div className="text-xs text-gray-500">👷 {t.technician_name}</div>}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                {detail.parts?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-ink mb-2">อะไหล่ที่ใช้ — รวม ฿{baht(detail.parts.reduce((s: number, p: any) => s + -Number(p.qty) * Number(p.unit_cost), 0))}</h4>
                    <div className="space-y-1 text-sm">
                      {detail.parts.map((p: any) => (
                        <div key={p.move_id} className="flex justify-between text-gray-300">
                          <span>{p.name} × {Math.abs(Number(p.qty))} {p.unit} {p.kind === 'RETURN' && <span className="text-xs text-gray-500">(คืน)</span>}</span>
                          <span className="text-gray-500 text-xs">{p.ticket_number} · {fmtDate(p.moved_at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
