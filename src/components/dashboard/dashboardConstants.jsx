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

export const statusLabels = {
  waiting_treatment: 'ממתין לטיפול',
  awaiting_assignment: 'ממתין לשיוך',
  assigning: 'בשיוך',
  vendor_enroute: 'ספק בדרך',
  in_progress: 'בטיפול',
  completed: 'הושלם',
  cancelled: 'בוטל',
};

export const openStatuses = [
  'waiting_treatment',
  'awaiting_assignment',
  'assigning',
  'vendor_enroute',
  'in_progress',
];
