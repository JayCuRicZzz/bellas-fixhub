'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './authprovider';
import { useI18n } from '../lib/i18n/i18n';
import { DEPARTMENTS, getDepartmentByCode } from '../types';
import Logo from './logo';
import {
  LayoutDashboard,
  PlusCircle,
  BarChart3,
  Bot,
  FileText,
  Wrench,
  LogOut,
  X,
  Globe,
  Shield,
  ClipboardList,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t, lang, toggleLang } = useI18n();

  // Get user's department info
  const userDept = user?.department ? getDepartmentByCode(user.department) : null;

  const navItems = [
    { href: '/dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
    { href: '/dashboard/create', label: t.nav.createTicket, icon: PlusCircle },
    { href: '/dashboard/reports', label: t.nav.reports, icon: BarChart3 },
    { href: '/ai', label: t.nav.aiAssistant, icon: Bot },
    { href: '/ai/report', label: t.nav.aiReport, icon: FileText },
  ];

  // PM link for all users
  navItems.push({ href: '/dashboard/pm', label: '📅 ตาราง PM', icon: ClipboardList });

  // Add admin links for admin/GM users
  if (['admin', 'gm'].includes(user?.role || '')) {
    navItems.push({ href: '/dashboard/admin/pm', label: '⚙️ จัดการ PM', icon: Wrench });
    navItems.push({ href: '/dashboard/admin', label: t.nav.admin || 'Admin', icon: Shield });
    navItems.push({ href: '/dashboard/admin/line-settings', label: '⚙️ LINE Bot', icon: Shield });
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside suppressHydrationWarning
        className={`
          fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-navy-800 to-navy-900 border-r border-navy-700/50 z-50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >
        {/* Logo */}
        <div className="px-4 py-3 border-b border-navy-700/50">
          <Link href="/dashboard" className="block group">
            <div className="rounded-xl bg-white/90 p-2 inline-block mb-2 shadow-lg shadow-gold-500/10">
              <img src="/logo.jpg" alt="Bellas FixHub" className="h-10 w-auto" />
            </div>
            <p className="text-base font-extrabold tracking-tight text-white group-hover:text-gold-400 transition-colors">
              Bellas <span className="text-gold-400">Fix</span>Hub
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">
              {lang === 'th' ? 'ระบบแจ้งซ่อมบำรุงช่างและไอที' : 'Maintenance & IT Repair System'} · BellaVilla Pattaya
            </p>
          </Link>
          <button onClick={onClose} className="lg:hidden absolute right-4 top-3 p-1 rounded-lg hover:bg-navy-700 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User info */}
        <div className="px-4 py-3 border-b border-navy-700/50">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-white truncate">{user?.full_name || user?.username}</p>
            {userDept && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-navy-700 text-gray-400 flex-shrink-0">
                {userDept.icon} {lang === 'th' ? userDept.name_th : userDept.name_en}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{user?.role} · {user?.branch_code || 'HQ'}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-all duration-200 group relative
                  ${isActive
                    ? 'bg-gold-500/10 text-gold-500 border-l-2 border-gold-500 shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-navy-700/50 hover:pl-4 border-l-2 border-transparent'
                  }
                `}
              >
                <Icon className="w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                {item.label}
                {isActive && (
                  <span className="absolute right-2 w-1.5 h-1.5 rounded-full bg-gold-500" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-navy-700/50 space-y-3">
          {/* Language Toggle */}
          <button
            onClick={toggleLang}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-navy-700/50 w-full transition-all duration-200 group"
          >
            <Globe className="w-5 h-5 group-hover:scale-110 transition-transform" />
            🌐 {lang === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นไทย'}
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-900/20 w-full transition-all duration-200 group"
          >
            <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
            {t.auth.logout}
          </button>

          {/* Developer Info */}
          <div className="text-center text-xs text-gray-500 pt-2 border-t border-navy-700/50 px-1">
            <p className="text-gold-500/70">🛠️ {t.auth.devBy} นายเดชาธร เดชอนุรักษ์ · 👾 JayCuRicZzz</p>
            <p className="text-gray-600 mt-0.5">🐞 {t.auth.contactIssue} 📞 094-492-6155</p>
          </div>
        </div>
      </aside>
    </>
  );
}
