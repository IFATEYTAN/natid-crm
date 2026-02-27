import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { X, ChevronLeft, ChevronRight, BookOpen, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'natid_nati_assistant';

// Contextual tips for every screen in the system
const contextualTips = {
  // === Daily Operations ===
  Dashboard: [
    {
      title: 'לוח הבקרה',
      text: 'כאן תראה סיכום של כל הפעילות - קריאות פתוחות, ביצועים וסטטיסטיקות בזמן אמת. המדדים מתעדכנים אוטומטית.',
    },
    {
      title: 'כרטיסי KPI',
      text: 'לחץ על כל כרטיס (כמו "קריאות פתוחות" או "SLA") כדי לעבור ישירות לסינון המתאים ברשימת הקריאות.',
    },
    {
      title: 'מעקב סטטוסים',
      text: 'הגרפים מציגים מגמות שבועיות וחודשיות. צבע אדום מסמן חריגה או דחיפות. העבר עכבר לפרטים נוספים.',
    },
    {
      title: 'קריאות אחרונות',
      text: 'טבלת הקריאות האחרונות מאפשרת גישה מהירה לתיקים פעילים. ניתן למיין לפי כל עמודה.',
    },
  ],
  Calls: [
    {
      title: 'רשימת קריאות',
      text: 'מרכז הבקרה לכל הקריאות. השתמש בפילטרים למעלה כדי לסנן לפי סטטוס, ספק, אזור או תאריך.',
    },
    {
      title: 'סינון וחיפוש',
      text: 'ניתן לחפש חופשי לפי שם לקוח, טלפון או מספר רכב. הסינון נשמר גם כשחוזרים לדף.',
    },
    {
      title: 'SLA וזמנים',
      text: 'שים לב לעמודת הזמנים - קריאות שמתקרבות לחריגה יסומנו בצבע בולט. תעדף אותן בטיפול.',
    },
    {
      title: 'ייצוא נתונים',
      text: 'כפתור הייצוא מאפשר להוריד את הטבלה הנוכחית (אחרי סינון) לקובץ Excel לעבודה חיצונית.',
    },
  ],
  CallDetails: [
    {
      title: 'כרטיס קריאה',
      text: 'כל המידע במקום אחד: סטטוס נוכחי, מיקום בזמן אמת, ופרטי הספק המשובץ.',
    },
    {
      title: 'שיבוץ ספקים',
      text: 'לחץ על "שבץ ספק" לקבלת המלצות חכמות מבוססות מיקום, דירוג וזמינות. המערכת תסמן את המומלצים.',
    },
    {
      title: 'עדכונים ויומן',
      text: 'ציר הזמן מתעד כל פעולה אוטומטית. השתמש ב"הערות" לתיעוד שיחות ועדכונים ידניים.',
    },
    {
      title: 'מדיה וקבצים',
      text: 'לשונית "קבצים" מרכזת את כל התמונות מהשטח וחתימת הלקוח. חובה לוודא קיום תמונות לפני סגירה.',
    },
  ],
  NewCase: [
    { title: 'פתיחת קריאה', text: 'תהליך מהיר ב-4 שלבים: פרטי לקוח > רכב > מיקום > שירות.' },
    {
      title: 'זיהוי לקוח',
      text: 'הקלד מספר טלפון או שם - אם הלקוח קיים, המערכת תשלים את כל הפרטים אוטומטית.',
    },
    {
      title: 'מיקום מדויק',
      text: 'חשוב להזין כתובת מדויקת לחישוב מרחק ספקים. ניתן להשתמש במיקום הנוכחי אם מדווחים מהשטח.',
    },
    {
      title: 'סוג שירות',
      text: 'בחירת סוג השירות (גרירה/חילוץ/שרות דרך) קריטית לשיבוץ הספק המתאים עם הציוד הנכון.',
    },
  ],

  // === Expanded Guides ===
  UserGuide: [
    {
      title: 'מדריך למוקדן',
      text: "ברוך הבא! כאן תלמד איך לנהל קריאות מא' ועד ת'.",
    },
    {
      title: 'פתיחת קריאה',
      text: '1. לחץ "קריאה חדשה". 2. מלא פרטי לקוח ורכב. 3. הזן מיקום. 4. שמור ושבץ ספק.',
    },
    {
      title: 'שיבוץ ספק',
      text: 'טיפ: בחר ספק לפי קרבה ודירוג. המערכת תתריע אם הספק לא זמין או רחוק מדי.',
    },
    {
      title: 'מעקב ובקרה',
      text: 'בדשבורד תראה את כל הקריאות הפעילות. עקוב אחרי סמני ה-SLA ומפה בזמן אמת.',
    },
  ],
  VendorGuide: [
    {
      title: 'מדריך לספק',
      text: 'כל מה שצריך כדי לקבל קריאות ולבצע אותן בהצלחה.',
    },
    {
      title: 'התחלת עבודה',
      text: '1. התחבר למערכת. 2. סמן "זמין" בפורטל. 3. אשר שיתוף מיקום לקבלת קריאות קרובות.',
    },
    {
      title: 'תהליך קריאה',
      text: 'קבלת התראה > אישור תוך 5 דקות > "יצאתי לדרך" > "הגעתי" > צילום ותיעוד > חתימה וסיום.',
    },
    {
      title: 'שאלות נפוצות',
      text: 'ביטול? עדכן סטטוס והערה. בעיה? צור קשר עם המוקד. תשלום? מחושב אוטומטית בסוף חודש.',
    },
  ],

  // === Other Screens (Existing + Enhanced) ===
  Calendar: [
    {
      title: 'לוח שנה',
      text: 'תצוגה לוחית של כל הקריאות המתוזמנות. אפשר לעבור בין תצוגות יום, שבוע וחודש.',
    },
    { title: 'גרור ושחרר', text: 'אפשר לגרור קריאות בין תאריכים כדי לתזמן מחדש בקלות.' },
    {
      title: 'קודי צבע',
      text: 'הצבעים מייצגים סטטוס: ירוק=הושלם, צהוב=בביצוע, אדום=דחוף, אפור=ממתין.',
    },
  ],
  QueueMonitor: [
    { title: 'ניטור תורים', text: 'כאן רואים בזמן אמת את כל הקריאות שמחכות בתור לטיפול.' },
    { title: 'סדר עדיפויות', text: 'קריאות דחופות מוצגות בראש התור. אפשר לשנות עדיפות ידנית.' },
    { title: 'שיבוץ מהיר', text: 'לחץ על קריאה בתור ובחר ספק לשיבוץ מהיר.' },
  ],
  MyQueue: [
    {
      title: 'התור שלי',
      text: 'כאן מוצגות הקריאות שמחכות לטיפול שלך. הקריאות ממוינות לפי עדיפות.',
    },
    { title: 'קח קריאה', text: 'לחץ "קח לטיפול" כדי להתחיל לעבוד על קריאה מהתור.' },
  ],
  AllVendorsMap: [
    { title: 'מפת ספקים', text: 'כאן רואים את כל הספקים על המפה עם סטטוס הזמינות שלהם בזמן אמת.' },
    { title: 'סינון', text: 'אפשר לסנן לפי סוג שירות, זמינות או אזור כדי למצוא ספק מתאים.' },
    { title: 'פרטי ספק', text: 'לחץ על סמן במפה כדי לראות פרטי ספק, מרחק, וזמן הגעה משוער.' },
  ],
  VendorTracking: [
    { title: 'מעקב ספקים', text: 'מעקב בזמן אמת אחרי מיקום ותנועת הספקים בשטח.' },
    { title: 'מצב נוכחי', text: 'הצבעים מראים סטטוס: ירוק=זמין, כתום=בדרך, אדום=בקריאה.' },
  ],
  CoverageAreas: [
    {
      title: 'אזורי כיסוי',
      text: 'כאן מנוהלים אזורי הכיסוי של כל הספקים ומוצג הכיסוי הכולל על המפה.',
    },
    {
      title: 'חורים בכיסוי',
      text: 'המערכת מסמנת אזורים ללא כיסוי ספקים כדי לזהות פערים ולגייס ספקים חדשים.',
    },
  ],
  Reports: [
    { title: 'דוחות', text: 'כאן ניתן ליצור דוחות מותאמים אישית על ביצועים, עלויות ומגמות.' },
    { title: 'תבניות', text: 'בחר מתבניות דוח מוכנות או צור דוח מותאם אישית.' },
    { title: 'ייצוא', text: 'כל דוח ניתן לייצוא ל-Excel, PDF או לשליחה במייל.' },
  ],
  HistoricalDataAnalysis: [
    {
      title: 'ניתוח נתונים',
      text: 'ניתוח מעמיק של נתונים היסטוריים - מגמות, דפוסים והשוואות תקופתיות.',
    },
    { title: 'תקופת השוואה', text: 'בחר שתי תקופות להשוואה כדי לזהות שיפורים או ירידות בביצועים.' },
  ],
  AdvancedExport: [
    {
      title: 'ייצוא מתקדם',
      text: 'ייצוא נתונים מותאם אישית - בחר שדות, סנן תוצאות וייצא בפורמט הרצוי.',
    },
    { title: 'תבניות ייצוא', text: 'שמור תבניות ייצוא חוזרות כדי לחסוך זמן בפעם הבאה.' },
  ],
  ImportHistoricalData: [
    { title: 'ייבוא נתונים', text: 'ייבוא נתונים היסטוריים מקבצי Excel או CSV למערכת.' },
    { title: 'מיפוי שדות', text: 'התאם את העמודות בקובץ לשדות במערכת לפני הייבוא.' },
  ],
  Customers: [
    { title: 'לקוחות', text: 'ניהול מאגר הלקוחות - חיפוש, עריכה והיסטוריית קריאות לכל לקוח.' },
    { title: 'חיפוש', text: 'חפש לקוח לפי שם, טלפון, כתובת או מספר לקוח.' },
    { title: 'הוספת לקוח', text: 'לחץ "לקוח חדש" להוספת לקוח למאגר באופן ידני.' },
  ],
  CustomerDetails: [
    { title: 'פרטי לקוח', text: 'כל המידע על הלקוח - פרטים, כתובות, היסטוריית קריאות ומשובים.' },
    { title: 'היסטוריה', text: 'ראה את כל הקריאות הקודמות של הלקוח ואת הסטטוס שלהן.' },
  ],
  CustomerFeedback: [
    { title: 'משובי לקוחות', text: 'כאן מרוכזים כל המשובים שהתקבלו מלקוחות על השירות.' },
    { title: 'מגמות', text: 'המערכת מנתחת מגמות בשביעות רצון ומציגה תובנות לשיפור.' },
  ],
  ServiceProviders: [
    { title: 'נותני שירות', text: 'ניהול כל נותני השירות - פרטים, ביצועים, חוזים ודירוגים.' },
    { title: 'הוספת ספק', text: 'לחץ "ספק חדש" כדי להוסיף נותן שירות למערכת.' },
    { title: 'דירוג', text: 'הדירוג מחושב אוטומטית לפי זמני תגובה, איכות שירות ומשובי לקוחות.' },
  ],
  NewVendor: [
    { title: 'ספק חדש', text: 'מלא את כל הפרטים הנדרשים לרישום ספק חדש במערכת.' },
    { title: 'אזורי כיסוי', text: 'הגדר את האזורים שהספק מכסה ואת סוגי השירות שהוא נותן.' },
  ],
  VendorContracts: [
    { title: 'חוזי ספקים', text: 'ניהול חוזים עם ספקים - תנאים, תוקף, תעריפים וחידושים.' },
    { title: 'תוקף', text: 'המערכת מתריעה על חוזים שעומדים לפוג כדי לחדש בזמן.' },
  ],
  VendorPortal: [
    { title: 'פורטל ספקים', text: 'כאן תוכל לראות את כל הקריאות שלך ולנהל את הזמינות.' },
    {
      title: 'זמינות',
      text: 'הפעל את מתג הזמינות למעלה כדי לקבל קריאות חדשות. כשאתה לא זמין, לא ישובצו אליך קריאות.',
    },
    {
      title: 'קריאות פעילות',
      text: 'קריאות פעילות מופיעות בראש העמוד. לחץ "נהל" כדי לעדכן סטטוס.',
    },
    { title: 'סטטיסטיקות', text: 'עקוב אחרי הביצועים שלך - מספר קריאות, דירוג, ואחוז השלמה.' },
  ],
  VendorCallManagement: [
    {
      title: 'ניהול קריאה',
      text: 'כאן מנהלים את הקריאה מהשטח - עדכון סטטוס, העלאת תמונות וקבלת חתימה.',
    },
    { title: 'תהליך', text: 'עדכן לפי הסדר: "יצאתי לדרך" -> "הגעתי למקום" -> "סיימתי טיפול".' },
    { title: 'תמונות', text: 'חובה לצלם תמונות לפני ואחרי הטיפול. זה מגן עליך ומשפר את הדירוג.' },
    { title: 'חתימה', text: 'לפני סיום הקריאה, בקש מהלקוח לחתום על המסך לאישור ביצוע.' },
  ],
  MyVendorProfile: [
    { title: 'הפרופיל שלך', text: 'כאן ניתן לעדכן פרטי קשר, סוגי שירות ואזורי כיסוי.' },
    { title: 'סוגי שירות', text: 'סמן את כל סוגי השירות שאתה מספק והגדר תעריפים.' },
    { title: 'אזורי כיסוי', text: 'ככל שתכסה יותר אזורים, כך תקבל יותר קריאות.' },
    { title: 'שעות פעילות', text: 'הגדר שעות עבודה קבועות או סמן 24/7 לקבלת קריאות בכל שעה.' },
  ],
  Agents: [
    { title: 'סוכנים', text: 'ניהול סוכנים חכמים שמבצעים משימות אוטומטיות במערכת.' },
    { title: 'הפעלה', text: 'הפעל או כבה סוכנים בהתאם לצרכי העסק שלך.' },
  ],
  Settings: [
    { title: 'הגדרות מערכת', text: 'הגדרות כלליות של המערכת - שפה, אזור זמן, ברירות מחדל.' },
    { title: 'שמירה', text: 'אל תשכח ללחוץ "שמור" אחרי כל שינוי בהגדרות.' },
  ],
  UserManagement: [
    { title: 'ניהול משתמשים', text: 'כאן מנהלים את כל המשתמשים במערכת - הוספה, עריכה והרשאות.' },
    { title: 'תפקידים', text: 'הקצה תפקיד לכל משתמש: מנהל, מוקדן או ספק. זה קובע מה הוא רואה.' },
    { title: 'הזמנה', text: 'שלח הזמנה למשתמש חדש - הוא יקבל מייל עם קישור להרשמה.' },
  ],
  RoleManagement: [
    { title: 'ניהול תפקידים', text: 'הגדרת הרשאות וגישה לכל תפקיד במערכת.' },
    { title: 'הרשאות', text: 'בחר אילו מסכים ופעולות כל תפקיד רואה ויכול לבצע.' },
  ],
  AuditLog: [
    { title: 'יומן פעולות', text: 'מעקב אחר כל הפעולות שבוצעו במערכת - מי עשה מה ומתי.' },
    { title: 'סינון', text: 'סנן לפי משתמש, סוג פעולה או טווח תאריכים.' },
  ],
  AutomationSettings: [
    { title: 'אוטומציה', text: 'הגדרת כללים אוטומטיים - שיבוץ אוטומטי, התראות, והסלמות.' },
    { title: 'כללים', text: 'צור כללים כמו: "אם קריאה לא טופלה תוך שעה - שלח התראה למנהל".' },
  ],
  IntegrationSettings: [
    { title: 'אינטגרציות', text: 'חיבור המערכת למערכות חיצוניות - CRM, ERP, SMS ועוד.' },
    { title: 'Webhooks', text: 'הגדר webhooks לקבלת או שליחת עדכונים אוטומטיים.' },
  ],
  NotificationSettings: [
    { title: 'הגדרות התראות', text: 'הגדרת סוגי ההתראות שיישלחו, ערוצי שליחה ותזמונים.' },
    { title: 'ערוצים', text: 'בחר ערוצים: SMS, אימייל, Push או שילוב ביניהם.' },
  ],
  MyNotificationSettings: [
    { title: 'ההתראות שלי', text: 'התאם אישית אילו התראות תקבל ובאילו ערוצים.' },
    { title: 'העדפות', text: 'בחר מה חשוב לך - תוכל תמיד לשנות בהמשך.' },
  ],
  AdminDisplaySettings: [
    { title: 'הגדרות תצוגה', text: 'התאמת מראה המערכת - צבעים, לוגו ותצוגת ברירת מחדל.' },
  ],
  LandingPage: [
    {
      title: 'ברוכים הבאים!',
      text: 'זהו דף הבית של המערכת. התחבר כדי להתחיל לנהל את הקריאות שלך.',
    },
  ],
  default: [
    {
      title: 'שלום! אני נתי',
      text: 'אני כאן לעזור לך להשתמש במערכת. אני מכיל את כל הידע על המערכת.',
    },
    {
      title: 'עזרה הקשרית',
      text: 'לחץ עליי בכל מסך כדי לקבל הסבר וטיפים רלוונטיים בדיוק לדף שבו אתה נמצא.',
    },
    { title: 'מרכז הידע', text: 'למידע מקיף, עבור למדריך למשתמש או למדריך לספק בתפריט.' },
  ],
};

function TowTruckSVG({ isTalking }) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      {/* === VW Beetle "נתי הגרר" === */}

      {/* Lower body with wheel arches */}
      <path
        d="M8 48 Q6 48 6 50 L6 55 Q6 58 9 58 L15 58 Q15 53 21 53 Q27 53 27 58 L53 58 Q53 53 59 53 Q65 53 65 58 L71 58 Q74 58 74 55 L74 50 Q74 48 72 48 Z"
        fill="#DC2626"
      />

      {/* Upper body - beetle dome */}
      <path
        d="M16 48 Q13 40 17 32 Q23 22 35 20 Q43 18 47 20 Q59 22 63 32 Q67 40 64 48 Z"
        fill="#DC2626"
      />

      {/* Roof panel - darker */}
      <path
        d="M20 48 Q17 40 21 33 Q27 24 37 22 Q45 20 49 22 Q57 24 59 33 Q63 40 60 48 Z"
        fill="#B91C1C"
      />

      {/* Front windshield (car faces right) */}
      <path
        d="M44 48 L46 30 Q52 26 58 32 L58 48 Z"
        fill="#BFDBFE"
        stroke="#991B1B"
        strokeWidth="0.5"
      />

      {/* Rear window */}
      <path
        d="M22 48 L22 32 Q28 26 34 30 L36 48 Z"
        fill="#BFDBFE"
        stroke="#991B1B"
        strokeWidth="0.5"
      />

      {/* B-pillar (window divider) */}
      <rect x="36" y="27" width="8" height="21" rx="2" fill="#991B1B" />

      {/* Running board */}
      <rect x="27" y="56" width="26" height="2" rx="1" fill="#7F1D1D" />

      {/* Front bumper */}
      <rect x="73" y="52" width="4" height="2.5" rx="1.25" fill="#D1D5DB" />

      {/* Rear bumper */}
      <rect x="3" y="52" width="4" height="2.5" rx="1.25" fill="#D1D5DB" />

      {/* Headlight (front) */}
      <circle cx="72" cy="50" r="2.5" fill="#FBBF24" />
      <circle cx="72" cy="50" r="1" fill="#FEF3C7" />

      {/* Taillight (rear) */}
      <circle cx="8" cy="50" r="2" fill="#FCA5A5" />

      {/* Door handle */}
      <rect x="48" y="47" width="3" height="1" rx="0.5" fill="#991B1B" />

      {/* NatID text */}
      <text
        x="40"
        y="54"
        fill="white"
        fontSize="5.5"
        fontWeight="bold"
        fontFamily="Heebo, sans-serif"
        textAnchor="middle"
      >
        NatID
      </text>

      {/* Wheels */}
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        style={{ originX: '21px', originY: '60px' }}
      >
        <circle cx="21" cy="60" r="5.5" fill="#1E293B" />
        <circle cx="21" cy="60" r="2" fill="#94A3B8" />
      </motion.g>
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        style={{ originX: '59px', originY: '60px' }}
      >
        <circle cx="59" cy="60" r="5.5" fill="#1E293B" />
        <circle cx="59" cy="60" r="2" fill="#94A3B8" />
      </motion.g>

      {/* Eyes */}
      <AnimatePresence>
        {isTalking ? (
          <>
            <motion.ellipse
              cx="48"
              cy="38"
              rx="2.5"
              ry="3"
              fill="#1E293B"
              animate={{ scaleY: [1, 0.2, 1] }}
              transition={{ duration: 0.4, repeat: Infinity, repeatDelay: 1.5 }}
            />
            <motion.ellipse
              cx="55"
              cy="38"
              rx="2.5"
              ry="3"
              fill="#1E293B"
              animate={{ scaleY: [1, 0.2, 1] }}
              transition={{ duration: 0.4, repeat: Infinity, repeatDelay: 1.5 }}
            />
          </>
        ) : (
          <>
            <circle cx="48" cy="38" r="2.5" fill="#1E293B" />
            <circle cx="55" cy="38" r="2.5" fill="#1E293B" />
          </>
        )}
      </AnimatePresence>

      {/* Eye highlights */}
      <circle cx="49" cy="37" r="0.8" fill="white" />
      <circle cx="56" cy="37" r="0.8" fill="white" />

      {/* Mouth */}
      {isTalking ? (
        <motion.ellipse
          cx="51"
          cy="44"
          rx="2.5"
          fill="#7F1D1D"
          initial={{ ry: 1.5 }}
          animate={{ ry: [1, 2, 1] }}
          transition={{ duration: 0.3, repeat: Infinity }}
        />
      ) : (
        <path d="M48 44 Q51 46 54 44" stroke="#7F1D1D" strokeWidth="1.5" fill="none" />
      )}

      {/* Exhaust smoke (VW Beetle has rear engine) */}
      <motion.circle
        cx="4"
        cy="54"
        r="2"
        fill="#CBD5E1"
        animate={{ x: [-2, -8], y: [0, -6], opacity: [0.6, 0], scale: [0.5, 1.5] }}
        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5 }}
      />

      {/* Headlight glow */}
      <motion.circle
        cx="72"
        cy="50"
        r="4"
        fill="#FBBF24"
        animate={{ opacity: [0.3, 0.1, 0.3] }}
        transition={{ duration: 0.8, repeat: Infinity }}
      />
    </svg>
  );
}

export default function NatiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(true);
  const location = useLocation();

  // Determine current page context
  const getPageKey = useCallback(() => {
    const path = location.pathname.replace(/^\//, '').split('/')[0];
    if (contextualTips[path]) return path;
    return 'default';
  }, [location.pathname]);

  const pageKey = getPageKey();
  const tips = contextualTips[pageKey];

  // Load saved state
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      setIsHidden(!!saved.hidden);
      setHasSeenWelcome(!!saved.seenWelcome);
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Auto-welcome on first visit
  useEffect(() => {
    if (!hasSeenWelcome && !isHidden) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        setHasSeenWelcome(true);
        try {
          const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...saved, seenWelcome: true }));
        } catch {
          // Ignore
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [hasSeenWelcome, isHidden]);

  // Reset tip index when page changes
  useEffect(() => {
    setCurrentTipIndex(0);
  }, [pageKey]);

  const handleHide = () => {
    setIsHidden(true);
    setIsOpen(false);
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...saved, hidden: true }));
    } catch {
      // Ignore
    }
  };

  const handleShow = () => {
    setIsHidden(false);
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...saved, hidden: false }));
    } catch {
      // Ignore
    }
  };

  // Determine guide link based on current context
  const guidePageName = 'UserGuide';
  const guideLabel = 'מדריך למשתמש';

  if (isHidden) {
    return (
      <motion.button
        className="fixed bottom-6 start-6 z-[100] w-14 h-14 bg-white border-2 border-red-100 rounded-full shadow-xl flex items-center justify-center text-red-500 hover:border-red-300 hover:bg-red-50 transition-all duration-300 group"
        onClick={handleShow}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        title="הצג את נתי"
      >
        <span className="text-2xl filter drop-shadow-sm group-hover:scale-110 transition-transform">
          🚛
        </span>
        <span className="absolute -top-1 -end-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
      </motion.button>
    );
  }

  return (
    <div className="fixed bottom-20 start-4 z-[100]" dir="rtl">
      {/* Speech Bubble */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="absolute bottom-20 start-0 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-red-50 border-b border-red-100">
              <span className="font-bold text-red-800 text-sm">נתי הגרר</span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tip Content */}
            <div className="p-4 min-h-[100px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${pageKey}-${currentTipIndex}`}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <h4 className="font-bold text-gray-900 text-sm mb-2">
                    {tips[currentTipIndex]?.title}
                  </h4>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {tips[currentTipIndex]?.text}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentTipIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentTipIndex === 0}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="flex gap-1">
                  {tips.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentTipIndex(idx)}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        idx === currentTipIndex ? 'bg-red-500' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setCurrentTipIndex((prev) => Math.min(tips.length - 1, prev + 1))}
                  disabled={currentTipIndex === tips.length - 1}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100">
              <Link to={createPageUrl(guidePageName)} onClick={() => setIsOpen(false)}>
                <Button size="sm" variant="default" className="gap-1 bg-red-600 hover:bg-red-700">
                  <BookOpen className="w-3.5 h-3.5" />
                  {guideLabel}
                </Button>
              </Link>
              <button
                onClick={handleHide}
                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
              >
                <EyeOff className="w-3 h-3" />
                הסתר
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-16 h-16 rounded-full bg-white shadow-lg border-2 border-red-100 hover:border-red-300 flex items-center justify-center overflow-hidden transition-colors"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <TowTruckSVG isTalking={isOpen} />
      </motion.button>
    </div>
  );
}
