'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTurf } from '@/lib/store/context';
import { useConfirm } from '@/components/ui/ConfirmModal';
import { Booking, DrinkType, PaymentRecord } from '@/types';
import { DRINK_ITEMS } from '@/lib/constants';
import { formatINR, formatNiceDate, formatTimeDisplay } from '@/lib/utils';
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

  if (!booking) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-4 shadow-sm my-6">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-2xl mx-auto font-black">
          ⚠️
        </div>
        <h3 className="text-lg font-black text-slate-900">Booking Not Found</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          The requested booking record may have been deleted.
        </p>
        <Link
          href="/schedule"
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-black text-xs uppercase shadow-sm"
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

  // Payment Timeline Records
  const paymentRecords: PaymentRecord[] = booking.payment_records || [];

  // Total Payments Calculation
  const totalAdvancePaid = booking.advance_amount || 0;
  const totalCashPaid = booking.cash_paid || 0;
  const totalGpayPaid = booking.gpay_paid || 0;
  const totalPaymentsReceived = totalAdvancePaid + totalCashPaid + totalGpayPaid;

  // Financial Live Totals
  const groundCharge = booking.total_price;
  const currentDiscount = Number(discountValue) || 0;
  const finalGroundPayable = Math.max(0, groundCharge - currentDiscount);

  const grandTotalPayable = finalGroundPayable + drinksTotalRevenue;
  
  // Outstanding Dues = (Net Ground Charge + Unpaid Drinks) - Total Payments Received
  const totalUnpaidDuesToCollect = finalGroundPayable + unpaidDrinksRevenue;
  const liveOutstanding = Math.max(0, totalUnpaidDuesToCollect - totalPaymentsReceived);

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

  const handleCompleteBooking = () => {
    const numDisc = Number(discountValue) || 0;
    const updatedStatus = liveOutstanding <= 0 ? 'paid' : totalPaymentsReceived > 0 ? 'advance_received' : 'pending';

    updateBooking(booking.id, {
      discount: numDisc,
      status: updatedStatus,
      outstanding_balance: liveOutstanding,
    });

    setSaveSuccessMessage(true);
    setTimeout(() => setSaveSuccessMessage(false), 3500);
  };

  return (
    <div className="space-y-6 pb-24 text-slate-900 max-w-4xl mx-auto">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 font-extrabold text-xs shadow-xs hover:bg-slate-100 transition-colors"
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
            paymentRecords.map((pay) => {
              const isEditing = editingRecordId === pay.id;

              if (isEditing) {
                return (
                  <div
                    key={pay.id}
                    className="p-3 bg-amber-50 border border-amber-300 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-800 animate-fade-in shadow-sm"
                  >
                    <div className="flex items-center space-x-2">
                      <select
                        value={editingMethod}
                        onChange={(e) => setEditingMethod(e.target.value as 'cash' | 'gpay')}
                        className="bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none"
                      >
                        <option value="cash">💵 Cash</option>
                        <option value="gpay">📱 GPay</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        value={editingAmount}
                        onChange={(e) => setEditingAmount(e.target.value)}
                        placeholder="Amount ₹"
                        className="w-28 bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs font-black text-slate-900 focus:outline-none"
                        autoFocus
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          const val = Number(editingAmount);
                          if (!isNaN(val) && val >= 0) {
                            editPaymentRecord(booking.id, pay.id, val, editingMethod);
                          }
                          setEditingRecordId(null);
                        }}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingRecordId(null)}
                        className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                );
              }

              return (
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

                    {/* EDIT & REMOVE BUTTONS */}
                    <div className="flex items-center space-x-1 border-l border-slate-200 pl-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRecordId(pay.id);
                          setEditingAmount(String(pay.amount));
                          setEditingMethod(pay.payment_method);
                        }}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Payment"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const confirmed = await confirm({
                            title: 'Remove Payment',
                            message: `Are you sure you want to remove this ${pay.payment_method.toUpperCase()} payment of ${formatINR(pay.amount)}?`,
                            confirmText: 'Remove Payment',
                            cancelText: 'Cancel',
                            variant: 'danger',
                          });
                          if (confirmed) {
                            removePaymentRecord(booking.id, pay.id);
                          }
                        }}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove Payment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <>
              {booking.cash_paid > 0 && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>💵 Cash Collection</span>
                  <div className="flex items-center space-x-3">
                    <span className="text-emerald-700 font-black">{formatINR(booking.cash_paid)}</span>
                    <button
                      type="button"
                      onClick={async () => {
                        const confirmed = await confirm({
                          title: 'Clear Cash Paid',
                          message: `Reset cash paid amount of ${formatINR(booking.cash_paid)} to ₹0?`,
                          confirmText: 'Clear Cash',
                          variant: 'danger',
                        });
                        if (confirmed) {
                          updateBooking(booking.id, { cash_paid: 0 });
                        }
                      }}
                      className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Clear Cash"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
              {booking.gpay_paid > 0 && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>📱 GPay Collection</span>
                  <div className="flex items-center space-x-3">
                    <span className="text-teal-700 font-black">{formatINR(booking.gpay_paid)}</span>
                    <button
                      type="button"
                      onClick={async () => {
                        const confirmed = await confirm({
                          title: 'Clear GPay Paid',
                          message: `Reset GPay paid amount of ${formatINR(booking.gpay_paid)} to ₹0?`,
                          confirmText: 'Clear GPay',
                          variant: 'danger',
                        });
                        if (confirmed) {
                          updateBooking(booking.id, { gpay_paid: 0 });
                        }
                      }}
                      className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Clear GPay"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
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

        {/* Quick Soda Buttons */}
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

        {/* Added Drinks Breakdown */}
        {bookingDrinks.length > 0 && (
          <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
            {bookingDrinks.map((sale) => (
              <div key={sale.id} className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between font-bold">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-900">{sale.drink_name} (Qty: {sale.quantity})</span>
                  <span className="text-amber-700">({formatINR(sale.total_price)})</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  {/* CASH Button */}
                  <button
                    onClick={() => updateDrinkPaidMethod(sale.id, 'cash')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all flex items-center space-x-1 cursor-pointer active:scale-95 ${
                      sale.is_paid && sale.payment_method === 'cash'
                        ? 'bg-emerald-600 text-white shadow-xs border border-emerald-700'
                        : 'bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 border border-slate-200'
                    }`}
                    title="Mark paid via Cash"
                  >
                    <span>{sale.is_paid && sale.payment_method === 'cash' ? '✓' : '💵'}</span>
                    <span>CASH</span>
                  </button>

                  {/* GPAY Button */}
                  <button
                    onClick={() => updateDrinkPaidMethod(sale.id, 'gpay')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all flex items-center space-x-1 cursor-pointer active:scale-95 ${
                      sale.is_paid && sale.payment_method === 'gpay'
                        ? 'bg-teal-600 text-white shadow-xs border border-teal-700'
                        : 'bg-slate-100 hover:bg-teal-100 text-slate-700 hover:text-teal-800 border border-slate-200'
                    }`}
                    title="Mark paid via GPay"
                  >
                    <span>{sale.is_paid && sale.payment_method === 'gpay' ? '✓' : '📱'}</span>
                    <span>GPAY</span>
                  </button>
                  <button
                    onClick={async () => {
                      const approved = await confirm({
                        title: 'Remove Drink Sale',
                        message: `Are you sure you want to remove "${sale.drink_name}" (₹${sale.total_price}) from this booking?`,
                        confirmText: 'Remove Drink',
                        variant: 'warning',
                      });
                      if (approved) {
                        removeDrinkSale(sale.id);
                      }
                    }}
                    className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Remove Drink Item"
                  >
                    <Trash2 className="w-4 h-4" />
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

      {/* SECTION 4: LIVE SUMMARY CARD */}
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

          {currentDiscount > 0 && (
            <div className="flex justify-between text-amber-700">
              <span>Discount:</span>
              <span>-{formatINR(currentDiscount)}</span>
            </div>
          )}

          <div className="flex justify-between text-slate-600">
            <span>Advance Paid:</span>
            <span className="text-emerald-700">{formatINR(totalAdvancePaid)}</span>
          </div>

          <div className="flex justify-between text-slate-600">
            <span>Total Payments Received:</span>
            <span className="text-emerald-700">{formatINR(totalPaymentsReceived)}</span>
          </div>

          <div className="flex justify-between text-sm font-black border-t border-slate-200 pt-3 text-slate-900">
            <span>Grand Total:</span>
            <span className="text-base text-emerald-700">{formatINR(grandTotalPayable)}</span>
          </div>

          {/* Remaining Outstanding Banner */}
          <div
            className={`p-4 rounded-2xl text-center space-y-1 ${
              liveOutstanding <= 0
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                : 'bg-rose-50 text-rose-900 border border-rose-300'
            }`}
          >
            <span className="text-[10px] font-black uppercase tracking-wider block">
              {liveOutstanding <= 0 ? 'STATUS: PAID IN FULL' : 'REMAINING OUTSTANDING DUES'}
            </span>
            <span className="text-2xl font-black block">
              {liveOutstanding <= 0 ? '₹0' : formatINR(liveOutstanding)}
            </span>
          </div>
        </div>

        {/* COMPLETE / SAVE BOOKING POS DETAILS BUTTON */}
        <div className="space-y-2 pt-2">
          {saveSuccessMessage && (
            <div className="p-3 bg-emerald-100 border-2 border-emerald-400 text-emerald-950 rounded-2xl text-center font-black text-xs animate-bounce shadow-sm flex items-center justify-center space-x-2">
              <span>🎉</span>
              <span>POS Details & Payment Status Saved Successfully!</span>
            </div>
          )}

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
  );
}
