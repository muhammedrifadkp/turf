'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useTurf } from '@/lib/store/context';
import { formatINR, formatNiceDate, formatTimeDisplay, getTodayDateString, parseTimeToMinutes } from '@/lib/utils';
import {
  ArrowRight,
  Banknote,
  Calculator,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Download,
  GlassWater,
  Plus,
  Receipt,
  User,
} from 'lucide-react';
import AddExpenseModal from '@/components/expenses/AddExpenseModal';
import { WhatsAppShareButton } from '@/components/ui/WhatsAppShareButton';
import { exportStaffDrinksReportPDF } from '@/lib/pdfExporter';

function getCourtBadge(b: any) {
  const court = (b.court_type || b.booking_type || 'football').toLowerCase();

  if (court === 'football') {
    return {
      icon: '⚽',
      label: 'Football Turf',
      badgeClass: 'bg-emerald-100 text-emerald-950 border-emerald-300',
    };
  }
  if (court === 'badminton_1') {
    return {
      icon: '🏸',
      label: 'Court 1 (Synthetic)',
      badgeClass: 'bg-cyan-100 text-cyan-950 border-cyan-300',
    };
  }
  if (court === 'badminton_2') {
    return {
      icon: '🏸',
      label: 'Court 2 (Wooden)',
      badgeClass: 'bg-purple-100 text-purple-950 border-purple-300',
    };
  }
  if (court === 'both_badminton') {
    return {
      icon: '🏸',
      label: 'Both Courts (1 & 2)',
      badgeClass: 'bg-indigo-100 text-indigo-950 border-indigo-300',
    };
  }
  if (court.includes('badminton')) {
    return {
      icon: '🏸',
      label: 'Badminton',
      badgeClass: 'bg-blue-100 text-blue-950 border-blue-300',
    };
  }

  return {
    icon: '⚽',
    label: court.toUpperCase(),
    badgeClass: 'bg-slate-100 text-slate-900 border-slate-300',
  };
}

export default function DrinksManager() {
  const { drinkSales, currentShift, bookings, user } = useTurf();
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // Today's Date
  const todayDate = getTodayDateString();

  const SHARED_DATE_KEY = 'staff_counter_selected_date';

  // Selected Date state (persisted in shared localStorage)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const savedDate = localStorage.getItem(SHARED_DATE_KEY);
      if (savedDate && /^\d{4}-\d{2}-\d{2}$/.test(savedDate)) {
        return savedDate;
      }
    }
    return todayDate;
  });

  // Update selected date state, update localStorage, and notify other sections
  const updateSelectedDate = (newDate: string) => {
    setSelectedDate(newDate);
    if (typeof window !== 'undefined') {
      localStorage.setItem(SHARED_DATE_KEY, newDate);
      window.dispatchEvent(new Event('staff_counter_date_changed'));
    }
  };

  // Sync state if date is changed from another tab or component
  useEffect(() => {
    const handleSync = () => {
      if (typeof window !== 'undefined') {
        const savedDate = localStorage.getItem(SHARED_DATE_KEY);
        if (savedDate && /^\d{4}-\d{2}-\d{2}$/.test(savedDate)) {
          setSelectedDate(savedDate);
        }
      }
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('staff_counter_date_changed', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('staff_counter_date_changed', handleSync);
    };
  }, []);

  // Date Navigation Handlers
  const handlePrevDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() - 1);
    const newY = dateObj.getFullYear();
    const newM = String(dateObj.getMonth() + 1).padStart(2, '0');
    const newD = String(dateObj.getDate()).padStart(2, '0');
    updateSelectedDate(`${newY}-${newM}-${newD}`);
  };

  const handleNextDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + 1);
    const newY = dateObj.getFullYear();
    const newM = String(dateObj.getMonth() + 1).padStart(2, '0');
    const newD = String(dateObj.getDate()).padStart(2, '0');
    updateSelectedDate(`${newY}-${newM}-${newD}`);
  };

  // Smart Bookings Filter for Duty Staff Counter:
  // Shows ONLY booking details matching the selected date
  const relevantBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (b.is_deleted || b.status === 'cancelled') return false;
      if (!b.play_date) return false;
      const playDateStr = b.play_date.split('T')[0].split(' ')[0];
      return playDateStr === selectedDate || b.play_date.startsWith(selectedDate);
    });
  }, [bookings, selectedDate]);

  // 1. Unconfirmed Pending Dues Teams (Initial Dues)
  const todayUnconfirmedPendingBookings = useMemo(() => {
    return relevantBookings
      .filter((b) => {
        const isConfirmed = Boolean(
          b.is_pos_confirmed || (b.payment_records && b.payment_records.length > 0)
        );
        return b.outstanding_balance > 0 && !isConfirmed;
      })
      .sort((a, b) => parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time));
  }, [relevantBookings]);

  // 2. Completed Bookings with Pending Dues (POS Confirmed with Pending Amount for Next Time)
  const todayCompletedWithPendingBookings = useMemo(() => {
    return relevantBookings
      .filter((b) => {
        const isConfirmed = Boolean(
          b.is_pos_confirmed || (b.payment_records && b.payment_records.length > 0)
        );
        return b.outstanding_balance > 0 && isConfirmed;
      })
      .sort((a, b) => parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time));
  }, [relevantBookings]);

  // 3. Finished / Fully Paid Bookings
  const todayFinishedBookings = useMemo(() => {
    return relevantBookings
      .filter((b) => b.outstanding_balance <= 0)
      .sort((a, b) => parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time));
  }, [relevantBookings]);

  // Recent shift drinks sales
  const shiftDrinks = drinkSales.filter(
    (d) => d.shift_id === (currentShift?.id || 'shift-demo-1') && !d.is_deleted
  );

  const totalDrinkRevenueThisShift = shiftDrinks.reduce((acc, d) => acc + d.total_price, 0);

  // PDF Export Handler
  const handleExportPDF = () => {
    exportStaffDrinksReportPDF({
      selectedDate,
      unconfirmedPending: todayUnconfirmedPendingBookings,
      completedWithPending: todayCompletedWithPendingBookings,
      finishedBookings: todayFinishedBookings,
      drinkSales,
      currentShift,
      staffName: user?.full_name || 'Duty Staff',
    });
  };

  return (
    <>
      {/* ========================================== */}
      {/* MOBILE VIEW (lg:hidden) - Perfect Mobile Layout */}
      {/* ========================================== */}
      <div className="block lg:hidden space-y-6 max-w-2xl mx-auto pb-24">
        {/* 1. Duty Staff Counter & POS Header Card */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/60 shadow-xs">
              <GlassWater className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Duty Staff Counter & POS
              </h2>
              <p className="text-xs text-slate-400 font-medium leading-relaxed mt-0.5">
                Collect team dues & manage shift cash accounting
              </p>
            </div>
          </div>

          {/* Buttons Row: Crimson Add Expense + Export PDF + Shift Revenue Badge */}
          <div className="grid grid-cols-2 sm:flex items-center gap-2.5 pt-1">
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="py-3 px-3 rounded-2xl bg-[#be123c] hover:bg-[#9f1239] active:scale-[0.98] text-white font-bold text-xs tracking-wide shadow-md transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>ADD EXPENSE</span>
            </button>

            <button
              onClick={handleExportPDF}
              className="py-3 px-3 rounded-2xl bg-teal-700 hover:bg-teal-800 active:scale-[0.98] text-white font-bold text-xs tracking-wide shadow-md transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              title="Export staff report as PDF for admin"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>EXPORT PDF</span>
            </button>

            <div className="col-span-2 sm:col-span-1 bg-slate-100/80 border border-slate-200/70 rounded-2xl p-2.5 px-4 flex flex-col items-center justify-center text-center min-w-[110px]">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block leading-none">
                SHIFT REVENUE
              </span>
              <span className="text-xl font-black text-emerald-700 tracking-tight mt-1 leading-none">
                {formatINR(totalDrinkRevenueThisShift)}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Date Selector Bar */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handlePrevDay}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 transition-all cursor-pointer"
            title="Previous Day"
          >
            <ChevronLeft className="h-4 w-4 stroke-[2.5]" />
          </button>

          <div className="relative flex items-center justify-center gap-2 cursor-pointer py-1 px-2 rounded-xl hover:bg-slate-50 transition-colors">
            <Calendar className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-extrabold text-xs sm:text-sm text-slate-900">
              {formatNiceDate(selectedDate)}
            </span>
            {selectedDate === todayDate && (
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wide">
                TODAY
              </span>
            )}
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && updateSelectedDate(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {selectedDate !== todayDate && (
              <button
                type="button"
                onClick={() => updateSelectedDate(todayDate)}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:scale-95 text-[11px] font-black transition-all cursor-pointer"
              >
                Today
              </button>
            )}
            <button
              type="button"
              onClick={handleNextDay}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 transition-all cursor-pointer"
              title="Next Day"
            >
              <ChevronRight className="h-4 w-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* SECTION 1: Pending Dues Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center space-x-2">
              <Banknote className="w-5 h-5 text-emerald-600" />
              <span>
                {selectedDate === todayDate
                  ? "Today's Pending Dues Teams"
                  : `Pending Dues Teams (${formatNiceDate(selectedDate)})`}
              </span>
            </h3>
            <span className="text-xs font-semibold text-slate-400">
              {todayUnconfirmedPendingBookings.length} Pending
            </span>
          </div>

          {todayUnconfirmedPendingBookings.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 text-center text-slate-400 text-xs font-medium shadow-xs">
              {selectedDate === todayDate
                ? '🎉 All initial pending teams have been processed or paid!'
                : `No initial pending teams for ${formatNiceDate(selectedDate)}.`}
            </div>
          ) : (
            <div className="space-y-3">
              {todayUnconfirmedPendingBookings.map((b) => {
                const courtInfo = getCourtBadge(b);
                return (
                  <div
                    key={b.id}
                    className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 transition-all hover:border-emerald-300"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="mb-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-black border shadow-2xs ${courtInfo.badgeClass}`}
                          >
                            <span>{courtInfo.icon}</span>
                            <span>{courtInfo.label}</span>
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          TEAM NAME
                        </span>
                        <h4 className="font-extrabold text-slate-900 text-base sm:text-lg leading-tight capitalize mt-0.5">
                          {b.team_name}
                        </h4>
                      </div>
                      <div className="bg-[#fef08a] text-amber-950 font-bold px-3 py-1 rounded-full text-xs flex items-center space-x-1 shadow-2xs shrink-0">
                        <Clock className="w-3.5 h-3.5 text-amber-800" />
                        <span>
                          {formatTimeDisplay(b.start_time)} - {formatTimeDisplay(b.end_time)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {b.customer_name} • ({b.phone})
                      </span>
                    </div>

                    <hr className="border-t border-dashed border-slate-200 my-2" />

                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <span className="font-semibold text-slate-400">Outstanding:</span>
                      <span className="text-sm font-extrabold text-rose-600">
                        Due Balance: {formatINR(b.outstanding_balance)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/bookings/${b.id}`}
                        className="flex-1 py-3 px-4 rounded-2xl bg-[#00a878] hover:bg-[#009067] active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-sm transition-all flex items-center justify-center space-x-2"
                      >
                        <Receipt className="w-4 h-4" />
                        <span>OPEN BOOKING POS PAGE ({formatINR(b.outstanding_balance)})</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                      <WhatsAppShareButton booking={b} variant="icon" className="py-3.5 px-3.5 rounded-2xl" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 2: Completed Bookings with Pending Dues */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-base sm:text-lg font-bold text-amber-900 flex items-center space-x-2">
              <div className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-xs">
                ⏳
              </div>
              <span>Completed Bookings with Pending Dues</span>
            </h3>
            <span className="text-xs font-semibold text-amber-700 font-bold">
              {todayCompletedWithPendingBookings.length} Saved Pending
            </span>
          </div>

          {todayCompletedWithPendingBookings.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 text-center text-slate-400 text-xs font-medium shadow-xs">
              {selectedDate === todayDate
                ? 'No completed bookings with pending dues saved for next time yet.'
                : `No completed bookings with pending dues saved for ${formatNiceDate(selectedDate)}.`}
            </div>
          ) : (
            <div className="space-y-3">
              {todayCompletedWithPendingBookings.map((b) => {
                const courtInfo = getCourtBadge(b);
                return (
                  <div
                    key={b.id}
                    className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 transition-all hover:border-amber-300"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="mb-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-black border shadow-2xs ${courtInfo.badgeClass}`}
                          >
                            <span>{courtInfo.icon}</span>
                            <span>{courtInfo.label}</span>
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
                          TEAM NAME
                        </span>
                        <h4 className="font-extrabold text-slate-900 text-base sm:text-lg leading-tight capitalize mt-0.5">
                          {b.team_name}
                        </h4>
                      </div>
                      <div className="bg-amber-200 text-amber-950 border border-amber-300 px-3 py-1 rounded-full text-xs font-extrabold flex items-center space-x-1 shrink-0">
                        <span>⏳ PENDING FOR NEXT TIME</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 text-xs text-slate-600 font-medium">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {b.customer_name} • ({b.phone})
                      </span>
                    </div>

                    <hr className="border-t border-dashed border-amber-200 my-2" />

                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <span className="font-bold text-slate-600">Pending Amount to Collect Next Time:</span>
                      <span className="text-sm font-black text-amber-800">
                        {formatINR(b.outstanding_balance)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/bookings/${b.id}`}
                        className="flex-1 py-3 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-sm transition-all flex items-center justify-center space-x-2"
                      >
                        <Receipt className="w-4 h-4" />
                        <span>OPEN POS / COLLECT PENDING ({formatINR(b.outstanding_balance)})</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                      <WhatsAppShareButton booking={b} variant="icon" className="py-3.5 px-3.5 rounded-2xl" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 3: Finished / Fully Paid Bookings Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center space-x-2">
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
              <span>
                {selectedDate === todayDate
                  ? 'Finished / Paid Bookings'
                  : `Finished / Paid Bookings (${formatNiceDate(selectedDate)})`}
              </span>
            </h3>
            <span className="text-xs font-semibold text-slate-400">
              {todayFinishedBookings.length} Completed
            </span>
          </div>

          {todayFinishedBookings.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 text-center text-slate-400 text-xs font-medium shadow-xs">
              {selectedDate === todayDate
                ? 'No completed/paid bookings for today yet.'
                : `No completed/paid bookings for ${formatNiceDate(selectedDate)}.`}
            </div>
          ) : (
            <div className="space-y-3">
              {todayFinishedBookings.map((b) => {
                const courtInfo = getCourtBadge(b);
                return (
                  <div
                    key={b.id}
                    className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="mb-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-black border shadow-2xs ${courtInfo.badgeClass}`}
                          >
                            <span>{courtInfo.icon}</span>
                            <span>{courtInfo.label}</span>
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          TEAM NAME
                        </span>
                        <h4 className="font-extrabold text-slate-900 text-base sm:text-lg leading-tight capitalize mt-0.5">
                          {b.team_name}
                        </h4>
                      </div>
                      <div className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2.5 py-1 rounded-full text-xs font-extrabold flex items-center space-x-1 shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>PAID IN FULL</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1.5 text-slate-500 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {formatTimeDisplay(b.start_time)} ({b.total_hours}h)
                        </span>
                      </div>
                      <div className="font-extrabold text-emerald-600 text-sm">
                        Total: {formatINR(b.final_amount)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/bookings/${b.id}`}
                        className="flex-1 py-3 px-4 rounded-2xl bg-[#18181b] hover:bg-slate-800 active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-sm transition-all flex items-center justify-center space-x-2"
                      >
                        <span>OPEN POS DETAILS</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                      <WhatsAppShareButton booking={b} variant="icon" className="py-3.5 px-3.5 rounded-2xl" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========================================== */}
      {/* DESKTOP / LAPTOP VIEW (hidden lg:block) - Original Desktop Design */}
      {/* ========================================== */}
      <div className="hidden lg:block space-y-6 pb-20">
        {/* Top Header Banner */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 text-2xl font-black shrink-0">
              🥤
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Duty Staff Counter & POS</h2>
              <p className="text-xs text-slate-500">
                Collect team dues & manage shift cash accounting
              </p>
            </div>
          </div>

          {/* Desktop Date Selector Control */}
          <div className="flex items-center bg-slate-50 border border-slate-200/90 rounded-2xl p-2 shadow-2xs space-x-2">
            <button
              type="button"
              onClick={handlePrevDay}
              className="p-2 rounded-xl bg-white hover:bg-slate-200 active:scale-95 text-slate-700 border border-slate-200/80 transition-all cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft className="h-4 w-4 stroke-[2.5]" />
            </button>

            <div className="relative flex items-center justify-center space-x-2 px-3 py-1 cursor-pointer">
              <Calendar className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="font-extrabold text-sm text-slate-900 whitespace-nowrap">
                {formatNiceDate(selectedDate)}
              </span>
              {selectedDate === todayDate && (
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wide">
                  TODAY
                </span>
              )}
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && updateSelectedDate(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </div>

            {selectedDate !== todayDate && (
              <button
                type="button"
                onClick={() => updateSelectedDate(todayDate)}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 hover:bg-emerald-200 active:scale-95 text-xs font-black transition-all cursor-pointer"
              >
                Today
              </button>
            )}

            <button
              type="button"
              onClick={handleNextDay}
              className="p-2 rounded-xl bg-white hover:bg-slate-200 active:scale-95 text-slate-700 border border-slate-200/80 transition-all cursor-pointer"
              title="Next Day"
            >
              <ChevronRight className="h-4 w-4 stroke-[2.5]" />
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportPDF}
              className="px-4 py-2.5 rounded-2xl bg-teal-700 hover:bg-teal-800 active:scale-95 text-white font-black text-xs sm:text-sm uppercase tracking-wide shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
              title="Export staff report as PDF for admin"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>EXPORT PDF</span>
            </button>

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

        {/* SECTION 1: Unconfirmed Pending Dues Teams */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <span>
                {selectedDate === todayDate
                  ? `Today's Pending Dues Teams (${todayUnconfirmedPendingBookings.length} Pending Dues)`
                  : `Pending Dues Teams (${formatNiceDate(selectedDate)}) (${todayUnconfirmedPendingBookings.length} Pending Dues)`}
              </span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">Page-Based Dues & Drinks</span>
          </div>

          {todayUnconfirmedPendingBookings.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs font-semibold">
              {selectedDate === todayDate
                ? '🎉 All initial pending teams have been processed or paid!'
                : `No initial pending teams for ${formatNiceDate(selectedDate)}.`}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {todayUnconfirmedPendingBookings.map((b) => {
                const courtInfo = getCourtBadge(b);
                return (
                  <div
                    key={b.id}
                    className="bg-slate-50/80 border border-slate-200 hover:border-emerald-300 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-2xs transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="mb-1">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-black border shadow-2xs ${courtInfo.badgeClass}`}
                            >
                              <span>{courtInfo.icon}</span>
                              <span>{courtInfo.label}</span>
                            </span>
                          </div>
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

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/bookings/${b.id}`}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm uppercase tracking-wide shadow-xs transition-all flex items-center justify-center space-x-1.5"
                      >
                        <DollarSign className="w-4 h-4" />
                        <span>OPEN BOOKING POS PAGE ({formatINR(b.outstanding_balance)}) →</span>
                      </Link>
                      <WhatsAppShareButton booking={b} variant="icon" className="py-2.5 px-3 rounded-xl" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 2: Completed Bookings with Pending Dues */}
        <div className="bg-white border border-amber-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-amber-100 pb-3">
            <h3 className="text-base font-black text-amber-950 flex items-center space-x-2">
              <span className="text-lg">⏳</span>
              <span>Completed Bookings with Pending Dues ({todayCompletedWithPendingBookings.length} Teams)</span>
            </h3>
            <span className="text-xs text-amber-700 font-bold">POS Confirmed • Pending Dues</span>
          </div>

          {todayCompletedWithPendingBookings.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs font-semibold">
              {selectedDate === todayDate
                ? 'No completed bookings with pending dues saved for next time yet.'
                : `No completed bookings with pending dues saved for ${formatNiceDate(selectedDate)}.`}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {todayCompletedWithPendingBookings.map((b) => {
                const courtInfo = getCourtBadge(b);
                return (
                  <div
                    key={b.id}
                    className="bg-amber-50/70 border border-amber-200/90 hover:border-amber-400 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-2xs transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="mb-1">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-black border shadow-2xs ${courtInfo.badgeClass}`}
                            >
                              <span>{courtInfo.icon}</span>
                              <span>{courtInfo.label}</span>
                            </span>
                          </div>
                          <span className="text-[10px] font-extrabold text-amber-700 uppercase tracking-wider block">
                            Team Name
                          </span>
                          <h4 className="font-black text-slate-900 text-lg sm:text-xl leading-tight capitalize">
                            {b.team_name}
                          </h4>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-amber-200 text-amber-950 border border-amber-300 shadow-2xs whitespace-nowrap">
                          ⏳ SAVED PENDING
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 font-semibold mt-2 flex items-center gap-1.5">
                        <span>👤 {b.customer_name}</span>
                        <span className="text-slate-400">•</span>
                        <span>({b.phone})</span>
                      </p>
                      <div className="mt-2 pt-2 border-t border-amber-200/80 flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-600">Pending Dues for Next Time:</span>
                        <span className="text-base font-black text-amber-800">
                          {formatINR(b.outstanding_balance)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/bookings/${b.id}`}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs sm:text-sm uppercase tracking-wide shadow-xs transition-all flex items-center justify-center space-x-1.5"
                      >
                        <span>OPEN POS / COLLECT PENDING ({formatINR(b.outstanding_balance)}) →</span>
                      </Link>
                      <WhatsAppShareButton booking={b} variant="icon" className="py-2.5 px-3 rounded-xl" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 3: FINISHED / PAID BOOKINGS SECTION */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>
                {selectedDate === todayDate
                  ? `Today's Finished / Paid Bookings (${todayFinishedBookings.length} Completed)`
                  : `Finished / Paid Bookings (${formatNiceDate(selectedDate)}) (${todayFinishedBookings.length} Completed)`}
              </span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">Fully Paid Dues</span>
          </div>

          {todayFinishedBookings.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              {selectedDate === todayDate
                ? 'No completed/paid bookings for today yet.'
                : `No completed/paid bookings for ${formatNiceDate(selectedDate)}.`}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {todayFinishedBookings.map((b) => {
                const courtInfo = getCourtBadge(b);
                return (
                  <div
                    key={b.id}
                    className="bg-emerald-50/40 border border-emerald-200/80 rounded-2xl p-4 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="mb-1">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-black border shadow-2xs ${courtInfo.badgeClass}`}
                            >
                              <span>{courtInfo.icon}</span>
                              <span>{courtInfo.label}</span>
                            </span>
                          </div>
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

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/bookings/${b.id}`}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs sm:text-sm uppercase tracking-wide shadow-xs transition-all flex items-center justify-center space-x-1.5"
                      >
                        <span>OPEN POS DETAILS →</span>
                      </Link>
                      <WhatsAppShareButton booking={b} variant="icon" className="py-2.5 px-3 rounded-xl" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Standalone Quick Add Expense Modal */}
      <AddExpenseModal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} />
    </>
  );
}
