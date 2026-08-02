'use client';

import React, { useState } from 'react';
import { useTurf } from '@/lib/store/context';
import { usePopup } from '@/components/ui/ConfirmModal';
import { CourtType } from '@/types';
import { formatINR, formatNiceDate } from '@/lib/utils';
import { Calendar, Plus, ToggleLeft, ToggleRight, Zap } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function MonthlySubscriptionsManager() {
  const { alert } = usePopup();
  const {
    monthlySubscriptions,
    addSubscription,
    toggleSubscriptionStatus,
  } = useTurf();

  const [teamName, setTeamName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [courtType, setCourtType] = useState<CourtType>('badminton_wooden');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5]); // Mon, Wed, Fri
  const [startTime, setStartTime] = useState('06:00');
  const [endTime, setEndTime] = useState('07:00');
  const [monthlyAmount, setMonthlyAmount] = useState<number | string>(4500);
  const [startDate, setStartDate] = useState('2026-08-01');
  const [endDate, setEndDate] = useState('2026-08-31');

  const toggleDay = (dayIdx: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayIdx) ? prev.filter((d) => d !== dayIdx) : [...prev, dayIdx]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName || !customerName || !phone || selectedDays.length === 0) {
      alert(
        'Please fill Team Name, Customer Name, Phone, and pick at least 1 recurring day.',
        'Incomplete Details',
        'warning'
      );
      return;
    }

    addSubscription({
      team_name: teamName,
      customer_name: customerName,
      phone,
      court_type: courtType,
      days_of_week: selectedDays,
      start_time: startTime,
      end_time: endTime,
      monthly_amount: Number(monthlyAmount) || 0,
      start_date: startDate,
      end_date: endDate,
      status: 'active',
    });

    setTeamName('');
    setCustomerName('');
    setPhone('');
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 text-2xl">
            ⚡
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">Monthly Badminton Subscriptions</h2>
            <p className="text-xs text-slate-500">
              Recurring member slots auto-projected into Today's Visual Schedule
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Subscription Form */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
            <Zap className="w-4 h-4 text-blue-600" />
            <span>Create New Subscriber</span>
          </h3>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Team / Club Name *
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. Morning Smashers"
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Customer Name *
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. George K"
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Court Type
              </label>
              <select
                value={courtType}
                onChange={(e) => setCourtType(e.target.value as CourtType)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-xs font-bold outline-none"
              >
                <option value="badminton_wooden">Badminton Court 2 (Wooden)</option>
                <option value="badminton_synthetic">Badminton Court 1 (Synthetic)</option>
                <option value="football">Football Turf</option>
              </select>
            </div>

            {/* Recurring Days Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Recurring Days
              </label>
              <div className="flex items-center justify-between gap-1">
                {DAYS.map((day, idx) => {
                  const isSel = selectedDays.includes(idx);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(idx)}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                        isSel
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-emerald-700 font-bold rounded-xl px-2 py-1.5 text-xs outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-emerald-700 font-bold rounded-xl px-2 py-1.5 text-xs outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Monthly Amount (₹)
              </label>
              <input
                type="number"
                value={monthlyAmount}
                onChange={(e) => setMonthlyAmount(e.target.value)}
                placeholder="4500"
                className="w-full bg-slate-50 border border-slate-200 text-blue-700 font-black rounded-xl px-3 py-2 text-xs outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-2 py-1.5 text-[11px] outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-2 py-1.5 text-[11px] outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wide shadow-sm transition-all flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>SAVE SUBSCRIBER</span>
            </button>
          </form>
        </div>

        {/* Subscriptions List */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
            <Zap className="w-4 h-4 text-blue-600" />
            <span>Active Monthly Members</span>
          </h3>

          {monthlySubscriptions.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">No monthly subscriptions active.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-100">
                  <tr>
                    <th className="p-3 rounded-l-xl">Team / Customer</th>
                    <th className="p-3">Court & Time</th>
                    <th className="p-3">Days</th>
                    <th className="p-3">Monthly Fee</th>
                    <th className="p-3 text-right rounded-r-xl">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlySubscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <div className="font-black text-slate-900">{sub.team_name}</div>
                        <div className="text-[11px] text-slate-500">
                          {sub.customer_name} ({sub.phone})
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-slate-800 capitalize">
                          {sub.court_type.replace('_', ' ')}
                        </div>
                        <div className="text-[11px] text-emerald-700 font-extrabold">
                          {sub.start_time} - {sub.end_time}
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="flex space-x-1">
                          {sub.days_of_week.map((d) => (
                            <span
                              key={d}
                              className="px-1.5 py-0.5 rounded text-[9px] font-black bg-blue-100 text-blue-800 border border-blue-300"
                            >
                              {DAYS[d]}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="p-3 font-black text-emerald-700">
                        {formatINR(sub.monthly_amount)}
                      </td>

                      <td className="p-3 text-right">
                        <button
                          onClick={() => toggleSubscriptionStatus(sub.id)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                            sub.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-slate-100 text-slate-500 border border-slate-300'
                          }`}
                        >
                          {sub.status === 'active' ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
