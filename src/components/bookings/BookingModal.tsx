'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTurf } from '@/lib/store/context';
import { usePopup } from '@/components/ui/ConfirmModal';
import { Booking, BookingSource, BookingType, CourtType } from '@/types';
import { calculateDurationHours, calculateHourlyRate, formatINR, getTodayDateString } from '@/lib/utils';
import { AlertTriangle, ChevronDown, ChevronUp, Clock, Edit3, Sparkles, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  bookingToEdit?: Booking | null;
  defaultCourt?: CourtType;
  defaultDate?: string;
  defaultStartTime?: string;
  defaultEndTime?: string;
}

export default function BookingModal({
  isOpen,
  onClose,
  bookingToEdit,
  defaultCourt = 'football',
  defaultDate = getTodayDateString(),
  defaultStartTime = '07:00',
  defaultEndTime = '08:00',
}: Props) {
  const { confirm, alert } = usePopup();
  const { addBooking, updateBooking, settings, bookings } = useTurf();

  const isEditing = Boolean(bookingToEdit);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [courtType, setCourtType] = useState<CourtType>(defaultCourt);
  const [playDate, setPlayDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [endTime, setEndTime] = useState(defaultEndTime);
  const [rateType, setRateType] = useState<'auto' | 'day' | 'night'>('auto');

  // Advanced / Financial State
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [source, setSource] = useState<BookingSource>('walk_in');
  const [referenceId, setReferenceId] = useState('');
  const [discount, setDiscount] = useState<number | string>(0);
  const [advanceAmount, setAdvanceAmount] = useState<number | string>(0);
  const [advanceMethod, setAdvanceMethod] = useState<'cash' | 'gpay'>('gpay');
  const [cashPaid, setCashPaid] = useState<number | string>(0);
  const [gpayPaid, setGpayPaid] = useState<number | string>(0);
  const [notes, setNotes] = useState('');

  // Pre-fill state when editing or defaults change
  useEffect(() => {
    if (bookingToEdit) {
      setName(bookingToEdit.team_name || bookingToEdit.customer_name);
      setPhone(bookingToEdit.phone || '');
      setCourtType(bookingToEdit.court_type);
      setPlayDate(bookingToEdit.play_date);
      setStartTime(bookingToEdit.start_time);
      setEndTime(bookingToEdit.end_time);
      setSource(bookingToEdit.source || 'walk_in');
      setReferenceId(bookingToEdit.reference_id || '');
      setDiscount(bookingToEdit.discount || 0);
      setAdvanceAmount(bookingToEdit.advance_amount || 0);
      setAdvanceMethod(bookingToEdit.advance_method || 'gpay');
      setCashPaid(bookingToEdit.cash_paid || 0);
      setGpayPaid(bookingToEdit.gpay_paid || 0);
      setNotes(bookingToEdit.notes || '');
      setShowAdvanced(true); // Automatically expand advanced fields in edit mode
      
      // Determine if booking is Day or Night rate
      if (bookingToEdit.rate_per_hour === settings.football_morning_rate) {
        setRateType('day');
      } else if (bookingToEdit.rate_per_hour === settings.football_night_rate) {
        setRateType('night');
      } else {
        setRateType('auto');
      }
    } else {
      if (defaultCourt) setCourtType(defaultCourt);
      if (defaultDate) setPlayDate(defaultDate);
      if (defaultStartTime) setStartTime(defaultStartTime);
      if (defaultEndTime) setEndTime(defaultEndTime);
      setRateType('auto');
    }
  }, [bookingToEdit, defaultCourt, defaultDate, defaultStartTime, defaultEndTime, settings]);

  // Calculations
  const durationHours = useMemo(
    () => calculateDurationHours(startTime, endTime),
    [startTime, endTime]
  );

  const hourlyRate = useMemo(() => {
    if (courtType === 'badminton_synthetic') return settings.badminton_synthetic_rate;
    if (courtType === 'badminton_wooden') return settings.badminton_wooden_rate;

    if (rateType === 'day') return settings.football_morning_rate || 600;
    if (rateType === 'night') return settings.football_night_rate || 1000;
    return calculateHourlyRate(courtType, startTime, settings);
  }, [courtType, startTime, settings, rateType]);

  const handleRateTypeChange = (newRateType: 'auto' | 'day' | 'night') => {
    setRateType(newRateType);
    const nightStart = settings.football_night_start_hour || 19;
    const currentHour = parseInt(startTime.split(':')[0], 10);

    if (newRateType === 'day') {
      if (isNaN(currentHour) || currentHour >= nightStart || currentHour < 6) {
        setStartTime('10:00');
        setEndTime('11:00');
      }
    } else if (newRateType === 'night') {
      if (isNaN(currentHour) || (currentHour < nightStart && currentHour >= 6)) {
        setStartTime('19:00');
        setEndTime('20:00');
      }
    }
  };

  const handleQuickSlotSelect = (val: string) => {
    if (!val) return;
    const [start, end] = val.split('-');
    if (start && end) {
      setStartTime(start);
      setEndTime(end);
      const startH = parseInt(start.split(':')[0], 10);
      const nightStart = settings.football_night_start_hour || 19;
      if (startH >= nightStart || startH < 6) {
        setRateType('night');
      } else {
        setRateType('day');
      }
    }
  };

  const totalPrice = Math.round(durationHours * hourlyRate);
  const numericDiscount = Number(discount) || 0;
  const finalAmount = Math.max(0, totalPrice - numericDiscount);

  const numericAdvance = Number(advanceAmount) || 0;
  const numericCash = Number(cashPaid) || 0;
  const numericGpay = Number(gpayPaid) || 0;
  const totalPaid = numericAdvance + numericCash + numericGpay;
  const outstandingBalance = Math.max(0, finalAmount - totalPaid);

  // Conflict Detection (ignore current booking if editing)
  const hasConflict = useMemo(() => {
    return bookings.some(
      (b) =>
        b.id !== bookingToEdit?.id &&
        b.play_date === playDate &&
        b.court_type === courtType &&
        !b.is_deleted &&
        b.status !== 'cancelled' &&
        ((startTime >= b.start_time && startTime < b.end_time) ||
          (endTime > b.start_time && endTime <= b.end_time) ||
          (startTime <= b.start_time && endTime >= b.end_time))
    );
  }, [bookings, playDate, courtType, startTime, endTime, bookingToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !phone) {
      alert('Please enter Team / Customer Name and Phone Number.', 'Required Fields', 'warning');
      return;
    }

    if (hasConflict) {
      const confirmConflict = await confirm({
        title: 'Schedule Time Conflict',
        message: 'Warning: Selected time slot conflicts with an existing active booking! Do you want to proceed anyway?',
        confirmText: 'Proceed With Conflict',
        variant: 'warning',
      });
      if (!confirmConflict) return;
    }

    if (isEditing && bookingToEdit) {
      updateBooking(bookingToEdit.id, {
        team_name: name,
        customer_name: name,
        phone,
        court_type: courtType,
        source,
        reference_id: referenceId || undefined,
        play_date: playDate,
        start_time: startTime,
        end_time: endTime,
        total_hours: durationHours,
        rate_per_hour: hourlyRate,
        total_price: totalPrice,
        discount: numericDiscount,
        advance_amount: numericAdvance,
        advance_method: numericAdvance > 0 ? advanceMethod : undefined,
        cash_paid: numericCash,
        gpay_paid: numericGpay,
        notes: notes || undefined,
      });
    } else {
      addBooking({
        team_name: name,
        customer_name: name,
        phone,
        court_type: courtType,
        booking_type: 'walk_in',
        source,
        reference_id: referenceId || undefined,
        play_date: playDate,
        start_time: startTime,
        end_time: endTime,
        total_hours: durationHours,
        rate_per_hour: hourlyRate,
        total_price: totalPrice,
        discount: numericDiscount,
        advance_amount: numericAdvance,
        advance_method: numericAdvance > 0 ? advanceMethod : undefined,
        cash_paid: numericCash,
        gpay_paid: numericGpay,
        status: outstandingBalance <= 0 ? 'paid' : numericAdvance > 0 ? 'advance_received' : 'pending',
        notes: notes || undefined,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-900">
        {/* Sticky Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 font-black text-base">
              {isEditing ? <Edit3 className="w-4 h-4" /> : '⚽'}
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                {isEditing ? 'Edit Turf Booking' : 'Quick Walk-in Booking'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {isEditing ? 'Modify booking details & slot' : 'Fast 3-tap slot checkout'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 flex items-center justify-center transition-colors font-bold cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Conflict Alert Banner */}
          {hasConflict && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center space-x-2 text-rose-800 text-xs font-extrabold">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>WARNING: Slot conflicts with an existing booking!</span>
            </div>
          )}

          <form id="booking-form" onSubmit={handleSubmit} className="space-y-3.5">
            {/* Step 1: Customer Info */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                Team / Customer Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Friends FC or Rahul Nair"
                className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:bg-white text-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:bg-white text-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none transition-colors"
                required
              />
            </div>

            {/* Step 2: Slot & Court Picker */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase mb-1">
                  Court
                </label>
                <select
                  value={courtType}
                  onChange={(e) => setCourtType(e.target.value as CourtType)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                >
                  <option value="football">Football Turf</option>
                  <option value="badminton_synthetic">Badminton (Court 1)</option>
                  <option value="badminton_wooden">Badminton (Court 2)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase mb-1">
                  Play Date
                </label>
                <input
                  type="date"
                  value={playDate}
                  onChange={(e) => setPlayDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                  required
                />
              </div>
            </div>

            {/* Day / Night Rate Mode Dropdown */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 p-3 rounded-2xl space-y-1.5">
              <label className="block text-xs font-black text-emerald-950 uppercase tracking-wider">
                Shift Rate (Day or Night) *
              </label>
              <select
                value={rateType}
                onChange={(e) => handleRateTypeChange(e.target.value as 'auto' | 'day' | 'night')}
                className="w-full bg-white border border-emerald-300 text-slate-900 font-black rounded-xl px-3 py-2.5 text-xs outline-none shadow-2xs cursor-pointer focus:ring-2 focus:ring-emerald-500"
              >
                <option value="auto">⚡ Auto (Based on Selected Time)</option>
                <option value="day">☀️ Day Rate (₹{settings.football_morning_rate || 600} / hr)</option>
                <option value="night">🌙 Night Rate (₹{settings.football_night_rate || 1000} / hr)</option>
              </select>
            </div>

            {/* Manual Start Time and End Time Picker */}
            <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-emerald-700 font-black rounded-xl px-3 py-2 text-xs outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-emerald-700 font-black rounded-xl px-3 py-2 text-xs outline-none"
                  required
                />
              </div>
            </div>

            {/* Auto Price Pill Card */}
            <div className="bg-slate-900 text-white p-3.5 rounded-2xl flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Auto Price ({durationHours}h @ ₹{hourlyRate})
                </span>
                <span className="text-xl font-black text-white">{formatINR(totalPrice)}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Final Payable
                </span>
                <span className="text-xl font-black text-emerald-400">{formatINR(finalAmount)}</span>
              </div>
            </div>

            {/* Expandable Advanced Options Accordion */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full text-left py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs flex items-center justify-between transition-colors"
              >
                <span>+ Payment & Notes (Advance / Discount / Ref)</span>
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showAdvanced && (
                <div className="mt-2.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 animate-fade-in">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                        Advance Paid (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={advanceAmount}
                        onChange={(e) => setAdvanceAmount(e.target.value)}
                        placeholder="0"
                        className="w-full bg-white border border-slate-200 text-amber-700 font-bold rounded-xl px-2.5 py-1.5 text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                        Advance Mode
                      </label>
                      <select
                        value={advanceMethod}
                        onChange={(e) => setAdvanceMethod(e.target.value as 'cash' | 'gpay')}
                        className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-2.5 py-1.5 text-xs outline-none"
                      >
                        <option value="gpay">GPay</option>
                        <option value="cash">Cash</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                        Discount (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        placeholder="0"
                        className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-2.5 py-1.5 text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                        Booking Source
                      </label>
                      <select
                        value={source}
                        onChange={(e) => setSource(e.target.value as BookingSource)}
                        className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-2.5 py-1.5 text-xs outline-none"
                      >
                        <option value="walk_in">Walk-in</option>
                        <option value="phone">Phone Call</option>
                        <option value="booking_app">Booking App</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                        Cash Paid Now (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={cashPaid}
                        onChange={(e) => setCashPaid(e.target.value)}
                        placeholder="0"
                        className="w-full bg-white border border-slate-200 text-emerald-700 font-bold rounded-xl px-2.5 py-1.5 text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                        GPay Paid Now (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={gpayPaid}
                        onChange={(e) => setGpayPaid(e.target.value)}
                        placeholder="0"
                        className="w-full bg-white border border-slate-200 text-emerald-700 font-bold rounded-xl px-2.5 py-1.5 text-xs outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                      Notes / Remarks
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Needs 2 bibs..."
                      className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-2.5 py-1.5 text-xs outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Single Tap Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-wide shadow-md transition-all flex items-center justify-center space-x-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isEditing ? 'SAVE BOOKING CHANGES' : 'CONFIRM BOOKING NOW'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
