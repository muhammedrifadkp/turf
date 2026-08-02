import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CourtType, Settings } from '@/types';

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

