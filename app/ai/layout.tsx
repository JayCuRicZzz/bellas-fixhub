'use client';
// NETLIFY-MARKER-v4

import { useAuth } from '../../components/authprovider';
import Navbar from '../../components/navbar';
import Sidebar from '../../components/sidebar';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AILayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-navy-950">
          {children}
        </main>
      </div>
    </div>
  );
}
