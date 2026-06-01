/**
 * Centralized Hebrew labels for the NatID CRM system.
 * מקור אמת יחיד לתוויות עבריות במערכת.
 *
 * All user-facing labels and color mappings should be defined here
 * to prevent inconsistencies across components.
 */

// ===================== Call Statuses =====================

export const statusLabels = {
  waiting_treatment: 'ממתין לטיפול',
  awaiting_assignment: 'ממתין לשיבוץ',
  assigning: 'ספק שובץ',
  vendor_enroute: 'ספק בדרך',
  in_progress: 'בטיפול',
  vendor_arrived: 'נותן השירות הגיע',
  future_service: 'שירות עתידי',
  in_followup: 'במעקב',
  in_storage: 'באחסנה',
  continued_treatment: 'המשך טיפול',
  awaiting_payment: 'המתנה לחיוב',
  completed: 'סגור',
  cancelled: 'בוטל',
};

export const statusColors = {
  waiting_treatment: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  awaiting_assignment: 'bg-orange-100 text-orange-800 border-orange-300',
  assigning: 'bg-blue-100 text-blue-800 border-blue-300',
  vendor_enroute: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  in_progress: 'bg-purple-100 text-purple-800 border-purple-300',
  vendor_arrived: 'bg-amber-100 text-amber-800 border-amber-300',
  future_service: 'bg-violet-100 text-violet-800 border-violet-300',
  in_followup: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  in_storage: 'bg-stone-100 text-stone-800 border-stone-300',
  continued_treatment: 'bg-teal-100 text-teal-800 border-teal-300',
  awaiting_payment: 'bg-rose-100 text-rose-800 border-rose-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
  cancelled: 'bg-gray-100 text-gray-800 border-gray-300',
};

export const openStatuses = [
  'waiting_treatment',
  'awaiting_assignment',
  'assigning',
  'vendor_enroute',
  'in_progress',
  'vendor_arrived',
  'future_service',
  'in_followup',
  'in_storage',
  'continued_treatment',
  'awaiting_payment',
];

// ===================== Issue Types (Call) =====================

export const issueTypeLabels = {
  mechanical: 'תקלה מכנית',
  stopped_driving: 'כבה בנסיעה',
  flat_tire: "פנצ'ר",
  stuck_wheel: 'גלגל תקוע',
  accident: 'תאונה',
  no_fuel: 'אין דלק',
  dead_battery: 'סוללה ריקה',
  locked_keys: 'מפתחות ננעלו',
  other: 'אחר',
};

// ===================== Service Types (Case/Call) =====================

export const serviceTypeLabels = {
  towing: 'גרירה',
  flat_tire: "פנצ'ר",
  battery: 'מצבר',
  lockout: 'פתיחת רכב',
  fuel: 'דלק',
  accident: 'תאונה',
  mechanical: 'תקלה מכנית',
  other: 'אחר',
};

// ===================== Vendor Service Types =====================

export const vendorServiceTypeLabels = {
  tow_truck: 'גרר',
  mobile_unit: 'ניידת',
  mechanic: 'מכונאי',
  tire_service: 'צמיגים',
  locksmith: 'מנעולן',
  fuel_delivery: 'דלק',
  multi_service: 'שירות משולב',
};

// ===================== Vehicle Types =====================

export const vehicleTypeLabels = {
  car: 'רכב פרטי',
  motorcycle: 'אופנוע',
  truck: 'משאית',
  bus: 'אוטובוס',
  van: 'ואן',
  other: 'אחר',
};

// ===================== Priority =====================

export const priorityLabels = {
  low: 'נמוך',
  normal: 'רגיל',
  high: 'גבוה',
  urgent: 'דחוף',
};

export const priorityColors = {
  low: 'bg-gray-100 text-gray-700',
  normal: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

// ===================== Vendor Availability =====================

export const availabilityLabels = {
  available: 'זמין',
  busy: 'עסוק',
  offline: 'לא מחובר',
  on_break: 'בהפסקה',
};

export const availabilityColors = {
  available: 'bg-green-100 text-green-700',
  busy: 'bg-red-100 text-red-700',
  offline: 'bg-gray-100 text-gray-500',
  on_break: 'bg-yellow-100 text-yellow-700',
};

// ===================== Roles =====================

export const roleLabels = {
  admin: 'מנהל מערכת',
  manager: 'מנהל תפעול',
  operator: 'מוקדן',
  agent: 'נציג שטח',
  vendor: 'ספק שירות',
};
