import React from 'react';
import { cn } from "@/lib/utils";

const statusConfig = {
  // Case statuses
  new: { label: 'חדש', bg: 'bg-blue-50', text: 'text-[#0288D1]', dot: 'bg-[#0288D1]' },
  assigned: { label: 'שובץ', bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  en_route: { label: 'בדרך', bg: 'bg-amber-50', text: 'text-[#ED6C02]', dot: 'bg-[#ED6C02]' },
  on_site: { label: 'באתר', bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-500' },
  in_progress: { label: 'בטיפול', bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  completed: { label: 'הושלם', bg: 'bg-green-50', text: 'text-[#2E7D32]', dot: 'bg-[#2E7D32]' },
  cancelled: { label: 'בוטל', bg: 'bg-gray-50', text: 'text-[#616161]', dot: 'bg-[#9E9E9E]' },
  
  // Provider statuses
  available: { label: 'זמין', bg: 'bg-green-50', text: 'text-[#2E7D32]', dot: 'bg-[#2E7D32]' },
  busy: { label: 'בעבודה', bg: 'bg-amber-50', text: 'text-[#ED6C02]', dot: 'bg-[#ED6C02]' },
  offline: { label: 'לא זמין', bg: 'bg-gray-50', text: 'text-[#616161]', dot: 'bg-[#9E9E9E]' },
  inactive: { label: 'לא פעיל', bg: 'bg-red-50', text: 'text-[#D32F2F]', dot: 'bg-[#D32F2F]' },
  
  // Customer statuses
  active: { label: 'פעיל', bg: 'bg-green-50', text: 'text-[#2E7D32]', dot: 'bg-[#2E7D32]' },
  suspended: { label: 'מושהה', bg: 'bg-red-50', text: 'text-[#D32F2F]', dot: 'bg-[#D32F2F]' },
  
  // Priority
  low: { label: 'נמוך', bg: 'bg-gray-50', text: 'text-[#616161]', dot: 'bg-[#9E9E9E]' },
  normal: { label: 'רגיל', bg: 'bg-blue-50', text: 'text-[#0288D1]', dot: 'bg-[#0288D1]' },
  high: { label: 'גבוה', bg: 'bg-amber-50', text: 'text-[#ED6C02]', dot: 'bg-[#ED6C02]' },
  urgent: { label: 'דחוף', bg: 'bg-red-50', text: 'text-[#D32F2F]', dot: 'bg-[#D32F2F]' },
  
  // Payment
  pending: { label: 'ממתין', bg: 'bg-amber-50', text: 'text-[#ED6C02]', dot: 'bg-[#ED6C02]' },
  invoiced: { label: 'חשבונית', bg: 'bg-blue-50', text: 'text-[#0288D1]', dot: 'bg-[#0288D1]' },
  paid: { label: 'שולם', bg: 'bg-green-50', text: 'text-[#2E7D32]', dot: 'bg-[#2E7D32]' },
  disputed: { label: 'במחלוקת', bg: 'bg-red-50', text: 'text-[#D32F2F]', dot: 'bg-[#D32F2F]' },
};

export default function StatusBadge({ status, size = 'default' }) {
  const config = statusConfig[status] || statusConfig.normal;
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full font-medium",
      config.bg,
      config.text,
      size === 'sm' ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}