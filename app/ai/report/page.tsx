'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../components/authprovider';
import { DailyReport } from '../../../types';
import { FileText, Sparkles, Loader2, AlertCircle } from 'lucide-react';

export default function AIReportPage() {
  const { token } = useAuth();
  const [summary, setSummary] = useState('');
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      const res = await fetch('/api/reports/daily?period=today', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setReport(data);
    } catch (err) {
      setError('ไม่สามารถโหลดข้อมูลรายงานได้');
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async () => {
    if (!report) return;
    setGenerating(true);
    setError('');

    try {
      const res = await fetch('/api/ai/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(report),
      });
      const data = await res.json();
      if (res.ok) {
        setSummary(data.summary);
      } else {
        setError('การสร้างรายงานไม่สำเร็จ');
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 fade-in">
      <div>
        <h2 className="text-2xl font-bold text-white">AI รายงานวิเคราะห์</h2>
        <p className="text-gray-400 mt-1">สร้างรายงานสรุปด้วย AI จากข้อมูลการแจ้งซ่อม</p>
      </div>

      {loading ? (
        <div className="card">
          <div className="skeleton h-6 w-48 mb-4" />
          <div className="skeleton h-4 w-full mb-2" />
          <div className="skeleton h-4 w-3/4 mb-2" />
          <div className="skeleton h-4 w-5/6" />
        </div>
      ) : report ? (
        <>
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gold-500" />
              ข้อมูลประจำวันนี้
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">จำนวนงานทั้งหมด</p>
                <p className="text-2xl font-bold text-white">{report.total}</p>
              </div>
              <div>
                <p className="text-gray-500">เสร็จสิ้น</p>
                <p className="text-2xl font-bold text-green-400">{report.completed}</p>
              </div>
              <div>
                <p className="text-gray-500">รอดำเนินการ</p>
                <p className="text-2xl font-bold text-yellow-400">{report.pending}</p>
              </div>
              <div>
                <p className="text-gray-500">กำลังดำเนินการ</p>
                <p className="text-2xl font-bold text-purple-400">{report.inProgress}</p>
              </div>
            </div>

            <button
              onClick={generateSummary}
              disabled={generating}
              className="btn-primary mt-6 flex items-center gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  กำลังสร้างรายงาน...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  สร้างรายงานด้วย AI
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {summary && (
            <div className="card border-gold-500/30 fade-in">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-gold-500" />
                AI รายงานสรุป
              </h3>
              <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                {summary}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="card text-center py-12">
          <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500">{error || 'ไม่มีข้อมูลรายงาน'}</p>
        </div>
      )}
    </div>
  );
}
