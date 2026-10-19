import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0d1423',
};

export const metadata: Metadata = {
  title: 'Bellas FixHub — ระบบแจ้งซ่อมบำรุง',
  description: 'ระบบแจ้งซ่อมบำรุงโรงแรมอัจฉริยะ พร้อม AI และรองรับ 2 ภาษา',
  icons: {
    icon: [{ url: '/favicon-32.png', sizes: '32x32', type: 'image/png' }, { url: '/favicon-48.png', sizes: '48x48', type: 'image/png' }],
    shortcut: '/favicon-32.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Bellas FixHub',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* ตั้งธีมก่อนวาดหน้า กันกระพริบ — ค่าเริ่มต้นมืด · ผู้ใช้เลือกเองได้ด้วยสวิตช์ (components/themetoggle.tsx) */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('fixhub-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);if(t==='light'){var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content','#eef2f8')}}}catch(e){}` }} />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
