// ======== סטטוסי קריאה עדכניים ========
// הסדר, הנוסח והצבעים זהים למערכת של נתי שירותי דרך (יישור 20.07):
// ירוק=ממתין, צהוב=בדרך/בטיפול, כתום=הגיע, לבן=ממתין לשיחת סגירה, סגול=עתידי.
export const callStatusFlow = [
  {
    key: 'waiting_treatment',
    label: 'ממתין לטיפול',
    description: 'הקריאה נפתחה (או הגיעה מסנכרון נתי) וממתינה לטיפול ראשוני ע"י מוקדן',
  },
  { key: 'awaiting_assignment', label: 'ממתין לשיבוץ', description: 'הקריאה מוכנה לשיבוץ ספק שטח' },
  { key: 'assigning', label: 'ספק שובץ', description: 'ספק נבחר והמערכת מחכה לאישורו' },
  {
    key: 'vendor_enroute',
    label: 'נותן השירות בדרך ללקוח',
    description: 'הספק אישר את הקריאה ויצא לדרך',
  },
  {
    key: 'vendor_arrived',
    label: 'נותן השירות הגיע ליעד',
    description: 'הספק הגיע לנקודת האיסוף / ליעד',
  },
  { key: 'in_progress', label: 'בטיפול', description: 'הספק מבצע את העבודה בשטח' },
  {
    key: 'awaiting_closure_call',
    label: 'ממתין לשיחת סגירה',
    description:
      'הטיפול בשטח הסתיים והוזנו שעות ההגעה וסטטוס הסגירה — הקריאה נשארת פתוחה עד שיחת הסגירה עם הלקוח (המצב ה"לבן" של נתי)',
  },
  {
    key: 'in_storage',
    label: 'באחסנה',
    description: 'הרכב נמצא באחסנה (מגרש/מוסך) וממתין לפעולה נוספת',
  },
  {
    key: 'future_service',
    label: 'שירות עתידי',
    description: 'תואם שירות עתידי - מתוזמן לתאריך קרוב',
  },
  { key: 'in_followup', label: 'במעקב', description: 'המוקדן מטפל בקריאה ועוקב אחרי ההתקדמות' },
  {
    key: 'continued_treatment',
    label: 'המשך טיפול',
    description: 'הקריאה דורשת טיפול נוסף או המשך מהמוקד',
  },
  {
    key: 'awaiting_payment',
    label: 'המתנה לחיוב',
    description: 'הטיפול הסתיים אך ממתין לתשלום/חיוב מהלקוח',
  },
  { key: 'completed', label: 'סגור', description: 'הקריאה טופלה בהצלחה ונסגרה' },
  { key: 'cancelled', label: 'בוטל', description: 'הקריאה בוטלה (ע"י הלקוח, המוקד, או הספק)' },
];

// ======== סוגי תקלות ========
export const issueTypes = [
  {
    key: 'mechanical',
    label: 'תקלה מכנית',
    description: 'בעיה במנוע, תיבת הילוכים, או מערכת מכנית אחרת',
  },
  {
    key: 'stopped_driving',
    label: 'רכב לא נוסע',
    description: 'הרכב הפסיק לנסוע ולא ניתן להתניעו',
  },
  { key: 'flat_tire', label: "פנצ'ר", description: 'תקר בצמיג, כולל צמיג תפוח או פגום' },
  { key: 'stuck_wheel', label: 'גלגל תקוע', description: 'גלגל שנתקע ולא מתגלגל' },
  { key: 'accident', label: 'תאונה', description: 'רכב שהיה מעורב בתאונת דרכים' },
  { key: 'no_fuel', label: 'אין דלק', description: 'הרכב נשאר ללא דלק' },
  { key: 'dead_battery', label: 'מצבר ריק', description: 'מצבר חלש או ריק שלא מאפשר התנעה' },
  { key: 'locked_keys', label: 'מפתחות נעולים', description: 'מפתחות ננעלו בתוך הרכב' },
  { key: 'other', label: 'אחר', description: 'כל תקלה אחרת שלא ברשימה' },
];

// ======== תפקידים במערכת ========
export const systemRoles = [
  {
    key: 'operator',
    label: 'מוקדן / מתפעל',
    description: 'מקבל קריאות, פותח תיקי שירות, משבץ ספקים ועוקב אחרי קריאות בזמן אמת',
    permissions: [
      'פתיחת קריאה חדשה',
      'שיבוץ ספקים',
      'עדכון סטטוסים',
      "ניהול צ'אט עם ספקים ולקוחות",
      'הזנת הערות',
      'צפייה בהיסטוריית קריאות',
    ],
  },
  {
    key: 'admin',
    label: 'מנהל מערכת',
    description: 'גישה מלאה לכל המודולים כולל דוחות, כספים, הרשאות, והגדרות מתקדמות',
    permissions: [
      'כל הרשאות המוקדן',
      'ניהול ספקים ולקוחות',
      'ניהול מוצרים ומחירונים',
      'דוחות מתקדמים',
      'דוחות פיננסיים',
      'ניהול הרשאות ומשתמשים',
      'הגדרות מערכת',
      'ייצוא נתונים',
    ],
  },
];

// ======== מודולים במערכת ========
export const systemModules = [
  {
    key: 'dashboard',
    label: 'לוח מחוונים',
    icon: 'BarChart3',
    description:
      'סקירה כללית של כל הפעילות - קריאות פתוחות, סטטיסטיקות וגרפים, עם סינון לפי מחלקה (הכל / גרירה / ניידת שירות / אחר)',
  },
  {
    key: 'calls',
    label: 'ניהול קריאות',
    icon: 'Phone',
    description: 'צפייה, חיפוש וניהול כל הקריאות עם סינון לפי סטטוס, עדיפות ועוד',
  },
  {
    key: 'new_case',
    label: 'קריאה חדשה',
    icon: 'Plus',
    description: 'פתיחת קריאת שירות חדשה עם כל הפרטים',
  },
  {
    key: 'call_details',
    label: 'פרטי קריאה',
    icon: 'FileText',
    description:
      "תצוגת פרטים מלאה של קריאה כולל לשוניות: מידע, פיננסים, תזכורות, צ'אט, קבצים, היסטוריה, סיכום",
  },
  {
    key: 'vendors',
    label: 'נותני שירות',
    icon: 'Truck',
    description: 'ניהול ספקי שטח - זמינות, דירוג, קריאות פתוחות/סגורות, פרטי קשר',
  },
  {
    key: 'customers',
    label: 'לקוחות',
    icon: 'Users',
    description: 'ניהול חברות ביטוח, פארקי רכב ולקוחות פרטיים',
  },
  {
    key: 'reports',
    label: 'דוחות',
    icon: 'BarChart3',
    description: 'דוחות יעילות תפעולית, ביצועי ספקים, ניתוח לקוחות, דוחות כספיים ומרכז חברות',
  },
  {
    key: 'vendor_contracts',
    label: 'חוזי ספקים',
    icon: 'FileText',
    description: 'ניהול חוזים - תעריפים, תנאים, תקופה, בונוסים וקנסות',
  },
  {
    key: 'reminders',
    label: 'תזכורות',
    icon: 'Bell',
    description: 'ניהול תזכורות אוטומטיות (פקיעת עירבון, שירות עתידי) וידניות',
  },
  {
    key: 'products',
    label: 'קטלוג מוצרים',
    icon: 'Package',
    description: 'ניהול מוצרים (מצברים, צמיגים, דלק) עם מחירי עלות ומכירה',
  },
  {
    key: 'rates',
    label: 'מחירון תפעולי',
    icon: 'Calculator',
    description: 'תעריפי בסיס, תוספות שעות, אזורים, סוגי רכב ושירות',
  },
  {
    key: 'deposits',
    label: 'עירבונות',
    icon: 'CreditCard',
    description: 'ניהול עירבונות מלקוחות - הפקדה, חיוב, החזרה ותאריכי תפוגה',
  },
  {
    key: 'eligibility',
    label: 'בדיקות זכאות',
    icon: 'Shield',
    description: 'בדיקת זכאות לקוח - כיסוי ביטוחי, מנוי בתוקף, מגבלת שירותים',
  },
  {
    key: 'vendor_tracking',
    label: 'מעקב GPS',
    icon: 'MapPin',
    description: 'מפת ספקים בזמן אמת עם סטטוסים ומיקום',
  },
  {
    key: 'queue',
    label: 'ניטור תורים',
    icon: 'Clock',
    description: 'צפייה בתור הקריאות, זמני המתנה, וסדרי עדיפות',
  },
  {
    key: 'calendar',
    label: 'יומן',
    icon: 'Calendar',
    description: 'תצוגת יומן של קריאות עתידיות ומשמרות',
  },
  {
    key: 'nati_integration',
    label: 'אינטגרציית נתי',
    icon: 'RefreshCw',
    description:
      'סנכרון דו-כיווני אוטומטי מול מערכת נתי שירותי דרך - משיכת קריאות פתוחות ודחיפת עדכונים חזרה (מסך "אינטגרציות CRM")',
  },
  {
    key: 'feedback',
    label: 'משובים',
    icon: 'Star',
    description: 'ניהול משובי לקוחות וספקים, דירוגים, והערות',
  },
];
