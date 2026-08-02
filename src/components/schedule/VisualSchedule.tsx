'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useTurf } from '@/lib/store/context';
import { useConfirm } from '@/components/ui/ConfirmModal';
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
  Pencil,
  Plus,
  RotateCw,
  Search,
  Sparkles,
  User,
  XCircle,
  Zap,
  ArrowRight,
} from 'lucide-react';
import BookingModal from '@/components/bookings/BookingModal';
import PaymentModal from '@/components/bookings/PaymentModal';

export default function VisualSchedule() {
  const confirm = useConfirm();
  const {
    bookings,
    updateBooking,
    monthlySubscriptions,
    currentShift,
    role,
    settings,
  } = useTurf();

  const [mounted, setMounted] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedCourt, setSelectedCourt] = useState<CourtType>('football');
  const [searchQuery, setSearchQuery] = useState('');

  // Mobile filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'advance_received' | 'monthly_subscriber'>('all');
  const [courtFilter, setCourtFilter] = useState<string>('all');

  // View mode (booked_only vs full_grid)
  const [viewMode, setViewMode] = useState<'booked_only' | 'full_grid'>('booked_only');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Modal triggers
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedBookingForEdit, setSelectedBookingForEdit] = useState<Booking | null>(null);
  const [prefilledTimeSlot, setPrefilledTimeSlot] = useState<{ start: string; end: string } | null>(null);
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState<Booking | null>(null);

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

  // Day of week for subscription matching
  const dayOfWeek = useMemo(() => new Date(selectedDate).getDay(), [selectedDate]);

  // Active bookings for selected date & court (Desktop view)
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

  // Projected monthly subs for selected date & court (Desktop view)
  const projectedMonthlySubs = useMemo(() => {
    return monthlySubscriptions
      .filter((sub) => {
        const isCourtMatch = sub.court_type === selectedCourt;
        const isDayMatch = sub.days_of_week.includes(dayOfWeek);
        const isActive = sub.status === 'active';
        const inDateRange = selectedDate >= sub.start_date && selectedDate <= sub.end_date;
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

  // 24-Hour Slots Grid for Desktop & Mobile Full-Grid Views
  const allSlotsGrid = useMemo(() => {
    return TIME_SLOTS.map((time, idx) => {
      const nextTime = TIME_SLOTS[idx + 1] || '24:00';
      const hourNum = parseInt(time.split(':')[0], 10);
      const slotStartMins = parseTimeToMinutes(time);
      const slotEndMins = parseTimeToMinutes(nextTime === '24:00' ? '24:00' : nextTime);

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

  // Booked slots list for Desktop View
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

  // Filtered Slots for Desktop View
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

  const bookedCount = useMemo(() => allBookedSlotsForDate.length, [allBookedSlotsForDate]);

  // Mobile Filtered Bookings list
  const mobileFilteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const notDeleted = !b.is_deleted && b.status !== 'cancelled';
      const matchDate = !selectedDate || b.play_date === selectedDate;
      const matchCourt = courtFilter === 'all' || b.court_type === courtFilter;

      const matchStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'paid'
          ? b.status === 'paid' || b.outstanding_balance <= 0
          : statusFilter === 'pending'
          ? b.status === 'pending' || b.outstanding_balance > 0
          : statusFilter === 'advance_received'
          ? b.status === 'advance_received'
          : b.status === (statusFilter as Booking['status']);

      const matchSearch =
        !searchQuery ||
        b.team_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.phone.includes(searchQuery) ||
        b.id.toLowerCase().includes(searchQuery.toLowerCase());

      return notDeleted && matchDate && matchCourt && matchStatus && matchSearch;
    });
  }, [bookings, selectedDate, courtFilter, statusFilter, searchQuery]);

  // Mobile Pending Dues Bookings
  const mobilePendingBookings = useMemo(() => {
    return mobileFilteredBookings.filter(
      (b) => b.status !== 'monthly_subscriber' && b.outstanding_balance > 0
    );
  }, [mobileFilteredBookings]);

  // Mobile Completed / Fully Paid Bookings
  const mobileCompletedBookings = useMemo(() => {
    return mobileFilteredBookings.filter(
      (b) =>
        b.status === 'paid' ||
        b.status === 'monthly_subscriber' ||
        b.outstanding_balance <= 0
    );
  }, [mobileFilteredBookings]);

  const handleOpenWalkIn = (startTime: string, endTime: string) => {
    setSelectedBookingForEdit(null);
    setPrefilledTimeSlot({ start: startTime, end: endTime });
    setIsBookingModalOpen(true);
  };

  const handleEditBooking = (b: Booking) => {
    setSelectedBookingForEdit(b);
    setIsBookingModalOpen(true);
  };

  const handleRepeatBooking = (b: Booking) => {
    setSelectedBookingForEdit({ ...b, id: '' });
    setIsBookingModalOpen(true);
  };

  const handleCancelBooking = async (b: Booking) => {
    const confirmed = await confirm({
      title: 'Cancel Booking',
      message: `Are you sure you want to cancel booking for "${b.team_name}" (${b.play_date})?`,
      confirmText: 'Cancel Booking',
      variant: 'danger',
    });

    if (confirmed) {
      updateBooking(b.id, { status: 'cancelled' });
    }
  };

  const getStatusBadge = (status: Booking['status']) => {
    switch (status) {
      case 'paid':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            <span>PAID</span>
          </span>
        );
      case 'advance_received':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            <span>ADVANCE</span>
          </span>
        );
      case 'pending':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300 flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
            <span>PENDING</span>
          </span>
        );
      case 'monthly_subscriber':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-300 flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            <span>SUBSCRIBER</span>
          </span>
        );
      default:
        return null;
    }
  };

  // Minimal card for Full 24-Hour Grid in Mobile View
  const renderMinimalMobileSlotCard = (slot: {
    time: string;
    nextTime: string;
    occupant: Booking | undefined;
    rate: number;
    isMorning: boolean;
  }) => {
    const { time, nextTime, occupant, rate } = slot;

    if (!occupant) {
      // AVAILABLE SLOT: Very minimal clean white box without background color
      return (
        <div
          key={time}
          className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-2xs"
        >
          <div className="flex items-center space-x-2">
            <span className="text-xs font-extrabold text-slate-800 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
              {formatTimeDisplay(time)} - {formatTimeDisplay(nextTime)}
            </span>
            <span className="text-[11px] font-semibold text-slate-400">
              Available (₹{rate}/hr)
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleOpenWalkIn(time, nextTime)}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#00a67e] hover:text-white text-[#00a67e] font-extrabold text-[11px] border border-slate-200 transition-all flex items-center space-x-1 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Walk-in</span>
          </button>
        </div>
      );
    }

    // BOOKED SLOT: Distinct background color based on status
    const isPaid = occupant.status === 'paid' || occupant.outstanding_balance <= 0;
    const isAdvance = occupant.status === 'advance_received' || (occupant.advance_amount > 0 && occupant.outstanding_balance > 0);
    const isSubscriber = occupant.status === 'monthly_subscriber';

    const bgClass = isPaid
      ? 'bg-emerald-50/90 border-emerald-300'
      : isAdvance
      ? 'bg-amber-50/90 border-amber-300'
      : isSubscriber
      ? 'bg-blue-50/90 border-blue-300'
      : 'bg-rose-50/90 border-rose-300';

    return (
      <div
        key={time}
        className={`rounded-xl p-3 border space-y-2 transition-all ${bgClass}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-extrabold text-slate-900 bg-white/90 px-2 py-0.5 rounded-lg border border-slate-200">
              {formatTimeDisplay(time)} - {formatTimeDisplay(nextTime)}
            </span>
            <span className="text-xs font-extrabold text-slate-900 truncate max-w-[140px]">
              {occupant.team_name}
            </span>
          </div>
          <div>{getStatusBadge(occupant.status)}</div>
        </div>

        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
          <div className="text-slate-600 font-medium truncate max-w-[180px]">
            👤 {occupant.customer_name} {occupant.phone && `• 📞 ${occupant.phone}`}
          </div>

          {occupant.status !== 'monthly_subscriber' && (
            <Link
              href={`/bookings/${occupant.id}`}
              className="px-2.5 py-1 rounded-lg bg-[#00a67e] hover:bg-emerald-700 text-white font-extrabold text-[10px] uppercase shadow-xs transition-all flex items-center space-x-1 shrink-0"
            >
              <span>POS DETAILS →</span>
            </Link>
          )}
        </div>
      </div>
    );
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
              ? 'border-emerald-300 shadow-xs'
              : occupant.status === 'advance_received'
              ? 'border-amber-300 shadow-xs'
              : occupant.status === 'monthly_subscriber'
              ? 'border-blue-300 shadow-xs'
              : 'border-rose-300 shadow-xs'
            : 'border-slate-200 hover:border-slate-300 shadow-2xs'
        }`}
      >
        <div className="flex items-start justify-between">
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
                {occupant.phone && <span>📞 {occupant.phone}</span>}
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

              {occupant.status !== 'monthly_subscriber' && (
                <div className="mt-2 flex items-center space-x-1.5">
                  <Link
                    href={`/bookings/${occupant.id}`}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-2xs transition-all flex items-center space-x-1"
                  >
                    <span>Manage POS Details →</span>
                  </Link>

                  <button
                    suppressHydrationWarning
                    onClick={() => handleEditBooking(occupant)}
                    className="px-2 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs border border-slate-200 transition-colors flex items-center space-x-1 cursor-pointer"
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
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-600 hover:text-white text-emerald-700 font-extrabold text-xs border border-slate-200 transition-all flex items-center space-x-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Walk-in Book</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderMobileBookingCard = (b: Booking) => {
    const isPaid = b.status === 'paid' || b.outstanding_balance <= 0;
    const isAdvance = b.status === 'advance_received' || (b.advance_amount > 0 && b.outstanding_balance > 0);

    return (
      <section
        key={b.id}
        className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100 space-y-3.5"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 capitalize leading-tight">
              {b.team_name}
            </h3>
            <p className="text-xs font-semibold text-slate-400 flex items-center gap-1 mt-0.5">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <span>{b.customer_name || b.team_name}</span>
            </p>
          </div>

          <div>
            {isPaid ? (
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-3 py-1 rounded-lg tracking-wider uppercase">
                PAID
              </span>
            ) : isAdvance ? (
              <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-3 py-1 rounded-lg tracking-wider uppercase">
                ADVANCE
              </span>
            ) : (
              <span className="bg-rose-100 text-rose-800 text-[10px] font-extrabold px-3 py-1 rounded-lg tracking-wider uppercase">
                PENDING
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2 border-t border-slate-100 pt-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-semibold">Court & Date:</span>
            <span className="font-extrabold text-slate-800">
              {b.court_type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())} • {formatNiceDate(b.play_date)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-semibold">Time Slot:</span>
            <span className="font-extrabold text-[#00a67e]">
              {formatTimeDisplay(b.start_time)} - {formatTimeDisplay(b.end_time)} ({b.total_hours}H)
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-semibold">Total / Outstanding:</span>
            <span className="font-extrabold text-slate-900">
              {formatINR(b.final_amount || b.total_price)}
              {b.outstanding_balance > 0 && (
                <span className="text-rose-600 font-extrabold ml-1">
                  (Due: {formatINR(b.outstanding_balance)})
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Link
            href={`/bookings/${b.id}`}
            className="bg-[#00a67e] hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs py-3 px-4 rounded-xl flex-1 flex items-center justify-center gap-1 shadow-xs transition-all"
          >
            <span>POS DETAILS</span>
            <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
          </Link>

          <button
            type="button"
            onClick={() => handleEditBooking(b)}
            className="w-10 h-10 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Edit Booking"
          >
            <Pencil className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => handleRepeatBooking(b)}
            className="w-10 h-10 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Repeat Booking"
          >
            <RotateCw className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => handleCancelBooking(b)}
            className="w-10 h-10 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Cancel Booking"
          >
            <XCircle className="h-4 w-4 text-rose-500" />
          </button>
        </div>
      </section>
    );
  };

  if (!mounted) return null;

  return (
    <div className="pb-20 text-slate-800">
      {/* ========================================== */}
      {/* MOBILE VIEW (block lg:hidden) - Redesigned Bookings Directory */}
      {/* ========================================== */}
      <div className="block lg:hidden space-y-5 max-w-md mx-auto px-4">
        {/* 1. Header Card / Title Banner */}
        <section className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100 flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Calendar className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 leading-tight">
              Bookings Directory
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1 leading-normal">
              Manage walk-ins, phone bookings, payments, repeat orders & cancellations
            </p>
          </div>
        </section>

        {/* 2. Main Action Button: + NEW BOOKING */}
        <button
          type="button"
          onClick={() => {
            setSelectedBookingForEdit(null);
            setIsBookingModalOpen(true);
          }}
          className="w-full bg-[#00a67e] hover:bg-emerald-700 active:scale-[0.98] text-white font-extrabold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-emerald-200 transition-all text-sm cursor-pointer tracking-wide"
        >
          <Plus className="h-5 w-5 stroke-[2.5]" />
          <span>NEW BOOKING</span>
        </button>

        {/* 3. Date Navigation bar */}
        <div className="flex items-center justify-between bg-white border border-slate-200/90 p-2 rounded-2xl shadow-2xs">
          <button
            type="button"
            onClick={handlePrevDay}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-center flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#00a67e]" />
            <span className="font-extrabold text-xs text-slate-900">
              {formatNiceDate(selectedDate)}
            </span>
          </div>
          <button
            type="button"
            onClick={handleNextDay}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* 4. Search & Filter Controls */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Team, Customer, Phone or ID"
              className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-10 pr-4 font-bold text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#00a67e] shadow-2xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-white border border-slate-200 rounded-2xl py-3 px-3.5 font-bold text-xs text-slate-800 outline-none focus:ring-2 focus:ring-[#00a67e] shadow-2xs cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="advance_received">Advance Paid</option>
            </select>

            <select
              value={courtFilter}
              onChange={(e) => setCourtFilter(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl py-3 px-3.5 font-bold text-xs text-slate-800 outline-none focus:ring-2 focus:ring-[#00a67e] shadow-2xs cursor-pointer"
            >
              <option value="all">All Courts</option>
              <option value="football">Football</option>
              <option value="badminton_synthetic">Court 1 (Synthetic)</option>
              <option value="badminton_wooden">Court 2 (Wooden)</option>
            </select>
          </div>
        </div>

        {/* View Mode Switcher Pill (Booked Slots Only vs Full 24-Hour Grid) */}
        <div className="flex items-center space-x-1 p-1 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode('booked_only')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              viewMode === 'booked_only'
                ? 'bg-[#00a67e] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Booked Slots Only ({mobileFilteredBookings.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('full_grid')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              viewMode === 'full_grid'
                ? 'bg-[#00a67e] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Full 24-Hour Grid</span>
          </button>
        </div>

        {/* 5. Mobile Booking Cards / Grid Stack */}
        {viewMode === 'booked_only' ? (
          <div className="space-y-6 pt-1">
            {mobileFilteredBookings.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-3 shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#00a67e] flex items-center justify-center text-2xl mx-auto font-black">
                  ⚽
                </div>
                <h3 className="text-base font-extrabold text-slate-900">No Bookings Found</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  There are no bookings matching your search or filters for {formatNiceDate(selectedDate)}.
                </p>
              </div>
            ) : (
              <>
                {/* Section 1: Pending Dues Teams */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4 text-rose-600" />
                      <span>Pending Dues Teams ({mobilePendingBookings.length})</span>
                    </h3>
                    <span className="bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                      Pending Dues
                    </span>
                  </div>

                  {mobilePendingBookings.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center text-slate-400 text-xs font-semibold shadow-xs">
                      🎉 All booked teams for this date have paid in full!
                    </div>
                  ) : (
                    mobilePendingBookings.map((b) => renderMobileBookingCard(b))
                  )}
                </div>

                {/* Section 2: Completed / Paid Bookings */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-[#00a67e]" />
                      <span>Completed / Paid Bookings ({mobileCompletedBookings.length})</span>
                    </h3>
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                      Fully Paid Dues
                    </span>
                  </div>

                  {mobileCompletedBookings.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center text-slate-400 text-xs font-semibold shadow-xs">
                      No completed/paid bookings for this date yet.
                    </div>
                  ) : (
                    mobileCompletedBookings.map((b) => renderMobileBookingCard(b))
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          /* Full 24-Hour Minimal Grid Stack for Mobile */
          <div className="space-y-2 pt-1">
            {allSlotsGrid.map((slot) => renderMinimalMobileSlotCard(slot))}
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* DESKTOP / LAPTOP VIEW (hidden lg:block) - Original Desktop Schedule */}
      {/* ========================================== */}
      <div className="hidden lg:block space-y-6 max-w-7xl mx-auto px-4">
        {/* Top Banner & Date + Court Switcher */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <button
                suppressHydrationWarning
                onClick={handlePrevDay}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-left">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <h2 className="text-xl font-black text-slate-900">
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
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                suppressHydrationWarning
                onClick={() => setSelectedDate(getTodayDateString())}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  selectedDate === getTodayDateString()
                    ? 'bg-emerald-600 text-white shadow-xs'
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
                className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
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
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wide shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ ADD BOOKING</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
            <button
              suppressHydrationWarning
              onClick={() => setSelectedCourt('football')}
              className={`py-3 px-3 rounded-2xl text-sm font-black flex flex-col items-center justify-center transition-all cursor-pointer ${
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
              className={`py-3 px-3 rounded-2xl text-sm font-black flex flex-col items-center justify-center transition-all cursor-pointer ${
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
              className={`py-3 px-3 rounded-2xl text-sm font-black flex flex-col items-center justify-center transition-all cursor-pointer ${
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

          <div className="relative pt-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              suppressHydrationWarning
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search slot by Team Name, Phone or Customer..."
              className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:bg-white text-sm text-slate-900 rounded-xl pl-9 pr-4 py-2.5 outline-none transition-colors"
            />
          </div>
        </div>

        <div className="flex flex-row items-center justify-between gap-3 px-1">
          <div className="flex items-center space-x-2">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center space-x-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>SCHEDULE OVERVIEW ({bookedCount} BOOKED)</span>
            </h3>
          </div>

          <div className="flex items-center space-x-1 p-1 bg-white border border-slate-200 rounded-2xl shadow-2xs">
            <button
              suppressHydrationWarning
              onClick={() => setViewMode('booked_only')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-all cursor-pointer ${
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
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-all cursor-pointer ${
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

        {displaySlots.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-4 shadow-xs my-4">
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
              className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wide shadow-md transition-all inline-flex items-center space-x-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>RECORD FIRST BOOKING NOW</span>
            </button>
          </div>
        ) : viewMode === 'booked_only' ? (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
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
                <div className="grid grid-cols-2 gap-3">
                  {pendingBookedSlots.map((slot) => renderSlotCard(slot))}
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
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
                <div className="grid grid-cols-2 gap-3">
                  {completedBookedSlots.map((slot) => renderSlotCard(slot))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {displaySlots.map((slot) => renderSlotCard(slot))}
          </div>
        )}
      </div>

      {/* Booking Modal */}
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
