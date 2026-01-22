import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

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

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}