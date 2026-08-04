'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTurf } from '@/lib/store/context';
import { useConfirm } from '@/components/ui/ConfirmModal';
import { Booking, DrinkType, PaymentRecord } from '@/types';
import { DRINK_ITEMS } from '@/lib/constants';
import { formatINR, formatNiceDate, formatTimeDisplay, normalizeBookingPaymentRecords } from '@/lib/utils';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Coffee,
  DollarSign,
  Minus,
  Pencil,
  Phone,
  Plus,
  Receipt,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react';

interface Props {
  bookingId: string;
}

export default function BookingDetailsPOS({ bookingId }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const {
    bookings,
    updateBooking,
    addPaymentRecord,
    removePaymentRecord,
    editPaymentRecord,
    drinkSales,
    addDrinkSale,
    removeDrinkSale,
    toggleDrinkPaidStatus,
    updateDrinkPaidMethod,
    settings,
    user,
  } = useTurf();

  // Find booking
  const booking = useMemo(
    () => bookings.find((b) => b.id === bookingId && !b.is_deleted),
    [bookings, bookingId]
  );

  // Inline Quick Payment State (No Popups!)
  const [inlinePaymentMethod, setInlinePaymentMethod] = useState<'cash' | 'gpay' | null>(null);
  const [inlinePaymentAmount, setInlinePaymentAmount] = useState<string>('');

  // Editing payment record state
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState<string>('');
  const [editingMethod, setEditingMethod] = useState<'cash' | 'gpay'>('cash');

  // Discount State
  const [discountValue, setDiscountValue] = useState<number | string>(
    booking?.discount || 0
  );

  // Pending Amount State (for teams that don't pay full amount today)
  const initialPending =
    booking?.pending_amount !== undefined
      ? booking.pending_amount
      : booking?.outstanding_balance !== undefined
      ? booking.outstanding_balance
      : 0;

  const [pendingAmountInput, setPendingAmountInput] = useState<number | string>(initialPending);
  const [isPendingManuallyEdited, setIsPendingManuallyEdited] = useState<boolean>(false);

  if (!booking) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-4 shadow-sm my-6 max-w-2xl mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-2xl mx-auto font-black">
          ⚠️
        </div>
        <h3 className="text-lg font-black text-slate-900">Booking Not Found</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          The requested booking record may have been deleted.
        </p>
        <Link
          href="/schedule"
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#00a67e] text-white font-black text-xs uppercase shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Today's Bookings</span>
        </Link>
      </div>
    );
  }

  // Related Drinks for this booking
  const bookingDrinks = drinkSales.filter(
    (d) => d.booking_id === booking.id && !d.is_deleted
  );
  const drinksTotalRevenue = bookingDrinks.reduce((acc, d) => acc + d.total_price, 0);

  // Unpaid drinks vs paid drinks
  const unpaidDrinksRevenue = bookingDrinks
    .filter((d) => !d.is_paid)
    .reduce((acc, d) => acc + d.total_price, 0);

  // Payment Timeline Records (Normalized to include any cash/gpay/advance payments)
  const paymentRecords: PaymentRecord[] = useMemo(
    () => normalizeBookingPaymentRecords(booking),
    [booking]
  );

  // Total Payments Calculation from Normalized Payment Records
  const totalAdvancePaid =
    paymentRecords
      .filter((r) => r.is_advance || (r.note && r.note.toLowerCase().includes('advance')))
      .reduce((sum, r) => sum + r.amount, 0) || (booking.advance_amount || 0);

  const totalCashPaid = paymentRecords
    .filter((r) => r.payment_method === 'cash' && !r.is_advance && (!r.note || !r.note.toLowerCase().includes('advance')))
    .reduce((sum, r) => sum + r.amount, 0);

  const totalGpayPaid = paymentRecords
    .filter((r) => r.payment_method === 'gpay' && !r.is_advance && (!r.note || !r.note.toLowerCase().includes('advance')))
    .reduce((sum, r) => sum + r.amount, 0);

  const totalPaymentsReceived = paymentRecords.reduce((sum, r) => sum + r.amount, 0);

  // Financial Live Totals
  const groundCharge = booking.total_price;
  const currentDiscount = Number(discountValue) || 0;
  const finalGroundPayable = Math.max(0, groundCharge - currentDiscount);

  const grandTotalPayable = finalGroundPayable + drinksTotalRevenue;
  
  // Outstanding Dues = (Net Ground Charge + Unpaid Drinks) - Total Payments Received
  const totalUnpaidDuesToCollect = finalGroundPayable + unpaidDrinksRevenue;
  const liveOutstanding = Math.max(0, totalUnpaidDuesToCollect - totalPaymentsReceived);

  // Auto-sync pending amount input with liveOutstanding if user hasn't manually overridden
  React.useEffect(() => {
    if (!isPendingManuallyEdited) {
      setPendingAmountInput(liveOutstanding);
    }
  }, [liveOutstanding, isPendingManuallyEdited]);

  // Dynamic Payment Status
  const isFullyPaid = booking.status === 'paid' || liveOutstanding <= 0;

  // Save Inline Payment
  const handleSaveInlinePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlinePaymentMethod) return;

    const amount = Number(inlinePaymentAmount) || 0;
    if (amount <= 0) return;

    addPaymentRecord(booking.id, amount, inlinePaymentMethod);

    setInlinePaymentMethod(null);
    setInlinePaymentAmount('');
  };

  // Quick 1-Tap Drink Addition
  const handleQuickAddDrink = (drinkType: DrinkType) => {
    addDrinkSale(drinkType, 1, 'cash', booking.id);
  };

  // Save Discount
  const handleDiscountChange = (val: string) => {
    setDiscountValue(val);
    const numDisc = Number(val) || 0;
    updateBooking(booking.id, { discount: numDisc });
  };

  // Mark Booking Complete & Save POS Details
  const [saveSuccessMessage, setSaveSuccessMessage] = useState(false);

  const handleSavePendingOnly = () => {
    const numDisc = Number(discountValue) || 0;
    const finalPending = Math.max(0, Number(pendingAmountInput) || 0);

    const updatedStatus =
      finalPending <= 0
        ? 'paid'
        : totalPaymentsReceived > 0
        ? 'advance_received'
        : 'pending';

    updateBooking(booking.id, {
      discount: numDisc,
      status: updatedStatus,
      outstanding_balance: finalPending,
      pending_amount: finalPending,
      is_pos_confirmed: true,
    });

    setSaveSuccessMessage(true);
    setTimeout(() => setSaveSuccessMessage(false), 3500);
  };

  const handleCompleteBooking = () => {
    const numDisc = Number(discountValue) || 0;
    const finalPending = Math.max(0, Number(pendingAmountInput) || 0);

    const updatedStatus =
      finalPending <= 0
        ? 'paid'
        : totalPaymentsReceived > 0
        ? 'advance_received'
        : 'pending';

    updateBooking(booking.id, {
      discount: numDisc,
      status: updatedStatus,
      outstanding_balance: finalPending,
      pending_amount: finalPending,
      is_pos_confirmed: true,
    });

    setSaveSuccessMessage(true);
    setTimeout(() => setSaveSuccessMessage(false), 3500);
  };

  return (
    <div className="pb-24 text-slate-800">
      {/* ========================================== */}
      {/* MOBILE VIEW (lg:hidden) - Exact Code.html Design */}
      {/* ========================================== */}
      <div className="block lg:hidden space-y-6 max-w-md mx-auto px-4">
        {/* Navigation Bar */}
        <nav className="pt-2 pb-1 flex items-center justify-between gap-2">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-slate-700 bg-white border border-slate-200/90 px-3 py-2 rounded-xl text-xs font-extrabold shadow-2xs hover:bg-slate-50 active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <ArrowLeft className="h-4 w-4 text-[#00a67e] stroke-[2.5]" />
            <span>Back to Today's Bookings</span>
          </button>
          <span className="bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase shrink-0 shadow-2xs">
            {booking.court_type.replace('_', ' ')}
          </span>
        </nav>

        {/* 1. Customer Overview Card */}
        <section className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100 space-y-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 capitalize mb-1">
              {booking.team_name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-500">
              {booking.phone && (
                <a href={`tel:${booking.phone}`} className="flex items-center gap-1 text-slate-600 hover:text-[#00a67e]">
                  <Phone className="h-4 w-4 text-[#00a67e]" />
                  <span>{booking.phone}</span>
                </a>
              )}
              <span>•</span>
              <span className="flex items-center gap-1 font-bold text-[#00a67e]">
                <span>⏰</span>
                <span>
                  {formatTimeDisplay(booking.start_time)} - {formatTimeDisplay(booking.end_time)} ({booking.total_hours}h)
                </span>
              </span>
            </div>
          </div>

          {/* Advance Paid Alert Pill */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl py-2 px-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-600" />
            <span className="text-amber-800 font-bold text-xs tracking-wider uppercase">
              Advance Paid ({formatINR(totalAdvancePaid)})
            </span>
          </div>

          {/* 2-Column Details Grid */}
          <div className="grid grid-cols-2 gap-y-4 border-t border-slate-100 pt-4 text-xs">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Advance Paid</p>
              <p className="text-amber-700 font-bold text-sm mt-0.5">
                {formatINR(totalAdvancePaid)} ({booking.advance_method?.toUpperCase() || 'CASH'})
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Booking Type</p>
              <p className="text-slate-800 font-bold text-sm capitalize mt-0.5">{booking.booking_type}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Play Date</p>
              <p className="text-slate-800 font-bold text-sm mt-0.5">{formatNiceDate(booking.play_date)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Court Rate</p>
              <p className="text-slate-800 font-bold text-sm mt-0.5">₹{booking.rate_per_hour}/hr</p>
            </div>
          </div>
        </section>

        {/* 2. Payment Section (+ CASH, + GPAY) */}
        <section className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100 space-y-4">
          <div className="flex items-start gap-3">
            <div className="text-[#00a67e] text-2xl font-black">₹</div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 leading-none">Payment Section</h2>
              <p className="text-xs text-slate-500 mt-1">Record payments directly inline</p>
            </div>
          </div>

          {/* Action Buttons: + CASH and + GPAY */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setInlinePaymentMethod('cash');
                setInlinePaymentAmount(liveOutstanding > 0 ? String(liveOutstanding) : '');
              }}
              className="bg-[#00a67e] hover:bg-emerald-700 active:scale-95 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs text-xs"
            >
              <span className="text-base">💵</span> + CASH
            </button>
            <button
              onClick={() => {
                setInlinePaymentMethod('gpay');
                setInlinePaymentAmount(liveOutstanding > 0 ? String(liveOutstanding) : '');
              }}
              className="bg-sky-500 hover:bg-sky-600 active:scale-95 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs text-xs"
            >
              <span className="text-base">📱</span> + GPAY
            </button>
          </div>

          {/* Inline Form */}
          {inlinePaymentMethod && (
            <form
              onSubmit={handleSaveInlinePayment}
              className="p-4 bg-emerald-50 border-2 border-[#00a67e] rounded-xl space-y-3 animate-fade-in"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-emerald-950 flex items-center gap-1.5">
                  <span>{inlinePaymentMethod === 'cash' ? '💵' : '📱'}</span>
                  <span>Enter {inlinePaymentMethod.toUpperCase()} Amount</span>
                </span>
                <button
                  type="button"
                  onClick={() => setInlinePaymentMethod(null)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Select Chips */}
              <div className="flex flex-wrap items-center gap-1 bg-white p-2 rounded-lg border border-emerald-200">
                {[10, 20, 50, 100, 200, 500].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setInlinePaymentAmount(String(amt))}
                    className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                      Number(inlinePaymentAmount) === amt
                        ? 'bg-[#00a67e] text-white'
                        : 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                    }`}
                  >
                    ₹{amt}
                  </button>
                ))}
                {liveOutstanding > 0 && (
                  <button
                    type="button"
                    onClick={() => setInlinePaymentAmount(String(liveOutstanding))}
                    className="px-2 py-1 rounded text-xs font-bold bg-[#00a67e] text-white"
                  >
                    Full (₹{liveOutstanding})
                  </button>
                )}
              </div>

              <div className="space-y-2 pt-1">
                <input
                  type="number"
                  min="1"
                  value={inlinePaymentAmount}
                  onChange={(e) => setInlinePaymentAmount(e.target.value)}
                  placeholder="Enter Amount (₹)"
                  className="w-full bg-white border border-emerald-300 text-slate-900 font-extrabold text-base rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#00a67e]"
                  autoFocus
                  required
                />
                <button
                  type="submit"
                  className="w-full py-3 bg-[#00a67e] hover:bg-emerald-700 active:scale-[0.98] text-white font-extrabold text-xs uppercase tracking-wide rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <span>SAVE {inlinePaymentMethod.toUpperCase()} PAYMENT</span>
                </button>
              </div>
            </form>
          )}

          {/* Payment Entries */}
          <div className="space-y-2">
            {paymentRecords.map((pay) => (
              <div
                key={pay.id}
                className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs font-bold"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{pay.payment_method === 'cash' ? '💵' : '📱'}</span>
                  <div>
                    <p className="text-slate-800 font-bold flex items-center gap-1.5">
                      <span>{pay.note || (pay.payment_method === 'cash' ? 'Cash Payment' : 'GPay Payment')}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({new Date(pay.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[#00a67e] font-extrabold text-sm">{formatINR(pay.amount)}</span>
                  <div className="flex gap-1.5 border-l border-slate-200 pl-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRecordId(pay.id);
                        setEditingAmount(String(pay.amount));
                        setEditingMethod(pay.payment_method);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const confirmed = await confirm({
                          title: 'Remove Payment',
                          message: `Are you sure you want to remove this ${pay.payment_method.toUpperCase()} payment of ${formatINR(pay.amount)}?`,
                          confirmText: 'Remove',
                          variant: 'danger',
                        });
                        if (confirmed) {
                          removePaymentRecord(booking.id, pay.id);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Drinks POS Section */}
        <section className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-amber-500 text-xl">🍹</span>
              <h2 className="text-lg font-extrabold text-slate-900">Drinks</h2>
            </div>
            <div className="bg-amber-50 text-amber-800 px-3 py-1 rounded-full text-xs font-bold border border-amber-100">
              Drinks Total: {formatINR(drinksTotalRevenue)}
            </div>
          </div>

          {/* Quick Select Soda Grid */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleQuickAddDrink('normal_soda')}
              className="bg-amber-50/60 border border-amber-100 hover:bg-amber-100/70 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <span className="text-3xl">🥤</span>
              <span className="font-extrabold text-slate-800 text-xs">Normal Soda</span>
              <span className="bg-amber-200 text-amber-900 text-[10px] px-2 py-0.5 rounded-full font-bold">
                + ₹10 Soda
              </span>
            </button>

            <button
              onClick={() => handleQuickAddDrink('mint_soda')}
              className="bg-amber-50/60 border border-amber-100 hover:bg-amber-100/70 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <span className="text-3xl">🍃</span>
              <span className="font-extrabold text-slate-800 text-xs">Special Soda</span>
              <span className="bg-amber-200 text-amber-900 text-[10px] px-2 py-0.5 rounded-full font-bold">
                + ₹12 Soda
              </span>
            </button>
          </div>

          {/* Added Items Breakdown List */}
          {bookingDrinks.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
              {bookingDrinks.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between p-2.5 border-b border-slate-100 font-bold">
                  <div className="flex flex-col">
                    <span className="text-xs font-extrabold text-slate-800 leading-tight">{sale.drink_name}</span>
                    <span className="text-[10px] text-slate-400 font-medium">(Qty: {sale.quantity})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-700 font-bold">({formatINR(sale.total_price)})</span>
                    <button
                      onClick={() => updateDrinkPaidMethod(sale.id, 'cash')}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-0.5 cursor-pointer ${
                        sale.is_paid && sale.payment_method === 'cash'
                          ? 'bg-[#00a67e] text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      💵 CASH
                    </button>
                    <button
                      onClick={() => updateDrinkPaidMethod(sale.id, 'gpay')}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-0.5 cursor-pointer ${
                        sale.is_paid && sale.payment_method === 'gpay'
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      📱 GPAY
                    </button>
                    <button
                      onClick={async () => {
                        const approved = await confirm({
                          title: 'Remove Drink',
                          message: `Remove ${sale.drink_name}?`,
                          confirmText: 'Remove',
                          variant: 'warning',
                        });
                        if (approved) {
                          removeDrinkSale(sale.id);
                        }
                      }}
                      className="p-1 text-red-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 4. Discount Input */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100 space-y-2">
          <label className="block text-[11px] font-extrabold text-slate-900 uppercase tracking-widest">
            Discount Amount (₹)
          </label>
          <input
            type="number"
            min="0"
            value={discountValue}
            onChange={(e) => handleDiscountChange(e.target.value)}
            placeholder="0"
            className="w-full bg-slate-50 border-slate-200 rounded-xl py-3 px-4 font-bold text-base focus:ring-[#00a67e] focus:border-[#00a67e] outline-none"
          />
        </div>

        {/* 5. Pending Amount Input (For Partial Payments / Next Time Collection) */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-[11px] font-extrabold text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
              <span>⏳</span>
              <span>Pending Amount for Next Time (₹)</span>
            </label>
            {isPendingManuallyEdited && (
              <button
                type="button"
                onClick={() => {
                  setPendingAmountInput(liveOutstanding);
                  setIsPendingManuallyEdited(false);
                }}
                className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md cursor-pointer"
              >
                Reset (₹{liveOutstanding})
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-500 font-medium">
            If team doesn't pay full amount today, set the pending amount to collect next time.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              min="0"
              value={pendingAmountInput}
              onChange={(e) => {
                setPendingAmountInput(e.target.value);
                setIsPendingManuallyEdited(true);
              }}
              placeholder="0"
              className="flex-1 min-w-[120px] bg-slate-50 border border-slate-200 text-slate-900 font-extrabold rounded-xl py-3 px-4 text-base focus:ring-2 focus:ring-[#00a67e] focus:border-[#00a67e] outline-none"
            />
            <button
              type="button"
              onClick={handleSavePendingOnly}
              className="px-3.5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black text-xs shrink-0 cursor-pointer shadow-xs transition-all flex items-center gap-1.5"
              title="Save Pending Amount & Confirm POS"
            >
              <span>💾</span>
              <span>Save Pending</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPendingAmountInput(0);
                setIsPendingManuallyEdited(true);
              }}
              className="px-3 py-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold text-xs shrink-0 cursor-pointer border border-emerald-200"
              title="Set to ₹0 (Paid Full)"
            >
              ₹0 (Paid Full)
            </button>
          </div>
        </div>

        {/* 6. Live Summary Card */}
        <section className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-xl overflow-hidden relative space-y-4">
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Live Summary</h2>

          <div className="space-y-2.5 text-xs font-bold">
            <div className="flex justify-between items-center text-slate-500 font-medium">
              <span>Ground Charge:</span>
              <span className="text-slate-800 font-bold">{formatINR(groundCharge)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500 font-medium">
              <span>Drinks Total:</span>
              <span className="text-amber-700 font-bold">+{formatINR(drinksTotalRevenue)}</span>
            </div>
            {currentDiscount > 0 && (
              <div className="flex justify-between items-center text-amber-700 font-medium">
                <span>Discount:</span>
                <span className="font-bold">-{formatINR(currentDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-slate-500 font-medium">
              <span>Advance Paid:</span>
              <span className="text-[#00a67e] font-bold">{formatINR(totalAdvancePaid)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500 font-medium">
              <span>Total Payments Received:</span>
              <span className="text-[#00a67e] font-bold">{formatINR(totalPaymentsReceived)}</span>
            </div>

            <div className="pt-3 border-t border-dashed border-slate-200 flex justify-between items-center">
              <span className="text-base font-extrabold text-slate-900">Grand Total:</span>
              <span className="text-2xl font-black text-[#00a67e]">{formatINR(grandTotalPayable)}</span>
            </div>
          </div>

          {/* Outstanding / Pending Dues Box */}
          <div
            className={`rounded-2xl p-5 text-center transition-all ${
              Number(pendingAmountInput) <= 0
                ? 'bg-emerald-50 border-2 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-2 border-amber-200 text-amber-900'
            }`}
          >
            <p className="text-[10px] font-black uppercase tracking-widest mb-1">
              {Number(pendingAmountInput) <= 0
                ? 'STATUS: PAID IN FULL'
                : 'PENDING AMOUNT (TO BE COLLECTED NEXT TIME)'}
            </p>
            <p className="text-3.5xl font-black">
              {Number(pendingAmountInput) <= 0 ? '₹0' : formatINR(Number(pendingAmountInput))}
            </p>
          </div>

          {saveSuccessMessage && (
            <div className="p-3 bg-emerald-100 border border-emerald-400 text-emerald-950 rounded-xl text-center font-black text-xs">
              🎉 POS Details & Payment Status Saved Successfully!
            </div>
          )}

          {/* Main Action Button */}
          <button
            type="button"
            onClick={handleCompleteBooking}
            className="w-full bg-[#00a67e] hover:bg-emerald-700 text-white font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 transition-all active:scale-[0.98] cursor-pointer"
          >
            <CheckCircle2 className="h-5 w-5" />
            <span>SAVE & CONFIRM POS DETAILS</span>
          </button>
        </section>
      </div>

      {/* ========================================== */}
      {/* DESKTOP / LAPTOP VIEW (hidden lg:block) - Original Desktop Design */}
      {/* ========================================== */}
      <div className="hidden lg:block space-y-6 max-w-4xl mx-auto px-4">
        {/* Top Header Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 font-extrabold text-xs shadow-xs hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-600" />
            <span>Back to Today's Bookings</span>
          </button>

          <span className="text-xs font-black text-slate-600 bg-slate-200 px-3 py-1 rounded-xl uppercase">
            {booking.court_type.replace('_', ' ')}
          </span>
        </div>

        {/* TOP SECTION: Booking Header Summary */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {booking.team_name}
              </h1>
              <p className="text-xs font-bold text-slate-600 flex items-center space-x-2">
                {booking.phone && (
                  <a href={`tel:${booking.phone}`} className="hover:text-emerald-600">
                    📞 {booking.phone}
                  </a>
                )}
                <span>•</span>
                <span className="text-emerald-700">
                  ⏰ {formatTimeDisplay(booking.start_time)} - {formatTimeDisplay(booking.end_time)} ({booking.total_hours}h)
                </span>
              </p>
            </div>

            {/* Status Badge */}
            <div>
              {isFullyPaid ? (
                <span className="px-4 py-1.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1.5 shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>PAID</span>
                </span>
              ) : totalPaymentsReceived > 0 ? (
                <span className="px-4 py-1.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 flex items-center space-x-1.5 shadow-xs">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>ADVANCE PAID ({formatINR(totalAdvancePaid)})</span>
                </span>
              ) : (
                <span className="px-4 py-1.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 flex items-center space-x-1.5 shadow-xs">
                  <Clock className="w-4 h-4 text-rose-600" />
                  <span>PENDING</span>
                </span>
              )}
            </div>
          </div>

          {/* Quick Booking Info Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-extrabold">Advance Paid</span>
              <span className="text-amber-700 font-black">{formatINR(totalAdvancePaid)} ({booking.advance_method?.toUpperCase() || 'CASH'})</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-extrabold">Booking Type</span>
              <span className="capitalize">{booking.booking_type}</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-extrabold">Play Date</span>
              <span>{formatNiceDate(booking.play_date)}</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-extrabold">Court Rate</span>
              <span>₹{booking.rate_per_hour}/hr</span>
            </div>
          </div>
        </div>

        {/* SECTION 1: PAYMENT SECTION (+ Cash, + GPay) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span>Payment Section</span>
              </h3>
              <p className="text-xs text-slate-500">Record payments directly inline</p>
            </div>

            {/* Quick Two Buttons: + Cash & + GPay */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setInlinePaymentMethod('cash');
                  setInlinePaymentAmount(liveOutstanding > 0 ? String(liveOutstanding) : '');
                }}
                className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase shadow-sm transition-all flex items-center space-x-1.5 active:scale-95 cursor-pointer"
              >
                <span>💵</span>
                <span>+ CASH</span>
              </button>

              <button
                onClick={() => {
                  setInlinePaymentMethod('gpay');
                  setInlinePaymentAmount(liveOutstanding > 0 ? String(liveOutstanding) : '');
                }}
                className="px-5 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs uppercase shadow-sm transition-all flex items-center space-x-1.5 active:scale-95 cursor-pointer"
              >
                <span>📱</span>
                <span>+ GPAY</span>
              </button>
            </div>
          </div>

          {/* INLINE PAYMENT FORM (NO POPUP) */}
          {inlinePaymentMethod && (
            <form
              onSubmit={handleSaveInlinePayment}
              className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl space-y-3 animate-fade-in"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-emerald-900 flex items-center space-x-1.5">
                  <span>{inlinePaymentMethod === 'cash' ? '💵' : '📱'}</span>
                  <span>Enter {inlinePaymentMethod.toUpperCase()} Amount</span>
                </span>
                <button
                  type="button"
                  onClick={() => setInlinePaymentMethod(null)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Fixed Amount Pill Chips */}
              <div className="flex flex-wrap items-center gap-1.5 bg-white/90 p-2 rounded-xl border border-emerald-200 shadow-2xs">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider mr-1">
                  Quick Select:
                </span>
                {[10, 20, 50, 100, 200, 500].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setInlinePaymentAmount(String(amt))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all active:scale-95 cursor-pointer ${
                      Number(inlinePaymentAmount) === amt
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300'
                    }`}
                  >
                    ₹{amt}
                  </button>
                ))}
                {liveOutstanding > 0 && (
                  <button
                    type="button"
                    onClick={() => setInlinePaymentAmount(String(liveOutstanding))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all active:scale-95 cursor-pointer ${
                      Number(inlinePaymentAmount) === liveOutstanding
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    Full Due (₹{liveOutstanding})
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  min="1"
                  value={inlinePaymentAmount}
                  onChange={(e) => setInlinePaymentAmount(e.target.value)}
                  placeholder="Amount (₹)"
                  className="flex-1 bg-white border border-emerald-300 focus:border-emerald-600 text-slate-900 font-black text-sm rounded-xl px-4 py-3 outline-none"
                  autoFocus
                  required
                />
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase shadow-sm active:scale-95 cursor-pointer"
                >
                  SAVE
                </button>
                <button
                  type="button"
                  onClick={() => setInlinePaymentMethod(null)}
                  className="px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* PAYMENT ENTRIES TIMELINE */}
          <div className="space-y-2">
            {booking.advance_amount > 0 && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs font-bold text-slate-800">
                <span>Advance ({booking.advance_method?.toUpperCase() || 'CASH'})</span>
                <span className="text-amber-700 font-black">{formatINR(booking.advance_amount)}</span>
              </div>
            )}

            {paymentRecords.length > 0 ? (
              paymentRecords.map((pay) => (
                <div
                  key={pay.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs font-bold text-slate-800 animate-fade-in hover:bg-slate-100/70 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <span>{pay.payment_method === 'cash' ? '💵 Cash' : '📱 GPay'}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      ({new Date(pay.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-emerald-700 font-black text-sm">{formatINR(pay.amount)}</span>
                    <div className="flex items-center space-x-1 border-l border-slate-200 pl-2">
                      <button
                        type="button"
                        onClick={async () => {
                          const confirmed = await confirm({
                            title: 'Remove Payment',
                            message: `Are you sure you want to remove this ${pay.payment_method.toUpperCase()} payment of ${formatINR(pay.amount)}?`,
                            confirmText: 'Remove Payment',
                            variant: 'danger',
                          });
                          if (confirmed) {
                            removePaymentRecord(booking.id, pay.id);
                          }
                        }}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : null}
          </div>
        </div>

        {/* SECTION 2: DRINKS (+ ₹10 Soda, + ₹12 Soda) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
              <Coffee className="w-5 h-5 text-amber-600" />
              <span>Drinks</span>
            </h3>

            <span className="text-xs font-black text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl">
              Drinks Total: {formatINR(drinksTotalRevenue)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleQuickAddDrink('normal_soda')}
              className="p-4 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-2xl flex flex-col items-center justify-center space-y-1 transition-all active:scale-95 cursor-pointer"
            >
              <span className="text-3xl">🥤</span>
              <span className="font-black text-slate-900 text-sm">Normal Soda</span>
              <span className="text-xs font-extrabold text-amber-800 bg-amber-200 px-3 py-1 rounded-full">
                + ₹10 Soda
              </span>
            </button>

            <button
              onClick={() => handleQuickAddDrink('mint_soda')}
              className="p-4 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-2xl flex flex-col items-center justify-center space-y-1 transition-all active:scale-95 cursor-pointer"
            >
              <span className="text-3xl">🍃</span>
              <span className="font-black text-slate-900 text-sm">Special Soda</span>
              <span className="text-xs font-extrabold text-amber-800 bg-amber-200 px-3 py-1 rounded-full">
                + ₹12 Soda
              </span>
            </button>
          </div>

          {/* Added Drinks Breakdown List */}
          {bookingDrinks.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                Added Drinks ({bookingDrinks.length}):
              </h4>
              {bookingDrinks.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between p-3 bg-amber-50/60 border border-amber-200 rounded-2xl font-bold"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-extrabold text-slate-900">{sale.drink_name}</span>
                    <span className="text-[10px] text-slate-500 font-medium">(Qty: {sale.quantity})</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-amber-800 font-black text-sm">{formatINR(sale.total_price)}</span>

                    <button
                      type="button"
                      onClick={() => updateDrinkPaidMethod(sale.id, 'cash')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center space-x-1 cursor-pointer transition-all ${
                        sale.is_paid && sale.payment_method === 'cash'
                          ? 'bg-[#00a67e] text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>💵</span>
                      <span>CASH</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateDrinkPaidMethod(sale.id, 'gpay')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center space-x-1 cursor-pointer transition-all ${
                        sale.is_paid && sale.payment_method === 'gpay'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>📱</span>
                      <span>GPAY</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        const approved = await confirm({
                          title: 'Remove Drink',
                          message: `Remove ${sale.drink_name}?`,
                          confirmText: 'Remove',
                          variant: 'warning',
                        });
                        if (approved) {
                          removeDrinkSale(sale.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove Drink"
                    >
                      <Trash2 className="w-4 h-4 text-rose-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 3: DISCOUNT */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-2">
          <label className="text-xs font-black text-slate-900 uppercase block">
            Discount Amount (₹)
          </label>
          <input
            type="number"
            min="0"
            value={discountValue}
            onChange={(e) => handleDiscountChange(e.target.value)}
            placeholder="0"
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-600"
          />
        </div>

        {/* SECTION 4: PENDING AMOUNT (FOR PARTIAL PAYMENTS / NEXT TIME) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-slate-900 uppercase flex items-center space-x-1.5">
              <span>⏳</span>
              <span>Pending Amount for Next Time (₹)</span>
            </label>
            {isPendingManuallyEdited && (
              <button
                type="button"
                onClick={() => {
                  setPendingAmountInput(liveOutstanding);
                  setIsPendingManuallyEdited(false);
                }}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg cursor-pointer"
              >
                Reset to Calculated (₹{liveOutstanding})
              </button>
            )}
          </div>

          <p className="text-xs text-slate-500 font-medium">
            If team doesn't pay full amount today, set the pending amount to collect next time.
          </p>

          <div className="flex items-center space-x-3">
            <input
              type="number"
              min="0"
              value={pendingAmountInput}
              onChange={(e) => {
                setPendingAmountInput(e.target.value);
                setIsPendingManuallyEdited(true);
              }}
              placeholder="0"
              className="flex-1 bg-slate-50 border border-slate-200 text-slate-900 font-bold rounded-xl px-4 py-3 text-base outline-none focus:border-emerald-600"
            />
            <button
              type="button"
              onClick={handleSavePendingOnly}
              className="px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black text-xs cursor-pointer shadow-xs transition-all flex items-center space-x-1.5 shrink-0"
              title="Save Pending Amount & Confirm POS"
            >
              <span>💾</span>
              <span>SAVE PENDING</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPendingAmountInput(0);
                setIsPendingManuallyEdited(true);
              }}
              className="px-4 py-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-black text-xs cursor-pointer border border-emerald-200 shrink-0"
            >
              ₹0 (Paid Full)
            </button>
          </div>
        </div>

        {/* SECTION 5: LIVE SUMMARY CARD */}
        <div className="bg-white border-2 border-slate-900 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="text-base font-black text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-3">
            Live Summary
          </h3>

          <div className="space-y-2.5 text-xs font-bold">
            <div className="flex justify-between text-slate-600">
              <span>Ground Charge:</span>
              <span className="text-slate-900">{formatINR(groundCharge)}</span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>Drinks Total:</span>
              <span className="text-amber-700">+{formatINR(drinksTotalRevenue)}</span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>Total Payments Received:</span>
              <span className="text-emerald-700">{formatINR(totalPaymentsReceived)}</span>
            </div>

            <div className="flex justify-between text-sm font-black border-t border-slate-200 pt-3 text-slate-900">
              <span>Grand Total:</span>
              <span className="text-base text-emerald-700">{formatINR(grandTotalPayable)}</span>
            </div>

            <div
              className={`p-4 rounded-2xl text-center space-y-1 transition-all ${
                Number(pendingAmountInput) <= 0
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                  : 'bg-amber-50 text-amber-900 border border-amber-300'
              }`}
            >
              <span className="text-[10px] font-black uppercase tracking-wider block">
                {Number(pendingAmountInput) <= 0
                  ? 'STATUS: PAID IN FULL'
                  : 'PENDING AMOUNT (TO BE COLLECTED NEXT TIME)'}
              </span>
              <span className="text-2xl font-black block">
                {Number(pendingAmountInput) <= 0 ? '₹0' : formatINR(Number(pendingAmountInput))}
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={handleCompleteBooking}
              className="w-full py-4 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-sm sm:text-base uppercase tracking-wide shadow-lg transition-all cursor-pointer flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>SAVE & CONFIRM POS DETAILS</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
