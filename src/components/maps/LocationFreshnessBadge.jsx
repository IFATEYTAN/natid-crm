import { Clock, Radio, WifiOff } from 'lucide-react';
import { getLocationFreshness } from '@/lib/locationFreshness';

const STYLES = {
  live: 'bg-green-100 text-green-700',
  delayed: 'bg-amber-100 text-amber-700',
  stale: 'bg-red-100 text-red-700',
  none: 'bg-gray-100 text-gray-600',
};

const ICONS = {
  live: Radio,
  delayed: Clock,
  stale: WifiOff,
  none: WifiOff,
};

/**
 * Small badge that shows how fresh a vendor's GPS location is, so operators
 * don't mistake a stale marker for the vendor's live position.
 */
export default function LocationFreshnessBadge({ lastUpdate, className = '' }) {
  const f = getLocationFreshness(lastUpdate);
  const Icon = ICONS[f.level];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${STYLES[f.level]} ${className}`}
      title={f.relative ? `עדכון אחרון ${f.relative}` : 'אין נתוני מיקום'}
    >
      <Icon className="w-3 h-3" />
      {f.relative ? `${f.label} · ${f.relative}` : f.label}
    </span>
  );
}
