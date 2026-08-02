'use client';

import React, { useState } from 'react';
import { useTurf } from '@/lib/store/context';
import { Booking } from '@/types';
import { formatINR } from '@/lib/utils';
import { CheckCircle2, DollarSign, Sparkles, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
}

export default function PaymentModal({ isOpen, onClose, booking }: Props) {
  const { collectPayment } = useTurf();

  const [cashAmount, setCashAmount] = useState<number | string>(
    booking.outstanding_balance > 0 ? booking.outstanding_balance : 0
  );
  const [gpayAmount, setGpayAmount] = useState<number | string>(0);
  const [discount, setDiscount] = useState<number | string>(0);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    collectPayment(
      booking.id,
      Number(cashAmount) || 0,
      Number(gpayAmount) || 0,
      Number(discount) || 0
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl max-w-md w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-900 animate-slide-up sm:animate-fade-in">
        {/* Mobile Drag Handle */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto my-2 sm:hidden shrink-0" />

        {/* Sticky Header */}
        <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 font-bold">
              💰
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-tight">Collect Payment</h3>
              <p className="text-xs text-slate-500 font-medium">{booking.team_name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 flex items-center justify-center transition-colors font-bold shadow-xs cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Financial Summary */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Total Price:</span>
              <span className="font-bold text-slate-900">{formatINR(booking.total_price)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>Existing Discount:</span>
              <span className="font-bold text-amber-700">-{formatINR(booking.discount)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>Already Paid (Advance + Cash + GPay):</span>
              <span className="font-bold text-emerald-700">
                {formatINR(
                  (booking.advance_amount || 0) + (booking.cash_paid || 0) + (booking.gpay_paid || 0)
                )}
              </span>
            </div>
            <div className="flex justify-between text-sm font-black border-t border-slate-200 pt-2 text-rose-700">
              <span>Outstanding Balance:</span>
              <span>{formatINR(booking.outstanding_balance)}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Cash Amount (₹)
                </label>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {[10, 20, 50, 100, 200, 500].map((amt) => (
                    <button
                      key={`cash-${amt}`}
                      type="button"
                      onClick={() => setCashAmount(amt)}
                      className={`px-2 py-0.5 rounded text-[11px] font-black transition-all ${
                        Number(cashAmount) === amt
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 hover:bg-emerald-100 text-slate-700'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                  {booking.outstanding_balance > 0 && (
                    <button
                      type="button"
                      onClick={() => setCashAmount(booking.outstanding_balance)}
                      className="px-2 py-0.5 rounded text-[11px] font-black bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      Full (₹{booking.outstanding_balance})
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  min="0"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-600 text-emerald-700 font-bold rounded-xl px-3.5 py-2.5 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  GPay Amount (₹)
                </label>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {[10, 20, 50, 100, 200, 500].map((amt) => (
                    <button
                      key={`gpay-${amt}`}
                      type="button"
                      onClick={() => setGpayAmount(amt)}
                      className={`px-2 py-0.5 rounded text-[11px] font-black transition-all ${
                        Number(gpayAmount) === amt
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-100 hover:bg-teal-100 text-slate-700'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                  {booking.outstanding_balance > 0 && (
                    <button
                      type="button"
                      onClick={() => setGpayAmount(booking.outstanding_balance)}
                      className="px-2 py-0.5 rounded text-[11px] font-black bg-teal-600 text-white hover:bg-teal-700"
                    >
                      Full (₹{booking.outstanding_balance})
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  min="0"
                  value={gpayAmount}
                  onChange={(e) => setGpayAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-600 text-emerald-700 font-bold rounded-xl px-3.5 py-2.5 text-sm outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Additional Discount (₹)
              </label>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0"
                className="w-full bg-slate-50 border border-slate-200 text-amber-700 font-bold rounded-xl px-3.5 py-2.5 text-xs outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-wide shadow-md transition-all flex items-center justify-center space-x-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>RECORD PAYMENT</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
