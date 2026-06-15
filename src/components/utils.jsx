import { format as dateFnsFormat, parseISO as dateFnsParseISO } from 'date-fns';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const createPageUrl = (pageName) => {
  if (!pageName) return '/';
  return `/${pageName}`;
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('he-IL');
};

export const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('he-IL');
};

/**
 * מעצב משך זמן לתצוגה אחידה בכל הממשק:
 *   עד שעה        → דקות ("52 דק׳")
 *   עד 24 שעות    → שעות ודקות ("12 שע׳ 52 דק׳")
 *   מ-24 שעות ומעלה → ימים (ושעות) ("יום", "יומיים 3 שע׳", "5 ימים 7 שע׳")
 * @param {number} minutes - משך בדקות
 * @returns {string|null} מחרוזת מעוצבת; null אם אין נתון תקין
 */
export const formatWaitTime = (minutes) => {
  if (minutes == null || isNaN(minutes) || minutes < 0) return null;
  const total = Math.floor(Number(minutes));
  const DAY = 24 * 60;
  if (total >= DAY) {
    const days = Math.floor(total / DAY);
    const remHours = Math.floor((total % DAY) / 60);
    const dayStr = days === 1 ? 'יום' : days === 2 ? 'יומיים' : `${days} ימים`;
    return remHours > 0 ? `${dayStr} ${remHours} שע׳` : dayStr;
  }
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 0) return `${h} שע׳ ${m} דק׳`;
  return `${m} דק׳`;
};

/**
 * Safe wrapper around date-fns format() that returns fallback for invalid dates.
 */
export const safeFormat = (dateValue, formatStr, options = {}) => {
  try {
    if (!dateValue) return '-';
    const date = typeof dateValue === 'string' ? dateFnsParseISO(dateValue) : dateValue;
    if (isNaN(date.getTime())) return '-';
    return dateFnsFormat(date, formatStr, options);
  } catch {
    return '-';
  }
};

/**
 * Safe wrapper around parseISO that returns null for invalid strings.
 */
export const safeParseISO = (dateString) => {
  try {
    if (!dateString) return null;
    const date = dateFnsParseISO(dateString);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
};
