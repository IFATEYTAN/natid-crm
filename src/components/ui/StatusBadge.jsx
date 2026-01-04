import React from 'react';
import { cn } from "@/lib/utils";
import {
  Clock,
  UserPlus,
  RefreshCw,
  Truck,
  Wrench,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';

/**
 * StatusBadge - Minimalist Design System
 * Uses only 2-3 colors:
 * - Gray (default/neutral states)
 * - Blue (in-progress states)
 * - Red (urgent/cancelled states)
 */
const statusConfig = {
  // Call statuses - Minimalist color scheme
  waiting_treatment: {
    label: 'ממתין לטיפול',
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    icon: Clock
  },
  awaiting_assignment: {
    label: 'ממתין לשיוך',
    bg: 'bg-gray-50',
    text: 'text-gray-600',
    icon: Clock
  },
  assigning: {
    label: 'בשיוך',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    icon: UserPlus
  },
  vendor_enroute: {
    label: 'ספק בדרך',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    icon: Truck
  },
  in_progress: {
    label: 'בטיפול',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    icon: Wrench
  },
  completed: {
    label: 'הושלם',
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    icon: CheckCircle
  },
  cancelled: {
    label: 'בוטל',
    bg: 'bg-gray-100',
    text: 'text-gray-500',
    icon: XCircle
  },

  // Legacy case statuses (for backward compatibility)
  new: {
    label: 'ממתין לטיפול',
    bg: 'bg-gray-50',
    text: 'text-gray-600',
    icon: Clock
  },
  assigned: {
    label: 'שובץ',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    icon: UserPlus
  },
  en_route: {
    label: 'ספק בדרך',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    icon: Truck
  },
  on_site: {
    label: 'באתר',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    icon: RefreshCw
  },
  sla_breach: {
    label: 'חרג SLA',
    bg: 'bg-red-50',
    text: 'text-red-700',
    icon: AlertTriangle
  },

  // Provider statuses
  available: { label: 'זמין', bg: 'bg-gray-100', text: 'text-gray-800', icon: CheckCircle },
  busy: { label: 'בעבודה', bg: 'bg-blue-50', text: 'text-blue-700', icon: Clock },
  offline: { label: 'לא זמין', bg: 'bg-gray-100', text: 'text-gray-500', icon: XCircle },
  inactive: { label: 'לא פעיל', bg: 'bg-gray-100', text: 'text-gray-500', icon: XCircle },

  // Customer statuses
  active: { label: 'פעיל', bg: 'bg-gray-100', text: 'text-gray-800', icon: CheckCircle },
  suspended: { label: 'מושהה', bg: 'bg-red-50', text: 'text-red-700', icon: AlertTriangle },

  // Priority - Minimalist
  low: { label: 'נמוך', bg: 'bg-gray-50', text: 'text-gray-600' },
  normal: { label: 'רגיל', bg: 'bg-gray-100', text: 'text-gray-700' },
  high: { label: 'גבוה', bg: 'bg-blue-50', text: 'text-blue-700', icon: AlertTriangle },
  urgent: { label: 'דחוף', bg: 'bg-red-50', text: 'text-red-700', icon: AlertTriangle },

  // Payment
  pending: { label: 'ממתין', bg: 'bg-gray-50', text: 'text-gray-600', icon: Clock },
  invoiced: { label: 'חשבונית', bg: 'bg-blue-50', text: 'text-blue-700' },
  paid: { label: 'שולם', bg: 'bg-gray-100', text: 'text-gray-800', icon: CheckCircle },
  disputed: { label: 'במחלוקת', bg: 'bg-red-50', text: 'text-red-700', icon: AlertTriangle },
};

export default function StatusBadge({ status, size = 'default', showIcon = true }) {
  const config = statusConfig[status] || statusConfig.normal;
  const Icon = config.icon;

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full font-medium",
      config.bg,
      config.text,
      size === 'sm' ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-[13px]"
    )}>
      {showIcon && Icon && <Icon className="w-3.5 h-3.5" strokeWidth={2} />}
      {config.label}
    </span>
  );
}
