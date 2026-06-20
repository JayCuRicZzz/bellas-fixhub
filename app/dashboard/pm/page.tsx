'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../components/authprovider';
import { Calendar, Clock, Wrench } from 'lucide-react';

interface PmItem {
  id: number;
  branch_code: string;
  title: string;
  description: string;
  department: string;
  frequency_value: number;
  frequency_unit: string;
  last_run: string | null;
  next_run: string;
  category_name: string;
  dept_type: string;
  created_by_name: string;
}

export default function PMPage() {
  const { user, token } = useAuth();
  const [pmList, setPmList] = useState<PmItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'MAINT' | 'IT'>('all');

  useEffect(() => {
    loadPM();
  }, []);

  async function loadPM() {
    try {
      const res = await fetch('/api/pm', { headers: { Authorization: `Bearer ${token}` } });
      setPmList(await res.json());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  const filtered = pmList.filter(p => filter === 'all' || p.dept_type === filter);

  // Group by month
  const grouped: Record<string, PmItem[]> = {};
  filtered.forEach(p => {
    const d = new Date(p.next_run);
    const key = d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long' });
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(p);
  });

  function freqLabel(v: number, u: string) {
    const units: Record<string, string> = { day: 'วัน', week: 'สัปดาห์', month: 'เดือน', year: 'ปี' };
    return `ทุก ${v} ${units[u] || u}`;
  }

  if (loading) return <div className="p-8 text-center">กำลังโหลด...</div>;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
        <Calendar className="w-6 h-6" /> ตาราง PM
      </h1>
      <p className="text-gray-500 mb-6">งานบำรุงรักษาตามรอบ — ระบบออกใบงานอัตโนมัติเมื่อถึงกำหนด</p>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {(['all', 'MAINT', 'IT'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? 'ทั้งหมด' : f === 'MAINT' ? '🔧 ช่าง' : '💻 ไอที'}
          </button>
        ))}
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Wrench className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>ไม่มีแผน PM</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([month, items]) => (
            <div key={month}>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                {month}
                <span className="text-sm text-gray-400 font-normal">({items.length} รายการ)</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map(pm => {
                  const nextDate = new Date(pm.next_run);
                  const isOverdue = nextDate < new Date();
                  return (
                    <div
                      key={pm.id}
                      className={`bg-white rounded-xl shadow p-4 border-l-4 ${
                        isOverdue ? 'border-red-500' : pm.dept_type === 'IT' ? 'border-blue-400' : 'border-amber-400'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{pm.title}</h3>
                          <p className="text-sm text-gray-500">{pm.branch_code} — {pm.category_name}</p>
                        </div>
                        {isOverdue && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">เลยกำหนด</span>
                        )}
                      </div>
                      <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {freqLabel(pm.frequency_value, pm.frequency_unit)}
                        </span>
                        <span>📅 ครั้งต่อไป: {nextDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                      {pm.last_run && (
                        <p className="text-xs text-gray-400 mt-2">
                          ครั้งล่าสุด: {new Date(pm.last_run).toLocaleDateString('th-TH')}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
