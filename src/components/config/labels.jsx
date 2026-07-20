export const statusColors = {
  waiting_treatment: 'bg-gray-100 text-gray-700',
  awaiting_assignment: 'bg-yellow-100 text-yellow-800',
  assigning: 'bg-blue-100 text-blue-800',
  vendor_enroute: 'bg-indigo-100 text-indigo-800',
  in_progress: 'bg-orange-100 text-orange-800',
  vendor_arrived: 'bg-purple-100 text-purple-800',
  future_service: 'bg-teal-100 text-teal-800',
  in_followup: 'bg-cyan-100 text-cyan-800',
  in_storage: 'bg-slate-100 text-slate-700',
  continued_treatment: 'bg-amber-100 text-amber-800',
  awaiting_payment: 'bg-red-100 text-red-800',
  awaiting_closure_call: 'bg-white text-gray-800 border border-gray-300',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-200 text-red-900',
};

export const statusLabels = {
  waiting_treatment: 'ממתין לטיפול',
  awaiting_assignment: 'ממתין לשיבוץ',
  assigning: 'ספק שובץ',
  vendor_enroute: 'ספק בדרך',
  in_progress: 'בטיפול',
  vendor_arrived: 'ספק הגיע',
  future_service: 'שירות עתידי',
  in_followup: 'במעקב',
  in_storage: 'באחסון',
  continued_treatment: 'טיפול המשך',
  awaiting_payment: 'ממתין לתשלום',
  awaiting_closure_call: 'ממתין לשיחת סגירה',
  completed: 'סגור',
  cancelled: 'בוטל',
};

export const priorityLabels = {
  normal: 'רגיל',
  urgent: 'דחוף',
  critical: 'קריטי',
};

export const serviceTypeLabels = {
  towing: 'גרירה',
  mobile_unit: 'נייד',
  towing_storage: 'גרירה + אחסון',
  towing_mobile: 'גרירה + נייד',
  storage_only: 'אחסון בלבד',
  other: 'אחר',
};

export const vehicleTypeLabels = {
  private: 'פרטי',
  commercial_light: 'מסחרי קל',
  truck: 'משאית',
  motorcycle: 'אופנוע',
};

export const issueTypeLabels = {
  mechanical: 'תקלה מכנית',
  stopped_driving: 'הפסיק לנסוע',
  flat_tire: "פנצ'ר",
  stuck_wheel: 'גלגל תקוע',
  accident: 'תאונה',
  no_fuel: 'אזל הדלק',
  dead_battery: 'מצבר מת',
  locked_keys: 'מפתחות נעולים',
  other: 'אחר',
};
