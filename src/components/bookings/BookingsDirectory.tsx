'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useTurf } from '@/lib/store/context';
import { useConfirm } from '@/components/ui/ConfirmModal';
import { Booking, BookingStatus, CourtType } from '@/types';
import { formatINR, formatNiceDate, formatTimeDisplay, parseTimeToMinutes } from '@/lib/utils';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Edit3,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react';
import BookingModal from '@/components/bookings/BookingModal';
import PaymentModal from '@/components/bookings/PaymentModal';
import { WhatsAppShareButton } from '@/components/ui/WhatsAppShareButton';

export default function BookingsDirectory() {
  const confirm = useConfirm();
  const { bookings, cancelBooking, softDeleteBooking, role, addBooking } = useTurf();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [courtFilter, setCourtFilter] = useState<string>('all');

  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState<Booking | null>(
    null
  );
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<Booking | null>(null);
  const [selectedBookingForEdit, setSelectedBookingForEdit] = useState<Booking | null>(null);

  const [cancelReason, setCancelReason] = useState('');
  const [refundAmount, setRefundAmount] = useState<number | string>(0);
  const [cancelCharge, setCancelCharge] = useState<number | string>(0);

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const filteredBookings = useMemo(() => {
    return bookings
      .filter((b) => {
        const notDeleted = !b.is_deleted;
        const matchSearch =
          !searchQuery ||
          b.team_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.phone.includes(searchQuery) ||
          b.id.includes(searchQuery) ||
          (b.reference_id && b.reference_id.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchStatus = statusFilter === 'all' || b.status === statusFilter;
        const matchCourt = courtFilter === 'all' || b.court_type === courtFilter;

        return notDeleted && matchSearch && matchStatus && matchCourt;
      })
      .sort((a, b) => parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time));
  }, [bookings, searchQuery, statusFilter, courtFilter]);

  const handleRepeatBooking = (b: Booking) => {
    addBooking({
      team_name: b.team_name,
      customer_name: b.customer_name,
      phone: b.phone,
      court_type: b.court_type,
      booking_type: b.booking_type,
      source: 'walk_in',
      play_date: b.play_date,
      start_time: b.start_time,
      end_time: b.end_time,
      total_hours: b.total_hours,
      rate_per_hour: b.rate_per_hour,
      total_price: b.total_price,
      discount: 0,
      advance_amount: 0,
      cash_paid: 0,
      gpay_paid: 0,
      status: 'pending',
      notes: `Repeat booking of ${b.id}`,
    });
  };

  const handleConfirmCancel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingForCancel) return;

    cancelBooking(
      selectedBookingForCancel.id,
      cancelReason || 'Customer requested cancellation',
      Number(refundAmount) || 0,
      Number(cancelCharge) || 0
    );

    setSelectedBookingForCancel(null);
    setCancelReason('');
    setRefundAmount(0);
    setCancelCharge(0);
  };

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'paid':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
            PAID
          </span>
        );
      case 'advance_received':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
            ADVANCE
          </span>
        );
      case 'pending':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
            PENDING
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-500 border border-slate-300">
            CANCELLED
          </span>
        );
      case 'monthly_subscriber':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-300">
            SUBSCRIBER
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 text-2xl">
            ⚽
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">Bookings Directory</h2>
            <p className="text-xs text-slate-500">
              Manage walk-ins, phone bookings, payments, repeat orders & cancellations
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setSelectedBookingForEdit(null);
            setIsBookingModalOpen(true);
          }}
          className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wide shadow-sm transition-all flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>NEW BOOKING</span>
        </button>
      </div>

      {/* Filter Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Team, Customer, Phone or Booking ID..."
              className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-600 text-xs sm:text-sm text-slate-900 rounded-xl pl-9 pr-4 py-2.5 outline-none"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2.5 outline-none flex-1"
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="advance_received">Advance</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={courtFilter}
              onChange={(e) => setCourtFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2.5 outline-none flex-1"
            >
              <option value="all">All Courts</option>
              <option value="football">Football</option>
              <option value="badminton_synthetic">Badminton Synthetic</option>
              <option value="badminton_wooden">Badminton Wooden</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bookings Directory (Responsive Mobile Cards + Desktop Table) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
        {filteredBookings.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No bookings match your search criteria.
          </div>
        ) : (
          <>
            {/* Mobile View Card List */}
            <div className="grid grid-cols-1 gap-3.5 md:hidden">
              {filteredBookings.map((b) => (
                <div
                  key={b.id}
                  className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs hover:border-emerald-300 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-black text-slate-900 text-base leading-tight">
                        {b.team_name}
                      </h4>
                      <p className="text-xs text-slate-600 font-semibold mt-0.5">
                        👤 {b.customer_name}
                      </p>
                    </div>
                    <div>{getStatusBadge(b.status)}</div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200/70 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="font-semibold text-slate-500">Court & Date:</span>
                      <span className="font-bold text-slate-900 capitalize">
                        {b.court_type.replace('_', ' ')} • {formatNiceDate(b.play_date)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="font-semibold text-slate-500">Time Slot:</span>
                      <span className="font-black text-emerald-700">
                        {formatTimeDisplay(b.start_time)} - {formatTimeDisplay(b.end_time)} ({b.total_hours}h)
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <span className="font-semibold text-slate-500">Total / Outstanding:</span>
                      <div className="text-right">
                        <span className="font-black text-slate-900">{formatINR(b.final_amount)}</span>
                        {b.outstanding_balance > 0 && b.status !== 'cancelled' && (
                          <span className="text-rose-600 font-black ml-2">
                            (Due: {formatINR(b.outstanding_balance)})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Mobile Touch Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <Link
                      href={`/bookings/${b.id}`}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase shadow-xs transition-all flex items-center justify-center space-x-1"
                    >
                      <span>POS Details →</span>
                    </Link>

                    <WhatsAppShareButton booking={b} variant="icon" className="p-2.5 rounded-xl" />

                    <button
                      onClick={() => {
                        setSelectedBookingForEdit(b);
                        setIsBookingModalOpen(true);
                      }}
                      className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors shrink-0"
                      title="Edit Booking"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleRepeatBooking(b)}
                      className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 text-xs font-bold transition-colors shrink-0"
                      title="Repeat Booking"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>

                    {b.status !== 'cancelled' && (
                      <button
                        onClick={() => setSelectedBookingForCancel(b)}
                        className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 text-xs font-bold transition-colors shrink-0"
                        title="Cancel Booking"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-100">
                  <tr>
                    <th className="p-3 rounded-l-xl">Team / Customer</th>
                    <th className="p-3">Court / Date</th>
                    <th className="p-3">Time</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Financials</th>
                    <th className="p-3 text-right rounded-r-xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <div className="font-black text-slate-900 text-sm">{b.team_name}</div>
                        <div className="text-[11px] text-slate-500">
                          👤 {b.customer_name} ({b.phone})
                        </div>
                        {b.reference_id && (
                          <span className="text-[9px] font-semibold text-emerald-700 px-1.5 py-0.2 rounded bg-slate-100 mt-1 inline-block">
                            Ref: {b.reference_id}
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-slate-800 capitalize">
                          {b.court_type.replace('_', ' ')}
                        </div>
                        <div className="text-[11px] text-slate-500">{formatNiceDate(b.play_date)}</div>
                      </td>

                      <td className="p-3">
                        <div className="font-black text-emerald-700">
                          {formatTimeDisplay(b.start_time)} - {formatTimeDisplay(b.end_time)}
                        </div>
                        <div className="text-[10px] text-slate-400">{b.total_hours} hrs</div>
                      </td>

                      <td className="p-3">{getStatusBadge(b.status)}</td>

                      <td className="p-3">
                        <div className="font-black text-slate-900">{formatINR(b.final_amount)}</div>
                        {b.outstanding_balance > 0 && b.status !== 'cancelled' && (
                          <div className="text-[11px] font-bold text-rose-600">
                            Due: {formatINR(b.outstanding_balance)}
                          </div>
                        )}
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Page-Based POS Details Button */}
                          <Link
                            href={`/bookings/${b.id}`}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] shadow-xs transition-colors flex items-center space-x-1"
                          >
                            <span>POS Page →</span>
                          </Link>

                          <WhatsAppShareButton booking={b} variant="icon" className="p-1 rounded-lg" />

                          {/* Edit Button */}
                          <button
                            onClick={() => {
                              setSelectedBookingForEdit(b);
                              setIsBookingModalOpen(true);
                            }}
                            title="Edit Booking"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center space-x-1"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-slate-700" />
                          </button>

                          <button
                            onClick={() => handleRepeatBooking(b)}
                            title="Repeat Booking (One Tap)"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                          </button>

                          {b.status !== 'cancelled' && (
                            <button
                              onClick={() => setSelectedBookingForCancel(b)}
                              title="Cancel Booking"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-rose-600 transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {role === 'owner' && (
                            <button
                              onClick={async () => {
                                const approved = await confirm({
                                  title: 'Delete Booking Record',
                                  message: `Are you sure you want to delete the booking for "${b.team_name}" (${b.play_date})?`,
                                  confirmText: 'Delete Record',
                                  variant: 'danger',
                                });
                                if (approved) {
                                  softDeleteBooking(b.id);
                                }
                              }}
                              title="Delete Booking (Owner)"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-600 hover:text-white text-slate-600 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Booking Modal (Create or Edit) */}
      {isBookingModalOpen && (
        <BookingModal
          isOpen={isBookingModalOpen}
          onClose={() => {
            setIsBookingModalOpen(false);
            setSelectedBookingForEdit(null);
          }}
          bookingToEdit={selectedBookingForEdit}
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

      {/* Cancellation Dialog */}
      {selectedBookingForCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in text-slate-900">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-rose-600" />
              <span>Cancel Booking ({selectedBookingForCancel.team_name})</span>
            </h3>

            <form onSubmit={handleConfirmCancel} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Cancellation Reason *
                </label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Rain / Customer cancelled"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-xs outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Refund (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-emerald-700 rounded-xl p-2.5 text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Charge (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={cancelCharge}
                    onChange={(e) => setCancelCharge(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-rose-600 rounded-xl p-2.5 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedBookingForCancel(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs"
                >
                  Confirm Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
