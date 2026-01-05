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

// WCAG AA Compliant Colors (contrast ratio >= 4.5:1)
const statusConfig = {
  // Call statuses
  waiting_treatment: {
    label: 'ממתין לטיפול',
    bg: 'bg-[#FEF3C7]',
    text: 'text-[#92400E]', // Dark amber for better contrast
    icon: Clock
  },
  awaiting_assignment: {
    label: 'ממתין לשיוך',
    bg: 'bg-[#FEF3C7]',
    text: 'text-[#92400E]',
    icon: Clock
  },
  assigning: {
    label: 'בשיוך',
    bg: 'bg-[#FEE2E2]',
    text: 'text-[#991B1B]', // Dark red for better contrast
    icon: UserPlus
  },
  vendor_enroute: {
    label: 'ספק בדרך',
    bg: 'bg-[#D1FAE5]',
    text: 'text-[#065F46]', // Dark green for better contrast
    icon: Truck
  },
  in_progress: {
    label: 'בטיפול',
    bg: 'bg-[#DBEAFE]',
    text: 'text-[#1E40AF]', // Dark blue for active state
    icon: Wrench
  },
  completed: {
    label: 'הושלם',
    bg: 'bg-[#D1FAE5]',
    text: 'text-[#065F46]',
    icon: CheckCircle
  },
  cancelled: {
    label: 'בוטל',
    bg: 'bg-[#FEE2E2]',
    text: 'text-[#991B1B]',
    icon: XCircle
  },

  // Legacy case statuses (for backward compatibility)
  new: {
    label: 'ממתין לטיפול',
    bg: 'bg-[#FEF3C7]',
    text: 'text-[#92400E]',
    icon: Clock
  },
  assigned: {
    label: 'שובץ',
    bg: 'bg-[#DBEAFE]',
    text: 'text-[#1E40AF]',
    icon: UserPlus
  },
  en_route: {
    label: 'ספק בדרך',
    bg: 'bg-[#D1FAE5]',
    text: 'text-[#065F46]',
    icon: Truck
  },
  on_site: {
    label: 'באתר',
    bg: 'bg-[#DBEAFE]',
    text: 'text-[#1E40AF]',
    icon: RefreshCw
  },
  sla_breach: {
    label: 'חרג SLA',
    bg: 'bg-[#FEE2E2]',
    text: 'text-[#991B1B]',
    icon: AlertTriangle
  },

  // Provider statuses
  available: { label: 'זמין', bg: 'bg-[#D1FAE5]', text: 'text-[#065F46]', icon: CheckCircle },
  busy: { label: 'בעבודה', bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]', icon: Clock },
  offline: { label: 'לא זמין', bg: 'bg-[#F3F4F6]', text: 'text-[#4B5563]', icon: XCircle },
  inactive: { label: 'לא פעיל', bg: 'bg-[#FEE2E2]', text: 'text-[#991B1B]', icon: XCircle },

  // Customer statuses
  active: { label: 'פעיל', bg: 'bg-[#D1FAE5]', text: 'text-[#065F46]', icon: CheckCircle },
  suspended: { label: 'מושהה', bg: 'bg-[#FEE2E2]', text: 'text-[#991B1B]', icon: AlertTriangle },

  // Priority
  low: { label: 'נמוך', bg: 'bg-[#F3F4F6]', text: 'text-[#4B5563]' }, // Gray - high contrast
  normal: { label: 'רגיל', bg: 'bg-[#DBEAFE]', text: 'text-[#1E40AF]' }, // Blue - high contrast
  high: { label: 'גבוה', bg: 'bg-[#FED7AA]', text: 'text-[#9A3412]', icon: AlertTriangle }, // Orange - high contrast
  urgent: { label: 'דחוף', bg: 'bg-[#FECACA]', text: 'text-[#7F1D1D]', icon: AlertTriangle }, // Strong Red - high contrast

  // Payment
  pending: { label: 'ממתין', bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]', icon: Clock },
  invoiced: { label: 'חשבונית', bg: 'bg-[#DBEAFE]', text: 'text-[#1E40AF]' },
  paid: { label: 'שולם', bg: 'bg-[#D1FAE5]', text: 'text-[#065F46]', icon: CheckCircle },
  disputed: { label: 'במחלוקת', bg: 'bg-[#FEE2E2]', text: 'text-[#991B1B]', icon: AlertTriangle },
};

export default function StatusBadge({ status, size = 'default', showIcon = true }) {
  const config = statusConfig[status] || statusConfig.normal;
  const Icon = config.icon;
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-[12px] font-medium",
      config.bg,
      config.text,
      size === 'sm' ? "px-3 py-1 text-[13px]" : "px-3 py-1 text-[13px]"
    )}>
      {showIcon && Icon && <Icon className="w-4 h-4" strokeWidth={2} />}
      {config.label}
    </span>
  );
}