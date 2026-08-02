'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useTurf } from '@/lib/store/context';
import { Booking, CourtType } from '@/types';
import { TIME_SLOTS } from '@/lib/constants';
import { formatINR, formatNiceDate, formatTimeDisplay, getTodayDateString, parseTimeToMinutes } from '@/lib/utils';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Edit3,
  Filter,
  Grid,
  ListFilter,
  Plus,
  Search,
  Sparkles,
  User,
  Zap,
} from 'lucide-react';
import BookingModal from '@/components/bookings/BookingModal';
import PaymentModal from '@/components/bookings/PaymentModal';

export default function VisualSchedule() {
  const {
    bookings,
    monthlySubscriptions,
    currentShift,
    role,
    settings,
    reopenShift,
  } = useTurf();

  const [mounted, setMounted] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedCourt, setSelectedCourt] = useState<CourtType>('football');
  const [searchQuery, setSearchQuery] = useState('');

  // Default to showing Booked Slots Only for clean user-friendly view
  const [viewMode, setViewMode] = useState<'booked_only' | 'full_grid'>('booked_only');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Modal triggers
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedBookingForEdit, setSelectedBookingForEdit] = useState<Booking | null>(null);
  const [prefilledTimeSlot, setPrefilledTimeSlot] = useState<{ start: string; end: string } | null>(
    null
  );
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState<Booking | null>(
    null
  );

  // Date Navigation Handlers
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Day of week for subscription matching (0=Sunday, 1=Monday...)
  const dayOfWeek = useMemo(() => new Date(selectedDate).getDay(), [selectedDate]);

  // Active bookings for the selected date & court
  const activeBookings = useMemo(() => {
    return bookings.filter((b) => {
      const matchDate = b.play_date === selectedDate;
      const matchCourt = b.court_type === selectedCourt;
      const notDeleted = !b.is_deleted && b.status !== 'cancelled';
      const matchSearch =
        !searchQuery ||
        b.team_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.phone.includes(searchQuery);

      return matchDate && matchCourt && notDeleted && matchSearch;
    });
  }, [bookings, selectedDate, selectedCourt, searchQuery]);

  // Project active monthly subscriptions into virtual bookings for matching day
  const projectedMonthlySubs = useMemo(() => {
    return monthlySubscriptions
      .filter((sub) => {
        const isCourtMatch = sub.court_type === selectedCourt;
        const isDayMatch = sub.days_of_week.includes(dayOfWeek);
        const isActive = sub.status === 'active';
        const inDateRange =
          selectedDate >= sub.start_date && selectedDate <= sub.end_date;
        return isCourtMatch && isDayMatch && isActive && inDateRange;
      })
      .map((sub) => ({
        id: `sub-proj-${sub.id}-${selectedDate}`,
        shift_id: 'monthly-auto',
        team_name: `${sub.team_name} (Sub)`,
        customer_name: sub.customer_name,
        phone: sub.phone,
        court_type: sub.court_type,
        booking_type: 'badminton_monthly' as const,
        source: 'phone' as const,
        reference_id: undefined,
        booking_date: new Date().toISOString(),
        play_date: selectedDate,
        start_time: sub.start_time,
        end_time: sub.end_time,
        total_hours: 1,
        rate_per_hour: 0,
        total_price: 0,
        discount: 0,
        final_amount: 0,
        advance_amount: 0,
        cash_paid: 0,
        gpay_paid: 0,
        outstanding_balance: 0,
        status: 'monthly_subscriber' as const,
        notes: sub.notes || 'Monthly Subscriber Slot',
        created_by_user_id: 'system',
        created_by_name: 'Monthly Auto',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
  }, [monthlySubscriptions, selectedCourt, dayOfWeek, selectedDate]);

  // Map slots for 24-hour grid using numerical minute range overlap
  const allSlotsGrid = useMemo(() => {
    return TIME_SLOTS.map((time, idx) => {
      const nextTime = TIME_SLOTS[idx + 1] || '24:00';
      const hourNum = parseInt(time.split(':')[0], 10);
      const slotStartMins = parseTimeToMinutes(time);
      const slotEndMins = parseTimeToMinutes(nextTime === '24:00' ? '24:00' : nextTime);

      // Find booking overlapping this slot
      const occupant =
        activeBookings.find((b) => {
          const bStart = parseTimeToMinutes(b.start_time);
          const bEnd = parseTimeToMinutes(b.end_time);
          return bStart < slotEndMins && bEnd > slotStartMins;
        }) ||
        projectedMonthlySubs.find((s) => {
          const sStart = parseTimeToMinutes(s.start_time);
          const sEnd = parseTimeToMinutes(s.end_time);
          return sStart < slotEndMins && sEnd > slotStartMins;
        });

      const nightStart = settings.football_night_start_hour || 19;
      const isMorning = hourNum >= 6 && hourNum < nightStart;
      const rate =
        selectedCourt === 'football'
          ? isMorning
            ? settings.football_morning_rate
            : settings.football_night_rate
          : selectedCourt === 'badminton_synthetic'
          ? settings.badminton_synthetic_rate
          : settings.badminton_wooden_rate;

      return {
        time,
        nextTime,
        occupant: occupant as Booking | undefined,
        rate,
        isMorning,
      };
    });
  }, [activeBookings, projectedMonthlySubs, selectedCourt, settings]);

  // Direct collection of all booked slots for the date & court so no booking is ever missed
  const allBookedSlotsForDate = useMemo(() => {
    const combined = [...activeBookings, ...projectedMonthlySubs].sort(
      (a, b) => parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time)
    );

    return combined.map((b) => {
      const hourNum = parseInt((b.start_time || '0').split(':')[0], 10);
      const nightStart = settings.football_night_start_hour || 19;
      const isMorning = hourNum >= 6 && hourNum < nightStart;
      const rate =
        b.rate_per_hour ||
        (selectedCourt === 'football'
          ? isMorning
            ? settings.football_morning_rate
            : settings.football_night_rate
          : selectedCourt === 'badminton_synthetic'
          ? settings.badminton_synthetic_rate
          : settings.badminton_wooden_rate);

      return {
        time: b.start_time,
        nextTime: b.end_time,
        occupant: b as Booking,
        rate,
        isMorning,
      };
    });
  }, [activeBookings, projectedMonthlySubs, selectedCourt, settings]);

  // Filter slots based on user preference: booked_only (default) vs full_grid
  const displaySlots = useMemo(() => {
    if (viewMode === 'booked_only') {
      return allBookedSlotsForDate;
    }
    return allSlotsGrid;
  }, [allBookedSlotsForDate, allSlotsGrid, viewMode]);

  const pendingBookedSlots = useMemo(() => {
    return allBookedSlotsForDate.filter(
      (s) =>
        s.occupant &&
        s.occupant.status !== 'monthly_subscriber' &&
        s.occupant.outstanding_balance > 0
    );
  }, [allBookedSlotsForDate]);

  const completedBookedSlots = useMemo(() => {
    return allBookedSlotsForDate.filter(
      (s) =>
        s.occupant &&
        (s.occupant.status === 'paid' ||
          s.occupant.status === 'monthly_subscriber' ||
          s.occupant.outstanding_balance <= 0)
    );
  }, [allBookedSlotsForDate]);

  const bookedCount = useMemo(
    () => allBookedSlotsForDate.length,
    [allBookedSlotsForDate]
  );

  const handleOpenWalkIn = (startTime: string, endTime: string) => {
    setSelectedBookingForEdit(null);
    setPrefilledTimeSlot({ start: startTime, end: endTime });
    setIsBookingModalOpen(true);
  };

  const handleEditBooking = (b: Booking) => {
    setSelectedBookingForEdit(b);
    setIsBookingModalOpen(true);
  };

  const getStatusBadge = (status: Booking['status']) => {
    switch (status) {
      case 'paid':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            <span>PAID</span>
          </span>
        );
      case 'advance_received':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            <span>ADVANCE</span>
          </span>
        );
      case 'pending':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300 flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
            <span>PENDING</span>
          </span>
        );
      case 'monthly_subscriber':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-300 flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            <span>SUBSCRIBER</span>
          </span>
        );
      default:
        return null;
    }
  };

  const renderSlotCard = (slot: {
    time: string;
    nextTime: string;
    occupant: Booking | undefined;
    rate: number;
    isMorning: boolean;
  }) => {
    const { time, nextTime, occupant, rate, isMorning } = slot;
    return (
      <div
        key={time}
        className={`rounded-2xl p-4 border transition-all relative overflow-hidden bg-white ${
          occupant
            ? occupant.status === 'paid'
              ? 'border-emerald-300 shadow-sm'
              : occupant.status === 'advance_received'
              ? 'border-amber-300 shadow-sm'
              : occupant.status === 'monthly_subscriber'
              ? 'border-blue-300 shadow-sm'
              : 'border-rose-300 shadow-sm'
            : 'border-slate-200 hover:border-slate-300 shadow-xs'
        }`}
      >
        <div className="flex items-start justify-between">
          {/* Slot Time Label */}
          <div className="flex items-center space-x-2">
            <div className="px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 font-black text-xs text-slate-900">
              {formatTimeDisplay(time)} - {formatTimeDisplay(nextTime)}
            </div>
            {selectedCourt === 'football' && (
              <span className="text-[10px] text-slate-600 font-semibold px-2 py-0.5 rounded bg-slate-100">
                {isMorning ? '☀️ Day Rate' : '🌙 Night Rate'}
              </span>
            )}
          </div>

          {/* Rate / Status Badge */}
          <div>
            {occupant ? (
              getStatusBadge(occupant.status)
            ) : (
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                ₹{rate}/hr
              </span>
            )}
          </div>
        </div>

        {/* Slot Content: Occupied vs Available */}
        {occupant ? (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
            <div>
              <h4 className="font-black text-slate-900 text-base leading-tight flex items-center space-x-2">
                <span>{occupant.team_name}</span>
                {occupant.reference_id && (
                  <span className="text-[10px] font-semibold text-slate-500 px-1.5 py-0.2 rounded bg-slate-100">
                    {occupant.reference_id}
                  </span>
                )}
              </h4>
              <p className="text-xs text-slate-600 mt-0.5 flex items-center space-x-3">
                <span>👤 {occupant.customer_name}</span>
                <span>📞 {occupant.phone}</span>
              </p>
              {occupant.notes && (
                <p className="text-[11px] text-slate-500 mt-1 italic">
                  "{occupant.notes}"
                </p>
              )}
            </div>

            <div className="text-right flex flex-col items-end">
              <p className="text-base font-black text-emerald-700">
                {occupant.status === 'monthly_subscriber' ? 'SUBSCRIPTION' : formatINR(occupant.final_amount)}
              </p>

              {occupant.outstanding_balance > 0 && occupant.status !== 'monthly_subscriber' && (
                <p className="text-[11px] font-bold text-rose-600">
                  Due: {formatINR(occupant.outstanding_balance)}
                </p>
              )}

              {/* Action Buttons for occupied slot: Link to Page-Based POS */}
              {occupant.status !== 'monthly_subscriber' && (
                <div className="mt-2 flex items-center space-x-1.5">
                  <Link
                    href={`/bookings/${occupant.id}`}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition-all flex items-center space-x-1"
                  >
                    <span>Manage POS Details →</span>
                  </Link>

                  <button
                    suppressHydrationWarning
                    onClick={() => handleEditBooking(occupant)}
                    className="px-2 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs border border-slate-200 transition-colors flex items-center space-x-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-3 pt-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Available Slot</span>
            </span>

            <button
              suppressHydrationWarning
              onClick={() => handleOpenWalkIn(time, nextTime)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-600 hover:text-white text-emerald-700 font-extrabold text-xs border border-slate-200 transition-all flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Walk-in Book</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner & Date + Court Switcher */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
        {/* Date Selector Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <button
              suppressHydrationWarning
              onClick={handlePrevDay}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-left">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <h2 className="text-lg sm:text-xl font-black text-slate-900">
                  {formatNiceDate(selectedDate)}
                </h2>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {selectedDate === getTodayDateString() ? "Showing Today's Operational Schedule" : selectedDate}
              </p>
            </div>
            <button
              suppressHydrationWarning
              onClick={handleNextDay}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Date Shortcuts & Add Booking Button */}
          <div className="flex items-center space-x-2">
            <button
              suppressHydrationWarning
              onClick={() => setSelectedDate(getTodayDateString())}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                selectedDate === getTodayDateString()
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Today
            </button>
            <button
              suppressHydrationWarning
              onClick={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                setSelectedDate(tomorrow.toISOString().split('T')[0]);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              Tomorrow
            </button>
            <button
              suppressHydrationWarning
              onClick={() => {
                setSelectedBookingForEdit(null);
                setPrefilledTimeSlot(null);
                setIsBookingModalOpen(true);
              }}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wide shadow-md transition-all ml-auto"
            >
              <Plus className="w-4 h-4" />
              <span>+ ADD BOOKING</span>
            </button>
          </div>
        </div>

        {/* Facility Court Tabs */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
          <button
            suppressHydrationWarning
            onClick={() => setSelectedCourt('football')}
            className={`py-3 px-3 rounded-2xl text-xs sm:text-sm font-black flex flex-col items-center justify-center transition-all ${
              selectedCourt === 'football'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span className="flex items-center space-x-1.5">
              <span>⚽</span>
              <span>Football Turf</span>
            </span>
            <span className="text-[10px] font-medium opacity-90 mt-0.5">
              Day ₹{settings.football_morning_rate} / Night ₹{settings.football_night_rate}
            </span>
          </button>

          <button
            suppressHydrationWarning
            onClick={() => setSelectedCourt('badminton_synthetic')}
            className={`py-3 px-3 rounded-2xl text-xs sm:text-sm font-black flex flex-col items-center justify-center transition-all ${
              selectedCourt === 'badminton_synthetic'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span className="flex items-center space-x-1.5">
              <span>🏸</span>
              <span>Court 1 (Synthetic)</span>
            </span>
            <span className="text-[10px] font-medium opacity-90 mt-0.5">
              Rate: ₹{settings.badminton_synthetic_rate}/hr
            </span>
          </button>

          <button
            suppressHydrationWarning
            onClick={() => setSelectedCourt('badminton_wooden')}
            className={`py-3 px-3 rounded-2xl text-xs sm:text-sm font-black flex flex-col items-center justify-center transition-all ${
              selectedCourt === 'badminton_wooden'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span className="flex items-center space-x-1.5">
              <span>🏸</span>
              <span>Court 2 (Wooden)</span>
            </span>
            <span className="text-[10px] font-medium opacity-90 mt-0.5">
              Rate: ₹{settings.badminton_wooden_rate}/hr
            </span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative pt-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            suppressHydrationWarning
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search slot by Team Name, Phone or Customer..."
            className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:bg-white text-xs sm:text-sm text-slate-900 rounded-xl pl-9 pr-4 py-2.5 outline-none transition-colors"
          />
        </div>
      </div>

      {/* User-Friendly View Filter Toggle Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center space-x-2">
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center space-x-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>Schedule Overview ({bookedCount} Booked)</span>
          </h3>
        </div>

        {/* Clean View Mode Switcher: Booked Only (Default) vs Full 24-Hour Grid */}
        <div className="flex items-center space-x-1 p-1 bg-white border border-slate-200 rounded-2xl shadow-xs self-start sm:self-auto">
          <button
            suppressHydrationWarning
            onClick={() => setViewMode('booked_only')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-all ${
              viewMode === 'booked_only'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Booked Slots Only ({bookedCount})</span>
          </button>

          <button
            suppressHydrationWarning
            onClick={() => setViewMode('full_grid')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-all ${
              viewMode === 'full_grid'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Full 24-Hour Grid</span>
          </button>
        </div>
      </div>

      {/* Slots Display Section */}
      {displaySlots.length === 0 ? (
        /* Empty State when no bookings exist for the day */
        <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-4 shadow-sm my-4">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-3xl mx-auto">
            ⚽
          </div>
          <div>
            <h4 className="text-lg font-black text-slate-900">No Bookings Scheduled For This Day</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              There are no confirmed bookings yet for {formatNiceDate(selectedDate)}. Tap below to record a walk-in or phone booking!
            </p>
          </div>
          <button
            suppressHydrationWarning
            onClick={() => {
              setSelectedBookingForEdit(null);
              setPrefilledTimeSlot(null);
              setIsBookingModalOpen(true);
            }}
            className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wide shadow-md transition-all inline-flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>RECORD FIRST BOOKING NOW</span>
          </button>
        </div>
      ) : viewMode === 'booked_only' ? (
        /* Split into 2 Clear Sections: Pending Dues Teams & Completed / Paid Bookings */
        <div className="space-y-6">
          {/* Section 1: Pending Dues Teams */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-rose-600" />
                <span>Pending Dues Teams ({pendingBookedSlots.length} Pending Dues)</span>
              </h3>
              <span className="text-xs font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-xl">
                Pending Dues
              </span>
            </div>

            {pendingBookedSlots.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                🎉 All booked teams for this date have paid in full! No pending dues.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pendingBookedSlots.map((slot) => renderSlotCard(slot))}
              </div>
            )}
          </div>

          {/* Section 2: Completed / Fully Paid Bookings */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Completed / Paid Bookings ({completedBookedSlots.length} Completed)</span>
              </h3>
              <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
                Fully Paid Dues
              </span>
            </div>

            {completedBookedSlots.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                No completed/paid bookings for this date yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {completedBookedSlots.map((slot) => renderSlotCard(slot))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Full 24-Hour Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {displaySlots.map((slot) => renderSlotCard(slot))}
        </div>
      )}

      {/* Booking Modal (Used for both Create and Edit) */}
      {isBookingModalOpen && (
        <BookingModal
          isOpen={isBookingModalOpen}
          onClose={() => {
            setIsBookingModalOpen(false);
            setSelectedBookingForEdit(null);
          }}
          bookingToEdit={selectedBookingForEdit}
          defaultCourt={selectedCourt}
          defaultDate={selectedDate}
          defaultStartTime={prefilledTimeSlot?.start}
          defaultEndTime={prefilledTimeSlot?.end}
        />
      )}

      {/* Payment Modal */}
      {selectedBookingForPayment && (
        <PaymentModal
          isOpen={Boolean(selectedBookingForPayment)}
          onClose={() => setSelectedBookingForPayment(null)}
          booking={selectedBookingForPayment}
        />
      )}
    </div>
  );
}
