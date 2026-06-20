'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../../components/authprovider';
import { useI18n } from '../../../../lib/i18n/i18n';
import { Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
        ⚙️ {lang === 'th' ? 'ตั้งค่า LINE Bot' : 'LINE Bot Settings'}
      </h2>
      <p className="text-gray-400 text-sm">
        {lang === 'th'
          ? 'ตั้งค่า Token และกลุ่มเป้าหมายสำหรับส่งแจ้งเตือน LINE'
          : 'Configure LINE tokens and target groups for notifications'}
      </p>

      <form onSubmit={handleSave} className="space-y-5">
        <div className="card space-y-4">
          <h3 className="text-white font-semibold">🔑 LINE Access Token</h3>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Channel Access Token</label>
            <input type="text" value={accessToken} onChange={e => setAccessToken(e.target.value)}
              className="input-field font-mono text-sm" placeholder="กรอก LINE Access Token..." />
          </div>
        </div>

        <div className="card space-y-4">
          <h3 className="text-white font-semibold">🎯 กลุ่มเป้าหมาย (LINE Group IDs)</h3>
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

        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {lang === 'th' ? 'บันทึก' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
