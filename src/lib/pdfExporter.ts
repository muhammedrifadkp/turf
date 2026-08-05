import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Booking, DrinkSale, Shift } from '@/types';
import { formatNiceDate, formatTimeDisplay } from '@/lib/utils';
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

export function isFootballBooking(b: Booking): boolean {
  const court = (b.court_type || (b as any).booking_type || 'football').toLowerCase();
  return court === 'football';
}

/**
 * PDF-safe currency formatter.
 * Standard jsPDF helvetica font doesn't contain unicode '₹' (U+20B9),
 * so we use 'Rs. ' to guarantee perfect rendering across all PDF viewers.
 */
function formatPDFMoney(amount: number | undefined | null): string {
  const val = Number(amount) || 0;
  const formatted = Math.abs(val).toLocaleString('en-IN');
  if (val < 0) return `-Rs. ${formatted}`;
  return `Rs. ${formatted}`;
}

export function exportStaffDrinksReportPDF({
  selectedDate,
  unconfirmedPending,
  completedWithPending,
  finishedBookings,
  drinkSales,
  staffName = 'Duty Staff',
}: ExportStaffReportOptions) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const formattedDate = formatNiceDate(selectedDate);
  const reportTime = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // Categorize bookings by sport
  const footballUnconfirmed = unconfirmedPending.filter(isFootballBooking);
  const badmintonUnconfirmed = unconfirmedPending.filter((b) => !isFootballBooking(b));

  const footballCompletedPending = completedWithPending.filter(isFootballBooking);
  const badmintonCompletedPending = completedWithPending.filter((b) => !isFootballBooking(b));

  const footballFinished = finishedBookings.filter(isFootballBooking);
  const badmintonFinished = finishedBookings.filter((b) => !isFootballBooking(b));

  // Football financial metrics
  const fbUnconfirmedDues = footballUnconfirmed.reduce((sum, b) => sum + (b.outstanding_balance || 0), 0);
  const fbSavedPendingDues = footballCompletedPending.reduce((sum, b) => sum + (b.outstanding_balance || 0), 0);
  const fbFinishedRevenue = footballFinished.reduce((sum, b) => sum + (b.final_amount || b.total_price || 0), 0);
  const fbTotalBookings = footballUnconfirmed.length + footballCompletedPending.length + footballFinished.length;

  // Badminton financial metrics
  const bmUnconfirmedDues = badmintonUnconfirmed.reduce((sum, b) => sum + (b.outstanding_balance || 0), 0);
  const bmSavedPendingDues = badmintonCompletedPending.reduce((sum, b) => sum + (b.outstanding_balance || 0), 0);
  const bmFinishedRevenue = badmintonFinished.reduce((sum, b) => sum + (b.final_amount || b.total_price || 0), 0);
  const bmTotalBookings = badmintonUnconfirmed.length + badmintonCompletedPending.length + badmintonFinished.length;

  // Overall totals
  const totalUnconfirmedDues = fbUnconfirmedDues + bmUnconfirmedDues;
  const totalSavedPendingDues = fbSavedPendingDues + bmSavedPendingDues;
  const totalFinishedRevenue = fbFinishedRevenue + bmFinishedRevenue;
  const totalDrinkRevenue = drinkSales
    .filter((d) => !d.is_deleted)
    .reduce((sum, d) => sum + (d.total_price || 0), 0);
  const totalDailyRevenue = totalFinishedRevenue + totalDrinkRevenue;

  // ---------------------------------------------------------
  // 1. Document Header Banner
  // ---------------------------------------------------------
  doc.setFillColor(15, 118, 110); // Emerald Theme #0f766e
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('ORION TURF & SPORTS ARENA', 14, 13);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('DUTY STAFF COUNTER & POS DAILY REPORT', 14, 20);

  doc.setFontSize(8.5);
  doc.text(`Selected Date: ${formattedDate} | Exported: ${reportTime}`, 14, 26);

  let currentY = 38;

  // ---------------------------------------------------------
  // 2. Executive Summary Card / Metrics Box
  // ---------------------------------------------------------
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, currentY, 182, 38, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('EXECUTIVE FINANCIAL SUMMARY', 18, currentY + 7);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  const col1 = 18;
  const col2 = 110;

  doc.text(
    `Total Bookings: ${fbTotalBookings + bmTotalBookings} (Football: ${fbTotalBookings}, Badminton: ${bmTotalBookings})`,
    col1,
    currentY + 15
  );
  doc.text(
    `Football Revenue: ${formatPDFMoney(fbFinishedRevenue)} | Badminton Revenue: ${formatPDFMoney(bmFinishedRevenue)}`,
    col1,
    currentY + 22
  );
  doc.text(
    `Shift Drink Sales: ${formatPDFMoney(totalDrinkRevenue)} | Total Revenue: ${formatPDFMoney(totalDailyRevenue)}`,
    col1,
    currentY + 29
  );

  doc.text(
    `Pending Dues (Unconfirmed): ${unconfirmedPending.length} teams (${formatPDFMoney(totalUnconfirmedDues)})`,
    col2,
    currentY + 15
  );
  doc.text(
    `Saved Dues (Next Time): ${completedWithPending.length} teams (${formatPDFMoney(totalSavedPendingDues)})`,
    col2,
    currentY + 22
  );
  doc.text(`Duty Staff: ${staffName}`, col2, currentY + 29);

  currentY += 46;

  // Common AutoTable Layout Configuration
  const commonMargin = { left: 14, right: 14 };
  const commonTableWidth = 182;
  const commonColumnStyles = {
    0: { cellWidth: 30 }, // Team Name
    1: { cellWidth: 36 }, // Customer (Phone)
    2: { cellWidth: 26 }, // Court
    3: { cellWidth: 34 }, // Timing
    4: { cellWidth: 18, halign: 'right' as const }, // Cash in Hand
    5: { cellWidth: 18, halign: 'right' as const }, // Cash in GPay
    6: { cellWidth: 20, halign: 'right' as const }, // Balance / Paid
  };

  // Helper to add section headers safely
  const renderSectionHeader = (title: string, colorRGB: [number, number, number]) => {
    if (currentY > 210) {
      doc.addPage();
      currentY = 20;
    }
    doc.setFillColor(...colorRGB);
    doc.rect(14, currentY, 182, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text(title, 18, currentY + 5.5);
    currentY += 13;
  };

  // Helper to add table titles safely
  const renderTableTitle = (title: string, colorRGB: [number, number, number]) => {
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...colorRGB);
    doc.text(title, 14, currentY);
  };

  // ==========================================================
  // SECTION 1: FOOTBALL TURF DETAILS
  // ==========================================================
  renderSectionHeader(
    `SECTION 1: FOOTBALL TURF DETAILS (${fbTotalBookings} Bookings - Paid: ${formatPDFMoney(fbFinishedRevenue)})`,
    [15, 118, 110]
  );

  // 1.1 Football Pending Dues
  renderTableTitle(
    `1.1 Football Pending Dues Teams (${footballUnconfirmed.length} Teams - Total: ${formatPDFMoney(fbUnconfirmedDues)})`,
    [225, 29, 72]
  );

  if (footballUnconfirmed.length === 0) {
    currentY += 6;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text('No pending dues football teams for this date.', 14, currentY);
    currentY += 10;
  } else {
    autoTable(doc, {
      startY: currentY + 3,
      margin: commonMargin,
      tableWidth: commonTableWidth,
      showHead: 'everyPage',
      head: [['Team Name', 'Customer (Phone)', 'Court', 'Timing', 'Cash', 'GPay', 'Due Balance']],
      body: footballUnconfirmed.map((b) => {
        const { cashPaid, gpayPaid } = getBookingCashAndGpayTotals(b);
        return [
          b.team_name,
          `${b.customer_name}\n(${b.phone || 'N/A'})`,
          getCourtLabel(b.court_type || (b as any).booking_type),
          `${formatTimeDisplay(b.start_time)} - ${formatTimeDisplay(b.end_time)}`,
          formatPDFMoney(cashPaid),
          formatPDFMoney(gpayPaid),
          formatPDFMoney(b.outstanding_balance),
        ];
      }),
      headStyles: { fillColor: [225, 29, 72], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak' },
      columnStyles: commonColumnStyles,
      alternateRowStyles: { fillColor: [255, 241, 242] },
    });
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // 1.2 Football Completed with Pending Dues
  renderTableTitle(
    `1.2 Football Completed Bookings with Pending Dues (${footballCompletedPending.length} Teams - Total: ${formatPDFMoney(fbSavedPendingDues)})`,
    [217, 119, 6]
  );

  if (footballCompletedPending.length === 0) {
    currentY += 6;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text('No completed football bookings with pending dues saved for next time.', 14, currentY);
    currentY += 10;
  } else {
    autoTable(doc, {
      startY: currentY + 3,
      margin: commonMargin,
      tableWidth: commonTableWidth,
      showHead: 'everyPage',
      head: [['Team Name', 'Customer (Phone)', 'Court', 'Timing', 'Cash', 'GPay', 'Saved Pending']],
      body: footballCompletedPending.map((b) => {
        const { cashPaid, gpayPaid } = getBookingCashAndGpayTotals(b);
        return [
          b.team_name,
          `${b.customer_name}\n(${b.phone || 'N/A'})`,
          getCourtLabel(b.court_type || (b as any).booking_type),
          `${formatTimeDisplay(b.start_time)} - ${formatTimeDisplay(b.end_time)}`,
          formatPDFMoney(cashPaid),
          formatPDFMoney(gpayPaid),
          formatPDFMoney(b.outstanding_balance),
        ];
      }),
      headStyles: { fillColor: [217, 119, 6], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak' },
      columnStyles: commonColumnStyles,
      alternateRowStyles: { fillColor: [254, 243, 199] },
    });
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // 1.3 Football Finished & Fully Paid
  renderTableTitle(
    `1.3 Football Finished & Fully Paid Bookings (${footballFinished.length} Completed - Total: ${formatPDFMoney(fbFinishedRevenue)})`,
    [5, 150, 105]
  );

  if (footballFinished.length === 0) {
    currentY += 6;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text('No finished/paid football bookings for this date yet.', 14, currentY);
    currentY += 12;
  } else {
    autoTable(doc, {
      startY: currentY + 3,
      margin: commonMargin,
      tableWidth: commonTableWidth,
      showHead: 'everyPage',
      head: [['Team Name', 'Customer (Phone)', 'Court', 'Timing', 'Cash', 'GPay', 'Total Paid']],
      body: footballFinished.map((b) => {
        const { cashPaid, gpayPaid } = getBookingCashAndGpayTotals(b);
        return [
          b.team_name,
          `${b.customer_name}\n(${b.phone || 'N/A'})`,
          getCourtLabel(b.court_type || (b as any).booking_type),
          `${formatTimeDisplay(b.start_time)} - ${formatTimeDisplay(b.end_time)} (${b.total_hours || 1}h)`,
          formatPDFMoney(cashPaid),
          formatPDFMoney(gpayPaid),
          formatPDFMoney(b.final_amount || b.total_price),
        ];
      }),
      headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak' },
      columnStyles: commonColumnStyles,
      alternateRowStyles: { fillColor: [236, 253, 245] },
    });
    currentY = (doc as any).lastAutoTable.finalY + 14;
  }

  // ==========================================================
  // SECTION 2: BADMINTON COURTS DETAILS
  // ==========================================================
  renderSectionHeader(
    `SECTION 2: BADMINTON COURTS DETAILS (${bmTotalBookings} Bookings - Paid: ${formatPDFMoney(bmFinishedRevenue)})`,
    [67, 56, 202]
  );

  // 2.1 Badminton Pending Dues
  renderTableTitle(
    `2.1 Badminton Pending Dues Teams (${badmintonUnconfirmed.length} Teams - Total: ${formatPDFMoney(bmUnconfirmedDues)})`,
    [225, 29, 72]
  );

  if (badmintonUnconfirmed.length === 0) {
    currentY += 6;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text('No pending dues badminton teams for this date.', 14, currentY);
    currentY += 10;
  } else {
    autoTable(doc, {
      startY: currentY + 3,
      margin: commonMargin,
      tableWidth: commonTableWidth,
      showHead: 'everyPage',
      head: [['Team Name', 'Customer (Phone)', 'Court', 'Timing', 'Cash', 'GPay', 'Due Balance']],
      body: badmintonUnconfirmed.map((b) => {
        const { cashPaid, gpayPaid } = getBookingCashAndGpayTotals(b);
        return [
          b.team_name,
          `${b.customer_name}\n(${b.phone || 'N/A'})`,
          getCourtLabel(b.court_type || (b as any).booking_type),
          `${formatTimeDisplay(b.start_time)} - ${formatTimeDisplay(b.end_time)}`,
          formatPDFMoney(cashPaid),
          formatPDFMoney(gpayPaid),
          formatPDFMoney(b.outstanding_balance),
        ];
      }),
      headStyles: { fillColor: [190, 18, 60], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak' },
      columnStyles: commonColumnStyles,
      alternateRowStyles: { fillColor: [255, 241, 242] },
    });
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // 2.2 Badminton Completed with Pending Dues
  renderTableTitle(
    `2.2 Badminton Completed Bookings with Pending Dues (${badmintonCompletedPending.length} Teams - Total: ${formatPDFMoney(bmSavedPendingDues)})`,
    [217, 119, 6]
  );

  if (badmintonCompletedPending.length === 0) {
    currentY += 6;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text('No completed badminton bookings with pending dues saved for next time.', 14, currentY);
    currentY += 10;
  } else {
    autoTable(doc, {
      startY: currentY + 3,
      margin: commonMargin,
      tableWidth: commonTableWidth,
      showHead: 'everyPage',
      head: [['Team Name', 'Customer (Phone)', 'Court', 'Timing', 'Cash', 'GPay', 'Saved Pending']],
      body: badmintonCompletedPending.map((b) => {
        const { cashPaid, gpayPaid } = getBookingCashAndGpayTotals(b);
        return [
          b.team_name,
          `${b.customer_name}\n(${b.phone || 'N/A'})`,
          getCourtLabel(b.court_type || (b as any).booking_type),
          `${formatTimeDisplay(b.start_time)} - ${formatTimeDisplay(b.end_time)}`,
          formatPDFMoney(cashPaid),
          formatPDFMoney(gpayPaid),
          formatPDFMoney(b.outstanding_balance),
        ];
      }),
      headStyles: { fillColor: [217, 119, 6], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak' },
      columnStyles: commonColumnStyles,
      alternateRowStyles: { fillColor: [254, 243, 199] },
    });
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // 2.3 Badminton Finished & Fully Paid
  renderTableTitle(
    `2.3 Badminton Finished & Fully Paid Bookings (${badmintonFinished.length} Completed - Total: ${formatPDFMoney(bmFinishedRevenue)})`,
    [67, 56, 202]
  );

  if (badmintonFinished.length === 0) {
    currentY += 6;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text('No finished/paid badminton bookings for this date yet.', 14, currentY);
    currentY += 10;
  } else {
    autoTable(doc, {
      startY: currentY + 3,
      margin: commonMargin,
      tableWidth: commonTableWidth,
      showHead: 'everyPage',
      head: [['Team Name', 'Customer (Phone)', 'Court', 'Timing', 'Cash', 'GPay', 'Total Paid']],
      body: badmintonFinished.map((b) => {
        const { cashPaid, gpayPaid } = getBookingCashAndGpayTotals(b);
        return [
          b.team_name,
          `${b.customer_name}\n(${b.phone || 'N/A'})`,
          getCourtLabel(b.court_type || (b as any).booking_type),
          `${formatTimeDisplay(b.start_time)} - ${formatTimeDisplay(b.end_time)} (${b.total_hours || 1}h)`,
          formatPDFMoney(cashPaid),
          formatPDFMoney(gpayPaid),
          formatPDFMoney(b.final_amount || b.total_price),
        ];
      }),
      headStyles: { fillColor: [67, 56, 202], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak' },
      columnStyles: commonColumnStyles,
      alternateRowStyles: { fillColor: [238, 242, 255] },
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
