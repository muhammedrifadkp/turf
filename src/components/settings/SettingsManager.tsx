'use client';

import React, { useState } from 'react';
import { useTurf } from '@/lib/store/context';
import { usePopup } from '@/components/ui/ConfirmModal';
import { DrinkType } from '@/types';
import { formatINR } from '@/lib/utils';
import {
  Activity,
  DollarSign,
  Lock,
  Plus,
  Save,
  Settings as SettingsIcon,
  ShieldAlert,
  UserCheck,
  UserPlus,
  UserX,
  Users,
} from 'lucide-react';

export default function SettingsManager() {
  const { alert } = usePopup();
  const {
    settings,
    updateSettings,
    role,
    users,
    createStaffAccount,
    toggleUserStatus,
    activityLogs,
  } = useTurf();

  // Settings State
  const [footballMorning, setFootballMorning] = useState<number | string>(
    settings.football_morning_rate
  );
  const [footballNight, setFootballNight] = useState<number | string>(
    settings.football_night_rate
  );
  const [badmintonSynthetic, setBadmintonSynthetic] = useState<number | string>(
    settings.badminton_synthetic_rate
  );
  const [badmintonWooden, setBadmintonWooden] = useState<number | string>(
    settings.badminton_wooden_rate
  );

  const [normalSoda, setNormalSoda] = useState<number | string>(
    settings.drink_prices.normal_soda || 10
  );
  const [specialSoda, setSpecialSoda] = useState<number | string>(
    settings.drink_prices.mint_soda || 12
  );

  // Staff Account Creation Form State
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [showAddStaff, setShowAddStaff] = useState(false);

  const handleSavePricing = (e: React.FormEvent) => {
    e.preventDefault();
    if (role !== 'owner') {
      alert('Only Owners can modify pricing.', 'Access Restricted', 'danger');
      return;
    }

    updateSettings({
      football_morning_rate: Number(footballMorning) || 600,
      football_night_rate: Number(footballNight) || 1000,
      badminton_synthetic_rate: Number(badmintonSynthetic) || 350,
      badminton_wooden_rate: Number(badmintonWooden) || 400,
      drink_prices: {
        normal_soda: Number(normalSoda) || 10,
        mint_soda: Number(specialSoda) || 12,
        color_soda: Number(specialSoda) || 12,
        jeera_soda: Number(specialSoda) || 12,
      },
    });

    alert('Facility pricing and rates updated successfully!', 'Settings Saved', 'success');
  };

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName || !staffEmail) return;

    createStaffAccount(staffName, staffEmail, staffPhone);
    setStaffName('');
    setStaffEmail('');
    setStaffPhone('');
    setShowAddStaff(false);
  };

  if (role !== 'owner') {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-3 shadow-sm">
        <ShieldAlert className="w-12 h-12 text-rose-600 mx-auto" />
        <h3 className="text-lg font-black text-slate-900">Owner Access Only</h3>
        <p className="text-xs text-slate-500">
          Only facility owners are authorized to access settings, pricing, and staff account management.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex items-center space-x-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 text-2xl">
          ⚙️
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900">Facility Settings & Staff Management</h2>
          <p className="text-xs text-slate-500">
            Configure hourly court rates, soda prices, staff credentials & activity logs
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pricing Manager Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>Facility Pricing Configuration</span>
          </h3>

          <form onSubmit={handleSavePricing} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-emerald-700 uppercase">
                Football Turf Rates (per hour)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">Morning Rate (₹)</span>
                  <input
                    type="number"
                    value={footballMorning}
                    onChange={(e) => setFootballMorning(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold rounded-xl px-3 py-2 text-xs outline-none"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">Night Rate (₹)</span>
                  <input
                    type="number"
                    value={footballNight}
                    onChange={(e) => setFootballNight(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold rounded-xl px-3 py-2 text-xs outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-extrabold text-teal-700 uppercase">
                Badminton Court Rates (per hour)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">Synthetic Court (₹)</span>
                  <input
                    type="number"
                    value={badmintonSynthetic}
                    onChange={(e) => setBadmintonSynthetic(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold rounded-xl px-3 py-2 text-xs outline-none"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">Wooden Court (₹)</span>
                  <input
                    type="number"
                    value={badmintonWooden}
                    onChange={(e) => setBadmintonWooden(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold rounded-xl px-3 py-2 text-xs outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-extrabold text-amber-700 uppercase">
                Soda Beverages Pricing
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">Normal Soda (₹)</span>
                  <input
                    type="number"
                    value={normalSoda}
                    onChange={(e) => setNormalSoda(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold rounded-xl px-3 py-2 text-xs outline-none"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">
                    Special Soda (Mint/Color/Jeera) (₹)
                  </span>
                  <input
                    type="number"
                    value={specialSoda}
                    onChange={(e) => setSpecialSoda(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold rounded-xl px-3 py-2 text-xs outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase shadow-sm transition-all flex items-center justify-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>SAVE PRICING SETTINGS</span>
            </button>
          </form>
        </div>

        {/* Staff Account Management Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Staff Accounts Directory</span>
            </h3>
            <button
              onClick={() => setShowAddStaff(!showAddStaff)}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 font-extrabold text-xs border border-emerald-200 flex items-center space-x-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Staff</span>
            </button>
          </div>

          {/* Add Staff Drawer Form */}
          {showAddStaff && (
            <form onSubmit={handleCreateStaff} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="e.g. Suresh V"
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-1.5 text-xs outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  placeholder="suresh@turfarena.com"
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-1.5 text-xs outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={staffPhone}
                  onChange={(e) => setStaffPhone(e.target.value)}
                  placeholder="+91 98765 11223"
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-1.5 text-xs outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
              >
                CREATE STAFF ACCOUNT
              </button>
            </form>
          )}

          {/* Staff Accounts List */}
          <div className="space-y-2">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200"
              >
                <div>
                  <div className="font-extrabold text-slate-900 text-xs flex items-center space-x-2">
                    <span>{u.full_name}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-black uppercase ${
                        u.role === 'owner' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {u.role}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">{u.email}</div>
                </div>

                {u.role !== 'owner' && (
                  <button
                    onClick={() => toggleUserStatus(u.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      u.is_active
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {u.is_active ? 'Disable' : 'Enable'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
