'use client';

import React, { useState } from 'react';
import { useTurf } from '@/lib/store/context';
import { useConfirm } from '@/components/ui/ConfirmModal';
import { Shift, ShiftSummary } from '@/types';
import { formatINR } from '@/lib/utils';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Coffee,
  DollarSign,
  FileSpreadsheet,
  FileText,
  Lock,
  RotateCcw,
  ShieldCheck,
  Sparkles,
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
    <div className="space-y-6 pb-20">
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
              className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase shadow-sm transition-all flex items-center space-x-2"
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
              className="w-full py-4 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm uppercase tracking-wider shadow-md transition-all flex items-center justify-center space-x-2"
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
            className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase shadow-sm transition-all"
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

      <StartShiftModal isOpen={showStartModal} onClose={() => setShowStartModal(false)} />
    </div>
  );
}
