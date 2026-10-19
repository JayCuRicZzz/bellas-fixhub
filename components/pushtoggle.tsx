'use client';

// ปุ่ม "เปิดแจ้งเตือนงานใหม่บนเครื่องนี้" (Web Push) — ฟรี ใช้คู่กับ LINE
import { useEffect, useState } from 'react';
import { BellRing, BellOff, Loader2 } from 'lucide-react';

type State = 'loading' | 'unsupported' | 'ios-install' | 'denied' | 'off' | 'on';

function b64ToUint8(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

export default function PushToggle({ token }: { token?: string | null }) {
  const [state, setState] = useState<State>('loading');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };

  useEffect(() => {
    (async () => {
      const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        setState(ios && !standalone ? 'ios-install' : 'unsupported'); return;
      }
      if (Notification.permission === 'denied') { setState('denied'); return; }
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        const sub = await reg.pushManager.getSubscription();
        if (!sub) { setState('off'); return; }
        const r = await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`, { headers });
        const d = await r.json().catch(() => ({}));
        setState(d.subscribed ? 'on' : 'off');
      } catch { setState('off'); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const enable = async () => {
    setBusy(true); setMsg('');
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setState(perm === 'denied' ? 'denied' : 'off'); return; }
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const k = await fetch('/api/push/subscribe', { headers }).then(r => r.json());
      if (!k.publicKey) throw new Error(k.error || 'โหลดกุญแจไม่สำเร็จ');
      let sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(k.publicKey) });
      const r = await fetch('/api/push/subscribe', { method: 'POST', headers, body: JSON.stringify(sub.toJSON()) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `บันทึกไม่สำเร็จ (${r.status})`);
      setState('on'); setMsg('เปิดแล้ว ✓ กด "ทดสอบ" เพื่อลองรับแจ้งเตือน');
    } catch (e: any) {
      setMsg('เปิดไม่สำเร็จ: ' + (e?.message || 'ลองใหม่อีกครั้ง'));
    } finally { setBusy(false); }
  };

  const disable = async () => {
    setBusy(true); setMsg('');
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/subscribe', { method: 'DELETE', headers, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setState('off');
    } catch (e: any) { setMsg('ปิดไม่สำเร็จ: ' + (e?.message || '')); }
    finally { setBusy(false); }
  };

  const test = async () => {
    setBusy(true); setMsg('');
    const r = await fetch('/api/push/test', { method: 'POST', headers });
    const d = await r.json().catch(() => ({}));
    setMsg(r.ok ? 'ส่งแล้ว — ดูแจ้งเตือนที่มุมจอ/หน้าจอล็อก' : (d.error || 'ส่งไม่สำเร็จ'));
    setBusy(false);
  };

  if (state === 'loading') return null;

  return (
    <div className="card p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3" data-t="push-toggle">
      <div className="flex items-start gap-3 flex-1">
        {state === 'on' ? <BellRing className="w-5 h-5 text-green-400 shrink-0 mt-0.5" /> : <BellOff className="w-5 h-5 text-gold-500 shrink-0 mt-0.5" />}
        <div className="text-sm">
          {state === 'on' && <p className="text-ink font-medium">เครื่องนี้รับแจ้งเตือนงานใหม่แล้ว</p>}
          {state === 'off' && <p className="text-ink font-medium">รับแจ้งเตือนงานใหม่บนเครื่องนี้ (ฟรี เด้งเหมือนแอป)</p>}
          {state === 'denied' && <p className="text-ink font-medium">การแจ้งเตือนถูกปิดไว้ — เปิดได้ที่ตั้งค่าเบราว์เซอร์ → การแจ้งเตือน → อนุญาตเว็บนี้</p>}
          {state === 'ios-install' && <p className="text-ink font-medium">iPhone: กดปุ่มแชร์ → “เพิ่มไปยังหน้าจอโฮม” แล้วเปิดจากไอคอน FixHub จึงจะเปิดแจ้งเตือนได้</p>}
          {state === 'unsupported' && <p className="text-ink font-medium">เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน — ใช้ Chrome หรือเพิ่มแอปลงหน้าจอหลัก</p>}
          {msg && <p className="text-gray-400 mt-1">{msg}</p>}
        </div>
      </div>
      <div className="flex gap-2">
        {state === 'off' && (
          <button onClick={enable} disabled={busy} className="btn-primary text-sm inline-flex items-center gap-2" data-t="push-enable">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />} เปิดการแจ้งเตือน
          </button>
        )}
        {state === 'on' && (
          <>
            <button onClick={test} disabled={busy} className="btn-secondary text-sm" data-t="push-test">ทดสอบ</button>
            <button onClick={disable} disabled={busy} className="btn-secondary text-sm" data-t="push-disable">ปิด</button>
          </>
        )}
      </div>
    </div>
  );
}
