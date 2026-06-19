'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { BarChart3, Users, Star, TrendingUp, Loader2, Wrench } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TechPerf {
  technician_name: string;
  technician_id: number;
  total_work: number;
  approved_count: number;
  avg_kpi: number;
  easy_count: number;
  medium_count: number;
  hard_count: number;
  very_hard_count: number;
  avg_sla_minutes: number;
  on_time_count: number;
  overdue_count: number;
}

export default function PerformanceReportPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<TechPerf[]>([]);
  const [loading, setLoading] = useState(true);
  const [workType, setWorkType] = useState('');

  useEffect(() => {
    if (user && !['admin', 'gm'].includes(user.role || '')) {
      router.push('/dashboard');
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (workType) params.set('work_type', workType);
    fetch(`/api/reports/performance?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token, workType]);

  if (loading) return <div className="card"><Loader2 className="w-8 h-8 animate-spin text-gold-500 mx-auto" /></div>;

  return (
    <div className="space-y-6 fade-in">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
        <BarChart3 className="w-6 h-6 text-gold-500" /> รายงานประเมินผลช่าง
      </h2>

      <div className="flex gap-2">
        {[{ value: '', label: 'ทั้งหมด' }, { value: 'MAINTENANCE', label: '🔧 งานช่าง' }, { value: 'IT', label: '💻 งานไอที' }]
          .map(tab => (
            <button key={tab.value} onClick={() => setWorkType(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                workType === tab.value ? 'bg-gold-500/20 border-gold-500 text-gold-400' : 'border-navy-600 text-gray-400'
              }`}>{tab.label}</button>
          ))
        }
      </div>

      <div className="space-y-4">
        {data.map((tech, i) => {
          const maxWork = Math.max(...data.map(d => d.total_work), 1);
          return (
            <div key={i} className="card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gold-500/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-gold-500" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{tech.technician_name}</h3>
                    <p className="text-xs text-gray-500">งานทั้งหมด {tech.total_work} | อนุมัติ {tech.approved_count}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-gold-400">
                    <Star className="w-4 h-4" />
                    <span className="font-bold">{(tech.avg_kpi || 0).toFixed(1)}</span>
                  </div>
                  <p className="text-xs text-gray-500">คะแนนเฉลี่ย</p>
                </div>
              </div>

              {/* Work volume bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>ปริมาณงาน</span><span>{tech.total_work}</span>
                </div>
                <div className="h-2 bg-navy-700 rounded-full">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(tech.total_work/maxWork)*100}%` }} />
                </div>
              </div>

              {/* Difficulty breakdown */}
              <div className="flex gap-1.5 mb-3">
                {[
                  { label: 'ง่าย', count: tech.easy_count, color: 'bg-green-500' },
                  { label: 'กลาง', count: tech.medium_count, color: 'bg-blue-500' },
                  { label: 'ยาก', count: tech.hard_count, color: 'bg-orange-500' },
                  { label: 'ยากมาก', count: tech.very_hard_count, color: 'bg-red-500' },
                ].map(d => d.count > 0 && (
                  <div key={d.label} className="flex-1 text-center">
                    <div className={`h-8 rounded-t-md ${d.color}`} style={{ height: `${Math.max(d.count * 8, 4)}px` }} />
                    <span className="text-xs text-gray-500">{d.label} ({d.count})</span>
                  </div>
                ))}
              </div>

              {/* SLA & On-time */}
              <div className="flex justify-between text-xs">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3 h-3 text-green-400" />
                  <span className="text-green-400">{tech.on_time_count} ทันเวลา</span>
                  {tech.overdue_count > 0 && (
                    <span className="text-red-400 ml-1">{tech.overdue_count} เกิน</span>
                  )}
                </div>
                <span className="text-gray-500">SLA เฉลี่ย {tech.avg_sla_minutes ? `${tech.avg_sla_minutes.toFixed(0)} นาที` : '-'}</span>
              </div>
            </div>
          );
        })}
        {data.length === 0 && (
          <div className="card text-center py-8 text-gray-500">ไม่มีข้อมูล</div>
        )}
      </div>
    </div>
  );
}
