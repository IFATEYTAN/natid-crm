import React from 'react';
import { cn } from "@/lib/utils";

/**
 * Minimalist Status Badge - 4 Colors Only
 * Primary (Blue #3b82f6): In progress, active states
 * Dark (Black #111827): Completed, success states  
 * Danger (Red #ef4444): Cancelled, error states
 * Light (Gray #6b7280): Neutral, secondary states
 */

const statusConfig = {
  // Call statuses - PRIMARY (Blue) for in-progress
  waiting_treatment: { label: 'ממתין לטיפול', variant: 'primary' },
  awaiting_assignment: { label: 'ממתין לשיוך', variant: 'primary' },
  assigning: { label: 'בשיוך', variant: 'primary' },
  vendor_enroute: { label: 'ספק בדרך', variant: 'primary' },
  in_progress: { label: 'בטיפול', variant: 'primary' },
  
  // DARK (Black) for completed/success
  completed: { label: 'הושלם', variant: 'dark' },
  
  // DANGER (Red) for cancelled/errors
  cancelled: { label: 'בוטל', variant: 'danger' },
  sla_breach: { label: 'חרג SLA', variant: 'danger' },

  // Legacy case statuses
  new: { label: 'חדש', variant: 'primary' },
  assigned: { label: 'שובץ', variant: 'primary' },
  en_route: { label: 'בדרך', variant: 'primary' },
  on_site: { label: 'באתר', variant: 'primary' },

  // Provider statuses
  available: { label: 'זמין', variant: 'dark' },
  busy: { label: 'בעבודה', variant: 'primary' },
  offline: { label: 'לא זמין', variant: 'light' },
  inactive: { label: 'לא פעיל', variant: 'danger' },
  on_break: { label: 'בהפסקה', variant: 'light' },

  // Customer statuses
  active: { label: 'פעיל', variant: 'dark' },
  suspended: { label: 'מושהה', variant: 'danger' },

  // Priority
  low: { label: 'נמוך', variant: 'light' },
  normal: { label: 'רגיל', variant: 'primary' },
  high: { label: 'גבוה', variant: 'danger' },
  urgent: { label: 'דחוף', variant: 'danger' },
  critical: { label: 'קריטי', variant: 'danger' },

  // Payment
  pending: { label: 'ממתין', variant: 'light' },
  invoiced: { label: 'חשבונית', variant: 'primary' },
  paid: { label: 'שולם', variant: 'dark' },
  disputed: { label: 'במחלוקת', variant: 'danger' },
  approved: { label: 'מאושר', variant: 'dark' },

  // SLA
  on_track: { label: 'בזמן', variant: 'dark' },
  near_breach: { label: 'קרוב לחריגה', variant: 'primary' },
  breached: { label: 'חרג', variant: 'danger' },
};

const variantStyles = {
  primary: 'bg-[#3b82f6] text-white',
  dark: 'bg-[#111827] text-white',
  danger: 'bg-[#ef4444] text-white',
  light: 'bg-[#6b7280] text-white',
};

export default function StatusBadge({ status, size = 'default', showIcon = false }) {
  const config = statusConfig[status] || { label: status, variant: 'light' };
  const variantClass = variantStyles[config.variant] || variantStyles.light;
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-[8px] font-medium",
      variantClass,
      size === 'sm' ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-[12px]"
    )}>
      {config.label}
    </span>
  );
}