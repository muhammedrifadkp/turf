import React from 'react';
import BookingDetailsPOS from '@/components/bookings/BookingDetailsPOS';

export const metadata = {
  title: 'Booking Details POS | Orion Turf',
  description: 'Dedicated page-based booking POS workflow for payments, timeline, drinks, and live calculations.',
};

export default async function BookingDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  return <BookingDetailsPOS bookingId={resolvedParams.id} />;
}
