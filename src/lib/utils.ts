import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CourtType, PaymentRecord, Settings } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function calculateHourlyRate(
  courtType: CourtType,
  startTime: string,
  settings: Settings
): number {
  if (courtType === 'badminton_synthetic') {
    return settings.badminton_synthetic_rate;
  }
  if (courtType === 'badminton_wooden') {
    return settings.badminton_wooden_rate;
  }

  // Football morning vs night rate
  const hour = parseInt(startTime.split(':')[0], 10);
  if (isNaN(hour)) return settings.football_morning_rate;

  if (hour >= settings.football_night_start_hour || hour < 6) {
    return settings.football_night_rate;
  }
  return settings.football_morning_rate;
}

export function calculateDurationHours(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  if (isNaN(startH) || isNaN(endH)) return 1;

  let totalMinutes = (endH * 60 + (endM || 0)) - (startH * 60 + (startM || 0));
  if (totalMinutes <= 0) {
    totalMinutes += 24 * 60; // Overnight handle
  }

  const hours = totalMinutes / 60;
  return Math.round(hours * 10) / 10;
}

export function formatTimeDisplay(time24: string): string {
  if (!time24) return '';
  if (time24.includes('AM') || time24.includes('PM')) return time24;

  const parts = time24.split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1] || '0', 10);

  if (isNaN(h)) return time24;

  const normH = h % 24;
  const period = normH >= 12 ? 'PM' : 'AM';
  const displayH = normH % 12 === 0 ? 12 : normH % 12;
  const displayM = String(isNaN(m) ? 0 : m).padStart(2, '0');
  return `${displayH}:${displayM} ${period}`;
}

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const trimmed = timeStr.trim();
  const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = parseInt(ampmMatch[2], 10);
    const period = ampmMatch[3].toUpperCase();
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + (isNaN(minutes) ? 0 : minutes);
  }

  const parts = trimmed.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1] || '0', 10);
  if (isNaN(hours)) return 0;
  return hours * 60 + (isNaN(minutes) ? 0 : minutes);
}


export function getTodayDateString(): string {
  const today = new Date();
  // Operational business day changes at 6:00 AM (06:00)
  // Between 12:00 AM (00:00) and 05:59 AM, treat as previous day's operational schedule
  if (today.getHours() < 6) {
    today.setDate(today.getDate() - 1);
  }
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatNiceDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function normalizeBookingPaymentRecords(booking: any): PaymentRecord[] {
  if (!booking) return [];

  const existingRecords: PaymentRecord[] = Array.isArray(booking.payment_records)
    ? [...booking.payment_records]
    : [];

  const createdDate = booking.created_at || booking.booking_date || new Date().toISOString();

  // Helper to identify advance records
  const isAdvRecord = (r: any) =>
    Boolean(r.is_advance) || Boolean(r.note && r.note.toLowerCase().includes('advance'));

  // 1. Ensure Advance Paid Record Exists if advance_amount > 0
  const advanceAmt = Number(booking.advance_amount) || 0;
  if (advanceAmt > 0) {
    const hasAdvanceRecord = existingRecords.some(isAdvRecord);
    if (!hasAdvanceRecord) {
      const advMethod = (booking.advance_method || 'gpay').toLowerCase() as 'cash' | 'gpay';
      existingRecords.unshift({
        id: `adv-${booking.id}`,
        booking_id: booking.id,
        amount: advanceAmt,
        payment_method: advMethod === 'cash' ? 'cash' : 'gpay',
        staff_id: booking.created_by_user_id || 'system',
        staff_name: booking.created_by_name || 'System',
        created_at: createdDate,
        note: `Advance (${advMethod.toUpperCase()})`,
        is_advance: true,
      });
    }
  }

  // 2. Ensure Non-Advance Cash Paid is fully accounted for
  let targetCash = Number(booking.cash_paid) || 0;
  let targetGpay = Number(booking.gpay_paid) || 0;

  // IF booking is marked status === 'paid' or outstanding_balance === 0,
  // but total explicit payments (advance + cash + gpay) is less than final_amount,
  // infer the remaining balance as Cash Payment!
  const finalGroundAmount = Math.max(
    0,
    (Number(booking.final_amount) || Number(booking.total_price) || 0) - (Number(booking.discount) || 0)
  );
  const isPaidStatus =
    booking.status === 'paid' ||
    (booking.outstanding_balance !== undefined && Number(booking.outstanding_balance) <= 0);

  const totalExplicitPayments = advanceAmt + targetCash + targetGpay;
  if (isPaidStatus && finalGroundAmount > totalExplicitPayments) {
    const unrecordedBalance = finalGroundAmount - totalExplicitPayments;
    targetCash += unrecordedBalance;
  }

  const recordedCash = existingRecords
    .filter((r) => r.payment_method === 'cash' && !isAdvRecord(r))
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  if (targetCash > recordedCash) {
    const missingCash = targetCash - recordedCash;
    existingRecords.push({
      id: `cash-sys-${booking.id}`,
      booking_id: booking.id,
      amount: missingCash,
      payment_method: 'cash',
      staff_id: booking.created_by_user_id || 'staff',
      staff_name: booking.created_by_name || 'Staff',
      created_at: createdDate,
      note: 'Cash Payment',
    });
  }

  // 3. Ensure Non-Advance GPay Paid is fully accounted for
  const recordedGpay = existingRecords
    .filter((r) => r.payment_method === 'gpay' && !isAdvRecord(r))
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  if (targetGpay > recordedGpay) {
    const missingGpay = targetGpay - recordedGpay;
    existingRecords.push({
      id: `gpay-sys-${booking.id}`,
      booking_id: booking.id,
      amount: missingGpay,
      payment_method: 'gpay',
      staff_id: booking.created_by_user_id || 'staff',
      staff_name: booking.created_by_name || 'Staff',
      created_at: createdDate,
      note: 'GPay Payment',
    });
  }

  return existingRecords;
}

