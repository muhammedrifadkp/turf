'use client';

import React, { useState } from 'react';
import { useTurf } from '@/lib/store/context';
import { usePopup } from '@/components/ui/ConfirmModal';
import {
  KeyRound,
  Lock,
  Phone,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  UserX,
  Users,
} from 'lucide-react';

export default function StaffManager() {
  const { confirm, alert } = usePopup();
  const {
    role,
    users,
    createStaffAccount,
    resetStaffPassword,
    toggleUserStatus,
    deleteStaffAccount,
  } = useTurf();

  // Create Staff Form State
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Password Reset Modal State
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !password) {
      alert('Please fill Staff Name and Password.', 'Missing Information', 'warning');
      return;
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match! Please check and try again.', 'Password Mismatch', 'warning');
      return;
    }

    const cleanUsername = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const generatedEmail = `${cleanUsername}@turf.com`;

    createStaffAccount(name.trim(), generatedEmail, '', password);

    // Reset Form
    setName('');
    setPassword('');
    setConfirmPassword('');
    setShowAddForm(false);

    alert({
      title: 'Staff Account Created',
      message: `Staff account "${name}" created successfully!\n\nLogin Username: ${name}`,
      variant: 'success',
    });
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUserId || !newPassword) return;

    resetStaffPassword(resetUserId, newPassword);
    setResetUserId(null);
    setNewPassword('');
    alert('Staff password updated successfully!', 'Password Reset', 'success');
  };

  if (role !== 'owner') {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-3 shadow-sm">
        <ShieldAlert className="w-12 h-12 text-rose-600 mx-auto" />
        <h3 className="text-lg font-black text-slate-900">Admin Authentication Required</h3>
        <p className="text-xs text-slate-500">
          Only Admin / Facility Owners are authorized to assign staff accounts and manage credentials.
        </p>
      </div>
    );
  }

  const staffList = users.filter((u) => u.role === 'staff');

  return (
    <div className="space-y-6 pb-20">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 text-2xl">
            👥
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">Staff Account Assignment</h2>
            <p className="text-xs text-slate-500">
              Admin Portal: Assign duty staff accounts, set passwords & control access
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wide shadow-sm transition-all flex items-center justify-center space-x-2"
        >
          <UserPlus className="w-4 h-4" />
          <span>{showAddForm ? 'CLOSE FORM' : 'ASSIGN NEW STAFF'}</span>
        </button>
      </div>

      {/* Staff Creation Drawer Form */}
      {showAddForm && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 animate-fade-in">
          <h3 className="text-base font-black text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-3">
            <UserPlus className="w-4 h-4 text-emerald-600" />
            <span>Assign New Staff Member Credentials</span>
          </h3>

          <form onSubmit={handleCreateStaff} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                Staff Name / Username *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. suresh or Staff 1"
                className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-600 text-slate-900 font-bold rounded-xl px-4 py-3 text-xs outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Assigned Password *
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Password"
                  className="w-full bg-white border border-slate-200 focus:border-emerald-600 text-slate-900 font-bold rounded-xl px-3.5 py-2.5 text-xs outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter Password"
                  className="w-full bg-white border border-slate-200 focus:border-emerald-600 text-slate-900 font-bold rounded-xl px-3.5 py-2.5 text-xs outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wide shadow-md transition-all flex items-center justify-center space-x-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>CREATE STAFF ACCOUNT</span>
            </button>
          </form>
        </div>
      )}

      {/* Existing Staff Directory List */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-black text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-3">
          <Users className="w-4 h-4 text-emerald-600" />
          <span>Active Staff Accounts Directory ({staffList.length})</span>
        </h3>

        {staffList.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No staff accounts created yet. Tap [ASSIGN NEW STAFF] above to create accounts.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {staffList.map((staff) => (
              <div
                key={staff.id}
                className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                  staff.is_active
                    ? 'bg-white border-slate-200 shadow-xs'
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 font-black text-sm flex items-center justify-center border border-emerald-200">
                    {staff.full_name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">{staff.full_name}</h4>
                    <p className="text-xs text-slate-500 font-medium">Username: {staff.full_name}</p>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase inline-block mt-1 ${
                        staff.is_active
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {staff.is_active ? 'ACTIVE ACCOUNT' : 'DISABLED'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setResetUserId(staff.id)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                    title="Reset Password"
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => toggleUserStatus(staff.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-black uppercase transition-colors ${
                      staff.is_active
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {staff.is_active ? 'Disable' : 'Enable'}
                  </button>

                  <button
                    onClick={async () => {
                      const approved = await confirm({
                        title: 'Delete Staff Account',
                        message: `Are you sure you want to permanently delete staff account "${staff.full_name}"? This action cannot be undone.`,
                        confirmText: 'Delete Account',
                        variant: 'danger',
                      });
                      if (approved) {
                        deleteStaffAccount(staff.id);
                      }
                    }}
                    className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold transition-colors"
                    title="Delete Staff Account"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Password Reset Modal */}
      {resetUserId && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 z-50 animate-fade-in">
          <form
            onSubmit={handleResetPassword}
            className="bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl space-y-4 text-slate-900 animate-slide-up sm:animate-fade-in"
          >
            {/* Mobile Drag Handle */}
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-1 sm:hidden shrink-0" />

            <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
              <KeyRound className="w-4 h-4 text-emerald-600" />
              <span>Reset Staff Password</span>
            </h3>

            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter New Password"
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold rounded-xl px-3.5 py-2.5 text-sm outline-none"
              required
            />

            <div className="flex items-center justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setResetUserId(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-black text-xs uppercase shadow-sm"
              >
                Update Password
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
