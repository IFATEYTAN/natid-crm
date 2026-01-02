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

const statusConfig = {
  // Call statuses
  waiting_treatment: { 
    label: 'ממתין לטיפול', 
    bg: 'bg-[#FFF4E5]', 
    text: 'text-[#ED6C02]',
    icon: Clock
  },
  awaiting_assignment: { 
    label: 'ממתין לשיוך', 
    bg: 'bg-[#FFF4E5]', 
    text: 'text-[#ED6C02]',
    icon: Clock
  },
  assigning: { 
    label: 'בשיוך', 
    bg: 'bg-[#FFE6E6]', 
    text: 'text-[#FF0000]',
    icon: UserPlus
  },
  vendor_enroute: { 
    label: 'ספק בדרך', 
    bg: 'bg-[#E8F5E9]', 
    text: 'text-[#2E7D32]',
    icon: Truck
  },
  in_progress: { 
    label: 'בטיפול', 
    bg: 'bg-[#FFE6E6]', 
    text: 'text-[#FF0000]',
    icon: Wrench
  },
  completed: { 
    label: 'הושלם', 
    bg: 'bg-[#E8F5E9]', 
    text: 'text-[#1B5E20]',
    icon: CheckCircle
  },
  cancelled: { 
    label: 'בוטל', 
    bg: 'bg-[#FFEBEE]', 
    text: 'text-[#C62828]',
    icon: XCircle
  },
  
  // Legacy case statuses (for backward compatibility)
  new: { 
    label: 'ממתין לטיפול', 
    bg: 'bg-[#FFF4E5]', 
    text: 'text-[#ED6C02]',
    icon: Clock
  },
  assigned: { 
    label: 'שובץ', 
    bg: 'bg-[#E3F2FD]', 
    text: 'text-[#0288D1]',
    icon: UserPlus
  },
  en_route: { 
    label: 'ספק בדרך', 
    bg: 'bg-[#E8F5E9]', 
    text: 'text-[#2E7D32]',
    icon: Truck
  },
  on_site: { 
    label: 'באתר', 
    bg: 'bg-[#E3F2FD]', 
    text: 'text-[#0288D1]',
    icon: RefreshCw
  },
  sla_breach: { 
    label: 'חרג SLA', 
    bg: 'bg-[#FFEBEE]', 
    text: 'text-[#C62828]',
    icon: AlertTriangle
  },
  
  // Provider statuses
  available: { label: 'זמין', bg: 'bg-[#E8F5E9]', text: 'text-[#2E7D32]', icon: CheckCircle },
  busy: { label: 'בעבודה', bg: 'bg-[#FFF4E5]', text: 'text-[#ED6C02]', icon: Clock },
  offline: { label: 'לא זמין', bg: 'bg-[#F5F5F5]', text: 'text-[#616161]', icon: XCircle },
  inactive: { label: 'לא פעיל', bg: 'bg-[#FFEBEE]', text: 'text-[#C62828]', icon: XCircle },
  
  // Customer statuses
  active: { label: 'פעיל', bg: 'bg-[#E8F5E9]', text: 'text-[#2E7D32]', icon: CheckCircle },
  suspended: { label: 'מושהה', bg: 'bg-[#FFEBEE]', text: 'text-[#C62828]', icon: AlertTriangle },
  
  // Priority
  low: { label: 'נמוך', bg: 'bg-[#F5F5F5]', text: 'text-[#616161]' },
  normal: { label: 'רגיל', bg: 'bg-[#E3F2FD]', text: 'text-[#0288D1]' },
  high: { label: 'גבוה', bg: 'bg-[#FFF4E5]', text: 'text-[#ED6C02]', icon: AlertTriangle },
  urgent: { label: 'דחוף', bg: 'bg-[#FFEBEE]', text: 'text-[#C62828]', icon: AlertTriangle },
  
  // Payment
  pending: { label: 'ממתין', bg: 'bg-[#FFF4E5]', text: 'text-[#ED6C02]', icon: Clock },
  invoiced: { label: 'חשבונית', bg: 'bg-[#E3F2FD]', text: 'text-[#0288D1]' },
  paid: { label: 'שולם', bg: 'bg-[#E8F5E9]', text: 'text-[#2E7D32]', icon: CheckCircle },
  disputed: { label: 'במחלוקת', bg: 'bg-[#FFEBEE]', text: 'text-[#C62828]', icon: AlertTriangle },
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