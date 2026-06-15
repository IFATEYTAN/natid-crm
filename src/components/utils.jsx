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

// תקרת תצוגה לזמן המתנה - מעליה מוצג סימון חריגה במקום מספר ענק (קריאות ישנות שנשארו פתוחות).
export const WAIT_TIME_MAX_MINUTES = 24 * 60;

/**
 * מעצב משך זמן המתנה לשעות ודקות בלבד (אף פעם לא ימים) - תצוגה אחידה בכל הממשק.
 * @param {number} minutes - משך בדקות
 * @param {object} [opts]
 * @param {number} [opts.maxMinutes] - תקרה; מעליה מוחזר "מעל X שע׳" כסימון חריגה
 * @returns {string|null} למשל "12 שע׳ 52 דק׳" או "52 דק׳"; null אם אין נתון תקין
 */
export const formatWaitTime = (minutes, { maxMinutes } = {}) => {
  if (minutes == null || isNaN(minutes) || minutes < 0) return null;
  const total = Math.floor(Number(minutes));
  if (maxMinutes != null && total > maxMinutes) {
    return `מעל ${Math.floor(maxMinutes / 60)} שע׳`;
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
