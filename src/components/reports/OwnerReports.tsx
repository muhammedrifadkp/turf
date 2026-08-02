'use client';

import React, { useMemo } from 'react';
import { useTurf } from '@/lib/store/context';
import { formatINR, getTodayDateString } from '@/lib/utils';
import { Calendar, DollarSign, FileText, ShieldAlert, Sparkles, TrendingUp, Users } from 'lucide-react';

export default function OwnerReports() {
  const { role, bookings, drinkSales } = useTurf();
  const todayDate = getTodayDateString();

  // Non-deleted bookings
  const validBookings = useMemo(
    () => bookings.filter((b) => !b.is_deleted && b.status !== 'cancelled'),
    [bookings]
  );

  // Today's bookings
  const todayBookings = useMemo(
    () => validBookings.filter((b) => b.play_date === todayDate),
    [validBookings, todayDate]
  );

  // Aggregate metrics
  const totalBookingsCount = todayBookings.length;

  let totalCashCollected = 0;
  let totalGpayCollected = 0;
  let totalOutstandingDues = 0;

  todayBookings.forEach((b) => {
    totalCashCollected += (b.cash_paid || 0) + (b.advance_method === 'cash' ? b.advance_amount || 0 : 0);
    totalGpayCollected += (b.gpay_paid || 0) + (b.advance_method === 'gpay' ? b.advance_amount || 0 : 0);
    totalOutstandingDues += b.outstanding_balance || 0;
  });

  const totalDailyCollection = totalCashCollected + totalGpayCollected;

  if (role !== 'owner') {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-4 shadow-sm my-6 max-w-lg mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl mx-auto font-black">
          🔒
        </div>
        <h3 className="text-lg font-black text-slate-900">Owner Access Only</h3>
        <p className="text-xs text-slate-500">
          Owner reports are restricted to facility owners only.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto text-slate-900">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white text-2xl flex items-center justify-center font-black shadow-md">
            📊
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Daily Owner Summary Report</h1>
            <p className="text-xs text-slate-500 font-medium">
              Simple daily collection breakdown: Cash, GPay, Dues & Bookings
            </p>
          </div>
        </div>

        <div className="px-4 py-2 rounded-2xl bg-slate-100 border border-slate-200 text-slate-800 text-xs font-black">
          📅 Today: {todayDate}
        </div>
      </div>

      {/* 4 CORE METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
            Total Today's Bookings
          </span>
          <span className="text-2xl font-black text-slate-900 block">{totalBookingsCount}</span>
          <span className="text-[11px] font-bold text-slate-500 block">Scheduled Games</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
            💵 Cash Collection
          </span>
          <span className="text-2xl font-black text-emerald-700 block">{formatINR(totalCashCollected)}</span>
          <span className="text-[11px] font-bold text-emerald-600 block">In Cash Drawer</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
            📱 GPay Collection
          </span>
          <span className="text-2xl font-black text-teal-700 block">{formatINR(totalGpayCollected)}</span>
          <span className="text-[11px] font-bold text-teal-600 block">UPI Bank Received</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
            ⚠️ Outstanding Dues
          </span>
          <span className="text-2xl font-black text-rose-700 block">{formatINR(totalOutstandingDues)}</span>
          <span className="text-[11px] font-bold text-rose-600 block">Pending Dues</span>
        </div>
      </div>

      {/* TOTAL DAILY COLLECTION BANNER */}
      <div className="bg-emerald-600 text-white rounded-3xl p-6 shadow-md flex items-center justify-between">
        <div>
          <span className="text-xs font-black uppercase tracking-wider block text-emerald-200">
            Total Daily Revenue Collection (Cash + GPay)
          </span>
          <span className="text-3xl font-black block mt-1">{formatINR(totalDailyCollection)}</span>
        </div>

        <div className="text-right font-bold text-xs text-emerald-100">
          <div>Cash: {formatINR(totalCashCollected)}</div>
          <div>GPay: {formatINR(totalGpayCollected)}</div>
        </div>
      </div>

      {/* TODAY'S BOOKINGS SUMMARY TABLE */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
          <FileText className="w-5 h-5 text-emerald-600" />
          <span>Today's Games Breakdown</span>
        </h3>

        {todayBookings.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No bookings recorded for today yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-medium">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-100">
                <tr>
                  <th className="p-3 rounded-l-xl">Team Name</th>
                  <th className="p-3">Court</th>
                  <th className="p-3">Time</th>
                  <th className="p-3">Advance</th>
                  <th className="p-3">Cash</th>
                  <th className="p-3">GPay</th>
                  <th className="p-3 text-right rounded-r-xl">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {todayBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-black text-slate-900">{b.team_name}</td>
                    <td className="p-3 font-bold text-slate-700 capitalize">{b.court_type.replace('_', ' ')}</td>
                    <td className="p-3 font-extrabold text-emerald-700">{b.start_time} - {b.end_time}</td>
                    <td className="p-3 text-amber-700 font-bold">{formatINR(b.advance_amount || 0)} ({b.advance_method || 'CASH'})</td>
                    <td className="p-3 font-bold text-emerald-700">{formatINR(b.cash_paid || 0)}</td>
                    <td className="p-3 font-bold text-teal-700">{formatINR(b.gpay_paid || 0)}</td>
                    <td className="p-3 text-right font-black text-rose-700">
                      {b.outstanding_balance > 0 ? formatINR(b.outstanding_balance) : '✓ PAID'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
