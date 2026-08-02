'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useTurf } from '@/lib/store/context';
import { formatINR, formatTimeDisplay, getTodayDateString, parseTimeToMinutes } from '@/lib/utils';
import { CheckCircle2, Coffee, DollarSign, Plus, Sparkles, UserCheck, Users } from 'lucide-react';
import AddExpenseModal from '@/components/expenses/AddExpenseModal';

export default function DrinksManager() {
  const { drinkSales, currentShift, bookings } = useTurf();
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // Today's Date
  const todayDate = getTodayDateString();

  // Today's Bookings with Pending Dues (Sorted by start_time from earliest to latest)
  const todayBookingsWithDues = useMemo(() => {
    return bookings
      .filter(
        (b) =>
          b.play_date === todayDate &&
          !b.is_deleted &&
          b.status !== 'cancelled' &&
          b.outstanding_balance > 0
      )
      .sort((a, b) => parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time));
  }, [bookings, todayDate]);

  // Today's Finished / Paid Bookings (Sorted by start_time from earliest to latest)
  const todayFinishedBookings = useMemo(() => {
    return bookings
      .filter(
        (b) =>
          b.play_date === todayDate &&
          !b.is_deleted &&
          b.status !== 'cancelled' &&
          b.outstanding_balance <= 0
      )
      .sort((a, b) => parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time));
  }, [bookings, todayDate]);

  // Recent shift drinks sales
  const shiftDrinks = drinkSales.filter(
    (d) => d.shift_id === (currentShift?.id || 'shift-demo-1') && !d.is_deleted
  );

  const totalDrinkRevenueThisShift = shiftDrinks.reduce((acc, d) => acc + d.total_price, 0);

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 text-2xl font-black">
            🥤
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">Duty Staff Counter & POS</h2>
            <p className="text-xs text-slate-500">
              Collect team dues & manage shift cash accounting
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs sm:text-sm uppercase tracking-wide shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ADD EXPENSE</span>
          </button>

          <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div className="text-right">
              <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                Shift Drink Revenue
              </span>
              <span className="text-lg font-black text-amber-700">
                {formatINR(totalDrinkRevenueThisShift)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dues Money Collection Cards for Booked Teams */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <span>Today's Pending Dues Teams ({todayBookingsWithDues.length} Pending Dues)</span>
          </h3>
          <span className="text-xs text-slate-500 font-medium">Page-Based Dues & Drinks</span>
        </div>

        {todayBookingsWithDues.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs font-semibold">
            🎉 All booked teams for today have paid in full! No pending dues.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todayBookingsWithDues.map((b) => (
              <div
                key={b.id}
                className="bg-slate-50/80 border border-slate-200 hover:border-emerald-300 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-2xs transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                        Team Name
                      </span>
                      <h4 className="font-black text-slate-900 text-lg sm:text-xl leading-tight capitalize">
                        {b.team_name}
                      </h4>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs whitespace-nowrap">
                      {formatTimeDisplay(b.start_time)} - {formatTimeDisplay(b.end_time)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 font-semibold mt-2 flex items-center gap-1.5">
                    <span>👤 {b.customer_name}</span>
                    <span className="text-slate-400">•</span>
                    <span>({b.phone})</span>
                  </p>
                  <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-500">Outstanding:</span>
                    <span className="text-base font-black text-rose-700">
                      Due Balance: {formatINR(b.outstanding_balance)}
                    </span>
                  </div>
                </div>

                <Link
                  href={`/bookings/${b.id}`}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm uppercase tracking-wide shadow-xs transition-all flex items-center justify-center space-x-1.5"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>OPEN BOOKING POS PAGE ({formatINR(b.outstanding_balance)}) →</span>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TODAY'S FINISHED / PAID BOOKINGS SECTION */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>Today's Finished / Paid Bookings ({todayFinishedBookings.length} Completed)</span>
          </h3>
          <span className="text-xs text-slate-500 font-medium">Fully Paid Dues</span>
        </div>

        {todayFinishedBookings.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">
            No completed/paid bookings for today yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todayFinishedBookings.map((b) => (
              <div
                key={b.id}
                className="bg-emerald-50/40 border border-emerald-200/80 rounded-2xl p-4 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                        Team Name
                      </span>
                      <h4 className="font-black text-slate-900 text-lg sm:text-xl leading-tight capitalize">
                        {b.team_name}
                      </h4>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      ✓ PAID IN FULL
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 font-semibold mt-2">
                    👤 {b.customer_name} ({b.phone})
                  </p>
                  <p className="text-xs font-bold text-slate-600 mt-1">
                    Timing: {formatTimeDisplay(b.start_time)} - {formatTimeDisplay(b.end_time)} ({b.total_hours}h)
                  </p>
                  <p className="text-sm font-black text-emerald-700 mt-1.5">
                    Total Paid: {formatINR(b.final_amount)}
                  </p>
                </div>

                <Link
                  href={`/bookings/${b.id}`}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs sm:text-sm uppercase tracking-wide shadow-xs transition-all flex items-center justify-center space-x-1.5"
                >
                  <span>OPEN POS DETAILS →</span>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Standalone Quick Add Expense Modal */}
      <AddExpenseModal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} />
    </div>
  );
}
