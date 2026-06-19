'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/authprovider';
import { useI18n } from '@/lib/i18n/i18n';
import { useRouter } from 'next/navigation';
import { Lock, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function SetPasswordPage() {
  const { user, token, loading: authLoading } = useAuth();
  const { t, lang } = useI18n();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 4) {
      setError(lang === 'th' ? 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร' : 'Password must be at least 4 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError(lang === 'th' ? 'รหัสผ่านไม่ตรงกัน กรุณาลองใหม่' : 'Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password, confirmPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push('/dashboard'), 2000);
      } else {
        setError(data.error || (lang === 'th' ? 'เกิดข้อผิดพลาด' : 'Error'));
      }
    } catch {
      setError(lang === 'th' ? 'เกิดข้อผิดพลาดในการเชื่อมต่อ' : 'Connection error');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0f1a 0%, #111a2e 40%, #1a2744 100%)',
      }}>
        <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a0f1a 0%, #111a2e 40%, #1a2744 100%)',
      padding: '1rem', fontFamily: "'Sarabun', sans-serif",
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 80, height: 80, borderRadius: 20, overflow: 'hidden',
            boxShadow: '0 8px 30px rgba(212,168,37,0.3)', background: '#0d1423',
          }}>
            <img src="/logo.jpg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <h1 style={{ color: 'white', fontSize: '1.3rem', fontWeight: 700, margin: '1rem 0 4px' }}>
            {lang === 'th' ? 'ตั้งรหัสผ่านครั้งแรก' : 'Set Your Password'}
          </h1>
          <p style={{ color: '#6786c3', fontSize: '0.875rem', margin: 0 }}>
            {lang === 'th' ? `ยินดีต้อนรับ, ${user.full_name || user.username}` : `Welcome, ${user.full_name || user.username}`}
          </p>
        </div>

        {/* Form */}
        <div style={{
          background: 'rgba(17, 26, 46, 0.9)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '1.75rem',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}>
          {success ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <p style={{ color: 'white', fontSize: '1.1rem', fontWeight: 600 }}>
                {lang === 'th' ? 'ตั้งรหัสผ่านสำเร็จ!' : 'Password set!'}
              </p>
              <p style={{ color: '#6786c3', fontSize: '0.85rem' }}>
                {lang === 'th' ? 'กำลังนำทางไปหน้าแดชบอร์ด...' : 'Redirecting to dashboard...'}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ color: '#8da4d2', fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <Lock className="w-3.5 h-3.5 inline mr-1" />
                  {lang === 'th' ? 'รหัสผ่านใหม่' : 'New Password'}
                </label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder={lang === 'th' ? 'อย่างน้อย 4 ตัวอักษร' : 'At least 4 characters'}
                  autoFocus required
                  style={{
                    width: '100%', padding: '12px 16px', background: 'rgba(13,20,35,0.8)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
                    color: 'white', fontSize: '1rem', outline: 'none', boxSizing: 'border-box',
                  }} />
              </div>

              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ color: '#8da4d2', fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {lang === 'th' ? 'ยืนยันรหัสผ่าน' : 'Confirm Password'}
                </label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder={lang === 'th' ? 'ใส่รหัสผ่านอีกครั้ง' : 'Enter password again'}
                  required
                  style={{
                    width: '100%', padding: '12px 16px', background: 'rgba(13,20,35,0.8)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
                    color: 'white', fontSize: '1rem', outline: 'none', boxSizing: 'border-box',
                  }} />
              </div>

              {error && (
                <div style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                  color: '#fca5a5', padding: '10px 14px', borderRadius: 8, fontSize: '0.85rem',
                  marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                </div>
              )}

              <button type="submit" disabled={submitting} style={{
                width: '100%', padding: 14, background: 'linear-gradient(135deg, #d4a825, #b8921e)',
                border: 'none', borderRadius: 10, color: '#0d1423', fontSize: '1.05rem',
                fontWeight: 700, cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.7 : 1,
                boxShadow: '0 4px 15px rgba(212,168,37,0.25)',
              }}>
                {submitting ? (
                  <><Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                  {lang === 'th' ? 'กำลังบันทึก...' : 'Saving...'}</>
                ) : (
                  lang === 'th' ? 'บันทึกรหัสผ่าน' : 'Save Password'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
