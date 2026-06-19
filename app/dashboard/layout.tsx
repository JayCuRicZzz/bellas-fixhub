'use client';

import { useState } from 'react';
import { AuthProvider } from '@/components/AuthProvider';
import { I18nProvider } from '@/lib/i18n/i18n';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <I18nProvider>
      <AuthProvider>
        <div className="flex h-screen overflow-hidden">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Navbar onMenuClick={() => setSidebarOpen(true)} />
            <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-navy-950">
              {children}
            </main>
          </div>
        </div>
      </AuthProvider>
    </I18nProvider>
  );
}
