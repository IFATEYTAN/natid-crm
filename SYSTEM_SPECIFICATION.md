# מסמך אפיון מערכת - NatID CRM
## מערכת ניהול קריאות שירות ונותני שירות

**תאריך עדכון אחרון:** פברואר 2026
**גרסה:** 2.0

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
├── components/             # רכיבי UI (26 קטגוריות)
│   ├── ui/                 # רכיבים בסיסיים (85+)
│   ├── ai/                 # רכיבי בינה מלאכותית
│   ├── auth/               # הרשאות ו-RoleGuard
│   ├── call-details/       # טאבים של פרטי קריאה
│   ├── calls/              # רכיבי קריאות (שאלון טכני)
│   ├── chat/               # צ'אט בתוך קריאות
│   ├── contracts/          # חוזי ספקים
│   ├── dashboard/          # ווידג'טים של דשבורד
│   ├── feedback/           # משובים ודירוגים
│   ├── files/              # העלאת קבצים
│   ├── layout/             # Layout ראשי וניווט
│   ├── maps/               # מפות Leaflet
│   ├── notifications/      # התראות ו-Push
│   ├── permissions/        # PermissionsContext
│   ├── pwa/                # PWA (Install, Offline, Update)
│   ├── reports/            # גרפי דוחות
│   ├── signature/          # חתימה דיגיטלית
│   └── vendor/             # רכיבי ספקים
├── config/                 # הגדרות הרשאות
│   └── permissions.js      # PAGE_PERMISSIONS, REPORT_PERMISSIONS
├── features/               # 10 מודולים עם hooks
│   ├── agents/             # ניהול סוכנים (useUsers)
│   ├── calls/              # קריאות (useCalls)
│   ├── cases/              # תיקים (useCases)
│   ├── customers/          # לקוחות (useCustomers)
│   ├── dashboard/          # דשבורד
│   ├── operators/          # מתפעלים
│   ├── queue/              # תורים (useQueue)
│   ├── reports/            # דוחות (useReports)
│   ├── settings/           # הגדרות (useSettings)
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

#### VendorPricing - הסכמי תמחור ✅ (Admin בלבד)
ניהול הסכמי מחיר של ספקים: ספק, סוג שירות, אזור, מחיר, תוקף הסכם. משמש לבחירת הספק הזול ביותר.

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
מערכת דוחות מתקדמת עם:
- **דוחות תפעוליים:** ביצועי ספקים, איחורים, דירוגים (admin + operator)
- **דוחות פיננסיים:** חשבוניות, תמחור, סיכום פיננסי (admin בלבד)
- סינון, ייצוא Excel/PDF, גרפים
- הרשאות: `canAccessReport()` מפריד בין דוחות תפעוליים לפיננסיים

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

| מסך | Admin | Operator | Agent | Vendor |
|-----|-------|----------|-------|--------|
| Dashboard | ✅ | ✅ | ❌ | ❌ |
| Calls | ✅ | ✅ | ❌ | ❌ |
| CallDetails | ✅ | ✅ | ❌ | ❌ |
| NewCase | ✅ | ✅ | ❌ | ❌ |
| Calendar | ✅ | ✅ | ❌ | ❌ |
| QueueMonitor | ✅ | ✅ | ❌ | ❌ |
| MyQueue | ✅ | ✅ | ❌ | ❌ |
| Customers | ✅ | ✅ | ❌ | ❌ |
| ServiceProviders | ✅ | ✅ | ❌ | ❌ |
| Reports | ✅ | ✅ | ❌ | ❌ |
| AllVendorsMap | ✅ | ✅ | ❌ | ❌ |
| CoverageAreas | ✅ | ✅ | ❌ | ❌ |
| VendorContracts | ✅ | ✅ | ❌ | ❌ |
| VendorTracking | ✅ | ✅ | ❌ | ❌ |
| Agents | ✅ | ✅ | ❌ | ❌ |
| AdvancedExport | ✅ | ✅ | ❌ | ❌ |
| HistoricalDataAnalysis | ✅ | ✅ | ❌ | ❌ |
| NotificationSettings | ✅ | ✅ | ❌ | ❌ |
| CustomerFeedback | ✅ | ✅ | ❌ | ❌ |
| **VendorPricing** | ✅ | ❌ | ❌ | ❌ |
| **FleetManagement** | ✅ | ❌ | ❌ | ❌ |
| **Invoices** | ✅ | ❌ | ❌ | ❌ |
| **UserManagement** | ✅ | ❌ | ❌ | ❌ |
| **RoleManagement** | ✅ | ❌ | ❌ | ❌ |
| **AuditLog** | ✅ | ❌ | ❌ | ❌ |
| **AutomationSettings** | ✅ | ❌ | ❌ | ❌ |
| **IntegrationSettings** | ✅ | ❌ | ❌ | ❌ |
| **Settings** | ✅ | ❌ | ❌ | ❌ |
| **ImportHistoricalData** | ✅ | ❌ | ❌ | ❌ |
| VendorPortal | ❌ | ❌ | ❌ | ✅ |
| VendorCallManagement | ❌ | ❌ | ❌ | ✅ |
| MyVendorProfile | ❌ | ❌ | ❌ | ✅ |
| VendorGuide | ❌ | ❌ | ❌ | ✅ |
| AgentDashboard | ❌ | ❌ | ✅ | ❌ |
| AgentCallManagement | ❌ | ❌ | ✅ | ❌ |
| MyNotificationSettings | ✅ | ✅ | ✅ | ✅ |
| UserGuide | ✅ | ✅ | ✅ | ✅ |

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

**אבטחה נוספת:**
- VendorCallManagement מוודא בעלות: `call.assigned_vendor_id === vendorProfile.id`
- VendorPortal מסנן: `Call.filter({ assigned_vendor_id: vendorProfile.id })`
- דוחות פיננסיים: `PermissionGuard category="reports" permission="financial"`
- Role נקבע מ-backend: `base44.auth.me()` - לא ניתן לזיוף בצד לקוח

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
| analyzeCallPatterns | ניתוח דפוסי קריאות |
| analyzeHistoricalPatterns | ניתוח מגמות היסטוריות |
| categorizeCall | קטגוריזציה אוטומטית של קריאה |
| detectSmartAlerts | זיהוי חריגות והתראות חכמות |
| predictCallTimes | חיזוי זמני טיפול |

### ניהול ספקים
| פונקציה | תיאור |
|---------|--------|
| analyzeVendorPerformance | חישוב מדדי ביצוע ספק |
| updateVendorLocation | עדכון GPS ספק |
| updateVendorStatus | עדכון סטטוס זמינות |
| getVendorScopedData | שליפת נתונים בהיקף ספק |
| submitVendorRating | שמירת דירוג ספק |

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
| 99digitalBot | אינטגרציה עם בוט WhatsApp של 99Digital |
| botWebhook | Webhook לקבלת נתונים מהבוט |
| externalCrmWebhook | Webhook ל-CRM חיצוני |

### כלים
| פונקציה | תיאור |
|---------|--------|
| logAuditAction | תיעוד פעולות ביומן |
| checkContractExpiry | מעקב וזיהוי חוזים שפגו |

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

### 8. דוחות ✅ מומש חלקית
**סטטוס:** 7 סוגי דוחות מוגדרים. ייצוא Excel/PDF. ממתינים לאפיון מפורט מדורית ואילנית.

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
| מסכים | 47 | 0 | 0 |
| פונקציות Backend | 30 | 0 | 0 |
| Feature Modules | 10 | 0 | 0 |
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
| 8 | דוחות | ⚠️ חלקי (תשתית קיימת, ממתין לאפיון) |
| 9 | שיחות סגירה | ✅ מומש |
| 10 | שאלון טכני | ✅ מומש |
| 11 | קריאות במעקב | ✅ מומש |

---

## פיצ'רים שעדיין חסרים

### עדיפות גבוהה 🔴

1. **WhatsApp Business API ישיר** - כיום עובד דרך בוט 99Digital. נדרשת אינטגרציה ישירה לשליחת הודעות ללקוחות.

2. **ספים וטריגרים מפורטים להתראות** - ממתינים להגדרות מאילנית: כמה זמן לפני שמתריעים על איחור, SLA חורג, וכו'.

3. **דוחות מפורטים** - ממתינים לאפיון מדורית ואילנית: דוח איחורים, דוח דירוגים, דוח ביצועים, דוח חשבוניות מאושרות.

4. **דפי Agent** - `AgentDashboard` ו-`AgentCallManagement` מוגדרים בהרשאות אבל עדיין לא ממומשים כדפים.

### עדיפות בינונית 🟡

5. **אפליקציית מובייל מותאמת** - PWA קיים אבל חוויית מובייל ייעודית יכולה להשתפר.

6. **תזמון חכם** - Calendar קיים אבל חסר: התנגשויות תזמון, תזמון אוטומטי לפי עומס.

7. **סטטוס "הפסקה" לספק** - ספק לא יכול לסמן שהוא בהפסקה (רק זמין/לא זמין).

### עדיפות נמוכה 🟢

8. **ERP Integration** - סנכרון עם מערכות ארגוניות.
9. **BI ואנליטיקס** - חיבור ל-Power BI, דשבורד מותאם אישית.

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

*מסמך זה מתאר את מצב המערכת נכון לפברואר 2026. גרסה 2.0 - עדכון מלא של כל 47 המסכים, 4 תפקידים, 30 פונקציות backend.*
