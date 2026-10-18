'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../../components/authprovider';
import { useI18n } from '../../../../lib/i18n/i18n';
import { Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import EscalationSettings from '../../../../components/escalationsettings';

export default function LineSettingsPage() {
  const { user, token } = useAuth();
  const { lang } = useI18n();
  const router = useRouter();

  // Block non-admin (including GM)
  useEffect(() => {
    if (user && user.role !== 'admin') router.push('/dashboard');
  }, [user, router]);

  const [accessToken, setAccessToken] = useState('');
  const [targetIdMaint, setTargetIdMaint] = useState('');
  const [targetIdIT, setTargetIdIT] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [testing, setTesting] = useState<'' | 'MAINT' | 'IT'>('');
  const [testMsg, setTestMsg] = useState('');

  const handleSendSummary = async (group: 'MAINT' | 'IT') => {
    setTesting(group); setTestMsg(''); setError('');
    try {
      const res = await fetch('/api/admin/line-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'send-summary', group }),
      });
      const d = await res.json();
      if (res.ok && d.success) setTestMsg(lang === 'th' ? `ส่งรูปสรุปวันนี้เข้ากลุ่ม${group === 'IT' ? 'ไอที' : 'ช่าง'}แล้ว ✅` : `Summary sent ✅`);
      else setError(d.reason || (d.error && JSON.stringify(d.error)) || 'ส่งไม่สำเร็จ');
    } catch {
      setError(lang === 'th' ? 'เกิดข้อผิดพลาด' : 'Connection error');
    } finally {
      setTesting('');
    }
  };

  const handleTest = async (group: 'MAINT' | 'IT') => {
    setTesting(group); setTestMsg(''); setError('');
    try {
      const res = await fetch('/api/admin/line-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'test', group }),
      });
      const d = await res.json();
      if (res.ok && d.success) setTestMsg(lang === 'th' ? `ส่งข้อความทดสอบไปกลุ่ม${group === 'IT' ? 'ไอที' : 'ช่าง'}แล้ว ✅` : `Test message sent to ${group} group ✅`);
      else setError(d.error || (d.result && JSON.stringify(d.result)) || 'ส่งไม่สำเร็จ');
    } catch {
      setError(lang === 'th' ? 'เกิดข้อผิดพลาด' : 'Connection error');
    } finally {
      setTesting('');
    }
  };

  // Only admin/GM can access
  useEffect(() => {
    if (user && !['admin', 'gm'].includes(user.role || '')) {
      router.push('/dashboard');
    }
  }, [user]);

  useEffect(() => {
    fetch('/api/admin/line-config', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.accessToken) setAccessToken(d.accessToken);
        if (d.targetIdMaint) setTargetIdMaint(d.targetIdMaint);
        if (d.targetIdIT) setTargetIdIT(d.targetIdIT);
      })
      .catch(() => {});
  }, [token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/admin/line-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          accessToken: accessToken || undefined,
          targetIdMaint: targetIdMaint || undefined,
          targetIdIT: targetIdIT || undefined,
        }),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const d = await res.json();
        setError(d.error || 'Save failed');
      }
    } catch {
      setError(lang === 'th' ? 'เกิดข้อผิดพลาด' : 'Connection error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 fade-in max-w-2xl">
      <h2 className="text-2xl font-bold text-ink flex items-center gap-2">
        ⚙️ {lang === 'th' ? 'ตั้งค่า LINE Bot' : 'LINE Bot Settings'}
      </h2>
      <p className="text-gray-400 text-sm">
        {lang === 'th'
          ? 'ตั้งค่า Token และกลุ่มเป้าหมายสำหรับส่งแจ้งเตือน LINE'
          : 'Configure LINE tokens and target groups for notifications'}
      </p>

      <form onSubmit={handleSave} className="space-y-5">
        <div className="card space-y-4">
          <h3 className="text-ink font-semibold">🔑 LINE Access Token</h3>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Channel Access Token</label>
            <input type="text" value={accessToken} onChange={e => setAccessToken(e.target.value)}
              className="input-field font-mono text-sm" placeholder="กรอก LINE Access Token..." />
          </div>
        </div>

        <div className="card space-y-4">
          <h3 className="text-ink font-semibold">🎯 กลุ่มเป้าหมาย (LINE Group IDs)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">🔧 กลุ่มช่าง (Maintenance)</label>
              <input type="text" value={targetIdMaint} onChange={e => setTargetIdMaint(e.target.value)}
                className="input-field font-mono text-sm" placeholder="LINE Target ID (ช่าง)..." />
              <p className="text-xs text-gray-500 mt-1">งาน MAINTENANCE/EN จะส่งเข้ากลุ่มนี้</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">💻 กลุ่มไอที</label>
              <input type="text" value={targetIdIT} onChange={e => setTargetIdIT(e.target.value)}
                className="input-field font-mono text-sm" placeholder="LINE Target ID (ไอที)..." />
              <p className="text-xs text-gray-500 mt-1">งาน IT จะส่งเข้ากลุ่มนี้</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{error}
          </div>
        )}
        {success && (
          <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />{lang === 'th' ? 'บันทึกสำเร็จ' : 'Saved successfully'}
          </div>
        )}

        {testMsg && (
          <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />{testMsg}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {lang === 'th' ? 'บันทึก' : 'Save Settings'}
          </button>
          <button type="button" disabled={!!testing} onClick={() => handleTest('MAINT')} className="btn-secondary flex items-center gap-2">
            {testing === 'MAINT' ? <Loader2 className="w-4 h-4 animate-spin" /> : '🔧'} {lang === 'th' ? 'ทดสอบส่งกลุ่มช่าง' : 'Test Maintenance group'}
          </button>
          <button type="button" disabled={!!testing} onClick={() => handleTest('IT')} className="btn-secondary flex items-center gap-2">
            {testing === 'IT' ? <Loader2 className="w-4 h-4 animate-spin" /> : '💻'} {lang === 'th' ? 'ทดสอบส่งกลุ่มไอที' : 'Test IT group'}
          </button>
        </div>
        <p className="text-xs text-gray-500">{lang === 'th' ? 'กด "บันทึก" ก่อนทดสอบ หากเพิ่งเปลี่ยนค่า' : 'Save first if you just changed values.'}</p>

        <div className="card space-y-3">
          <h3 className="font-semibold text-ink">🖼️ {lang === 'th' ? 'สรุปรายวัน (รูปภาพ) — ส่งอัตโนมัติทุกวัน 22:00 น.' : 'Daily summary image — auto 22:00'}</h3>
          <p className="text-xs text-gray-400">{lang === 'th'
            ? 'ส่งรูปตารางสรุปแต่ละสาขา + ข้อความสั้นใน 1 ครั้ง (นับโควตา 1 ข้อความต่อสมาชิกกลุ่ม)'
            : 'One push per group: image + short text (counts once per member).'}</p>
          <div className="flex flex-wrap gap-2">
            <a href="/api/reports/daily-image?dept=MAINT" target="_blank" rel="noopener" className="btn-secondary text-sm">👁️ {lang === 'th' ? 'ดูตัวอย่าง (ช่าง)' : 'Preview (Maint)'}</a>
            <a href="/api/reports/daily-image?dept=IT" target="_blank" rel="noopener" className="btn-secondary text-sm">👁️ {lang === 'th' ? 'ดูตัวอย่าง (ไอที)' : 'Preview (IT)'}</a>
            <button type="button" disabled={!!testing} onClick={() => handleSendSummary('MAINT')} className="btn-secondary text-sm">📤 {lang === 'th' ? 'ส่งสรุปตอนนี้ (ช่าง)' : 'Send now (Maint)'}</button>
            <button type="button" disabled={!!testing} onClick={() => handleSendSummary('IT')} className="btn-secondary text-sm">📤 {lang === 'th' ? 'ส่งสรุปตอนนี้ (ไอที)' : 'Send now (IT)'}</button>
          </div>
        </div>
      </form>
      <EscalationSettings token={token} />
    </div>
  );
}
