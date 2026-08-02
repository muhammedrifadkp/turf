'use client';

import React, { useState } from 'react';
import { useTurf } from '@/lib/store/context';
import { useConfirm } from '@/components/ui/ConfirmModal';
import { Shift, ShiftSummary } from '@/types';
import { formatINR } from '@/lib/utils';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  Lock,
  LockOpen,
  PauseCircle,
  Play,
  RotateCcw,
  ShieldCheck,
  Timer,
  Wallet,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import StartShiftModal from './StartShiftModal';

export default function ShiftView() {
  const confirm = useConfirm();
  const {
    currentShift,
    shifts,
    endShift,
    reopenShift,
    role,
    user,
    bookings,
    drinkSales,
    expenses,
  } = useTurf();

  const [showStartModal, setShowStartModal] = useState(false);
  const [shiftNotes, setShiftNotes] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [lastClosedSummary, setLastClosedSummary] = useState<ShiftSummary | null>(null);

  const handleCloseShift = async () => {
    if (!currentShift) return;

    const confirmEnd = await confirm({
      title: 'End & Lock Shift Accounting',
      message: 'Are you sure you want to end and lock this shift? Accounting metrics will be finalized.',
      confirmText: 'End Shift Now',
      variant: 'warning',
    });
    if (!confirmEnd) return;

    setIsClosing(true);
    try {
      const summary = await endShift(shiftNotes);
      setLastClosedSummary(summary);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (err) {
      alert('Failed to close shift');
    } finally {
      setIsClosing(false);
    }
  };

  // Active shift live totals
  const shiftBookings = currentShift
    ? bookings.filter((b) => b.shift_id === currentShift.id && !b.is_deleted)
    : [];
  const shiftDrinks = currentShift
    ? drinkSales.filter((d) => d.shift_id === currentShift.id && !d.is_deleted)
    : [];
  const shiftExpensesList = currentShift
    ? expenses.filter((e) => e.shift_id === currentShift.id && !e.is_deleted)
    : [];

  const liveFootballRev = shiftBookings
    .filter((b) => b.court_type === 'football' && b.status !== 'cancelled')
    .reduce((acc, b) => acc + b.final_amount, 0);

  const liveBadmintonRev = shiftBookings
    .filter((b) => b.court_type !== 'football' && b.status !== 'cancelled')
    .reduce((acc, b) => acc + b.final_amount, 0);

  const liveDrinkRev = shiftDrinks.reduce((acc, d) => acc + d.total_price, 0);
  const liveExpensesTotal = shiftExpensesList.reduce((acc, e) => acc + e.amount, 0);
  const liveGross = liveFootballRev + liveBadmintonRev + liveDrinkRev;

  // Calculate Cash & GPay breakdowns for Active Shift
  const shiftCashBookings = shiftBookings.reduce((acc, b) => {
    let bookingCash = b.cash_paid || 0;
    if (b.advance_amount > 0 && (b.advance_method === 'cash' || !b.advance_method)) {
      bookingCash += b.advance_amount;
    }
    return acc + bookingCash;
  }, 0);

  const shiftGpayBookings = shiftBookings.reduce((acc, b) => {
    let bookingGpay = b.gpay_paid || 0;
    if (b.advance_amount > 0 && b.advance_method === 'gpay') {
      bookingGpay += b.advance_amount;
    }
    return acc + bookingGpay;
  }, 0);

  const shiftCashDrinks = shiftDrinks
    .filter((d) => d.is_paid !== false && d.payment_method === 'cash')
    .reduce((acc, d) => acc + d.total_price, 0);

  const shiftGpayDrinks = shiftDrinks
    .filter((d) => d.is_paid !== false && d.payment_method === 'gpay')
    .reduce((acc, d) => acc + d.total_price, 0);

  const shiftCashExpenses = shiftExpensesList
    .filter((e) => !e.payment_method || e.payment_method === 'cash')
    .reduce((acc, e) => acc + e.amount, 0);

  const shiftGpayExpenses = shiftExpensesList
    .filter((e) => e.payment_method === 'gpay')
    .reduce((acc, e) => acc + e.amount, 0);

  const totalShiftCashRevenue = shiftCashBookings + shiftCashDrinks;
  const totalShiftGpayRevenue = shiftGpayBookings + shiftGpayDrinks;
  const netCashInHand = (currentShift?.opening_cash || 0) + totalShiftCashRevenue - shiftCashExpenses;

  return (
    <>
      {/* ========================================== */}
      {/* MOBILE VIEW (lg:hidden) - Perfect Mobile Layout */}
      {/* ========================================== */}
      <div className="block lg:hidden space-y-5 max-w-md mx-auto pb-32 text-[#1a1c1e]">
        {/* 1. Shift Accounting Engine Header Card */}
        <section className="bg-white border border-[#bccac2]/60 p-4 sm:p-5 rounded-xl shadow-xs flex flex-col gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-full bg-[#ffe16a] text-[#221b00] flex items-center justify-center shrink-0">
              <Timer className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="font-extrabold text-xl text-[#1a1c1e] tracking-tight leading-tight">
                Shift Accounting Engine
              </h1>
              <p className="text-xs text-[#3d4a43] font-medium leading-normal mt-0.5">
                Shift-bound financial auditing & irreversible shift locking
              </p>
            </div>
          </div>

          {/* Active Shift Badge */}
          {currentShift ? (
            <div className="bg-[#e8f5f0] border border-[#00a67e] rounded-full px-4 py-1.5 flex items-center gap-2 w-fit">
              <div className="w-2 h-2 rounded-full bg-[#006c51] animate-pulse"></div>
              <span className="text-xs font-bold text-[#00513c]">
                ACTIVE SHIFT ({currentShift.staff_name})
              </span>
            </div>
          ) : (
            <button
              onClick={() => setShowStartModal(true)}
              className="bg-[#00a67e] hover:bg-[#006c51] active:scale-95 text-white rounded-full px-5 py-2.5 flex items-center gap-2 font-bold text-xs tracking-wide shadow-sm transition-all w-fit cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-white stroke-none" />
              <span>START NEW SHIFT</span>
            </button>
          )}
        </section>

        {/* 2. Meta Data (Shift Started At & Opening Cash) */}
        {currentShift && (
          <section className="grid grid-cols-2 gap-3 px-1">
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-[#3d4a43] uppercase tracking-wider">
                SHIFT STARTED AT
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#1a1c1e] mt-0.5">
                {new Date(currentShift.start_time).toLocaleString([], {
                  month: 'numeric',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[11px] font-semibold text-[#3d4a43] uppercase tracking-wider">
                OPENING CASH
              </span>
              <span className="text-xl font-black text-[#006c51]">
                {formatINR(currentShift.opening_cash)}
              </span>
            </div>
          </section>
        )}

        {/* 3. Quick Stats Grid (4 Cards) */}
        {currentShift && (
          <section className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-[#bccac2]/60 p-3.5 rounded-xl shadow-2xs">
              <span className="text-[11px] font-bold text-[#3d4a43] uppercase block mb-0.5">
                FOOTBALL REV
              </span>
              <span className="text-xl font-extrabold text-[#006c51]">
                {formatINR(liveFootballRev)}
              </span>
            </div>

            <div className="bg-white border border-[#bccac2]/60 p-3.5 rounded-xl shadow-2xs">
              <span className="text-[11px] font-bold text-[#3d4a43] uppercase block mb-0.5">
                BADMINTON REV
              </span>
              <span className="text-xl font-extrabold text-[#1a1c1e]">
                {formatINR(liveBadmintonRev)}
              </span>
            </div>

            <div className="bg-white border border-[#bccac2]/60 p-3.5 rounded-xl shadow-2xs">
              <span className="text-[11px] font-bold text-[#3d4a43] uppercase block mb-0.5">
                DRINK REV
              </span>
              <span className="text-xl font-extrabold text-[#c8a900]">
                {formatINR(liveDrinkRev)}
              </span>
            </div>

            <div className="bg-white border border-[#bccac2]/60 p-3.5 rounded-xl shadow-2xs">
              <span className="text-[11px] font-bold text-[#3d4a43] uppercase block mb-0.5">
                EXPENSES
              </span>
              <span className="text-xl font-extrabold text-[#b7102a]">
                {formatINR(liveExpensesTotal)}
              </span>
            </div>
          </section>
        )}

        {/* 4. Cash in Drawer Card (Counter) */}
        {currentShift && (
          <section className="bg-white border-2 border-[#00a67e] p-4 sm:p-5 rounded-xl relative overflow-hidden shadow-sm space-y-3">
            <div className="flex justify-between items-start gap-2">
              <div>
                <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-[#003224]">
                  <DollarSign className="w-4 h-4 text-[#006c51]" />
                  <span>CASH IN DRAWER (COUNTER)</span>
                </div>
                <div className="text-3xl font-black text-[#006c51] mt-1 leading-tight">
                  {formatINR(netCashInHand)}
                </div>
              </div>
              <button
                onClick={() => alert(`Cash Handover to Owner: ${formatINR(netCashInHand)}`)}
                className="bg-[#7af9cc] hover:opacity-90 active:scale-95 text-[#002116] font-bold text-xs px-3 py-1.5 rounded-lg transition-all shadow-2xs cursor-pointer shrink-0"
              >
                HANDOVER CASH
              </button>
            </div>

            <div className="space-y-1.5 pt-2.5 border-t border-[#bccac2]/50 text-xs">
              <div className="flex justify-between text-[#3d4a43]">
                <span>Opening Cash:</span>
                <span className="font-bold text-[#1a1c1e]">+{formatINR(currentShift.opening_cash)}</span>
              </div>
              <div className="flex justify-between text-[#3d4a43]">
                <span>Cash Collections (Bookings + Drinks):</span>
                <span className="font-bold text-[#006c51]">+{formatINR(totalShiftCashRevenue)}</span>
              </div>
              <div className="flex justify-between text-[#3d4a43]">
                <span>Cash Expenses Paid Out:</span>
                <span className="font-bold text-[#b7102a]">-{formatINR(shiftCashExpenses)}</span>
              </div>
            </div>
          </section>
        )}

        {/* 5. GPay / UPI Received Card */}
        {currentShift && (
          <section className="bg-white border-2 border-[#5bdcb0] p-4 sm:p-5 rounded-xl shadow-sm space-y-3">
            <div className="flex justify-between items-start gap-2">
              <div>
                <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-[#1a1c1e]">
                  <CreditCard className="w-4 h-4 text-[#006c51]" />
                  <span>TOTAL GPAY / UPI RECEIVED</span>
                </div>
                <div className="text-3xl font-black text-[#00513c] mt-1 leading-tight">
                  {formatINR(totalShiftGpayRevenue)}
                </div>
              </div>
              <span className="bg-[#5bdcb0]/20 text-[#00513c] font-bold text-[11px] px-3 py-1.5 rounded-lg border border-[#5bdcb0] shrink-0">
                BANK DIRECT
              </span>
            </div>

            <div className="space-y-1.5 pt-2.5 border-t border-[#bccac2]/50 text-xs">
              <div className="flex justify-between text-[#3d4a43]">
                <span>GPay Bookings:</span>
                <span className="font-bold text-[#1a1c1e]">{formatINR(shiftGpayBookings)}</span>
              </div>
              <div className="flex justify-between text-[#3d4a43]">
                <span>GPay Drinks:</span>
                <span className="font-bold text-[#006c51]">+{formatINR(shiftGpayDrinks)}</span>
              </div>
              <div className="flex justify-between text-[#3d4a43]">
                <span>GPay Expenses:</span>
                <span className="font-bold text-[#b7102a]">-{formatINR(shiftGpayExpenses)}</span>
              </div>
            </div>
          </section>
        )}

        {/* 6. Total Combined Shift Revenue Card */}
        {currentShift && (
          <section className="bg-[#1a1c1e] p-4 sm:p-5 rounded-xl text-white shadow-md space-y-3">
            <div className="flex justify-between items-start gap-2">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#bccac2] uppercase tracking-wider">
                  <BarChart3 className="w-4 h-4 text-[#5bdcb0]" />
                  <span>TOTAL COMBINED SHIFT REVENUE</span>
                </div>
                <div className="text-3.5xl sm:text-4xl font-black text-[#7af9cc] mt-1 leading-tight">
                  {formatINR(totalShiftCashRevenue + totalShiftGpayRevenue)}
                </div>
              </div>
              <div className="bg-[#3d4a43]/50 px-3 py-1.5 rounded-lg text-center shrink-0">
                <span className="text-[9px] font-bold block opacity-70 tracking-wider">GROSS</span>
                <span className="text-[11px] font-bold block tracking-tight">REVENUE</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2.5 border-t border-[#3d4a43]/50 text-xs">
              <div className="flex justify-between text-[#bccac2]">
                <span>Cash Portion:</span>
                <span className="font-bold text-[#5bdcb0]">{formatINR(totalShiftCashRevenue)}</span>
              </div>
              <div className="flex justify-between text-[#bccac2]">
                <span>GPay Portion:</span>
                <span className="font-bold text-[#5bdcb0]">{formatINR(totalShiftGpayRevenue)}</span>
              </div>
            </div>
          </section>
        )}

        {/* 7. Shift Closing & Audit Notes */}
        {currentShift ? (
          <section className="bg-white border border-[#bccac2]/60 p-4 sm:p-5 rounded-xl shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <LockOpen className="w-5 h-5 text-[#c8a900]" />
              <h2 className="font-bold text-base text-[#1a1c1e]">Shift Closing & Audit Notes</h2>
            </div>

            <textarea
              value={shiftNotes}
              onChange={(e) => setShiftNotes(e.target.value)}
              placeholder="Enter closing remarks, handover notes or counter discrepancy explanation..."
              className="w-full h-28 rounded-lg border border-[#bccac2]/80 bg-[#f9f9fc] p-3 text-xs text-[#1a1c1e] focus:border-[#006c51] outline-none transition-all resize-none placeholder:opacity-50"
            />

            <button
              onClick={handleCloseShift}
              disabled={isClosing}
              className="w-full bg-[#c8a900] hover:bg-[#a68c00] active:bg-[#8c7600] text-white h-16 rounded-xl flex items-center justify-center gap-3 font-extrabold text-sm sm:text-base tracking-wide shadow-lg shadow-[#c8a900]/25 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Lock className="w-5 h-5 stroke-[2.5]" />
              <span>{isClosing ? 'Calculating & Locking Shift...' : 'END SHIFT & LOCK ACCOUNTING'}</span>
            </button>
          </section>
        ) : (
          <section className="bg-white border border-[#bccac2]/60 rounded-xl p-8 text-center space-y-4 shadow-xs">
            <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-2xl mx-auto font-black">
              ⏱️
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1a1c1e]">No Active Shift Currently</h3>
              <p className="text-xs text-[#3d4a43] max-w-xs mx-auto mt-1 font-medium">
                Staff must start a shift session before accepting bookings, payments or drink sales.
              </p>
            </div>
            <button
              onClick={() => setShowStartModal(true)}
              className="bg-[#00a67e] hover:bg-[#006c51] text-white font-bold text-xs uppercase px-6 py-3 rounded-full shadow-sm transition-all cursor-pointer"
            >
              START SHIFT NOW
            </button>
          </section>
        )}

        {/* 8. Recently Closed Shift Summary */}
        {lastClosedSummary && (
          <section className="bg-[#e8f5f0] border border-[#00a67e] rounded-xl p-5 shadow-xs space-y-3 text-[#003224]">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-6 h-6 text-[#006c51]" />
              <div>
                <h3 className="text-base font-bold">Shift Report Generated & Locked!</h3>
                <p className="text-xs text-[#00513c] font-medium">
                  Staff: {lastClosedSummary.staff_name} | Duration: {lastClosedSummary.duration_formatted}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="bg-white p-2.5 rounded-lg border border-[#00a67e]/30">
                <span className="text-[#3d4a43] block">Gross Collection</span>
                <span className="font-extrabold text-[#006c51] text-sm">
                  {formatINR(lastClosedSummary.gross_collection)}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-[#00a67e]/30">
                <span className="text-[#3d4a43] block">Net Cash in Register</span>
                <span className="font-extrabold text-[#c8a900] text-sm">
                  {formatINR(lastClosedSummary.net_cash_in_hand)}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* 9. Shift History Audit Log */}
        <section className="bg-white border border-[#bccac2]/60 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-[#bccac2]/50 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#006c51]" />
            <h2 className="font-bold text-sm text-[#1a1c1e]">Shift History Audit Log</h2>
          </div>

          {shifts.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs font-medium">No historical shifts recorded.</div>
          ) : (
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f3f3f6]">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-[#3d4a43]">STAFF</th>
                    <th className="px-4 py-3 font-semibold text-[#3d4a43]">START TIME</th>
                    <th className="px-4 py-3 font-semibold text-[#3d4a43]">END TIME</th>
                    <th className="px-4 py-3 font-semibold text-[#3d4a43] text-right">OPENING</th>
                    <th className="px-4 py-3 font-semibold text-[#3d4a43] text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#bccac2]/30">
                  {shifts.map((s) => (
                    <tr key={s.id} className="hover:bg-[#f9f9fc] transition-colors">
                      <td className="px-4 py-3.5 font-bold text-[#1a1c1e]">{s.staff_name}</td>
                      <td className="px-4 py-3.5 text-[#3d4a43]">
                        {new Date(s.start_time).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3.5 text-[#3d4a43] italic opacity-70">
                        {s.end_time
                          ? new Date(s.end_time).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Active'}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-[#006c51] text-right">
                        {formatINR(s.opening_cash)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            s.status === 'active'
                              ? 'bg-[#00a67e]/20 text-[#003224]'
                              : 'bg-[#e2e2e5] text-[#3d4a43]'
                          }`}
                        >
                          {s.status === 'active' ? 'Active' : 'Locked'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* ========================================== */}
      {/* DESKTOP / LAPTOP VIEW (hidden lg:block) - Original Desktop Design */}
      {/* ========================================== */}
      <div className="hidden lg:block space-y-6 pb-20">
        {/* Top Header Banner */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 text-2xl">
              ⏱️
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Shift Accounting Engine</h2>
              <p className="text-xs text-slate-500">
                Shift-bound financial auditing & irreversible shift locking
              </p>
            </div>
          </div>

          <div>
            {currentShift ? (
              <div className="px-4 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-black text-xs flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping" />
                <span>ACTIVE SHIFT ({currentShift.staff_name})</span>
              </div>
            ) : (
              <button
                onClick={() => setShowStartModal(true)}
                className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase shadow-sm transition-all flex items-center space-x-2 cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>START NEW SHIFT</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Shift Dashboard Panel */}
        {currentShift ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Shift Started At
                </span>
                <p className="text-sm font-black text-slate-900">
                  {new Date(currentShift.start_time).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Opening Cash
                </span>
                <p className="text-sm font-black text-emerald-700">
                  {formatINR(currentShift.opening_cash)}
                </p>
              </div>
            </div>

            {/* Live Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="block text-[10px] font-extrabold text-slate-500 uppercase">
                  Football Rev
                </span>
                <span className="text-lg font-black text-emerald-700">
                  {formatINR(liveFootballRev)}
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="block text-[10px] font-extrabold text-slate-500 uppercase">
                  Badminton Rev
                </span>
                <span className="text-lg font-black text-teal-700">
                  {formatINR(liveBadmintonRev)}
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="block text-[10px] font-extrabold text-slate-500 uppercase">
                  Drink Rev
                </span>
                <span className="text-lg font-black text-amber-700">
                  {formatINR(liveDrinkRev)}
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="block text-[10px] font-extrabold text-slate-500 uppercase">
                  Expenses
                </span>
                <span className="text-lg font-black text-rose-600">
                  {formatINR(liveExpensesTotal)}
                </span>
              </div>
            </div>

            {/* CASH & GPAY SEPARATED COUNTER AUDIT CARD */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-200 pt-5">
              {/* CASH IN HAND / DRAWER */}
              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-3xl p-5 shadow-sm space-y-2">
                <div className="flex justify-between items-center text-emerald-900 font-extrabold text-xs uppercase tracking-wide">
                  <span>💵 CASH IN DRAWER (COUNTER)</span>
                  <span className="bg-emerald-200 text-emerald-900 px-2.5 py-0.5 rounded-full text-[10px]">HANDOVER CASH</span>
                </div>
                <p className="text-3xl font-black text-emerald-800">
                  {formatINR(netCashInHand)}
                </p>
                <div className="text-[11px] font-bold text-emerald-700 space-y-0.5 border-t border-emerald-200 pt-2">
                  <div className="flex justify-between">
                    <span>Opening Cash:</span>
                    <span>+{formatINR(currentShift.opening_cash)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cash Collections (Bookings + Drinks):</span>
                    <span>+{formatINR(totalShiftCashRevenue)}</span>
                  </div>
                  <div className="flex justify-between text-rose-700">
                    <span>Cash Expenses Paid Out:</span>
                    <span>-{formatINR(shiftCashExpenses)}</span>
                  </div>
                </div>
              </div>

              {/* GPAY / UPI TOTAL */}
              <div className="bg-teal-50 border-2 border-teal-300 rounded-3xl p-5 shadow-sm space-y-2">
                <div className="flex justify-between items-center text-teal-900 font-extrabold text-xs uppercase tracking-wide">
                  <span>📱 TOTAL GPAY / UPI RECEIVED</span>
                  <span className="bg-teal-200 text-teal-900 px-2.5 py-0.5 rounded-full text-[10px]">BANK DIRECT</span>
                </div>
                <p className="text-3xl font-black text-teal-800">
                  {formatINR(totalShiftGpayRevenue)}
                </p>
                <div className="text-[11px] font-bold text-teal-700 space-y-0.5 border-t border-teal-200 pt-2">
                  <div className="flex justify-between">
                    <span>GPay Bookings:</span>
                    <span>{formatINR(shiftGpayBookings)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GPay Drinks:</span>
                    <span>+{formatINR(shiftGpayDrinks)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>GPay Expenses:</span>
                    <span>-{formatINR(shiftGpayExpenses)}</span>
                  </div>
                </div>
              </div>

              {/* TOTAL SHIFT GROSS REVENUE */}
              <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-sm space-y-2">
                <div className="flex justify-between items-center font-extrabold text-xs uppercase tracking-wide text-slate-300">
                  <span>📊 TOTAL COMBINED SHIFT REVENUE</span>
                  <span className="bg-slate-800 text-slate-200 px-2.5 py-0.5 rounded-full text-[10px]">GROSS REVENUE</span>
                </div>
                <p className="text-3xl font-black text-emerald-400">
                  {formatINR(totalShiftCashRevenue + totalShiftGpayRevenue)}
                </p>
                <div className="text-[11px] font-bold text-slate-400 space-y-0.5 border-t border-slate-800 pt-2">
                  <div className="flex justify-between">
                    <span>Cash Portion:</span>
                    <span className="text-emerald-400">{formatINR(totalShiftCashRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GPay Portion:</span>
                    <span className="text-teal-400">{formatINR(totalShiftGpayRevenue)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* End Shift Trigger Box */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <h4 className="text-sm font-black text-slate-900 flex items-center space-x-2">
                <Lock className="w-4 h-4 text-amber-600" />
                <span>Shift Closing & Audit Notes</span>
              </h4>

              <textarea
                value={shiftNotes}
                onChange={(e) => setShiftNotes(e.target.value)}
                placeholder="Enter closing remarks, handover notes or counter discrepancy explanation..."
                rows={2}
                className="w-full bg-white border border-slate-200 text-xs text-slate-900 rounded-xl p-3 outline-none"
              />

              <button
                onClick={handleCloseShift}
                disabled={isClosing}
                className="w-full py-4 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm uppercase tracking-wider shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>{isClosing ? 'Calculating & Locking Shift...' : 'END SHIFT & LOCK ACCOUNTING'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-3xl mx-auto text-amber-600">
              ⏸️
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">No Active Shift Currently</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Staff must start a shift session before accepting walk-in bookings, payments or drink sales.
              </p>
            </div>
            <button
              onClick={() => setShowStartModal(true)}
              className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase shadow-sm transition-all cursor-pointer"
            >
              START SHIFT NOW
            </button>
          </div>
        )}

        {/* Recently Closed Shift Summary Report Banner */}
        {lastClosedSummary && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 shadow-sm space-y-4 animate-fade-in text-emerald-900">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              <div>
                <h3 className="text-lg font-black">Shift Report Generated & Locked!</h3>
                <p className="text-xs text-emerald-700">
                  Staff: {lastClosedSummary.staff_name} | Duration: {lastClosedSummary.duration_formatted}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-emerald-100">
                <span className="text-slate-500 block">Gross Collection</span>
                <span className="font-black text-emerald-700 text-sm">
                  {formatINR(lastClosedSummary.gross_collection)}
                </span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-emerald-100">
                <span className="text-slate-500 block">Net Cash in Register</span>
                <span className="font-black text-amber-700 text-sm">
                  {formatINR(lastClosedSummary.net_cash_in_hand)}
                </span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-emerald-100">
                <span className="text-slate-500 block">GPay Collected</span>
                <span className="font-black text-blue-700 text-sm">
                  {formatINR(lastClosedSummary.gpay_collected)}
                </span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-emerald-100">
                <span className="text-slate-500 block">Total Expenses</span>
                <span className="font-black text-rose-600 text-sm">
                  {formatINR(lastClosedSummary.total_expenses)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Historical Shift Audit Log Table */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>Shift History Audit Log</span>
          </h3>

          {shifts.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">No historical shifts recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-100">
                  <tr>
                    <th className="p-3 rounded-l-xl">Staff</th>
                    <th className="p-3">Start Time</th>
                    <th className="p-3">End Time</th>
                    <th className="p-3">Opening Cash</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Gross Rev</th>
                    <th className="p-3 text-right rounded-r-xl">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shifts.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-bold text-slate-900">{s.staff_name}</td>
                      <td className="p-3 text-slate-600">
                        {new Date(s.start_time).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="p-3 text-slate-500">
                        {s.end_time
                          ? new Date(s.end_time).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Active'}
                      </td>
                      <td className="p-3 font-semibold text-emerald-700">{formatINR(s.opening_cash)}</td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            s.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="p-3 text-right font-black text-emerald-700">
                        {formatINR(s.summary?.gross_collection || 0)}
                      </td>
                      <td className="p-3 text-right">
                        {s.status === 'closed' && role === 'owner' && (
                          <button
                            onClick={async () => {
                              const approved = await confirm({
                                title: 'Reopen Closed Shift',
                                message: `Are you sure you want to reopen shift started by ${s.staff_name}?`,
                                confirmText: 'Reopen Shift',
                                variant: 'warning',
                              });
                              if (approved) {
                                reopenShift(s.id);
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[10px] border border-amber-200 transition-colors flex items-center space-x-1 ml-auto cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reopen (Owner)</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <StartShiftModal isOpen={showStartModal} onClose={() => setShowStartModal(false)} />
    </>
  );
}
