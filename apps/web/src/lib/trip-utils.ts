import { CURRENCY_SYMBOLS, Currency, TripStatus } from '@tripnest/shared';

/**
 * Format a monetary budget amount with proper currency symbol and formatting.
 * Defaults to Indian Rupees (INR / ₹) with 'en-IN' locale number formatting.
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency: string = 'INR',
): string {
  if (amount === null || amount === undefined) {
    return 'Not set';
  }

  const finalCurrency = currency || 'INR';
  const symbol =
    CURRENCY_SYMBOLS[finalCurrency as Currency] ||
    (finalCurrency === 'INR' ? '₹' : finalCurrency);

  try {
    const locale = finalCurrency === 'INR' ? 'en-IN' : 'en-US';
    const formattedNumber = new Intl.NumberFormat(locale, {
      maximumFractionDigits: 0,
    }).format(amount);

    return `${symbol}${formattedNumber}`;
  } catch {
    return `${symbol}${amount}`;
  }
}

/**
 * Format date range into an editorial string (e.g. "Dec 1 – Dec 5, 2026").
 */
export function formatDateRange(startDateStr: string, endDateStr: string): string {
  if (!startDateStr || !endDateStr) return '';

  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';

  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const startDay = start.getUTCDate();
  const startYear = start.getUTCFullYear();

  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const endDay = end.getUTCDate();
  const endYear = end.getUTCFullYear();

  if (startYear === endYear) {
    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} – ${endDay}, ${startYear}`;
    }
    return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${startYear}`;
  }

  return `${startMonth} ${startDay}, ${startYear} – ${endMonth} ${endDay}, ${endYear}`;
}

/**
 * Calculate the number of inclusive days between start and end dates.
 */
export function calculateDurationDays(startDateStr: string, endDateStr: string): number {
  if (!startDateStr || !endDateStr) return 1;

  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;

  const msPerDay = 1000 * 60 * 60 * 24;
  const days = Math.round((end.getTime() - start.getTime()) / msPerDay) + 1;
  return Math.max(1, days);
}

/**
 * Get visual styling parameters for a trip status badge.
 */
export function getStatusBadge(status: TripStatus): {
  label: string;
  bg: string;
  text: string;
  border: string;
  dotColor: string;
} {
  switch (status) {
    case 'ONGOING':
      return {
        label: 'Ongoing Journey',
        bg: 'bg-emerald-50',
        text: 'text-emerald-800',
        border: 'border-emerald-200',
        dotColor: 'bg-emerald-500',
      };
    case 'COMPLETED':
      return {
        label: 'Completed',
        bg: 'bg-[#EFECE5]',
        text: 'text-[#5C5F58]',
        border: 'border-[#DDD9D0]',
        dotColor: 'bg-[#85877F]',
      };
    case 'UPCOMING':
    default:
      return {
        label: 'Upcoming',
        bg: 'bg-accent-bg',
        text: 'text-accent',
        border: 'border-accent/20',
        dotColor: 'bg-accent',
      };
  }
}

/**
 * Convert "HH:mm" 24h string into friendly 12h time string (e.g. "09:30" -> "9:30 AM").
 */
export function formatTime(timeStr?: string | null): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;

  const hour = parseInt(parts[0], 10);
  const minutes = parts[1];

  if (isNaN(hour)) return timeStr;

  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;

  return `${hour12}:${minutes} ${ampm}`;
}

/**
 * Format duration in minutes into friendly string (e.g. 90 -> "1h 30m", 45 -> "45m").
 */
export function formatDuration(minutes?: number | null): string {
  if (!minutes || minutes <= 0) return '';
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;

  if (remainingMins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMins}m`;
}
