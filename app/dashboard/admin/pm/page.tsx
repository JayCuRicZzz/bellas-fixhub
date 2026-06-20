'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../../components/authprovider';
import { BRANCHES } from '../../../../types';
import { Plus, Trash2, Calendar, Clock, RefreshCw } from 'lucide-react';

interface Category {
  category_id: number;
  main_th: string;
  sub_th: string;
  dept_type: string;
}

interface PmItem {
  id: number;
  branch_code: string;
  title: string;
  description: string;
  department: string;
  category_id: number;
  frequency_value: number;
  frequency_unit: string;
  last_run: string | null;
  next_run: string;
  category_name: string;
  category_sub: string;
  dept_type: string;
  created_by_name: string;
}

export default function AdminPMPage() {
  const { user, token } = useAuth();
  const [pmList, setPmList] = useState<PmItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Form state
  const [branch, setBranch] = useState('BVP1');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [catId, setCatId] = useState<number>(1);
  const [freqVal, setFreqVal] = useState(3);
  const [freqUnit, setFreqUnit] = useState('month');
  const [dept, setDept] = useState('MAINT');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [pmRes, catRes] = await Promise.all([
        fetch('/api/pm', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/categories'),
      ]);
      const pmData = await pmRes.json();
      setPmList(pmRes.ok && Array.isArray(pmData) ? pmData : []);
      const cats = await catRes.json();
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (e) {
      console.error(e);
      setPmList([]);
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg('');

    try {
      const res = await fetch('/api/pm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          branch_code: branch,
          title,
          description: desc,
          department: dept,
          category_id: catId,
          frequency_value: freqVal,
          frequency_unit: freqUnit,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMsg('✅ เพิ่มแผน PM สำเร็จ!');
        setTitle('');
        setDesc('');
        setShowForm(false);
        loadData();
      } else {
        setMsg('❌ ' + (data.error || 'เกิดข้อผิดพลาด'));
      }
    } catch (e) {
      setMsg('❌ เกิดข้อผิดพลาด');
    }
    setSaving(false);
  }

  async function handleDelete(id: number) {
    if (!confirm('ยืนยันการลบแผน PM นี้?')) return;
    try {
      await fetch(`/api/pm/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleCheckDue() {
    try {
      const res = await fetch('/api/pm?check=1', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setMsg(`✅ ตรวจสอบเรียบร้อย — สร้างใบงาน ${data.tickets_created || 0} ใบ`);
      loadData();
    } catch (e) {
      setMsg('❌ เกิดข้อผิดพลาด');
    }
  }

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function freqLabel(v: number, u: string) {
    const units: Record<string, string> = { day: 'วัน', week: 'สัปดาห์', month: 'เดือน', year: 'ปี' };
    return `ทุก ${v} ${units[u] || u}`;
  }

  if (loading) return <div className="p-8 text-center">กำลังโหลด...</div>;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="w-6 h-6" /> ระบบ PM (Preventive Maintenance)
        </h1>
        <div className="flex gap-2">
          <button
            onClick={handleCheckDue}
            className="flex items-center gap-1 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
            title="ตรวจสอบ PM ที่ถึงกำหนด"
          >
            <RefreshCw className="w-4 h-4" /> ตรวจสอบ
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> เพิ่มแผน PM
          </button>
        </div>
      </div>

      {msg && (
        <div className={`mb-4 p-3 rounded-lg ${msg.startsWith('✅') ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}>
          {msg}
        </div>
      )}

      {/* Add Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-navy-800 rounded-xl shadow p-6 mb-6 space-y-4">
          <h2 className="text-lg font-semibold">เพิ่มแผน PM ใหม่</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">สาขา</label>
              <select value={branch} onChange={e => setBranch(e.target.value)} className="w-full border-navy-600 rounded-lg px-3 py-2 bg-navy-700 text-gray-200">
                {BRANCHES.map(b => (
                  <option key={b.branch_code} value={b.branch_code}>{b.branch_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">ฝ่าย</label>
              <select value={dept} onChange={e => setDept(e.target.value)} className="w-full border-navy-600 rounded-lg px-3 py-2 bg-navy-700 text-gray-200">
                <option value="MAINT">ช่าง Maintenance</option>
                <option value="IT">ไอที</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">หมวดหมู่</label>
              <select value={catId} onChange={e => setCatId(Number(e.target.value))} className="w-full border-navy-600 rounded-lg px-3 py-2 bg-navy-700 text-gray-200">
                {categories.map(c => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.main_th} - {c.sub_th} ({c.dept_type})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">ชื่องาน</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full border-navy-600 rounded-lg px-3 py-2 bg-navy-700 text-gray-200"
                placeholder="เช่น ล้างแอร์"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">ทำทุก</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  value={freqVal}
                  onChange={e => setFreqVal(Number(e.target.value))}
                  className="w-20 border border-navy-600 rounded-lg px-3 py-2 bg-navy-700 text-white"
                  required
                />
                <select value={freqUnit} onChange={e => setFreqUnit(e.target.value)} className="border border-navy-600 rounded-lg px-3 py-2 bg-navy-700 text-white">
                  <option value="day">วัน</option>
                  <option value="week">สัปดาห์</option>
                  <option value="month">เดือน</option>
                  <option value="year">ปี</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">รายละเอียด</label>
              <input
                type="text"
                value={desc}
                onChange={e => setDesc(e.target.value)}
                className="w-full border-navy-600 rounded-lg px-3 py-2 bg-navy-700 text-gray-200"
                placeholder="รายละเอียดเพิ่มเติม"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-navy-600 text-gray-200 rounded-lg hover:bg-navy-500"
            >
              ยกเลิก
            </button>
          </div>
        </form>
      )}

      {/* PM List */}
      {pmList.length === 0 ? (
        <div className="text-center py-12 text-gray-300">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>ยังไม่มีแผน PM — กด "เพิ่มแผน PM" เพื่อเริ่ม</p>
        </div>
      ) : (
        <div className="bg-navy-800 rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-navy-700">
              <tr>
                <th className="text-left p-3">ชื่องาน</th>
                <th className="text-left p-3">สาขา</th>
                <th className="text-left p-3">หมวดหมู่</th>
                <th className="text-left p-3">ความถี่</th>
                <th className="text-left p-3">ครั้งต่อไป</th>
                <th className="text-left p-3">ครั้งล่าสุด</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {pmList.map((pm) => (
                <tr key={pm.id} className="border-t hover:bg-navy-700">
                  <td className="p-3 font-medium">{pm.title}</td>
                  <td className="p-3">{pm.branch_code}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${pm.dept_type === 'IT' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                      {pm.category_name}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {freqLabel(pm.frequency_value, pm.frequency_unit)}
                    </span>
                  </td>
                  <td className="p-3">{fmtDate(pm.next_run)}</td>
                  <td className="p-3 text-gray-300">{pm.last_run ? fmtDate(pm.last_run) : '-'}</td>
                  <td className="p-3">
                    <button
                      onClick={() => handleDelete(pm.id)}
                      className="text-red-500 hover:text-red-700"
                      title="ลบ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
