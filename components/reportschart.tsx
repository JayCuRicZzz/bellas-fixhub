'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { DailyReport } from '../types';

const COLORS = ['#d4a825', '#4168b4', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6'];

export default function ReportsChart({ data }: { data: DailyReport }) {
  const statusData = [
    { name: 'รอดำเนินการ', value: data.pending || 0 },
    { name: 'กำลังดำเนินการ', value: data.inProgress || 0 },
    { name: 'เสร็จสิ้น', value: data.completed || 0 },
  ].filter(d => d.value > 0);

  const deptData = (data.byDepartment || []).map(d => ({
    name: d.name,
    count: d.count,
  }));

  const branchData = (data.byBranch || []).map(d => ({
    name: d.name,
    count: d.count,
  }));

  if (!data.total && (!deptData.length) && (!branchData.length)) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>ไม่มีข้อมูลสำหรับแสดงแผนภูมิ</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Department Distribution */}
      {deptData.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">จำนวนงานแยกตามแผนก</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={deptData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2744" />
              <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a2744',
                  border: '1px solid #2a3a5c',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#fff' }}
              />
              <Bar dataKey="count" name="จำนวนงาน" fill="#d4a825" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Status Distribution */}
      {statusData.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">สถานะงาน</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a2744',
                  border: '1px solid #2a3a5c',
                  borderRadius: '8px',
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Branch Distribution */}
      {branchData.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">จำนวนงานแยกตามสาขา</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={branchData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2744" />
              <XAxis type="number" stroke="#6b7280" fontSize={12} allowDecimals={false} />
              <YAxis dataKey="name" type="category" stroke="#6b7280" fontSize={11} width={200} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a2744',
                  border: '1px solid #2a3a5c',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="count" name="จำนวนงาน" fill="#4168b4" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
