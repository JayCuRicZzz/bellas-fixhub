'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../../components/authprovider';
import { BRANCHES } from '../../../../types';
import {
  AlertTriangle, Loader2, Wind, Building2, RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

export default function AirconReportPage() {
  const { user, token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');
  const [branch, setBranch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period, branch });
      const res = await fetch(`/api/reports/aircon?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) setData(await res.json()); else setData(null);
    } catch (e) {
      console.error('Failed to fetch aircon report:', e);
    }
    setLoading(false);
  };

  // ล็อกอินด้วยคุกกี้ token เป็น null ได้ — เดิมรอ token แล้วหน้าหมุนค้างตลอด
  useEffect(() => { if (user) fetchData(); }, [user, token, period, branch]);

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink flex items-center gap-2">
            <Wind className="w-6 h-6 text-cyan-400" />
            รายงานการเติมน้ำยาแอร์
          </h2>
          <p className="text-gray-400 mt-1">นับจากช่อง “เติมน้ำยาแอร์” ที่ช่างติ๊กตอนกดซ่อมเสร็จ — ห้องเดิมเติมซ้ำภายใน 15 วัน = ป้ายแดง</p>
        </div>
        <button onClick={fetchData} className="btn-secondary text-sm flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          รีเฟรช
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={period} onChange={e => setPeriod(e.target.value)}
          className="bg-navy-700 border border-navy-600 rounded-lg px-3 py-2 text-ink text-sm">
          <option value="7">7 วันล่าสุด</option>
          <option value="14">14 วันล่าสุด</option>
          <option value="30">30 วันล่าสุด</option>
          <option value="90">90 วันล่าสุด</option>
        </select>
        <select value={branch} onChange={e => setBranch(e.target.value)}
          className="bg-navy-700 border border-navy-600 rounded-lg px-3 py-2 text-ink text-sm">
          <option value="">ทุกสาขา</option>
          {BRANCHES.map(b => (
            <option key={b.branch_code} value={b.branch_code}>{b.branch_code} — {b.branch_name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gold-500" />
        </div>
      ) : !data ? (
        <div className="card text-center py-12">
          <AlertTriangle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 text-lg">ไม่สามารถโหลดข้อมูลได้</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card bg-cyan-500/10 border-cyan-500/30">
              <div className="flex items-center gap-3">
                <Wind className="w-8 h-8 text-cyan-400" />
                <div>
                  <p className="text-gray-400 text-xs">รายการแอร์ทั้งหมด</p>
                  <p className="text-2xl font-bold text-ink">{data.total_tickets}</p>
                </div>
              </div>
            </div>
            <div className="card bg-orange-500/10 border-orange-500/30">
              <div className="flex items-center gap-3">
                <Building2 className="w-8 h-8 text-orange-400" />
                <div>
                  <p className="text-gray-400 text-xs">ห้องที่เกี่ยวข้อง</p>
                  <p className="text-2xl font-bold text-ink">{data.rooms_affected}</p>
                </div>
              </div>
            </div>
            <div className="card bg-red-500/10 border-red-500/30">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-red-400" />
                <div>
                  <p className="text-gray-400 text-xs">🚨 เติมซ้ำใน 15 วัน</p>
                  <p className="text-2xl font-bold text-ink">{data.refill_alert_count}</p>
                </div>
              </div>
            </div>
            <div className="card bg-sky-500/10 border-sky-500/30" data-t="refill-count">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🧊</span>
                <div>
                  <p className="text-gray-400 text-xs">เติมน้ำยาแอร์ ({period} วัน)</p>
                  <p className="text-2xl font-bold text-ink">{data.refill_count ?? 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Refill Alerts */}
          {data.refill_alerts.length > 0 && (
            <div className="card border-2 border-red-500/50 bg-red-500/10" data-t="refill-repeats">
              <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
                🚨 ห้องที่เติมน้ำยาแอร์ซ้ำภายใน 15 วัน
              </h3>
              <div className="space-y-3">
                {data.refill_alerts.map((alert: any, i: number) => (
                  <div key={i} className="bg-navy-800 rounded-lg p-4 border border-red-500/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <Link href={`/dashboard/${alert.ticket_id}`} className="text-ink font-semibold hover:underline">{alert.room}</Link>
                        <p className="text-red-400 text-sm mt-0.5">
                          ห่างกันเพียง {alert.days_between} วัน — อาจมีจุดรั่ว ควรตรวจหาจุดรั่ว
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-gray-400">ครั้งก่อน: <span className="text-ink">{alert.refill1}</span></p>
                        <p className="text-gray-400">ครั้งนี้: <span className="text-red-400 font-semibold">{alert.refill2}</span></p>
                      </div>
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      <span>📅 {alert.date1 ? new Date(alert.date1).toLocaleDateString('th-TH') : '-'}</span>
                      <span>📅 {new Date(alert.date2).toLocaleDateString('th-TH')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Tickets */}
          <div className="card">
            <h3 className="text-lg font-semibold text-ink mb-4">📋 รายการแจ้งซ่อมแอร์ทั้งหมด ({period} วัน)</h3>
            {data.tickets.length === 0 ? (
              <p className="text-gray-500 text-center py-4">ไม่มีรายการในช่วงเวลานี้</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-navy-600">
                      <th className="pb-2">เลขที่</th>
                      <th className="pb-2">สาขา</th>
                      <th className="pb-2">ห้อง</th>
                      <th className="pb-2">ปัญหา</th>
                      <th className="pb-2">น้ำยา</th>
                      <th className="pb-2">สถานะ</th>
                      <th className="pb-2">วันที่</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tickets.map((t: any) => (
                      <tr key={t.ticket_id} className="border-b border-navy-700/50 hover:bg-navy-700/30">
                        <td className="py-2">
                          <Link href={`/dashboard/${t.ticket_id}`} className="text-gold-400 hover:underline">
                            {t.ticket_number}
                          </Link>
                        </td>
                        <td className="py-2 text-ink">{t.branch_code}</td>
                        <td className="py-2 text-ink">{t.location_detail}</td>
                        <td className="py-2 text-gray-300 truncate max-w-[200px]">{t.description}</td>
                        <td className="py-2 whitespace-nowrap">
                          {t.refrigerant_repeat_of ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white">🚨 ซ้ำ {t.refrigerant_repeat_days} วัน</span>
                          ) : t.refrigerant_refilled ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-sky-500/20 text-sky-400">🧊 เติม{t.refrigerant_type && t.refrigerant_type !== 'OTHER' ? ' ' + t.refrigerant_type : ''}</span>
                          ) : <span className="text-gray-600">—</span>}
                        </td>
                        <td className="py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            t.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400' :
                            t.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400' :
                            t.status === 'IN_PROGRESS' || t.status === 'ACCEPTED' ? 'bg-purple-500/20 text-purple-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="py-2 text-gray-400 text-xs">
                          {new Date(t.created_at).toLocaleDateString('th-TH')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
