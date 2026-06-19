'use client';

import { useState, useEffect } from 'react';
import { I18nProvider, useI18n } from '@/lib/i18n/i18n';
import { Eye, EyeOff } from 'lucide-react';

function LoginContent({ hasError }: { hasError: boolean }) {
  const { t, lang, toggleLang } = useI18n();
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a0f1a 0%, #111a2e 40%, #1a2744 100%)',
      padding: '1rem', fontFamily: "'Sarabun', 'Noto Sans Thai', sans-serif",
    }}>
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(212,168,37,0.08) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(65,104,180,0.1) 0%, transparent 70%)', borderRadius: '50%' }} />
      </div>

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }} suppressHydrationWarning>
        <div style={{ textAlign: 'right', marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
          <button onClick={() => lang !== 'th' && toggleLang()}
            style={{ width: '44px', height: '44px', borderRadius: '50%', background: lang==='th' ? 'rgba(212,168,37,0.25)' : 'rgba(255,255,255,0.06)', border: lang==='th' ? '2px solid rgba(212,168,37,0.5)' : '1px solid rgba(255,255,255,0.12)', color: lang==='th' ? '#d4a825' : '#8da4d2', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', letterSpacing: '0.5px' }}
            title="ภาษาไทย">TH</button>
          <button onClick={() => lang !== 'en' && toggleLang()}
            style={{ width: '44px', height: '44px', borderRadius: '50%', background: lang==='en' ? 'rgba(212,168,37,0.25)' : 'rgba(255,255,255,0.06)', border: lang==='en' ? '2px solid rgba(212,168,37,0.5)' : '1px solid rgba(255,255,255,0.12)', color: lang==='en' ? '#d4a825' : '#8da4d2', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', letterSpacing: '0.5px' }}
            title="English">EN</button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            marginBottom: '8px', padding: '12px 20px',
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 4px 32px rgba(212,168,37,0.15)',
          }}>
            <img src="/logo.jpg" alt="Bellas FixHub" style={{ height: '64px', width: 'auto', display: 'block', margin: '0 auto' }} />
          </div>
          <h1 style={{
            color: 'white', fontSize: '1.75rem', fontWeight: 700,
            margin: '0 0 4px 0', letterSpacing: '0.5px', textAlign: 'center',
          }}>
            Bellas <span style={{ color: '#D96F3B' }}>Fix</span>Hub
          </h1>
          <p style={{ color: '#6786c3', fontSize: '0.9rem', margin: '0 0 1.5rem 0', textAlign: 'center' }}>{t.app.subtitle}</p>
       
        </div>

        <form method="POST" action="/api/auth/login" style={{
          background: 'rgba(17, 26, 46, 0.9)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px',
          padding: '1.75rem', boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}>
          {hasError && (
            <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '1rem', color: '#fca5a5', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚠️ {t.auth.invalidCredentials}
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: '#8da4d2', fontSize: '0.8rem', fontWeight: 500, marginBottom: '6px' }}>{t.auth.username}</label>
            <input name="username" required placeholder={t.auth.usernamePlaceholder}
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '12px 14px', color: 'white', fontSize: '0.95rem', outline: 'none', transition: 'border 0.2s' }}
              onFocus={e => e.target.style.borderColor = '#d4a825'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', color: '#8da4d2', fontSize: '0.8rem', fontWeight: 500, marginBottom: '6px' }}>{t.auth.password}</label>
            <div style={{ position: 'relative' }}>
              <input name="password" type={showPassword ? 'text' : 'password'} required placeholder={t.auth.passwordPlaceholder}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '12px 14px', color: 'white', fontSize: '0.95rem', outline: 'none', paddingRight: '44px', transition: 'border 0.2s' }}
                onFocus={e => e.target.style.borderColor = '#d4a825'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8da4d2', cursor: 'pointer', padding: '4px' }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" style={{
            width: '100%', background: 'linear-gradient(135deg, #d4a825, #e5b840)', border: 'none',
            borderRadius: '10px', padding: '13px', color: '#0a0f1a', fontSize: '0.95rem', fontWeight: 700,
            cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '0.5px',
          }} onMouseEnter={e => { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 8px 25px rgba(212,168,37,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='none'; }}>
            {t.auth.login}
          </button>

        </form>

        <div style={{ textAlign: 'center', color: '#4168b4', fontSize: '0.7rem', opacity: mounted ? 0.7 : 0, transition: 'opacity 0.5s ease 0.3s', marginTop: '1rem' }}>
          <p style={{ margin: '0 0 2px 0' }}>🛠️ {t.auth.devBy} <span style={{ color: '#d4a825', fontWeight: 500 }}>นายเดชาธร เดชอนุรักษ์</span> · 👾 JayCuRicZzz ·</p>
          <p style={{ margin: 0 }}>🐞 {t.auth.contactIssue} 📞 <a href="tel:0944926155" style={{ color: '#d4a825', textDecoration: 'none' }}>094-492-6155</a></p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <I18nProvider>
      <LoginContent hasError={false} />
    </I18nProvider>
  );
}
