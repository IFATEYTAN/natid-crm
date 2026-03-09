export const statusLabels = {
  waiting_treatment: 'ממתין לטיפול',
  awaiting_assignment: 'ממתין לשיבוץ',
  assigning: 'בתהליך שיבוץ',
  vendor_enroute: 'ספק בדרך',
  in_progress: 'בטיפול',
  vendor_arrived: 'ספק הגיע',
  future_service: 'שירות עתידי',
  in_followup: 'במעקב',
  in_storage: 'באחסון',
  continued_treatment: 'טיפול המשך',
  awaiting_payment: 'ממתין לתשלום',
  completed: 'הושלם',
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
  flat_tire: 'פנצ\'ר',
  stuck_wheel: 'גלגל תקוע',
  accident: 'תאונה',
  no_fuel: 'אזל הדלק',
  dead_battery: 'מצבר מת',
  locked_keys: 'מפתחות נעולים',
  other: 'אחר',
};