'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/authprovider';
import { useI18n } from '@/lib/i18n/i18n';
import { BRANCHES } from '@/types';
import {
  UserPlus, Pencil, Trash2, X, Loader2, Shield, RefreshCw, Key,
} from 'lucide-react';

interface AdminUser {
  id: number;
  username: string;
  full_name: string;
  role: string;
  department: string | null;
  branch_code: string | null;
  branches: string[];
  created_at: string;
}

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'gm', label: 'GM (ผู้จัดการทั่วไป)' },
  { value: 'sup', label: 'Supervisor (หัวหน้าช่าง)' },
  { value: 'supit', label: 'Supervisor IT (หัวหน้าไอที)' },
  { value: 'tech', label: 'Technician (ช่าง)' },
  { value: 'it', label: 'IT Technician (ช่างไอที)' },
  { value: 'front', label: 'Front Desk (พนักงานต้อนรับ)' },
  { value: 'house', label: 'Housekeeping (แม่บ้าน)' },
];

const DEPT_OPTIONS = [
  { value: '', label: 'ไม่ระบุ' },
  { value: 'ช่าง', label: 'ฝ่ายช่าง' },
  { value: 'ไอที', label: 'ฝ่ายไอที' },
  { value: 'ทั่วไป', label: 'ทั่วไป' },
];

export default function AdminPage() {
  const { user, token } = useAuth();
  const { t } = useI18n();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formRole, setFormRole] = useState('tech');
  const [formDepartment, setFormDepartment] = useState('');
  const [formBranches, setFormBranches] = useState<string[]>([]);
  const [formLoading, setFormLoading] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<AdminUser | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormUsername('');
    setFormPassword('');
    setFormFullName('');
    setFormRole('tech');
    setFormDepartment('');
    setFormBranches([]);
    setEditingUser(null);
    setShowForm(false);
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (u: AdminUser) => {
    setEditingUser(u);
    setFormUsername(u.username);
    setFormPassword('');
    setFormFullName(u.full_name);
    setFormRole(u.role);
    setFormDepartment(u.department || '');
    setFormBranches(u.branches || []);
    setShowForm(true);
  };

  const toggleBranch = (code: string) => {
    setFormBranches(prev =>
      prev.includes(code) ? prev.filter(b => b !== code) : [...prev, code]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    try {
      const url = editingUser
        ? `/api/admin/users/${editingUser.id}`
        : '/api/admin/users';
      const method = editingUser ? 'PUT' : 'POST';

      const body: any = {
        username: formUsername,
        full_name: formFullName,
        role: formRole,
        department: formDepartment || null,
        branch_codes: formBranches,
      };
      if (formPassword || !editingUser) {
        body.password = formPassword;
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(editingUser ? t.admin.userUpdated : t.admin.userCreated);
        setTimeout(() => setSuccessMsg(''), 3000);
        resetForm();
        fetchUsers();
      } else {
        setError(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (u: AdminUser) => {
    setDeleteConfirm(null);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(t.admin.userDeleted);
        setTimeout(() => setSuccessMsg(''), 3000);
        fetchUsers();
      } else {
        setError(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  const handleResetPassword = async (u: AdminUser) => {
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'reset_password' }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`รีเซ็ตรหัสผ่าน ${u.username} สำเร็จ! รหัสชั่วคราว: ${data.temp_password}`);
        setTimeout(() => setSuccessMsg(''), 5000);
      } else {
        setError(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  // Only admin can access
  if (user?.role !== 'admin') {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <Shield className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400 text-lg">ไม่มีสิทธิ์เข้าถึงหน้านี้</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">{t.admin.title}</h2>
          <p className="text-gray-400 mt-1">จัดการบัญชีผู้ใช้และสิทธิ์</p>
        </div>
        <button
          onClick={openAddForm}
          className="btn-primary text-sm flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          {t.admin.addUser}
        </button>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-3 rounded-lg text-sm">
          ✅ {successMsg}
        </div>
      )}
      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
          ❌ {error}
          <button onClick={() => setError('')} className="ml-3 underline">ปิด</button>
        </div>
      )}

      {/* User Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center pt-10 px-4 overflow-y-auto">
          <div className="bg-navy-800 border border-navy-600 rounded-xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">
                {editingUser ? t.admin.editUser : t.admin.addUser}
              </h3>
              <button onClick={resetForm} className="p-1 hover:bg-navy-700 rounded text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t.admin.username} *</label>
                <input
                  type="text"
                  value={formUsername}
                  onChange={e => setFormUsername(e.target.value)}
                  className="input-field"
                  required
                  placeholder="username"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  {t.admin.password} {editingUser ? '(เว้นว่างเพื่อไม่เปลี่ยน)' : '*'}
                </label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={e => setFormPassword(e.target.value)}
                  className="input-field"
                  required={!editingUser}
                  placeholder={editingUser ? t.admin.leaveEmpty : '********'}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t.admin.fullName} *</label>
                <input
                  type="text"
                  value={formFullName}
                  onChange={e => setFormFullName(e.target.value)}
                  className="input-field"
                  required
                  placeholder="ชื่อ-นามสกุล"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t.admin.role} *</label>
                <select
                  value={formRole}
                  onChange={e => setFormRole(e.target.value)}
                  className="select-field"
                >
                  {ROLE_OPTIONS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t.admin.department}</label>
                <select
                  value={formDepartment}
                  onChange={e => setFormDepartment(e.target.value)}
                  className="select-field"
                >
                  {DEPT_OPTIONS.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  {t.admin.branches} ({t.admin.selectBranches})
                </label>
                <div className="flex flex-wrap gap-2">
                  {BRANCHES.map(b => (
                    <button
                      key={b.branch_code}
                      type="button"
                      onClick={() => toggleBranch(b.branch_code)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        formBranches.includes(b.branch_code)
                          ? 'bg-gold-500/20 border-gold-500 text-gold-400'
                          : 'bg-navy-700 border-navy-600 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      {b.branch_code}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t.admin.save}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn-secondary flex-1"
                >
                  {t.admin.cancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
          <div className="bg-navy-800 border border-navy-600 rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-white mb-2">{t.admin.confirmDelete}</h3>
            <p className="text-gray-400 text-sm mb-4">
              ต้องการลบผู้ใช้ <span className="text-white font-medium">{deleteConfirm.full_name}</span> ({deleteConfirm.username}) หรือไม่?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium"
              >
                {t.admin.deleteUser}
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 btn-secondary"
              >
                {t.admin.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="card overflow-x-auto">
        {loading ? (
          <div className="space-y-3 p-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton h-12 w-full" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <p className="text-gray-500 text-center py-8">{t.admin.noUsers}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-700 text-left text-gray-500 text-xs uppercase">
                <th className="py-3 px-3">#</th>
                <th className="py-3 px-3">{t.admin.username}</th>
                <th className="py-3 px-3">{t.admin.fullName}</th>
                <th className="py-3 px-3">{t.admin.role}</th>
                <th className="py-3 px-3">{t.admin.department}</th>
                <th className="py-3 px-3">{t.admin.branches}</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, idx) => (
                <tr key={u.id} className="border-b border-navy-700/50 hover:bg-navy-700/30">
                  <td className="py-2.5 px-3 text-gray-500">{idx + 1}</td>
                  <td className="py-2.5 px-3 text-white font-medium">{u.username}</td>
                  <td className="py-2.5 px-3 text-gray-300">{u.full_name}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-navy-600 text-gray-300">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-gray-400">{u.department || '-'}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex flex-wrap gap-1">
                      {(u.branches || []).map(bc => (
                        <span key={bc} className="px-1.5 py-0.5 rounded text-xs bg-gold-500/10 text-gold-400 border border-gold-500/20">
                          {bc}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleResetPassword(u)}
                        className="p-1.5 rounded hover:bg-blue-900/30 text-gray-400 hover:text-blue-400"
                        title="รีเซ็ตรหัสผ่าน"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditForm(u)}
                        className="p-1.5 rounded hover:bg-navy-600 text-gray-400 hover:text-white"
                        title={t.admin.editUser}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(u)}
                        className="p-1.5 rounded hover:bg-red-900/30 text-gray-400 hover:text-red-400"
                        title={t.admin.deleteUser}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
