// Shared utilities for Reports page

export const MONTHS_HE = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
export const DAYS_HE = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
export const SERVICE_TYPE_HE = {
  towing: 'גרירה', flat_tire: 'פנצ\'ר', battery: 'סוללה',
  lockout: 'נעילה', fuel: 'דלק', accident: 'תאונה', mechanical: 'מכאני', other: 'אחר'
};

export const COLORS = ['#3b82f6','#f97316','#10b981','#8b5cf6','#f43f5e','#14b8a6','#eab308','#6366f1','#ec4899','#84cc16'];

export const fmtNum = (n) => n == null ? '—' : Number(n).toLocaleString('he-IL');
export const fmtCurrency = (n) => n == null ? '—' : `₪${Number(n).toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
export const fmtPct = (n) => n == null ? '—' : `${Number(n).toFixed(1)}%`;

export function exportToExcel(data, filename) {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(h => {
      const val = row[h] ?? '';
      return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
    }).join(','))
  ].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${filename}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export function getYear(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).getFullYear();
}

export function getMonth(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).getMonth(); // 0-indexed
}

export function getDay(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).getDay(); // 0=Sun
}

export function getHour(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).getHours();
}