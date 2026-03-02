# מסמך אפיון מערכת - NatID CRM
## מערכת ניהול קריאות שירות ונותני שירות

**תאריך עדכון אחרון:** מרץ 2026
**גרסה:** 2.1

---

## תוכן עניינים

1. [סקירה כללית](#סקירה-כללית)
2. [ארכיטקטורה טכנית](#ארכיטקטורה-טכנית)
3. [מודולים ומסכים](#מודולים-ומסכים)
4. [מערכת הרשאות ותפקידים](#מערכת-הרשאות-ותפקידים)
5. [ישויות נתונים](#ישויות-נתונים)
6. [פונקציות Backend](#פונקציות-backend)
7. [אינטגרציות](#אינטגרציות)
8. [הבהרות אפיון](#הבהרות-אפיון-פברואר-2026)
9. [סטטוס פיתוח](#סטטוס-פיתוח)
10. [פיצ'רים חסרים](#פיצרים-שעדיין-חסרים)

---

## סקירה כללית

### תיאור המערכת
מערכת NatID CRM היא מערכת לניהול קריאות שירות (Service Calls) המיועדת לחברת נתי גרופ. המערכת מאפשרת ניהול מלא של:
- לקוחות וכתובות
- נותני שירות (גררים, ניידות, ספקים חיצוניים)
- קריאות שירות מהפתיחה ועד הסגירה
- צי רכב פנימי (גררים וניידות)
- שיבוץ אוטומטי וידני עם תמחור ספקים
- מעקב GPS בזמן אמת
- דוחות, ניתוחים ובינה מלאכותית
- תקשורת צ'אט בתוך קריאות
- חשבוניות (iFrame ל-CRM קיים)
- סקרי שביעות רצון ומשובים

### קהל יעד (4 תפקידים)
1. **מנהלי מערכת (Admin)** - ניהול מלא של כל המערכת כולל דוחות פיננסיים
2. **מתפעלים (Operator)** - פתיחת קריאות, שיבוץ ספקים, ניהול תפעולי
3. **טכנאים (Agent)** - עבודה בשטח, עדכון סטטוס קריאות
4. **ספקים (Vendor)** - פורטל ייעודי לקבלת ועדכון קריאות

---

## ארכיטקטורה טכנית

### Stack טכנולוגי

| רכיב | טכנולוגיה | גרסה |
|------|-----------|------|
| Frontend Framework | React | 18.2.0 |
| Build Tool | Vite | 6.1.0 |
| UI Components | Radix UI (shadcn/ui) | Latest |
| Styling | Tailwind CSS | 3.4.17 |
| State Management | React Context + React Query | 5.84.1 |
| Routing | React Router DOM | 6.26.0 |
| Charts | Recharts | 2.15.4 |
| Icons | Lucide React | 0.475.0 |
| Date Handling | date-fns | 3.6.0 |
| Backend/API | Base44 Platform (@base44/sdk) | 0.8.3 |
| Maps | Leaflet + OpenStreetMap + react-leaflet | 4.2.1 |
| Animation | Framer Motion | 11.16.4 |
| SMS | Twilio | Backend function |
| PWA | Vite PWA Plugin + Workbox | 1.2.0 |
| PDF Export | jspdf + html2canvas | 2.5.2 |
| Forms | React Hook Form + Zod | 7.54.2 / 3.24.2 |

### מבנה תיקיות

```
src/
├── api/                    # חיבור ל-API
│   └── base44Client.js     # קליינט Base44
├── components/             # רכיבי UI (25 קטגוריות)
│   ├── ui/                 # רכיבים בסיסיים (~40)
│   ├── ai/                 # רכיבי בינה מלאכותית
│   ├── auth/               # הרשאות ו-RoleGuard
│   ├── analysis/           # ניתוח נתונים
│   ├── animations/         # אנימציות
│   ├── call/               # רכיבי קריאות כלליים
│   ├── call-details/       # טאבים של פרטי קריאה
│   ├── calls/              # רכיבי קריאות (שאלון טכני)
│   ├── chat/               # צ'אט בתוך קריאות
│   ├── contracts/          # חוזי ספקים
│   ├── dashboard/          # ווידג'טים של דשבורד
│   ├── feedback/           # משובים ודירוגים
│   ├── files/              # העלאת קבצים
│   ├── forms/              # רכיבי טפסים
│   ├── guides/             # מדריכים
│   ├── layout/             # Layout ראשי וניווט
│   ├── maps/               # מפות Leaflet
│   ├── notifications/      # התראות ו-Push
│   ├── permissions/        # PermissionsContext
│   ├── pwa/                # PWA (Install, Offline, Update)
│   ├── queue/              # רכיבי תור
│   ├── reminders/          # תזכורות
│   ├── reports/            # גרפי דוחות
│   ├── signature/          # חתימה דיגיטלית
│   └── vendor/             # רכיבי ספקים
├── config/                 # הגדרות הרשאות
│   └── permissions.js      # PAGE_PERMISSIONS, REPORT_PERMISSIONS
├── features/               # 8 מודולים עם hooks
│   ├── agents/             # ניהול סוכנים
│   ├── calls/              # קריאות (useCalls)
│   ├── customers/          # לקוחות (useCustomers)
│   ├── queue/              # תורים (useQueue)
│   ├── reports/            # דוחות (useReports)
│   ├── settings/           # הגדרות (useSettings)
│   ├── cases/              # תיקים
│   └── vendors/            # ספקים (useVendors)
├── hooks/                  # Custom Hooks משותפים
├── lib/                    # ספריות עזר, queryKeys
├── pages/                  # 47 דפי אפליקציה
├── providers/              # React Context Providers
├── services/               # שירותים (חישוב מרחקים)
├── utils/                  # פונקציות עזר
├── App.jsx                 # ניתוב ראשי + RoleGuard
├── Layout.jsx              # Layout wrapper
└── design-system.js        # מערכת עיצוב RTL
functions/                  # 30 פונקציות TypeScript serverless
docs/                       # תיעוד פרויקט (עברית)
```

---

## מודולים ומסכים

המערכת כוללת **47 מסכים** מסודרים ב-7 קבוצות ניווט:

### קבוצה 1: תפעול יומי

#### LandingPage - מסך הבית
דף נחיתה ציבורי עם כניסה למערכת.

#### Dashboard - לוח בקרה ✅
מרכז הפיקוד הראשי. כולל:
- **כרטיסי סטטיסטיקות** - קריאות פעילות, ממתינות, הושלמו היום, ספקים זמינים
- **TrackedCallsPanel** - פאנל קריאות במעקב בזמן אמת (lazy loaded)
- **מפת GPS ספקים** - VendorMapWidget עם מיקומי ספקים חיים
- **4 טאבים:** דשבורד כללי, מתפעלים, סיכומים, התראות חכמות
- **ווידג'טים AI:** EscalationPredictionWidget, RecurringPatternsWidget, ProactiveRecommendationsWidget, AIInsightsWidget
- **גרפים:** CallsTrendChart, StatusDistributionChart, WorkQueueOverview
- **ייצוא נתונים:** ExportMenu

#### Calls - רשימת קריאות ✅
טבלה מתקדמת של כל קריאות השירות. חיפוש, סינון לפי סטטוס/עדיפות/ספק/טווח תאריכים, מיון, pagination.

#### Calendar - לוח שנה ✅
תצוגת לוח שנה חודשית/שבועית של קריאות מתוזמנות.

#### QueueMonitor - ניטור תורים ✅
מעקב בזמן אמת אחרי תור העבודה ושיבוצי ספקים.

---

### קבוצה 2: ניהול ספקים

#### ServiceProviders - נותני שירות ✅
רשימת ספקים עם תצוגת Grid/Table, חיפוש, סינון לפי סטטוס וזמינות, הוספת ספק חדש.

#### VendorPricing - הסכמי תמחור (Admin בלבד)
ניהול הסכמי מחיר של ספקים: ספק, סוג שירות, אזור, מחיר, תוקף הסכם. **הערה:** מוגדר בהרשאות אך משולב בתוך דפים אחרים (אין דף עצמאי).

#### VendorContracts - חוזי ספקים ✅
ניהול חוזים עם ספקים - יצירה, עריכה, מעקב תוקף.

#### AllVendorsMap - מפת ספקים ✅
מפה אינטראקטיבית של כל הספקים עם מיקום GPS חי.

#### CoverageAreas - אזורי כיסוי ✅
הגדרת וניהול אזורי כיסוי גיאוגרפיים של ספקים.

#### VendorPortal - פורטל ספקים ✅ (Vendor בלבד)
ממשק ייעודי לספקים: קבלת/דחיית קריאות, עדכון סטטוס, צפייה בקריאות משובצות. **מסונן** - ספק רואה רק קריאות שלו.

---

### קבוצה 3: צי רכב

#### FleetManagement - ניהול צי רכב ✅ (Admin בלבד)
ניהול גררים וניידות פנימיים של נתי. רשימת כלי רכב, סטטוסים, סוג (גרר/ניידת), שיוך לאזור.

---

### קבוצה 4: כלכלה ותשלומים

#### OperationalRates - תעריפון תפעול ✅
הגדרת תעריפי שירות ומחירונים.

#### Invoices - חשבוניות ✅ (Admin בלבד)
ניהול חשבוניות (iFrame ל-CRM קיים). יצירה, צפייה, סינון.

#### ProductCatalog - קטלוג מוצרים ✅
ניהול מוצרים ושירותים (מצברים, חלפים וכו').

#### Reminders - תזכורות ✅
ניהול תזכורות מערכת - יצירה, השלמה, מעקב.

---

### קבוצה 5: ניהול ונתונים

#### Reports - דוחות ✅
מערכת דוחות מקיפה עם **8 טאבים מתקדמים**, סינון לפי טווח תאריכים (7/30/90 ימים), ו-5 פורמטי ייצוא.

**8 טאבי דוחות:**
1. **דוח שנתי 2025** — סיכום שנתי: מגמות חודשיות, פילוח אזורי, סוגי שירות, צי פנימי מול חיצוני
2. **דוח צי רכב 2025** — השוואת צי פנימי מול ספקים חיצוניים: עלויות, אזורים, טופ-5 רכבי צי
3. **יעילות תפעולית** — זמני טיפול, עומס לפי מתפעל, מספר מתפעלים פעילים
4. **ביצועי ספקים** — טבלת ספקים עם אחוזי השלמה, זמני תגובה, דירוגים, progress bars
5. **ניתוח לקוחות** — לקוחות חוזרים, תדירות שירות, פילוח לפי סוג תקלה
6. **דוח חברות** — לקוחות ארגוניים, חברות ביטוח, SLA לפי לקוח
7. **דוח פיננסי** — הכנסות, עלויות ספקים, רווח גולמי, פיקדונות, תשלומים (admin בלבד)
8. **דוח שימוש** — פילוח לפי שעה, אזור, סוג רכב, כבישי אגרה

**ויזואליזציות:** 7+ סוגי גרפים (Line, Bar, Pie, Donut, Scatter, Grouped Bar, Horizontal Bar) עם Recharts
**כרטיסי סיכום:** 30+ כרטיסים בכל הטאבים
**ייצוא:** CSV/Excel (עם תמיכת UTF-8 לעברית), PDF (דרך print), HTML (עם אבטחת XSS), טקסט, הדפסה
**הרשאות:** 3 רמות — `financial` (admin בלבד), `performance`, `export` + audit logging
**מקורות נתונים:** 7 entities — Call, Vendor, Customer, VendorRating, VendorPayment, Deposit, CallProduct
**ביצועים:** כל טאב נטען ב-lazy loading (`React.lazy`), חישובים ב-`useMemo`

#### HistoricalDataAnalysis - ניתוח נתונים היסטוריים ✅
ניתוח מגמות וטרנדים מנתוני קריאות היסטוריים.

#### AdvancedExport - ייצוא מתקדם ✅
ייצוא נתונים בפורמטים שונים עם סינון מתקדם.

#### Customers - לקוחות ✅
CRUD מלא: רשימה, חיפוש, הוספה/עריכה, צפייה בהיסטוריית קריאות.

#### CustomerDetails - פרטי לקוח ✅
פרופיל לקוח מלא עם היסטוריית קריאות ופרטי התקשרות.

#### FeedbackManagement - ניהול משובים ✅
צפייה וניהול משובי לקוחות, דירוגים וסקרי שביעות רצון.

#### UserProfile - הפרופיל שלי ✅
פרופיל אישי של המשתמש המחובר.

---

### קבוצה 6: כלים

#### Agents - סוכנים ✅
ניהול סוכנים/טכנאים וכלי בינה מלאכותית.

---

### קבוצה 7: מערכת (Admin)

#### UserManagement - ניהול משתמשים ✅ (Admin בלבד)
CRUD מלא: רשימה, הוספה/עריכה/מחיקה, שיוך תפקיד.

#### RoleManagement - ניהול תפקידים ✅ (Admin בלבד)
הגדרת תפקידים ועריכת הרשאות.

#### AuditLog - יומן פעולות ✅ (Admin בלבד)
מעקב אחרי כל פעולות המשתמשים במערכת עם סינון.

#### AutomationSettings - אוטומציה ✅ (Admin בלבד)
הגדרת כללי אוטומציה ו-workflows.

#### IntegrationSettings - אינטגרציות CRM ✅ (Admin בלבד)
הגדרת חיבורים למערכות חיצוניות ו-webhooks.

#### NotificationSettings - הגדרות התראות ✅
הגדרת התראות מערכתיות וטריגרים.

#### AdminDisplaySettings - הגדרות תצוגה ✅ (Admin בלבד)
התאמת תצוגת המערכת.

#### Settings - הגדרות מערכת ✅ (Admin בלבד)
הגדרות כלליות: שם חברה, לוגו, קטגוריות, סטטוסים.

---

### מסכים נוספים (לא בתפריט ניווט)

| מסך | תיאור | הרשאה |
|-----|--------|-------|
| CallDetails | פרטי קריאה מלאים עם טאבים | admin, operator |
| NewCase | טופס פתיחת קריאה חדשה | admin, operator |
| NewVendor | יצירת ספק חדש | admin, operator |
| EditVendor | עריכת פרופיל ספק | admin, operator |
| VendorDetails | פרטי ספק מלאים | admin, operator |
| VendorTracking | מעקב GPS ספק | admin, operator |
| VendorCallManagement | ניהול קריאה ע"י ספק | vendor |
| MyVendorProfile | פרופיל הספק שלי | vendor |
| VendorGuide | מדריך לספקים | vendor |
| MyQueue | התור שלי | admin, operator |
| MyNotificationSettings | הגדרות התראות אישיות | כל התפקידים |
| UserGuide | מדריך למשתמש | כל התפקידים |
| CustomerFeedback | משובי לקוחות | admin, operator |
| ImportHistoricalData | ייבוא נתונים היסטוריים | admin |
| FormView | תצוגת טופס גנרית | - |

---

### טופס קריאה חדשה (NewCase) - שדות

```javascript
{
  // לקוח
  customer_name: String,           // שם לקוח
  customer_phone: String,          // טלפון (חובה, ולידציה)
  insurance_company: String,       // חברת ביטוח
  membership_package: String,      // חבילת חברות

  // רכב
  vehicle_plate: String,           // מספר רכב
  vehicle_type: String,            // סוג רכב
  vehicle_model: String,           // דגם

  // סוג שירות
  service_type: String,            // סוג שירות (גרירה/פנצ'ר/מצבר/...)
  issue_type: String,              // סוג תקלה → טוען שאלון טכני
  issue_description: String,       // תיאור התקלה
  dispatch_type: 'mobile_unit' | 'tow_truck',  // ניידת או גרר
  customer_source: 'phone' | 'bot',            // מקור הלקוח

  // מיקום
  pickup_location_address: String, // כתובת איסוף (חובה)
  pickup_location_city: String,    // עיר איסוף
  pickup_location_lat: Number,     // קו רוחב
  pickup_location_lng: Number,     // קו אורך
  dropoff_location_address: String,// כתובת יעד
  dropoff_location_city: String,   // עיר יעד
  dropoff_location_lat: Number,
  dropoff_location_lng: Number,

  // נוסף
  priority: 'low' | 'normal' | 'high' | 'urgent',
  internal_notes: String,          // הערות פנימיות
  questionnaire_answers: Object    // תשובות שאלון טכני דינמי
}
```

### פרטי קריאה (CallDetails) - טאבים

**InfoTab:**
- פרטי לקוח (שם, טלפון, ביטוח)
- פרטי רכב (לוחית, דגם, סוג)
- מיקום (איסוף, יעד, ניווט)
- ספק משובץ
- **הקלטת שיחה** - קישור להקלטה (`recording_url`) + סטטוס שיחת סגירה
- **תשובות שאלון טכני** - הצגת `questionnaire_answers`
- **חתימה דיגיטלית** - SignaturePad

**HistoryTab:** Timeline עדכונים
**ChatTab:** צ'אט עם ספק/מתפעל
**FilesTab:** העלאת קבצים ותמונות

---

## מערכת הרשאות ותפקידים

### 4 תפקידים (Roles)

| תפקיד | מזהה | תיאור |
|--------|------|--------|
| **מנהל** | `admin` | גישה מלאה לכל המערכת כולל דוחות פיננסיים והגדרות |
| **מתפעל** | `operator` | תפעול קריאות, שיבוץ, ניהול לקוחות (ללא דוחות פיננסיים) |
| **טכנאי** | `agent` | עבודה בשטח, דשבורד טכנאי, ניהול קריאות אישי |
| **ספק** | `vendor` | פורטל ספקים בלבד, קבלה/דחייה/עדכון קריאות |

### מטריצת הרשאות - מסכים

> מטריצה מלאה מבוססת על `src/config/permissions.js` — מרץ 2026

**Admin בלבד (12 דפים):**

| מסך | תיאור |
|-----|--------|
| AdminDisplaySettings | הגדרות תצוגה |
| AuditLog | יומן פעולות |
| AutomationSettings | אוטומציה |
| FleetManagement | ניהול צי רכב |
| ImportHistoricalData | ייבוא נתונים |
| IntegrationSettings | אינטגרציות |
| Invoices | חשבוניות |
| OperationalRates | תעריפון |
| RoleManagement | ניהול תפקידים |
| Settings | הגדרות מערכת |
| UserManagement | ניהול משתמשים |
| VendorPricing | הסכמי תמחור |

**Admin + Operator (27 דפים):**

| מסך | תיאור |
|-----|--------|
| AdvancedExport | ייצוא מתקדם |
| Agents | ניהול סוכנים |
| AllVendorsMap | מפת ספקים |
| Calendar | לוח שנה |
| CallDetails | פרטי קריאה |
| Calls | רשימת קריאות |
| CoverageAreas | אזורי כיסוי |
| CustomerDetails | פרטי לקוח |
| CustomerFeedback | משובי לקוחות |
| Customers | רשימת לקוחות |
| Dashboard | דשבורד |
| EditCustomer | עריכת לקוח |
| EditVendor | עריכת ספק |
| FeedbackManagement | ניהול משובים |
| HistoricalDataAnalysis | ניתוח היסטורי |
| MyQueue | התור שלי |
| NewCase | קריאה חדשה |
| NewVendor | ספק חדש |
| NotificationSettings | הגדרות התראות |
| ProductCatalog | קטלוג מוצרים |
| QueueMonitor | ניטור תורים |
| Reminders | תזכורות |
| Reports | דוחות |
| ServiceProviders | נותני שירות |
| VendorContracts | חוזי ספקים |
| VendorDetails | פרטי ספק |
| VendorTracking | מעקב ספק |

**Vendor בלבד (4 דפים):**

| מסך | תיאור |
|-----|--------|
| MyVendorProfile | פרופיל הספק שלי |
| VendorCallManagement | ניהול קריאה |
| VendorGuide | מדריך לספקים |
| VendorPortal | פורטל ספקים |

**כל התפקידים (5 דפים):**

| מסך | תיאור |
|-----|--------|
| FormView | תצוגת טופס |
| LandingPage | דף נחיתה |
| MyNotificationSettings | התראות אישיות |
| UserGuide | מדריך משתמש |
| UserProfile | פרופיל אישי |

**הערה:** דפי Agent (AgentDashboard, AgentCallManagement) עדיין לא ממומשים — ראו סעיף "פיצ'רים חסרים".

### הרשאות דוחות (REPORT_PERMISSIONS)

| דוח | Admin | Operator |
|-----|-------|----------|
| invoices_report | ✅ | ❌ |
| vendor_pricing_report | ✅ | ❌ |
| financial_summary | ✅ | ❌ |
| delays_report | ✅ | ✅ |
| ratings_report | ✅ | ✅ |
| performance_report | ✅ | ✅ |
| vendor_delays_report | ✅ | ✅ |

### מנגנון אכיפה (3 שכבות)

1. **שכבת Route (App.jsx):** כל דף עובר `getPageRoles()` → `RoleGuard` - חוסם גישה לפני רנדור
2. **שכבת Navigation (Layout.jsx):** `canAccessPage(item.href)` מסתיר פריטים מהתפריט
3. **שכבת Page (בתוך המסך):** `PermissionGuard` ו-`useCurrentUserRole` לבדיקות פנימיות

**אבטחת נתוני ספקים (Server-Side Scoping):**
- **כל נתוני הספק עוברים דרך `getVendorScopedData`** — פונקציית שרת שמחזירה רק נתונים השייכים לספק המאומת (קריאות, חוזים, דירוגים, פרופיל)
- **עדכוני קריאות דרך `updateVendorCall`** — פונקציית שרת עם אימות בעלות, allowlist שדות, וולידציית מעברי סטטוס
- **מיקום GPS דרך `updateVendorLocation`** — אימות בעלות + rate limiting (60/דק')
- **סטטוס זמינות דרך `updateVendorStatus`** — אימות בעלות + הודעה לצוות
- דוחות פיננסיים: `PermissionGuard category="reports" permission="financial"`
- Role נקבע מ-backend: `base44.auth.me()` — לא ניתן לזיוף בצד לקוח

**Rate Limiting:**
- כל 27 פונקציות שרת (מתוך 30, למעט 3 פונקציות cron) מוגנות ב-rate limiting
- מודול משותף `functions/_shared/rateLimit.ts` — sliding window על Deno KV
- דרגות: SMS 10/דק', AI 5-10/דק', ספקים 20-60/דק', webhooks 100/דק'/IP
- Google Maps: cache 4 שעות, מכסה 20,000/יום

---

## ישויות נתונים

### Customer (לקוח)
```javascript
{
  id: String,
  name: String,              // שם מלא
  phone: String,             // טלפון
  email: String,             // אימייל
  address: String,           // כתובת מלאה
  city: String,              // עיר
  notes: String,             // הערות
  status: String,            // active/inactive
  created_date: DateTime,
  updated_date: DateTime
}
```

### ServiceCall (קריאת שירות)
```javascript
{
  id: String,
  call_number: String,           // מספר קריאה ייחודי
  customer_name: String,
  customer_phone: String,
  insurance_company: String,
  membership_package: String,
  vehicle_plate: String,
  vehicle_type: String,
  vehicle_model: String,
  service_type: String,          // סוג שירות
  issue_type: String,            // סוג תקלה
  issue_description: String,
  dispatch_type: String,         // mobile_unit / tow_truck
  customer_source: String,       // phone / bot
  pickup_location_address: String,
  pickup_location_city: String,
  pickup_location_lat: Number,
  pickup_location_lng: Number,
  dropoff_location_address: String,
  dropoff_location_city: String,
  call_status: String,           // new/assigned/vendor_enroute/in_progress/completed/cancelled
  priority: String,              // low/normal/high/urgent
  assigned_vendor_id: String,
  internal_notes: String,
  vendor_notes: String,
  questionnaire_answers: Object, // תשובות שאלון טכני דינמי
  recording_url: String,         // קישור להקלטת שיחה
  closing_call_done: Boolean,    // שיחת סגירה בוצעה
  vendor_arrival_time_actual: DateTime,
  closed_at: DateTime,
  closed_by: String,
  created_date: DateTime,
  updated_date: DateTime
}
```

### Vendor (ספק/נותן שירות)
```javascript
{
  id: String,
  vendor_name: String,
  email: String,
  phone: String,
  address: String,
  service_areas: [String],
  specializations: [String],
  availability: Boolean,
  rating: Number,               // 1-5
  vendor_type: String,          // internal/external
  status: String,               // active/inactive
  current_lat: Number,          // GPS latitude
  current_lng: Number,          // GPS longitude
  image_url: String
}
```

### Fleet (צי רכב)
```javascript
{
  id: String,
  vehicle_number: String,       // מספר ספק
  vehicle_type: String,         // tow_truck / mobile_unit
  name: String,
  status: String,               // active/inactive
  area: String,                 // אזור שיוך
  assigned_vendor_id: String    // שיוך לספק
}
```

### VendorPricing (הסכמי תמחור)
```javascript
{
  id: String,
  vendor_id: String,
  service_type: String,
  area: String,
  price: Number,
  agreement_start: DateTime,
  agreement_end: DateTime,
  is_active: Boolean
}
```

### ישויות נוספות
- **CallHistory** - היסטוריית שינויים בקריאה
- **CallPhoto** - תמונות וקבצים מצורפים לקריאה
- **CallTemplate** - תבניות קריאה
- **Message** - הודעות צ'אט בתוך קריאה
- **User** - משתמשי מערכת (id, email, role, full_name)
- **Company** - פרטי חברה
- **SystemSettings** - הגדרות מערכת
- **Notification** - התראות
- **Contract** - חוזי ספקים
- **Product** - קטלוג מוצרים
- **AuditLog** - יומן פעולות

---

## פונקציות Backend

30 פונקציות TypeScript serverless בתיקיית `functions/`:

### שיבוץ וניתוב
| פונקציה | תיאור |
|---------|--------|
| autoAssignVendor | שיבוץ אוטומטי - אלגוריתם ניקוד (מרחק, זמינות, דירוג, מחיר) |
| calculateDistanceAndETA | חישוב מרחק וזמן הגעה משוער |
| handleAssignmentResponse | עיבוד קבלה/דחייה של ספק |
| recommendVendor | המלצת ספק מבוססת AI |

### ניתוח AI
| פונקציה | תיאור |
|---------|--------|
| generateCallSummary | סיכום אוטומטי של קריאה שהושלמה |
| quickCallSummary | סיכום מהיר |
| analyzeHistoricalPatterns | ניתוח מגמות היסטוריות |
| categorizeCall | קטגוריזציה אוטומטית של קריאה |
| detectSmartAlerts | זיהוי חריגות והתראות חכמות (cron) |
| predictCallTimes | חיזוי זמני טיפול |

### ניהול ספקים
| פונקציה | תיאור |
|---------|--------|
| analyzeVendorPerformance | חישוב מדדי ביצוע ספק |
| updateVendorLocation | עדכון GPS ספק (אימות בעלות + rate limiting) |
| updateVendorStatus | עדכון סטטוס זמינות (אימות בעלות + הודעות) |
| getVendorScopedData | שליפת נתונים מאובטחת בהיקף ספק (server-side scoping) |
| updateVendorCall | עדכון קריאה ע"י ספק (allowlist שדות + אימות בעלות) |

### התראות ותקשורת
| פונקציה | תיאור |
|---------|--------|
| sendNotification | שליחת התראה in-app |
| createNotification | יצירת רשומת התראה |
| checkAndSendNotifications | בדיקה ושליחת התראות תקופתית |
| sendSMS | שליחת SMS דרך Twilio |
| sendFeedbackSMS | שליחת סקר שביעות רצון ב-SMS |
| sendCallStatusUpdate | שליחת עדכון סטטוס ללקוח |

### משובים
| פונקציה | תיאור |
|---------|--------|
| createFeedbackToken | יצירת טוקן מאובטח לסקר |
| getFeedbackTokenInfo | שליפת מידע טוקן |
| validateAndSubmitFeedback | ולידציה ושמירת משוב |

### אינטגרציות
| פונקציה | תיאור |
|---------|--------|
| 99digitalBot | אינטגרציה עם בוט WhatsApp של 99Digital (webhook auth) |
| externalCrmWebhook | Webhook ל-CRM חיצוני (webhook auth + fail-closed) |

### כלים
| פונקציה | תיאור |
|---------|--------|
| logAuditAction | תיעוד פעולות ביומן |
| checkContractExpiry | מעקב וזיהוי חוזים שפגו (cron) |
| inviteTestUsers | הזמנת משתמשי בדיקה |
| seedDemoData | טעינת נתוני דמו (admin בלבד, rate limit 2/דק') |

---

## אינטגרציות

### 1. Base44 Platform ✅
Backend מלא: CRUD, Authentication, File Upload, Real-time Subscriptions.

### 2. Leaflet + OpenStreetMap ✅
מפות: מיקומי ספקים, מעקב GPS, ניתוב, אזורי כיסוי.

### 3. Twilio SMS ✅
שליחת SMS: עדכוני סטטוס, סקרי שביעות רצון.

### 4. 99Digital Bot ✅
בוט WhatsApp לקליטת קריאות: שם לקוח, טלפון, כתובת, פרטי רכב, שאלון בטיחות.

### 5. iFrame CRM ✅
חשבוניות מנוהלות ב-CRM קיים. המערכת מציגה iFrame.

### 6. PWA ✅
Progressive Web App: התקנה, עבודה offline, Push Notifications, Service Worker.

### 7. Real-time Updates ✅
Polling-based updates: עדכוני סטטוס בזמן אמת, סנכרון בין משתמשים.

---

## הבהרות אפיון (פברואר 2026)

סעיף זה מתעד הבהרות שהתקבלו מהלקוח (נתי גרופ) במהלך שלב האפיון.

### 1. צי רכב ✅ מומש
**הגדרה:** רשימת גררים וניידות פנימיים של חברת נתי.
**סטטוס:** מסך FleetManagement מומש. ישות Fleet קיימת. עדיפות שיבוץ לספקים פנימיים.

### 2. ניידת ✅ מומש
**הגדרה:** כלי רכב שירות לשירותי דרך (מצבר, טעינה).
**סטטוס:** שדה `dispatch_type` (mobile_unit/tow_truck) בטופס NewCase עם המלצה אוטומטית לפי סוג תקלה.

### 3. התראות ללקוחות ✅ מומש חלקית
**ערוץ ראשי:** WhatsApp (דרך בוט 99Digital).
**סטטוס:** SMS דרך Twilio קיים. WhatsApp API - דרך הבוט. שדה `customer_source` (phone/bot) מבדיל תהליך סגירה.

### 4. חשבוניות ✅ מומש
**ארכיטקטורה:** iFrame ל-CRM קיים (לא מערכת עצמאית).
**סטטוס:** מסך Invoices מומש.

### 5. תפקידים והרשאות ✅ מומש
**עדכון:** 4 תפקידים (admin, operator, agent, vendor) עם מטריצת הרשאות מלאה.
**סטטוס:** PAGE_PERMISSIONS, REPORT_PERMISSIONS, RoleGuard, PermissionGuard - הכל מומש.

### 6. התראות בזמן אמת ✅ מומש חלקית
**סטטוס:** SmartAlertsTab בדשבורד, detectSmartAlerts function. ממתינים להגדרות ספים מפורטות מאילנית.

### 7. תמחור ספק ✅ מומש
**סטטוס:** מסך VendorPricing מומש. ישות VendorPricing קיימת.

### 8. דוחות ✅ מומש
**סטטוס:** 8 טאבי דוחות מלאים (שנתי, צי רכב, יעילות, ספקים, לקוחות, חברות, פיננסי, שימוש). 5 פורמטי ייצוא (CSV, PDF, HTML, Text, Print). 30+ כרטיסי סיכום, 7+ סוגי גרפים, lazy loading, 3 רמות הרשאות.

### 9. שיחות סגירה ✅ מומש
**סטטוס:** שדה `recording_url` + `closing_call_done` בקריאה. הצגת הקלטה ב-CallDetailsInfoTab.

### 10. שאלון טכני דינמי ✅ מומש
**סטטוס:** TechnicalQuestionnaire component ב-NewCase. שדה `questionnaire_answers` נשמר בקריאה ומוצג ב-CallDetailsInfoTab.

### 11. קריאות במעקב ✅ מומש
**סטטוס:** TrackedCallsPanel מומש בדשבורד (lazy loaded). מוצג מעל המפה.

---

## סטטוס פיתוח

### סיכום כללי

| קטגוריה | מומש | חלקי | חסר |
|---------|------|------|-----|
| מסכים | 47 | 0 | 2 (Agent) |
| פונקציות Backend | 30 | 0 | 0 |
| Feature Modules | 8 | 0 | 0 |
| אינטגרציות | 7 | 0 | 1 |
| UI/UX + RTL | ✅ | - | - |
| Responsive | ✅ | - | - |
| Authentication | ✅ | - | - |
| Authorization (4 roles) | ✅ | - | - |
| PWA | ✅ | - | - |
| Code Splitting | ✅ | - | - |

### הבהרות אפיון - סטטוס

| # | הבהרה | סטטוס |
|---|-------|-------|
| 1 | צי רכב | ✅ מומש |
| 2 | ניידת | ✅ מומש |
| 3 | התראות ללקוחות | ⚠️ חלקי (SMS קיים, WhatsApp דרך בוט) |
| 4 | חשבוניות | ✅ מומש (iFrame) |
| 5 | תפקידים והרשאות | ✅ מומש |
| 6 | התראות בזמן אמת | ⚠️ חלקי (בסיסי קיים, ממתין לספים) |
| 7 | תמחור ספק | ✅ מומש |
| 8 | דוחות | ✅ מומש (8 טאבים, 5 פורמטי ייצוא, 7+ גרפים) |
| 9 | שיחות סגירה | ✅ מומש |
| 10 | שאלון טכני | ✅ מומש |
| 11 | קריאות במעקב | ✅ מומש |

---

## פיצ'רים שעדיין חסרים

### עדיפות גבוהה 🔴

1. **WhatsApp Business API ישיר** — כיום עובד דרך בוט 99Digital. נדרשת אינטגרציה ישירה לשליחת הודעות ללקוחות.

2. **דפי Agent** — `AgentDashboard` ו-`AgentCallManagement` אינם מוגדרים בהרשאות ואינם ממומשים כדפים. דרושים לטכנאים שטח.

3. **ספק לא יכול להעביר קריאה** — אם הספק לא מצליח לטפל בקריאה שכבר קיבל, אין מנגנון להחזיר/להעביר לספק אחר.

### עדיפות בינונית 🟡

4. **זיהוי חפיפת קריאות** — ספק יכול לקבל 2 קריאות באותו זמן. אין בדיקה אם כבר יש קריאה פעילה.

5. **סטטוס "לא ניתן לטיפול"** — חסר סטטוס ביניים כשספק הגיע אבל לא יכול לטפל.

6. **תזמון חכם** — Calendar קיים אבל חסר: התנגשויות תזמון, תזמון אוטומטי לפי עומס.

7. **ספים וטריגרים להתראות** — ממתינים להגדרות: כמה זמן לפני שמתריעים על איחור, SLA חורג. ווידג'ט חיזוי AI קיים אך אין אסקלציה אוטומטית.

8. **דוחות — שיפורים עתידיים** — גרף התפלגות זמני טיפול (placeholder), custom date range (כרגע 7/30/90 בלבד), תזמון דוחות אוטומטי.

### עדיפות נמוכה 🟢

9. **ERP Integration** — סנכרון עם מערכות ארגוניות.
10. **BI ואנליטיקס** — חיבור ל-Power BI, דשבורד מותאם אישית.

### מה תוקן מהגרסה הקודמת ✅

| פיצ'ר | סטטוס |
|--------|--------|
| סטטוס "הפסקה" לספק | ✅ מומש — `on_break` + `VendorAvailabilityToggle` |
| SMS Twilio | ✅ מומש — אינטגרציה מלאה עם Twilio, פועל כשמוגדרים credentials |
| ETA מדויק | ✅ שופר — OSRM routing + Google Maps Directions API עם fallback |
| מניעת שיבוץ כפול | ✅ מומש — בדיקות סטטוס + race condition guard |
| סיבות דחייה לספק | ✅ מומש — 6 סיבות מוגדרות |
| חישוב תשלום לספק | ✅ מומש — מוצג לפני קבלת קריאה |
| היסטוריית קריאות לספק | ✅ מומש — 3 טאבים (הכל/פעילות/הושלמו) |
| ספק רואה דירוג | ✅ מומש — VendorStats + MyVendorProfile |
| ETA ודירוג בדשבורד | ✅ מומש — מחושב מנתונים אמיתיים |
| דוחות מפורטים | ✅ מומש — 8 טאבים (שנתי, צי, יעילות, ספקים, לקוחות, חברות, פיננסי, שימוש), 5 פורמטי ייצוא, 30+ כרטיסים |

---

## נספח: Performance Optimization

### Bundle Splitting (Code Splitting)

המערכת משתמשת ב-Rollup `manualChunks` לפיצול ה-bundle:

| Chunk | גודל | תוכן |
|-------|------|-------|
| vendor-react | 164KB | React, React DOM, React Router |
| vendor-radix | 148KB | כל רכיבי Radix UI |
| vendor-maps | 155KB | Leaflet, React-Leaflet |
| vendor-motion | 114KB | Framer Motion |
| vendor-charts | 431KB | Recharts |
| vendor-pdf | 562KB | jspdf, html2canvas |
| vendor-icons | 57KB | Lucide React |
| vendor-query | 40KB | React Query |
| vendor-date | 27KB | date-fns |
| index (app) | 797KB | קוד האפליקציה |

**Lazy Loading:** 15+ קומפוננטות טעונות דינמית (TrackedCallsPanel, TechnicalQuestionnaire, AI widgets, דוחות ועוד).

---

**סוף מסמך**

*מסמך זה מתאר את מצב המערכת נכון למרץ 2026. גרסה 2.1 — עדכון מטריצת הרשאות מלאה (48 דפים), מודל אבטחת ספקים server-side, rate limiting, ו-30 פונקציות backend.*
