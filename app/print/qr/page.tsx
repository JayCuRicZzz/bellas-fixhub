'use client';
// แผ่น QR สำหรับพิมพ์ติดห้อง/อุปกรณ์ (A4, 3×4 ดวงต่อหน้า) — สแกนแล้วเปิดฟอร์มแจ้งซ่อมพร้อมห้อง/อุปกรณ์
//   อยู่นอก /dashboard เพื่อไม่ให้มีเมนู/แถบด้านบนติดไปตอนพิมพ์
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { AuthProvider } from '../../../components/authprovider';
import { BRANCHES } from '../../../types';
import { assetTypeOf } from '../../../lib/asset-types';

interface Item { id: number; title: string; sub: string; token: string; icon: string }

function Sheet() {
  const [items, setItems] = useState<(Item & { svg: string })[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [base, setBase] = useState('');

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const kind = sp.get('kind') === 'asset' ? 'asset' : 'location';
    const branch = sp.get('branch') || '';
    const ids = new Set((sp.get('ids') || '').split(',').map(Number).filter(Boolean));
    const origin = window.location.origin;
    setBase(origin.replace(/^https?:\/\//, ''));
    (async () => {
      try {
        const r = await fetch(`/api/${kind === 'asset' ? 'assets' : 'locations'}?branch=${encodeURIComponent(branch)}`);
        const rows: any[] = await r.json();
        if (!Array.isArray(rows)) throw new Error();
        const list: Item[] = rows
          .filter(x => !ids.size || ids.has(kind === 'asset' ? x.asset_id : x.location_id))
          .map(x => kind === 'asset'
            ? { id: x.asset_id, title: x.name, sub: [x.asset_code, x.location_name].filter(Boolean).join(' · '), token: x.qr_token, icon: assetTypeOf(x.asset_type)?.icon || '🔧' }
            : { id: x.location_id, title: x.name, sub: x.kind === 'area' ? 'พื้นที่ส่วนกลาง' : (x.floor ? `ชั้น ${x.floor}` : ''), token: x.qr_token, icon: x.kind === 'area' ? '📍' : '🛏️' });
        const withSvg = await Promise.all(list.map(async it => ({
          ...it,
          svg: await QRCode.toString(`${origin}/r/${it.token}`, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#0d1423', light: '#ffffff' } }),
        })));
        setItems(withSvg); setState('ready');
      } catch { setState('error'); }
    })();
  }, []);

  const branchCode = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('branch') || '' : '';
  const branchName = BRANCHES.find(b => b.branch_code === branchCode)?.branch_name || branchCode;

  return (
    <div className="qr-page">
      <style>{`
        html, body { background: #e5e7eb !important; color: #111 !important; }
        .qr-page { font-family: Sarabun, 'Noto Sans Thai', sans-serif; padding: 16px; }
        .qr-bar { max-width: 210mm; margin: 0 auto 12px; display: flex; gap: 8px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
        .qr-bar button { background: #d4a825; color: #0d1423; border: 0; border-radius: 8px; padding: 10px 18px; font-weight: 700; cursor: pointer; }
        .qr-sheet { width: 210mm; margin: 0 auto; background: #fff; padding: 8mm; box-sizing: border-box;
                    display: grid; grid-template-columns: repeat(3, 1fr); gap: 5mm; }
        .qr-card { border: 1.5px dashed #9ca3af; border-radius: 4mm; padding: 4mm 3mm 3mm; text-align: center; break-inside: avoid;
                   display: flex; flex-direction: column; align-items: center; height: 66mm; box-sizing: border-box; }
        .qr-head { font-size: 11pt; font-weight: 700; color: #0d1423; }
        .qr-head span { color: #b8921e; }
        .qr-code { width: 34mm; height: 34mm; margin: 2mm 0; }
        .qr-code svg { width: 100%; height: 100%; display: block; }
        .qr-title { font-size: 13pt; font-weight: 700; color: #0d1423; line-height: 1.15; }
        .qr-sub { font-size: 8pt; color: #4b5563; }
        .qr-foot { margin-top: auto; font-size: 7pt; color: #6b7280; }
        @media print {
          html, body { background: #fff !important; }
          .qr-page { padding: 0; }
          .qr-bar { display: none !important; }
          .qr-sheet { padding: 6mm; width: auto; }
          @page { size: A4; margin: 6mm; }
        }
      `}</style>
      <div className="qr-bar">
        <div><b>QR แจ้งซ่อม</b> · {branchName} · {items.length} ดวง</div>
        <button onClick={() => window.print()} disabled={state !== 'ready'}>🖨️ พิมพ์</button>
      </div>
      {state === 'loading' && <p style={{ textAlign: 'center' }}>กำลังสร้าง QR…</p>}
      {state === 'error' && <p style={{ textAlign: 'center', color: '#b42318' }}>โหลดข้อมูลไม่สำเร็จ — กรุณาเข้าสู่ระบบแล้วลองใหม่</p>}
      {state === 'ready' && items.length === 0 && <p style={{ textAlign: 'center' }}>ไม่มีรายการ</p>}
      {state === 'ready' && items.length > 0 && (
        <div className="qr-sheet">
          {items.map(it => (
            <div className="qr-card" key={it.id}>
              <div className="qr-head">🔧 แจ้งซ่อม · Bellas <span>Fix</span>Hub</div>
              <div className="qr-code" dangerouslySetInnerHTML={{ __html: it.svg }} />
              <div className="qr-title">{it.icon} {it.title}</div>
              {it.sub && <div className="qr-sub">{it.sub}</div>}
              <div className="qr-foot">สำหรับพนักงาน: สแกนแล้วเข้าระบบเพื่อแจ้งซ่อม · {base}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function QrPrintPage() {
  return <AuthProvider><Sheet /></AuthProvider>;
}
