<div align="center">

# NatID CRM

### מערכת ניהול קריאות שירות ונותני שירות

[![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.1-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![PWA](https://img.shields.io/badge/PWA-Enabled-5A0FC8?logo=pwa&logoColor=white)](#pwa)
[![RTL](https://img.shields.io/badge/RTL-Hebrew-blue)](#)

**מערכת CRM מלאה לניהול קריאות שירות, ספקים, צי רכב ולקוחות**
**מותאמת לעברית (RTL) עם בינה מלאכותית, מפות GPS ו-PWA**

[התקנה מהירה](#-התקנה-מהירה) · [ארכיטקטורה](#-ארכיטקטורה) · [מודולים](#-מודולים-ומסכים) · [API](#-פונקציות-backend) · [תיעוד](#-תיעוד)

</div>

---

## תוכן עניינים

- [סקירה כללית](#-סקירה-כללית)
- [התקנה מהירה](#-התקנה-מהירה)
- [טכנולוגיות](#-טכנולוגיות)
- [ארכיטקטורה](#-ארכיטקטורה)
- [מודולים ומסכים](#-מודולים-ומסכים)
- [תפקידים והרשאות](#-תפקידים-והרשאות)
- [תהליכים עסקיים](#-תהליכים-עסקיים)
- [פונקציות Backend](#-פונקציות-backend)
- [אינטגרציות](#-אינטגרציות)
- [פקודות פיתוח](#-פקודות-פיתוח)
- [מבנה הפרויקט](#-מבנה-הפרויקט)
- [Code Quality](#-code-quality)
- [ביצועים ואופטימיזציה](#-ביצועים-ואופטימיזציה)
- [PWA](#-pwa)
- [תיעוד](#-תיעוד)

---

## 📋 סקירה כללית

**NatID CRM** היא מערכת לניהול קריאות שירות (Service Calls) המיועדת לחברות המספקות שירותי תחזוקה, תיקון והתקנה. המערכת בנויה על פלטפורמת Base44 ומאפשרת ניהול מלא של:

| יכולת | תיאור |
|--------|--------|
| **קריאות שירות** | פתיחה, שיבוץ, מעקב וסגירה — מ-7 סטטוסים שונים |
| **נותני שירות** | ניהול ספקים פנימיים וחיצוניים עם דירוג וביצועים |
| **לקוחות** | CRUD מלא, היסטוריית קריאות, SLA אוטומטי |
| **צי רכב** | ניהול גררים וניידות פנימיים |
| **שיבוץ חכם** | אלגוריתם ניקוד אוטומטי (מרחק, זמינות, דירוג, מחיר) |
| **מפות GPS** | מעקב ספקים בזמן אמת, חישוב ETA, אזורי כיסוי |
| **בינה מלאכותית** | סיכום קריאות, ניתוח דפוסים, המלצות ספקים, חיזוי זמנים |
| **דוחות** | תפעוליים ופיננסיים עם ייצוא Excel/PDF |
| **התראות** | In-App, SMS (Twilio), Push, WhatsApp (בוט 99Digital) |
| **צ'אט** | תקשורת בזמן אמת בתוך קריאות |
| **חשבוניות** | iFrame ל-CRM קיים |
| **משובים** | סקרי שביעות רצון עם 4 מדדי דירוג |

---

## 🚀 התקנה מהירה

### דרישות מקדימות

- **Node.js** 18+
- **Git**

### התקנה אוטומטית

```bash
git clone <repo-url>
cd natid-crm
bash scripts/quick-start.sh
```

הסקריפט מבצע אוטומטית: התקנת תלויות, יצירת `.env.local`, הגדרת Git hooks, ובדיקת lint + build.

### התקנה ידנית

```bash
# 1. התקנת תלויות
npm install

# 2. הגדרת משתני סביבה
cp .env.example .env.local
# עריכת .env.local עם הערכים הנכונים:
#   VITE_BASE44_APP_ID=your_app_id
#   VITE_BASE44_APP_BASE_URL=your_backend_url

# 3. הפעלת שרת פיתוח
npm run dev
```

השרת יעלה בכתובת `http://localhost:5173`.

---

## 🛠 טכנולוגיות

### Frontend

| טכנולוגיה | שימוש | גרסה |
|-----------|--------|-------|
| **React** | Framework ראשי | 18.2 |
| **Vite** | Build tool | 6.1 |
| **Tailwind CSS** | Styling (RTL-first) | 3.4 |
| **Radix UI** (shadcn/ui) | ספריית UI components | Latest |
| **React Router DOM** | ניתוב | 6.26 |
| **React Query** (TanStack) | ניהול state שרת | 5.84 |
| **Recharts** | גרפים ותרשימים | 2.15 |
| **Framer Motion** | אנימציות | 11.16 |
| **Lucide React** | אייקונים | 0.475 |
| **React Hook Form** + **Zod** | טפסים וולידציה | 7.54 / 3.24 |
| **Leaflet** + **React-Leaflet** | מפות GPS | 4.2 |
| **date-fns** | ניהול תאריכים | 3.6 |
| **Sonner** | Toast notifications | 2.0 |
| **jsPDF** + **html2canvas** | ייצוא PDF | 2.5 |

### Backend

| טכנולוגיה | שימוש |
|-----------|--------|
| **Base44 Platform** (`@base44/sdk`) | Backend-as-a-Service: CRUD, Auth, Files, Real-time |
| **TypeScript Serverless Functions** | 32 פונקציות backend |
| **Twilio** | שליחת SMS |
| **99Digital Bot** | אינטגרציית WhatsApp |

### כלי פיתוח

| כלי | שימוש |
|-----|--------|
| **ESLint** 9 | לינטינג קוד |
| **Prettier** 3.8 | פורמט קוד |
| **Husky** + **lint-staged** | Pre-commit hooks |
| **TypeScript** 5.8 | Type checking |
| **Vitest** | Unit testing |
| **Storybook** 8.6 | ספריית קומפוננטות |

---

## 🏗 ארכיטקטורה

### תרשים שכבות

```
┌─────────────────────────────────────────────────┐
│                   Pages (47)                     │
│           דפי אפליקציה + ניתוב                  │
├─────────────────────────────────────────────────┤
│              Features (10 Modules)               │
│        מודולים עצמאיים + Custom Hooks            │
├──────────────────┬──────────────────────────────┤
│   Components     │       Services               │
│  (24 categories, │    Business Logic,            │
│   85+ UI comps)  │    Distance Calc              │
├──────────────────┴──────────────────────────────┤
│              Providers & Context                 │
│      Auth, Permissions, Theme, Query             │
├─────────────────────────────────────────────────┤
│            API Layer (@base44/sdk)               │
│         CRUD, Auth, Files, Subscriptions         │
├─────────────────────────────────────────────────┤
│        Backend Functions (32 Serverless)          │
│    AI, Assignment, Notifications, Webhooks        │
└─────────────────────────────────────────────────┘
```

### דפוסי ארכיטקטורה עיקריים

- **Feature-based modules** — כל פיצ'ר (`calls`, `vendors`, `customers`...) כולל hooks ולוגיקה עצמאית
- **React Query** — כל state שרת מנוהל דרך React Query עם `queryKeys` מרכזי
- **RoleGuard** — 3 שכבות אבטחה: Route → Navigation → Page
- **RTL-first** — מערכת עיצוב מלאה ב-RTL עם Design System tokens
- **Code Splitting** — Lazy loading ל-15+ קומפוננטות + manual chunks
- **Path aliases** — `@/` prefix (מוגדר ב-`jsconfig.json`)

---

## 📱 מודולים ומסכים

המערכת כוללת **47 מסכים** מסודרים ב-7 קבוצות:

### תפעול יומי

| מסך | תיאור | הרשאות |
|-----|--------|--------|
| **Dashboard** | לוח בקרה ראשי — סטטיסטיקות, מפת GPS, ווידג'טים AI, גרפים | Admin, Operator |
| **Calls** | טבלת קריאות שירות עם חיפוש, סינון, מיון ו-pagination | Admin, Operator |
| **CallDetails** | פרטי קריאה מלאים: Info, History, Chat, Files tabs | Admin, Operator |
| **NewCase** | טופס פתיחת קריאה עם שאלון טכני דינמי | Admin, Operator |
| **Calendar** | לוח שנה חודשי/שבועי של קריאות | Admin, Operator |
| **QueueMonitor** | ניטור תור עבודה ושיבוצים בזמן אמת | Admin, Operator |
| **MyQueue** | התור האישי של המתפעל | Admin, Operator |

### ניהול ספקים

| מסך | תיאור | הרשאות |
|-----|--------|--------|
| **ServiceProviders** | רשימת ספקים (Grid/Table), חיפוש וסינון | Admin, Operator |
| **VendorPricing** | הסכמי תמחור ספקים | Admin |
| **VendorContracts** | חוזי ספקים — יצירה, עריכה, מעקב | Admin, Operator |
| **AllVendorsMap** | מפת ספקים אינטראקטיבית עם GPS חי | Admin, Operator |
| **CoverageAreas** | אזורי כיסוי גיאוגרפיים | Admin, Operator |
| **VendorPortal** | פורטל ספקים — קבלה/דחייה/עדכון קריאות | Vendor |
| **VendorDetails** | פרופיל ספק מלא | Admin, Operator |
| **VendorTracking** | מעקב GPS ספק | Admin, Operator |

### צי רכב

| מסך | תיאור | הרשאות |
|-----|--------|--------|
| **FleetManagement** | ניהול גררים וניידות פנימיים | Admin |

### כלכלה ותשלומים

| מסך | תיאור | הרשאות |
|-----|--------|--------|
| **OperationalRates** | תעריפון תפעול | Admin, Operator |
| **Invoices** | חשבוניות (iFrame ל-CRM קיים) | Admin |
| **ProductCatalog** | קטלוג מוצרים ושירותים | Admin, Operator |
| **Reminders** | ניהול תזכורות | Admin, Operator |

### ניהול ונתונים

| מסך | תיאור | הרשאות |
|-----|--------|--------|
| **Reports** | דוחות תפעוליים ופיננסיים עם ייצוא | Admin, Operator |
| **HistoricalDataAnalysis** | ניתוח מגמות היסטוריות | Admin, Operator |
| **AdvancedExport** | ייצוא נתונים מתקדם | Admin, Operator |
| **Customers** | ניהול לקוחות — CRUD מלא | Admin, Operator |
| **CustomerDetails** | פרופיל לקוח עם היסטוריית קריאות | Admin, Operator |
| **FeedbackManagement** | ניהול משובים ודירוגים | Admin, Operator |

### מערכת (Admin בלבד)

| מסך | תיאור |
|-----|--------|
| **UserManagement** | ניהול משתמשים — CRUD מלא |
| **RoleManagement** | הגדרת תפקידים והרשאות |
| **AuditLog** | יומן פעולות מערכת |
| **AutomationSettings** | כללי אוטומציה ו-workflows |
| **IntegrationSettings** | חיבורים למערכות חיצוניות |
| **NotificationSettings** | הגדרות התראות וטריגרים |
| **AdminDisplaySettings** | התאמת תצוגה |
| **Settings** | הגדרות כלליות (שם חברה, לוגו, קטגוריות) |
| **ImportHistoricalData** | ייבוא נתונים היסטוריים |

### פורטל ספקים (Vendor בלבד)

| מסך | תיאור |
|-----|--------|
| **VendorCallManagement** | ניהול קריאה בשטח |
| **MyVendorProfile** | פרופיל הספק שלי |
| **VendorGuide** | מדריך לספקים |

### כלליים (כל המשתמשים)

| מסך | תיאור |
|-----|--------|
| **UserProfile** | הפרופיל שלי |
| **UserGuide** | מדריך למשתמש |
| **MyNotificationSettings** | הגדרות התראות אישיות |
| **LandingPage** | דף נחיתה ציבורי |

---

## 🔐 תפקידים והרשאות

### 4 תפקידים

| תפקיד | מזהה | תיאור |
|--------|------|--------|
| **מנהל** | `admin` | גישה מלאה — כולל דוחות פיננסיים, הגדרות ומשתמשים |
| **מתפעל** | `operator` | תפעול קריאות, שיבוץ ספקים, ניהול לקוחות |
| **טכנאי** | `agent` | דשבורד טכנאי, ניהול קריאות אישי |
| **ספק** | `vendor` | פורטל ספקים — קבלה/דחייה/עדכון קריאות |

### 3 שכבות אבטחה

```
1. Route (App.jsx)       → getPageRoles() → RoleGuard — חוסם גישה לפני רנדור
2. Navigation (Layout)   → canAccessPage() — מסתיר פריטים מהתפריט
3. Page (In-Component)   → PermissionGuard + useCurrentUserRole — בדיקות פנימיות
```

**אבטחה נוספת:**
- ספק רואה רק קריאות שלו (`assigned_vendor_id` filtering)
- דוחות פיננסיים מוגנים ב-`PermissionGuard category="reports" permission="financial"`
- Role נקבע מ-backend (`base44.auth.me()`) — לא ניתן לזיוף בצד לקוח

---

## 🔄 תהליכים עסקיים

### מחזור חיי קריאת שירות

```
  new → waiting_treatment → awaiting_assignment → assigning → vendor_enroute → in_progress → completed
   │                                                                                            │
   └────────────────────────── cancelled (מכל שלב) ──────────────────────────────────────────────┘
```

כל שינוי סטטוס יוצר רשומת `CallHistory` אוטומטית.

### שיבוץ אוטומטי — אלגוריתם ניקוד

הספק הזמין מקבל ניקוד עד ~105 נקודות:

| פרמטר | ניקוד מקסימלי |
|--------|--------------|
| מרחק גיאוגרפי | 40 נק' |
| התאמת סוג שירות | 20 נק' |
| דירוג ממוצע | 20 נק' |
| מהירות תגובה | 10 נק' |
| אחוז השלמה | 10 נק' |
| בונוס/קנס (תמיכת רכב, עומס) | ±5 נק' |

**זמן הגעה משוער (ETA):** `(מרחק_ק"מ × 2) + 10 דקות buffer`

### תגובת ספק לשיבוץ

- **Countdown UI:** 120 שניות לספק לקבל/לדחות
- **Backend timeout:** 5 דקות
- דחייה/timeout → שיבוץ מחדש (Vendor excluded)
- אין ספקים זמינים → חזרה ל-`awaiting_assignment`

### פעולות שטח (Vendor)

```
התחלת משמרת (GPS ON)
    → קבלת קריאה + התראה
    → בדרך (עדכון GPS כל 30 שניות)
    → הגעה → טיפול (תמונות, הערות, צ'אט)
    → סגירה (חתימה דיגיטלית חובה)
    → סיכום AI אוטומטי
```

### ערוצי התראות

| ערוץ | סטטוס | טריגרים |
|------|--------|---------|
| **In-App** | פעיל | שינוי סטטוס, שיבוץ, הודעות |
| **SMS** (Twilio) | פעיל | עדכוני סטטוס, סקרי שביעות רצון |
| **Push** (PWA) | פעיל | התראות בזמן אמת |
| **WhatsApp** (99Digital Bot) | פעיל | קליטת קריאות מבוט |

**טריגרים אוטומטיים:**
- קריאה לא משובצת — התראה אחרי 10 דקות
- SLA — אזהרה 15 דקות לפני חריגה

---

## ⚡ פונקציות Backend

32 פונקציות TypeScript serverless בתיקיית `functions/`:

### שיבוץ וניתוב

| פונקציה | תיאור |
|---------|--------|
| `autoAssignVendor` | שיבוץ אוטומטי — אלגוריתם ניקוד |
| `calculateDistanceAndETA` | חישוב מרחק וזמן הגעה |
| `handleAssignmentResponse` | עיבוד קבלה/דחייה של ספק |
| `recommendVendor` | המלצת ספק מבוססת AI |

### בינה מלאכותית

| פונקציה | תיאור |
|---------|--------|
| `generateCallSummary` | סיכום אוטומטי של קריאה שהושלמה |
| `quickCallSummary` | סיכום מהיר |
| `analyzeCallPatterns` | ניתוח דפוסי קריאות |
| `analyzeHistoricalPatterns` | ניתוח מגמות היסטוריות |
| `categorizeCall` | קטגוריזציה אוטומטית |
| `detectSmartAlerts` | זיהוי חריגות והתראות חכמות |
| `predictCallTimes` | חיזוי זמני טיפול |

### ניהול ספקים

| פונקציה | תיאור |
|---------|--------|
| `analyzeVendorPerformance` | חישוב מדדי ביצוע |
| `updateVendorLocation` | עדכון GPS + ETA |
| `updateVendorStatus` | עדכון זמינות |
| `getVendorScopedData` | שליפת נתונים בהיקף ספק |
| `submitVendorRating` | דירוג ספק + חישוב ממוצע |

### התראות ותקשורת

| פונקציה | תיאור |
|---------|--------|
| `sendNotification` | שליחת התראה multi-channel |
| `createNotification` | יצירת רשומת התראה |
| `checkAndSendNotifications` | בדיקת SLA ושליחת התראות |
| `sendSMS` | שליחת SMS דרך Twilio |
| `sendFeedbackSMS` | שליחת סקר שביעות רצון |
| `sendCallStatusUpdate` | עדכון סטטוס ללקוח |

### משובים

| פונקציה | תיאור |
|---------|--------|
| `createFeedbackToken` | יצירת טוקן מאובטח לסקר |
| `getFeedbackTokenInfo` | שליפת מידע טוקן |
| `validateAndSubmitFeedback` | ולידציה ושמירת משוב |

### אינטגרציות

| פונקציה | תיאור |
|---------|--------|
| `99digitalBot` | אינטגרציה עם בוט WhatsApp |
| `botWebhook` | Webhook לקבלת נתונים מהבוט |
| `externalCrmWebhook` | Webhook ל-CRM חיצוני |

### כלים

| פונקציה | תיאור |
|---------|--------|
| `logAuditAction` | תיעוד פעולות ביומן |
| `checkContractExpiry` | מעקב חוזים שפגו |
| `seedDemoData` | יצירת נתוני דמו |
| `inviteTestUsers` | הזמנת משתמשי בדיקה |

---

## 🔗 אינטגרציות

| אינטגרציה | סטטוס | תיאור |
|-----------|--------|--------|
| **Base44 Platform** | ✅ פעיל | Backend מלא: CRUD, Auth, Files, Real-time Subscriptions |
| **Leaflet + OpenStreetMap** | ✅ פעיל | מפות GPS, מיקומי ספקים, ניתוב, אזורי כיסוי |
| **Twilio SMS** | ✅ פעיל | עדכוני סטטוס, סקרי שביעות רצון |
| **99Digital Bot** | ✅ פעיל | בוט WhatsApp לקליטת קריאות |
| **iFrame CRM** | ✅ פעיל | חשבוניות מנוהלות ב-CRM קיים |
| **PWA** | ✅ פעיל | התקנה, Offline, Push, Service Worker |
| **Real-time Updates** | ✅ פעיל | Polling-based — סנכרון בזמן אמת |

---

## 💻 פקודות פיתוח

```bash
# פיתוח
npm run dev              # שרת פיתוח (http://localhost:5173)
npm run build            # בנייה לפרודקשן
npm run preview          # תצוגה מקדימה של build

# איכות קוד
npm run lint             # בדיקת שגיאות lint
npm run lint:fix         # תיקון אוטומטי
npm run format           # פורמט קוד עם Prettier
npm run format:check     # בדיקת פורמט
npm run typecheck        # בדיקת TypeScript types

# בדיקות
npm run test             # הרצת unit tests
npm run test:watch       # הרצה מתמשכת
npm run test:coverage    # כיסוי קוד

# קומפוננטות
npm run storybook        # ספריית קומפוננטות UI (port 6006)
npm run build-storybook  # בניית Storybook סטטי
```

---

## 📁 מבנה הפרויקט

```
natid-crm/
├── src/
│   ├── api/                        # חיבור ל-API
│   │   └── base44Client.js         # קליינט Base44
│   ├── components/                 # רכיבי UI (24+ קטגוריות)
│   │   ├── ui/                     # 85+ רכיבים בסיסיים (shadcn/ui)
│   │   ├── ai/                     # ווידג'טים של בינה מלאכותית
│   │   ├── auth/                   # RoleGuard, PermissionGuard
│   │   ├── call-details/           # טאבים של פרטי קריאה
│   │   ├── calls/                  # שאלון טכני, רכיבי קריאות
│   │   ├── chat/                   # צ'אט בתוך קריאות
│   │   ├── contracts/              # חוזי ספקים
│   │   ├── dashboard/              # ווידג'טים, KPIs, גרפים
│   │   ├── feedback/               # משובים ודירוגים
│   │   ├── files/                  # העלאת קבצים
│   │   ├── forms/                  # רכיבי טפסים
│   │   ├── layout/                 # Layout ראשי, Sidebar, Navbar
│   │   ├── maps/                   # מפות Leaflet + GPS
│   │   ├── notifications/          # התראות, Push, Toast
│   │   ├── permissions/            # PermissionsContext
│   │   ├── pwa/                    # Install, Offline, Update prompts
│   │   ├── queue/                  # רכיבי תור עבודה
│   │   ├── reports/                # גרפי דוחות
│   │   ├── signature/              # חתימה דיגיטלית
│   │   └── vendor/                 # רכיבי ספקים
│   ├── config/                     # הגדרות
│   │   └── permissions.js          # PAGE_PERMISSIONS, REPORT_PERMISSIONS
│   ├── features/                   # 10 מודולים עם hooks
│   │   ├── agents/                 # useUsers
│   │   ├── calls/                  # useCalls — מודול ליבה
│   │   ├── cases/                  # useCases
│   │   ├── customers/              # useCustomers
│   │   ├── dashboard/              # מדדי דשבורד
│   │   ├── operators/              # ניהול מתפעלים
│   │   ├── queue/                  # useQueue
│   │   ├── reports/                # useReports
│   │   ├── settings/               # useSettings
│   │   └── vendors/                # useVendors
│   ├── hooks/                      # Custom Hooks משותפים
│   ├── lib/                        # ספריות עזר, queryKeys
│   ├── pages/                      # 47 דפי אפליקציה
│   ├── providers/                  # React Context Providers
│   ├── services/                   # שירותים (חישוב מרחקים)
│   ├── utils/                      # פונקציות עזר
│   ├── App.jsx                     # ניתוב ראשי + RoleGuard
│   ├── Layout.jsx                  # Layout wrapper
│   └── design-system.js            # מערכת עיצוב RTL
├── functions/                      # 32 פונקציות TypeScript serverless
├── docs/                           # תיעוד פרויקט (15 מסמכים)
├── scripts/                        # סקריפטי עזר
│   └── quick-start.sh              # התקנה אוטומטית
├── .claude/                        # Claude Code skills (13 workflows)
├── CLAUDE.md                       # הנחיות לפיתוח עם Claude Code
├── SYSTEM_SPECIFICATION.md         # אפיון מערכת מלא (עברית)
└── package.json
```

---

## ✅ Code Quality

### Pre-commit Hooks

הפרויקט משתמש ב-**Husky** + **lint-staged** שרצים אוטומטית לפני כל commit:

```
ESLint (fix) → Prettier (format) → Vitest (related tests)
```

### קונבנציות קוד

| כלל | תיאור |
|-----|--------|
| **RTL First** | כל הלייאאוטים תומכים ב-RTL (עברית) |
| **Component Library** | שימוש ב-shadcn/ui מ-`src/components/ui/` |
| **Feature-based** | פיצ'רים חדשים ב-`src/features/` עם hooks |
| **React Query** | כל state שרת, keys ב-`src/lib/queryKeys.js` |
| **Path Aliases** | `@/` prefix (ב-`jsconfig.json`) |
| **Tailwind Only** | ללא inline styles |
| **Hebrew UI** | כל הטקסט למשתמש בעברית |
| **Sonner Toasts** | הודעות למשתמש דרך Sonner |

---

## 🚄 ביצועים ואופטימיזציה

### Bundle Splitting

הפרויקט משתמש ב-Rollup `manualChunks` לפיצול אופטימלי:

| Chunk | גודל | תוכן |
|-------|------|-------|
| `vendor-react` | ~164KB | React, React DOM, React Router |
| `vendor-radix` | ~148KB | Radix UI components |
| `vendor-maps` | ~155KB | Leaflet, React-Leaflet |
| `vendor-motion` | ~114KB | Framer Motion |
| `vendor-charts` | ~431KB | Recharts |
| `vendor-pdf` | ~562KB | jsPDF, html2canvas |
| `vendor-icons` | ~57KB | Lucide React |
| `vendor-query` | ~40KB | React Query |
| `vendor-date` | ~27KB | date-fns |

### Lazy Loading

15+ קומפוננטות נטענות דינמית:
- `TrackedCallsPanel` — פאנל קריאות במעקב
- `TechnicalQuestionnaire` — שאלון טכני
- AI Widgets — ווידג'טים של בינה מלאכותית
- דוחות, מפות, ועוד

---

## 📲 PWA

המערכת תומכת ב-**Progressive Web App** מלא:

- **התקנה** — ניתנת להתקנה על Desktop ומובייל
- **Offline** — עבודה ללא חיבור אינטרנט
- **Auto Update** — Service Worker מתעדכן אוטומטית
- **Push Notifications** — התראות בזמן אמת

### אסטרטגיית Cache (Workbox)

| משאב | אסטרטגיה | TTL | מקסימום |
|------|----------|-----|---------|
| API calls (`/api/*`) | NetworkFirst | 5 דקות | 100 entries |
| תמונות | CacheFirst | 30 ימים | 50 entries |
| פונטים | CacheFirst | שנה | 20 entries |
| מפות (OpenStreetMap) | CacheFirst | 7 ימים | 500 entries |

---

## 📚 תיעוד

### מסמכים עיקריים

| מסמך | תיאור |
|------|--------|
| [`SYSTEM_SPECIFICATION.md`](./SYSTEM_SPECIFICATION.md) | אפיון מערכת מלא — ישויות, מסכים, הרשאות, פונקציות |
| [`docs/BUSINESS_WORKFLOWS.md`](./docs/BUSINESS_WORKFLOWS.md) | תהליכים עסקיים מפורטים |
| [`docs/WORKFLOWS.md`](./docs/WORKFLOWS.md) | Workflows טכניים |
| [`docs/WORKFLOWS_SPEC.md`](./docs/WORKFLOWS_SPEC.md) | אפיון Workflows |
| [`docs/ARCHITECTURE_AUDIT.md`](./docs/ARCHITECTURE_AUDIT.md) | סקירת ארכיטקטורה |
| [`docs/SECURITY_AUDIT_REPORT.md`](./docs/SECURITY_AUDIT_REPORT.md) | דו"ח אבטחה |
| [`docs/LESSONS_LEARNED.md`](./docs/LESSONS_LEARNED.md) | ידע מצטבר ובאגים שנפתרו |
| [`docs/QA_CHECKLIST.md`](./docs/QA_CHECKLIST.md) | רשימת QA |
| [`docs/INTEGRATIONS_AND_TESTS.md`](./docs/INTEGRATIONS_AND_TESTS.md) | אינטגרציות ובדיקות |
| [`docs/CLAUDE_WORKFLOW.md`](./docs/CLAUDE_WORKFLOW.md) | מדריך עבודה עם Claude Code |
| [`CLAUDE.md`](./CLAUDE.md) | הנחיות לפיתוח עם Claude Code |

### Claude Code Skills

13 workflows מוכנים לשימוש חוזר ב-`.claude/skills/`:

| Skill | שימוש |
|-------|--------|
| `plan-and-review` | תכנון לפני קוד + סקירת בכיר |
| `ci-build-check` | הרצת lint, format, typecheck, build |
| `code-review` | סקירת אבטחה, ביצועים, RTL |
| `update-docs` | עדכון תיעוד שיטתי |
| `analytics` | ניתוח קוד ומטריקות |
| `security-audit` | ביקורת אבטחה |
| `full-system-test` | בדיקת מערכת מלאה |
| `subagents` | פירוק משימות מורכבות |
| `learning-mode` | הסברים ולמידה |

---

## ישויות נתונים עיקריות

### ServiceCall (קריאת שירות)

```javascript
{
  call_number,                    // מספר ייחודי
  customer_name, customer_phone,  // פרטי לקוח
  vehicle_plate, vehicle_type,    // פרטי רכב
  service_type, issue_type,       // סוג שירות ותקלה
  dispatch_type,                  // mobile_unit / tow_truck
  pickup_location_*,              // מיקום איסוף (כתובת + GPS)
  dropoff_location_*,             // מיקום יעד
  call_status,                    // new → completed / cancelled
  priority,                       // low / normal / high / urgent
  assigned_vendor_id,             // ספק משובץ
  questionnaire_answers,          // שאלון טכני דינמי
  recording_url,                  // הקלטת שיחה
  closing_call_done               // שיחת סגירה בוצעה
}
```

### Vendor (ספק)

```javascript
{
  vendor_name, email, phone,      // פרטי התקשרות
  service_areas, specializations, // אזורים והתמחויות
  availability, rating,           // זמינות + דירוג 1-5
  vendor_type,                    // internal / external
  current_lat, current_lng        // מיקום GPS חי
}
```

### Customer (לקוח)

```javascript
{
  name, phone, email, address,    // פרטים
  city, notes, status             // עיר, הערות, סטטוס
}
```

---

<div align="center">

**NatID CRM** — Built with React + Vite + Tailwind on Base44 Platform

[Base44 Docs](https://docs.base44.com/) · [Base44 Support](https://app.base44.com/support)

</div>
