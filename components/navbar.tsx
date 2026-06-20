'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './authprovider';
import { useI18n } from '../lib/i18n/i18n';
import { getDepartmentByCode } from '../types';
import { Menu, Bell, LogOut } from 'lucide-react';
import Link from 'next/link';

// Track seen notification IDs in localStorage
function getSeenIds(): Set<number> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem('notif_seen_ids');
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function saveSeenIds(ids: Set<number>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('notif_seen_ids', JSON.stringify(Array.from(ids)));
}

export default function Navbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, logout, token } = useAuth();
  const { t, lang } = useI18n();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [seenIds, setSeenIds] = useState<Set<number>>(getSeenIds);
  const notifRef = useRef<HTMLDivElement>(null);

  const userDept = user?.department ? getDepartmentByCode(user.department) : null;

  // Fetch notifications and compute unseen count
  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/tickets?status=PENDING,IN_PROGRESS&limit=20', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      setNotifications(arr.slice(0, 10));
      // Count unseen: tickets NOT in seenIds
      const currentSeen = getSeenIds();
      const unseen = arr.filter((t: any) => !currentSeen.has(t.ticket_id));
      setNotifCount(unseen.length);
    } catch {}
  }, [token]);

  useEffect(() => {
    fetchNotifications();
    // Poll every 30s
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Mark all as seen when bell is opened
  const handleBellClick = () => {
    setNotifOpen(!notifOpen);
    if (!notifOpen) {
      // Opening — mark all current as seen
      const newSeen = getSeenIds();
      notifications.forEach((n: any) => newSeen.add(n.ticket_id));
      saveSeenIds(newSeen);
      setSeenIds(newSeen);
      setNotifCount(0);
    }
  };

  // Mark single notification as read
  const handleNotifClick = (ticketId: number) => {
    const newSeen = getSeenIds();
    newSeen.add(ticketId);
    saveSeenIds(newSeen);
    setSeenIds(newSeen);
    setNotifCount(prev => Math.max(0, prev - 1));
    setNotifOpen(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header data-nav-v2="true" className="bg-navy-800/95 backdrop-blur-sm border-b border-navy-700 h-14 sm:h-16 flex items-center justify-between px-3 sm:px-4 lg:px-6 sticky top-0 z-40">
      <div className="flex items-center gap-3 sm:gap-4">
        <button onClick={onMenuClick} className="lg:hidden p-2 rounded-lg hover:bg-navy-700 text-gray-400 touch-manipulation transition-all duration-200 active:scale-90">
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white drop-shadow-md">
            Bellas <span className="text-gold-400 drop-shadow-sm">Fix</span>Hub
          </h1>
          <p className="text-[11px] sm:text-xs text-gray-400 hidden sm:block">
              {lang === 'th' ? 'ระบบแจ้งซ่อมบำรุงช่างและไอที' : 'Maintenance & IT Repair System'} · BellaVilla Pattaya
            </p>
          </div>
        </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <div className="flex sm:hidden items-center gap-2">
          <span className="text-xs text-gray-400 truncate max-w-[80px]">{user?.full_name || user?.username}</span>
          <button onClick={logout} className="p-2 rounded-lg hover:bg-red-900/30 text-gray-400 hover:text-red-400 touch-manipulation transition-all duration-200 active:scale-90">
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-4">
          {/* Notification Bell */}
          <div ref={notifRef} className="relative">
            <button
              onClick={handleBellClick}
              className="p-2 rounded-lg hover:bg-navy-700 text-gray-400 relative transition-all duration-200"
            >
              <Bell className="w-5 h-5" />
              {notifCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-gold-500 text-navy-900 text-[10px] font-bold rounded-full px-1 shadow-lg shadow-gold-500/30">
                  {notifCount > 99 ? '99+' : notifCount}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-navy-800 border border-navy-600 rounded-xl shadow-2xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-navy-700 flex items-center justify-between">
                  <h3 className="text-white font-semibold text-sm">
                    {lang === 'th' ? 'การแจ้งเตือน' : 'Notifications'}
                  </h3>
                  <span className="text-xs text-gold-400 font-medium">{notifCount} {lang === 'th' ? 'รายการ' : 'items'}</span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-6">
                      {lang === 'th' ? 'ไม่มีการแจ้งเตือน' : 'No notifications'}
                    </p>
                  ) : (
                    notifications.map((n: any) => (
                      <Link
                        key={n.ticket_id}
                        href={`/dashboard/${n.ticket_id}`}
                        onClick={(e) => { e.preventDefault(); handleNotifClick(n.ticket_id); window.location.href = `/dashboard/${n.ticket_id}`; }}
                        className="block px-4 py-3 hover:bg-navy-700/50 transition-colors border-b border-navy-700/50 last:border-0"
                      >
                        <div className="flex items-start justify-between">
                          <div className="min-w-0">
                            <p className="text-white text-sm font-medium truncate">{n.ticket_number}</p>
                            <p className="text-gray-400 text-xs truncate mt-0.5">{n.location_detail}</p>
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ml-2 ${
                            n.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400' : 'bg-purple-500/20 text-purple-400'
                          }`}>
                            {n.status === 'PENDING' ? (lang === 'th' ? 'รอ' : 'Pending') : (lang === 'th' ? 'กำลังทำ' : 'Active')}
                          </span>
                        </div>
                        <p className="text-gray-500 text-[10px] mt-0.5">
                          {new Date(n.created_at).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US')}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
                {notifications.length > 0 && (
                  <Link
                    href="/dashboard"
                    onClick={() => setNotifOpen(false)}
                    className="block text-center text-xs text-gold-400 hover:text-gold-300 py-2.5 border-t border-navy-700 hover:bg-navy-700/30 transition-colors font-medium"
                  >
                    {lang === 'th' ? 'ดูทั้งหมด' : 'View All'} →
                  </Link>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 border-l border-navy-700 pl-4">
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                <p className="text-sm font-medium text-white">{user?.full_name || user?.username}</p>
                {userDept && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-navy-700 text-gray-400 border border-navy-600">
                    {userDept.icon} {lang === 'th' ? userDept.name_th : userDept.name_en}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">{user?.branch_code} · {user?.role}</p>
            </div>
            <button onClick={logout} className="p-2 rounded-lg hover:bg-red-900/30 text-gray-400 hover:text-red-400 transition-all duration-200" title={t.auth.logout}>
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
