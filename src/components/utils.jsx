import { format as dateFnsFormat, parseISO as dateFnsParseISO } from 'date-fns';

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
