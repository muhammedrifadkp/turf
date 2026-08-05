import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Booking, DrinkSale, Shift } from '@/types';
import { formatINR, formatNiceDate, formatTimeDisplay } from '@/lib/utils';
import { getBookingCashAndGpayTotals, getCourtLabel } from '@/lib/whatsapp';

interface ExportStaffReportOptions {
  selectedDate: string;
  unconfirmedPending: Booking[];
  completedWithPending: Booking[];
  finishedBookings: Booking[];
  drinkSales: DrinkSale[];
  currentShift?: Shift | null;
  staffName?: string;
}

export function exportStaffDrinksReportPDF({
  selectedDate,
  unconfirmedPending,
  completedWithPending,
  finishedBookings,
  drinkSales,
  currentShift,
  staffName = 'Duty Staff',
}: ExportStaffReportOptions) {
  const doc = new jsPDF();
  const formattedDate = formatNiceDate(selectedDate);
  const reportTime = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // Calculate totals
  const totalUnconfirmedDues = unconfirmedPending.reduce((sum, b) => sum + (b.outstanding_balance || 0), 0);
  const totalSavedPendingDues = completedWithPending.reduce((sum, b) => sum + (b.outstanding_balance || 0), 0);
  const totalFinishedRevenue = finishedBookings.reduce((sum, b) => sum + (b.final_amount || b.total_price || 0), 0);
  const totalDrinkRevenue = drinkSales
    .filter((d) => !d.is_deleted)
    .reduce((sum, d) => sum + (d.total_price || 0), 0);

  // Document Header Banner
  doc.setFillColor(15, 118, 110); // Emerald Theme #0f766e
  doc.rect(0, 0, 210, 35, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('ORION TURF & SPORTS ARENA', 14, 15);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('DUTY STAFF COUNTER & POS DAILY REPORT', 14, 23);

  doc.setFontSize(9);
  doc.text(`Selected Date: ${formattedDate} | Exported: ${reportTime}`, 14, 30);

  let currentY = 42;

  // Executive Summary Card / Metrics Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, currentY, 182, 32, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('EXECUTIVE FINANCIAL SUMMARY', 18, currentY + 7);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  const col1 = 18;
  const col2 = 105;

  doc.text(`Total Bookings Today: ${unconfirmedPending.length + completedWithPending.length + finishedBookings.length}`, col1, currentY + 15);
  doc.text(`Finished / Paid Revenue: ${formatINR(totalFinishedRevenue)}`, col1, currentY + 22);
  doc.text(`Shift Drink Sales Revenue: ${formatINR(totalDrinkRevenue)}`, col1, currentY + 28);

  doc.text(`Pending Dues (Unconfirmed): ${unconfirmedPending.length} teams (${formatINR(totalUnconfirmedDues)})`, col2, currentY + 15);
  doc.text(`Saved Dues (For Next Time): ${completedWithPending.length} teams (${formatINR(totalSavedPendingDues)})`, col2, currentY + 22);
  doc.text(`Duty Staff: ${staffName}`, col2, currentY + 28);

  currentY += 40;

  // SECTION 1: Unconfirmed Pending Dues Teams
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(225, 29, 72); // Rose
  doc.text(`1. Pending Dues Teams (${unconfirmedPending.length} Teams - Total: ${formatINR(totalUnconfirmedDues)})`, 14, currentY);

  if (unconfirmedPending.length === 0) {
    currentY += 6;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text('No initial pending dues teams for this date.', 14, currentY);
    currentY += 6;
  } else {
    autoTable(doc, {
      startY: currentY + 3,
      head: [['Team Name', 'Customer (Phone)', 'Court', 'Timing', 'Cash in Hand', 'Cash in GPay', 'Due Balance']],
      body: unconfirmedPending.map((b) => {
        const { cashPaid, gpayPaid } = getBookingCashAndGpayTotals(b);
        return [
          b.team_name,
          `${b.customer_name}\n(${b.phone || 'N/A'})`,
          getCourtLabel(b.court_type || b.booking_type),
          `${formatTimeDisplay(b.start_time)} - ${formatTimeDisplay(b.end_time)}`,
          formatINR(cashPaid),
          formatINR(gpayPaid),
          formatINR(b.outstanding_balance),
        ];
      }),
      headStyles: { fillColor: [225, 29, 72], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2.5 },
      alternateRowStyles: { fillColor: [255, 241, 242] },
    });
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // SECTION 2: Completed Bookings with Pending Dues
  if (currentY > 240) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(180, 83, 9); // Amber
  doc.text(`2. Completed Bookings with Pending Dues (${completedWithPending.length} Teams - Total: ${formatINR(totalSavedPendingDues)})`, 14, currentY);

  if (completedWithPending.length === 0) {
    currentY += 6;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text('No completed bookings with pending dues saved for next time.', 14, currentY);
    currentY += 6;
  } else {
    autoTable(doc, {
      startY: currentY + 3,
      head: [['Team Name', 'Customer (Phone)', 'Court', 'Timing', 'Cash in Hand', 'Cash in GPay', 'Saved Pending']],
      body: completedWithPending.map((b) => {
        const { cashPaid, gpayPaid } = getBookingCashAndGpayTotals(b);
        return [
          b.team_name,
          `${b.customer_name}\n(${b.phone || 'N/A'})`,
          getCourtLabel(b.court_type || b.booking_type),
          `${formatTimeDisplay(b.start_time)} - ${formatTimeDisplay(b.end_time)}`,
          formatINR(cashPaid),
          formatINR(gpayPaid),
          formatINR(b.outstanding_balance),
        ];
      }),
      headStyles: { fillColor: [217, 119, 6], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2.5 },
      alternateRowStyles: { fillColor: [254, 243, 199] },
    });
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // SECTION 3: Finished / Paid Bookings
  if (currentY > 240) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(5, 150, 105); // Emerald
  doc.text(`3. Finished & Fully Paid Bookings (${finishedBookings.length} Completed - Total: ${formatINR(totalFinishedRevenue)})`, 14, currentY);

  if (finishedBookings.length === 0) {
    currentY += 6;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text('No finished/paid bookings for this date yet.', 14, currentY);
    currentY += 6;
  } else {
    autoTable(doc, {
      startY: currentY + 3,
      head: [['Team Name', 'Customer (Phone)', 'Court', 'Timing', 'Cash in Hand', 'Cash in GPay', 'Total Paid']],
      body: finishedBookings.map((b) => {
        const { cashPaid, gpayPaid } = getBookingCashAndGpayTotals(b);
        return [
          b.team_name,
          `${b.customer_name}\n(${b.phone || 'N/A'})`,
          getCourtLabel(b.court_type || b.booking_type),
          `${formatTimeDisplay(b.start_time)} - ${formatTimeDisplay(b.end_time)} (${b.total_hours || 1}h)`,
          formatINR(cashPaid),
          formatINR(gpayPaid),
          formatINR(b.final_amount || b.total_price),
        ];
      }),
      headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2.5 },
      alternateRowStyles: { fillColor: [236, 253, 245] },
    });
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Footer on all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Orion Turf Staff Counter & POS | Date: ${formattedDate} | Page ${i} of ${pageCount}`,
      14,
      288
    );
  }

  // Save PDF
  const cleanDate = selectedDate.replace(/[^0-9-]/g, '');
  doc.save(`Orion_Turf_Staff_Report_${cleanDate}.pdf`);
}
