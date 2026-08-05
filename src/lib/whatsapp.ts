import { Booking } from '@/types';
import { formatINR, formatNiceDate, formatTimeDisplay, normalizeBookingPaymentRecords } from '@/lib/utils';

export const ADMIN_WHATSAPP_NUMBER = '919961895114';

export function getCourtLabel(courtTypeStr?: string): string {
  const court = (courtTypeStr || '').toLowerCase();
  if (court === 'football') return 'Football Turf';
  if (court === 'badminton_1' || court === 'badminton_synthetic') return 'Court 1 (Synthetic)';
  if (court === 'badminton_2' || court === 'badminton_wooden') return 'Court 2 (Wooden)';
  if (court === 'both_badminton') return 'Both Courts (1 & 2)';
  if (court.includes('badminton')) return 'Badminton Court';
  return courtTypeStr ? courtTypeStr.toUpperCase() : 'Football Turf';
}

export function getBookingCashAndGpayTotals(booking: Booking) {
  const records = normalizeBookingPaymentRecords(booking);
  
  let cashPaid = 0;
  let gpayPaid = 0;

  records.forEach((r) => {
    if (r.payment_method === 'cash') {
      cashPaid += Number(r.amount) || 0;
    } else if (r.payment_method === 'gpay') {
      gpayPaid += Number(r.amount) || 0;
    }
  });

  return { cashPaid, gpayPaid };
}

export function generateWhatsAppBookingMessage(booking: Booking): string {
  const { cashPaid, gpayPaid } = getBookingCashAndGpayTotals(booking);
  const courtInfo = getCourtLabel(booking.court_type || (booking as any).booking_type);
  const formattedDate = formatNiceDate(booking.play_date || booking.booking_date);
  const formattedTime = `${formatTimeDisplay(booking.start_time)} - ${formatTimeDisplay(booking.end_time)}`;

  const finalPrice = booking.final_amount !== undefined ? booking.final_amount : booking.total_price;

  const lines = [
    `*⚽ BOOKING DETAILS - ORION TURF*`,
    `----------------------------------`,
    `👥 *Team Name:* ${booking.team_name || 'N/A'}`,
    `👤 *Customer:* ${booking.customer_name || 'N/A'} (${booking.phone || 'N/A'})`,
    `📅 *Play Date:* ${formattedDate}`,
    `⏰ *Timing:* ${formattedTime} (${booking.total_hours || 1}h)`,
    `🏟️ *Court:* ${courtInfo}`,
    `----------------------------------`,
    `💰 *Total Price:* ${formatINR(finalPrice)}`,
    `💵 *Cash in Hand:* ${formatINR(cashPaid)}`,
    `📱 *Cash in GPay:* ${formatINR(gpayPaid)}`,
    `⚠️ *Outstanding Dues:* ${formatINR(booking.outstanding_balance || 0)}`,
    `----------------------------------`,
    `📌 *Status:* ${(booking.status || 'PENDING').toUpperCase()}`,
  ];

  if (booking.notes) {
    lines.push(`📝 *Notes:* ${booking.notes}`);
  }

  return lines.join('\n');
}

export function getWhatsAppShareUrl(booking: Booking, phone: string = ADMIN_WHATSAPP_NUMBER): string {
  const cleanPhone = phone.replace(/\D/g, '');
  const message = generateWhatsAppBookingMessage(booking);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function openWhatsAppShare(booking: Booking, phone: string = ADMIN_WHATSAPP_NUMBER) {
  const url = getWhatsAppShareUrl(booking, phone);
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
