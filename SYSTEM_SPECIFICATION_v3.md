# מסמך אפיון מערכת - NatID CRM v3
## מערכת ניהול קריאות שירות ונותני שירות

**תאריך עדכון אחרון:** פברואר 2026
**גרסה:** 3.0

---

## תוכן עניינים

1. [סקירה כללית](#1-סקירה-כללית)
2. [ארכיטקטורה טכנית](#2-ארכיטקטורה-טכנית)
3. [מבנה הפרויקט](#3-מבנה-הפרויקט)
4. [מערכת הרשאות ותפקידים](#4-מערכת-הרשאות-ותפקידים)
5. [ישויות נתונים](#5-ישויות-נתונים)
6. [מודולים ומסכים (47 מסכים)](#6-מודולים-ומסכים)
7. [פונקציות Backend (30 פונקציות)](#7-פונקציות-backend)
8. [אינטגרציות חיצוניות](#8-אינטגרציות-חיצוניות)
9. [מערכת עיצוב (Design System)](#9-מערכת-עיצוב)
10. [ביצועים ואופטימיזציה](#10-ביצועים-ואופטימיזציה)
11. [הבהרות אפיון](#11-הבהרות-אפיון)
12. [סטטוס פיתוח](#12-סטטוס-פיתוח)
13. [פיצ'רים חסרים ופערים](#13-פיצרים-חסרים-ופערים)
14. [מפת דרכים](#14-מפת-דרכים)

---

## 1. סקירה כללית

### תיאור המערכת

**NatID CRM** (נתיב) היא מערכת ניהול שירותי דרך מקיפה לחברת "נתי גרופ". המערכת מאפשרת ניהול מלא של מחזור חיי קריאת שירות — מהרגע שהלקוח תקוע בדרך ועד לסיום הטיפול וקבלת משוב.

### יכולות מרכזיות

- **קליטת קריאות** — ידנית (מוקדן) + אוטומטית (בוט WhatsApp)
- **שיבוץ חכם** — אלגוריתם ניקוד רב-פרמטרי (מרחק, דירוג, זמינות, מחיר)
- **מעקב בזמן אמת** — GPS ספקים, ETA, מפות Leaflet
- **ניהול לקוחות** — CRUD, SLA, חוזים, היסטוריית אינטראקציות
- **ניהול ספקים** — פורטל עצמאי, חוזים, תמחור, דירוגים
- **צי רכב** — גררים וניידות פנימיים
- **דוחות ו-BI** — תפעוליים + פיננסיים, ייצוא, גרפים
- **בינה מלאכותית** — סיכום קריאות, המלצות ספקים, ניתוח דפוסים
- **תקשורת** — צ'אט בקריאות, SMS, התראות In-App
- **חשבוניות** — iFrame ל-CRM קיים
- **PWA** — התקנה, עבודה אופליין, Push Notifications

### קהל יעד — 4 תפקידים

| תפקיד | מזהה | תיאור |
|--------|------|--------|
| **מנהל** | `admin` | גישה מלאה — כולל דוחות פיננסיים, הגדרות מערכת, ניהול משתמשים |
| **מתפעל** | `operator` | תפעול יומי — פתיחת קריאות, שיבוץ ספקים, ניהול לקוחות (ללא פיננסי) |
| **טכנאי** | `agent` | עבודה בשטח — דשבורד טכנאי, ניהול קריאות אישי |
| **ספק** | `vendor` | פורטל ייעודי — קבלה/דחייה/עדכון קריאות |

### שפה וכיווניות

- **שפת ממשק:** עברית (RTL)
- **סוג אפליקציה:** SPA (Single Page Application) + PWA
- **Backend:** Base44 Platform

---

## 2. ארכיטקטורה טכנית

### Stack טכנולוגי — Frontend

| רכיב | טכנולוגיה | גרסה |
|------|-----------|------|
| Framework | React | 18.2.0 |
| Build Tool | Vite | 6.1.0 |
| UI Components | Radix UI (shadcn/ui) | 85+ רכיבים |
| Styling | Tailwind CSS | 3.4.17 |
| State Management | React Context + React Query | 5.84.1 |
| Routing | React Router DOM | 6.26.0 |
| Charts | Recharts | 2.15.4 |
| Icons | Lucide React | 0.475.0 |
| Date Handling | date-fns | 3.6.0 |
| Maps | Leaflet + react-leaflet | 4.2.1 |
| Animation | Framer Motion | 11.16.4 |
| Forms | React Hook Form + Zod | 7.54.2 / 3.24.2 |
| PDF Export | jspdf + html2canvas | 2.5.2 |
| PWA | vite-plugin-pwa + Workbox | 1.2.0 |
| Toast | Sonner | 2.0.1 |

### Stack טכנולוגי — Backend

| רכיב | טכנולוגיה |
|------|-----------|
| פלטפורמה | Base44 |
| SDK | @base44/sdk 0.8.3 |
| Functions Runtime | Deno TypeScript (Serverless) |
| מסד נתונים | Base44 Entities (Managed) |
| אימות | Base44 Auth (JWT) |
| אחסון קבצים | Base44 Files |
| AI/LLM | Base44 LLM Integration |
| SMS | Twilio |

### כלי פיתוח

| כלי | גרסה | שימוש |
|-----|-------|-------|
| ESLint | 9.19.0 | Linting |
| Prettier | 3.8.0 | Formatting |
| Storybook | 8.6.15 | Component Library |
| Husky | 9.1.7 | Git Hooks |
| lint-staged | 16.2.7 | Pre-commit |

---

## 3. מבנה הפרויקט

```
natid-crm/
├── .claude/                     # Claude Code skills & configuration
├── .husky/                      # Git hooks (pre-commit: lint + format)
├── .storybook/                  # Storybook configuration
├── docs/                        # תיעוד (עברית)
│   ├── SYSTEM_SPECIFICATION.md  # אפיון טכני מפורט (v3.0)
│   ├── BUSINESS_WORKFLOWS.md    # תהליכים עסקיים
│   ├── WORKFLOWS_SPEC.md        # אפיון זרימות עבודה טכני
│   ├── INTEGRATIONS_AND_TESTS.md # אינטגרציות ותוכנית בדיקות
│   ├── WORKFLOWS.md             # זרימות עבודה
│   ├── CLAUDE_WORKFLOW.md       # מדריך עבודה עם Claude
│   └── LESSONS_LEARNED.md       # לקחים ותיקונים
├── functions/                   # 30 Backend Serverless Functions (Deno TS)
├── public/                      # Assets סטטיים, manifest, icons
├── scripts/                     # סקריפטים (quick-start, worktree)
├── src/
│   ├── api/
│   │   └── base44Client.js      # קליינט Base44 + ייצוא ישויות
│   ├── components/
│   │   ├── ui/                  # 85+ רכיבי shadcn/ui
│   │   ├── ai/                  # 4 רכיבי AI insights
│   │   ├── auth/                # RoleGuard, PermissionGuard
│   │   ├── call-details/        # טאבים של פרטי קריאה
│   │   ├── calls/               # TechnicalQuestionnaire ועוד
│   │   ├── chat/                # CallChat, EnhancedCallChat
│   │   ├── contracts/           # ContractFormDialog, ContractDetailsDialog
│   │   ├── dashboard/           # ווידג'טים: TrackedCalls, SmartAlerts, AI
│   │   ├── feedback/            # CallFeedbackForm
│   │   ├── files/               # FileUploader
│   │   ├── hooks/               # 8 Custom Hooks (useCalls, useVendors...)
│   │   ├── layout/              # Layout ראשי, Sidebar, Navigation
│   │   ├── maps/                # 6 רכיבי מפות (Live, Route, Geofence)
│   │   ├── notifications/       # Push, Realtime, Preferences
│   │   ├── permissions/         # PermissionsContext
│   │   ├── pwa/                 # Install, Offline, Update
│   │   ├── reports/             # 5 רכיבי גרפים ודוחות
│   │   ├── signature/           # SignaturePad
│   │   └── vendor/              # Availability, GPS, NewCallAlert, Stats
│   ├── config/
│   │   └── permissions.js       # PAGE_PERMISSIONS, REPORT_PERMISSIONS, VALID_ROLES
│   ├── features/                # 11 Feature Modules
│   │   ├── agents/              # useUsers
│   │   ├── auth/                # AuthLogin, Login, Register (Legacy)
│   │   ├── calls/               # useCalls
│   │   ├── cases/               # useCases
│   │   ├── customers/           # useCustomers
│   │   ├── dashboard/           # Dashboard features
│   │   ├── operators/           # Operator features
│   │   ├── queue/               # useQueue
│   │   ├── reports/             # useReports
│   │   ├── settings/            # useSettings
│   │   └── vendors/             # useVendors
│   ├── hooks/                   # Shared Hooks
│   │   ├── use-mobile.jsx       # Responsive detection
│   │   └── useRealtimeUpdates.js # Real-time subscriptions
│   ├── lib/                     # Utilities
│   │   ├── AuthContext.jsx
│   │   ├── query-client.js
│   │   ├── queryKeys.js
│   │   └── utils.js / utils.jsx
│   ├── pages/                   # 30+ דפי אפליקציה
│   ├── providers/
│   │   └── AuthProvider.jsx
│   ├── services/
│   │   └── distanceMatrix.js    # OSRM distance calculation
│   ├── App.jsx                  # Router + RoleGuard
│   ├── Layout.jsx               # Layout wrapper + Navigation
│   ├── main.jsx                 # Entry point
│   ├── pages.config.js          # Page routes configuration
│   └── design-system.js         # RTL design system tokens
├── CLAUDE.md                    # Claude Code context
├── SYSTEM_SPECIFICATION.md      # Root-level system spec (v2.0)
├── SYSTEM_SPECIFICATION_v3.md   # מסמך זה (v3.0)
├── package.json
├── vite.config.js
├── tailwind.config.js
└── eslint.config.js
```

---

## 4. מערכת הרשאות ותפקידים

### 4.1 מטריצת הרשאות — מסכים

**קובץ:** `src/config/permissions.js`

#### Admin בלבד (10 מסכים)

| מסך | תיאור |
|-----|--------|
| UserManagement | ניהול משתמשים |
| RoleManagement | ניהול תפקידים |
| AuditLog | יומן פעולות |
| AutomationSettings | כללי אוטומציה |
| IntegrationSettings | חיבורים חיצוניים |
| Settings | הגדרות כלליות |
| VendorPricing | הסכמי תמחור |
| FleetManagement | צי רכב |
| Invoices | חשבוניות (iFrame) |
| ImportHistoricalData | ייבוא נתונים |

#### Admin + Operator (18 מסכים)

| מסך | תיאור |
|-----|--------|
| Dashboard | לוח בקרה |
| Calls | רשימת קריאות |
| CallDetails | פרטי קריאה |
| NewCase | קריאה חדשה |
| Calendar | לוח שנה |
| QueueMonitor | ניטור תורים |
| MyQueue | התור שלי |
| Customers | לקוחות |
| ServiceProviders | נותני שירות |
| NewVendor | ספק חדש |
| VendorTracking | מעקב GPS |
| AllVendorsMap | מפת ספקים |
| CoverageAreas | אזורי כיסוי |
| VendorContracts | חוזי ספקים |
| Reports | דוחות |
| HistoricalDataAnalysis | ניתוח היסטורי |
| AdvancedExport | ייצוא מתקדם |
| Agents | סוכנים |
| NotificationSettings | הגדרות התראות |
| CustomerFeedback | משובי לקוחות |

#### Agent בלבד (2 מסכים)

| מסך | תיאור |
|-----|--------|
| AgentDashboard | דשבורד טכנאי |
| AgentCallManagement | ניהול קריאות טכנאי |

#### Vendor בלבד (4 מסכים)

| מסך | תיאור |
|-----|--------|
| VendorPortal | פורטל ספקים |
| VendorCallManagement | ניהול קריאה |
| MyVendorProfile | הפרופיל שלי |
| VendorGuide | מדריך לספקים |

#### כל התפקידים (2 מסכים)

| מסך | תיאור |
|-----|--------|
| MyNotificationSettings | הגדרות התראות אישיות |
| UserGuide | מדריך למשתמש |

### 4.2 הרשאות דוחות

| דוח | Admin | Operator |
|-----|-------|----------|
| invoices_report | ✅ | ❌ |
| vendor_pricing_report | ✅ | ❌ |
| financial_summary | ✅ | ❌ |
| delays_report | ✅ | ✅ |
| ratings_report | ✅ | ✅ |
| performance_report | ✅ | ✅ |
| vendor_delays_report | ✅ | ✅ |

### 4.3 מנגנון אכיפה — 3 שכבות

| שכבה | רכיב | תפקיד |
|------|-------|--------|
| **Route** | `App.jsx` → `getPageRoles()` → `RoleGuard` | חוסם גישה לפני רנדור |
| **Navigation** | `Layout.jsx` → `canAccessPage()` | מסתיר פריטים מתפריט |
| **Page** | `PermissionGuard` + `useCurrentUserRole` | בדיקות פנימיות בדף |

### 4.4 אבטחה נוספת

- **בעלות ספק:** `VendorCallManagement` → `call.assigned_vendor_id === vendorProfile.id`
- **סינון ספק:** `VendorPortal` → `Call.filter({ assigned_vendor_id })`
- **דוחות פיננסיים:** `PermissionGuard category="reports" permission="financial"`
- **Role מ-backend:** `base44.auth.me()` — לא ניתן לזיוף בצד לקוח

---

## 5. ישויות נתונים

### 5.1 Call (קריאת שירות) — ישות מרכזית

| שדה | סוג | תיאור |
|-----|-----|--------|
| id | string | מזהה ייחודי |
| call_number | string | מספר קריאה (C-XXXXXXXX, auto) |
| call_status | enum | waiting_treatment, awaiting_assignment, assigning, vendor_enroute, in_progress, completed, cancelled |
| priority | enum | low, normal, high, urgent |
| customer_name | string | שם לקוח |
| customer_phone | string | טלפון לקוח |
| insurance_company | string | חברת ביטוח |
| membership_package | string | חבילת חברות |
| vehicle_plate | string | מספר רכב |
| vehicle_type | string | סוג רכב |
| vehicle_model | string | דגם רכב |
| service_type | enum | tow, mechanic, tire, locksmith, fuel, battery, combined |
| issue_type | string | סוג תקלה |
| issue_description | string | תיאור התקלה |
| dispatch_type | enum | mobile_unit, tow_truck |
| customer_source | enum | phone, bot |
| pickup_location_address | string | כתובת איסוף (חובה) |
| pickup_location_city | string | עיר איסוף |
| pickup_location_lat | number | GPS — קו רוחב |
| pickup_location_lng | number | GPS — קו אורך |
| dropoff_location_address | string | כתובת יעד |
| dropoff_location_city | string | עיר יעד |
| dropoff_location_lat | number | GPS יעד |
| dropoff_location_lng | number | GPS יעד |
| assigned_vendor_id | ref | ספק משובץ |
| assigned_vendor_name | string | שם ספק משובץ |
| internal_notes | text | הערות פנימיות |
| vendor_notes | text | הערות ספק |
| questionnaire_answers | object | תשובות שאלון טכני דינמי |
| recording_url | string | קישור להקלטת שיחה |
| closing_call_done | boolean | שיחת סגירה בוצעה |
| call_summary | text | סיכום AI |
| cost_to_vendor | number | עלות לספק |
| sla_deadline | datetime | דד-ליין SLA |
| vendor_arrival_time_actual | datetime | זמן הגעה בפועל |
| closed_at | datetime | תאריך סגירה |
| closed_by | string | נסגר ע"י |
| created_date | datetime | תאריך יצירה |
| updated_date | datetime | תאריך עדכון |

### 5.2 Customer (לקוח)

| שדה | סוג | תיאור |
|-----|-----|--------|
| id | string | מזהה |
| name | string | שם מלא |
| customer_type | enum | insurance_company, fleet, individual, garage, other |
| contact_person | string | איש קשר |
| phone | string | טלפון |
| email | string | אימייל |
| address | string | כתובת |
| city | string | עיר |
| contract_type | enum | monthly, yearly, per_call, none |
| sla_response_minutes | number | SLA תגובה |
| sla_arrival_minutes | number | SLA הגעה |
| monthly_budget | number | תקציב חודשי |
| status | enum | active, inactive, suspended |

### 5.3 Vendor (ספק/נותן שירות)

| שדה | סוג | תיאור |
|-----|-----|--------|
| id | string | מזהה |
| vendor_name | string | שם ספק |
| phone | string | טלפון |
| email | string | אימייל |
| service_type | array[enum] | tow, mechanic, tire, locksmith, fuel, battery, combined |
| coverage_areas | array[string] | אזורי כיסוי |
| availability_status | enum | available, busy, on_break, offline |
| is_active | boolean | פעיל |
| is_available_now | boolean | זמין כעת |
| latitude | number | GPS — קו רוחב נוכחי |
| longitude | number | GPS — קו אורך נוכחי |
| service_radius | number | רדיוס שירות (ק"מ) |
| average_rating | number | דירוג ממוצע (1-5) |
| total_calls | number | סה"כ קריאות |
| success_rate | number | אחוז הצלחה |
| payment_rate_per_call | number | תעריף לקריאה |
| vendor_type | enum | internal, external |
| operating_hours | string | שעות פעילות |

### 5.4 ישויות נוספות

| ישות | תיאור |
|------|--------|
| **User** | id, email, role (admin/operator/vendor/agent), full_name, is_active |
| **WorkQueue** | call_id, queue_status, priority_score, assigned_to_agent |
| **VendorLocation** | vendor_id, latitude, longitude, address, city, timestamp |
| **VendorRating** | vendor_id, overall_rating (1-5), comment, call_id |
| **VendorPayment** | vendor_id, call_id, amount, payment_status |
| **VendorContract** | vendor_id, contract_type, terms, start_date, end_date, status |
| **VendorPricing** | vendor_id, service_type, area, price, agreement_start/end, is_active |
| **Fleet** | vehicle_number, vehicle_type (tow_truck/mobile_unit), name, status, area |
| **CallHistory** | call_id, change_type, new_value, notes, changed_by |
| **CallPhoto** | call_id, photo_url, description |
| **CallAssignmentAttempt** | call_id, vendor_id, score, status (accepted/declined/timeout) |
| **Message** | הודעות צ'אט בקריאה |
| **Notification** | user_id, title, message, type, is_read, link |
| **NotificationSetting** | user_id, channel, event_type, is_enabled |
| **CustomerInteraction** | customer_id, interaction_type, notes |
| **CaseActivity** | case_id, action, notes, timestamp |
| **Product** | קטלוג מוצרים (מצברים, חלפים) |
| **Company** | פרטי חברה |
| **SystemSettings** | הגדרות מערכת |
| **AuditLog** | יומן פעולות |
| **Contract** | חוזי ספקים |

---

## 6. מודולים ומסכים

### 47 מסכים ב-7 קבוצות

### קבוצה 1: תפעול יומי

| מסך | תיאור | הרשאה | סטטוס |
|-----|--------|-------|-------|
| **Dashboard** | לוח בקרה — KPI, מפת GPS, TrackedCallsPanel, AI widgets, גרפים | admin, operator | ✅ |
| **Calls** | טבלת קריאות — חיפוש, סינון, pagination | admin, operator | ✅ |
| **CallDetails** | פרטי קריאה — InfoTab, HistoryTab, ChatTab, FilesTab | admin, operator | ✅ |
| **NewCase** | טופס קריאה חדשה — לקוח, רכב, מיקום, שירות, שאלון טכני | admin, operator | ✅ |
| **Calendar** | לוח שנה חודשי/שבועי/יומי | admin, operator | ✅ |
| **QueueMonitor** | ניטור תור — סטטיסטיקות, עומסים (רענון 15 שניות) | admin, operator | ✅ |
| **MyQueue** | התור שלי — קריאות המוקדן (רענון 30 שניות) | admin, operator | ✅ |

### קבוצה 2: ניהול ספקים

| מסך | תיאור | הרשאה | סטטוס |
|-----|--------|-------|-------|
| **ServiceProviders** | רשימת ספקים — Grid/Table, סינון, ייבוא/ייצוא | admin, operator | ✅ |
| **NewVendor** | הוספת ספק חדש | admin, operator | ✅ |
| **VendorPricing** | הסכמי תמחור — ספק, סוג שירות, אזור, מחיר, תוקף | admin | ✅ |
| **VendorContracts** | חוזי ספקים — יצירה, עריכה, מעקב | admin, operator | ✅ |
| **AllVendorsMap** | מפת ספקים אינטראקטיבית — GPS חי | admin, operator | ✅ |
| **CoverageAreas** | אזורי כיסוי גיאוגרפיים — Geofence | admin, operator | ✅ |
| **VendorTracking** | מעקב GPS ספק בודד — ETA | admin, operator | ✅ |

### קבוצה 3: פורטל ספקים

| מסך | תיאור | הרשאה | סטטוס |
|-----|--------|-------|-------|
| **VendorPortal** | דשבורד ספק — KPI, קריאות, סטטיסטיקות | vendor | ✅ |
| **VendorCallManagement** | ניהול קריאה — אישור, עדכון, תמונות, חתימה | vendor | ✅ |
| **MyVendorProfile** | פרופיל ספק — פרטים, שירותים, אזורים | vendor | ✅ |
| **VendorGuide** | מדריך לספקים | vendor | ✅ |

### קבוצה 4: צי רכב

| מסך | תיאור | הרשאה | סטטוס |
|-----|--------|-------|-------|
| **FleetManagement** | גררים וניידות — רשימה, סטטוסים, שיוך | admin | ✅ |

### קבוצה 5: כלכלה ותשלומים

| מסך | תיאור | הרשאה | סטטוס |
|-----|--------|-------|-------|
| **Invoices** | חשבוניות — iFrame ל-CRM חיצוני | admin | ✅ |
| **ProductCatalog** | קטלוג מוצרים — מצברים, חלפים | admin, operator | ✅ |
| **OperationalRates** | תעריפון תפעול | admin, operator | ✅ |
| **Reminders** | תזכורות מערכת | admin, operator | ✅ |

### קבוצה 6: ניהול ונתונים

| מסך | תיאור | הרשאה | סטטוס |
|-----|--------|-------|-------|
| **Customers** | לקוחות — CRUD, חיפוש, SLA | admin, operator | ✅ |
| **CustomerDetails** | פרופיל לקוח + היסטוריה | admin, operator | ✅ |
| **Reports** | דוחות — 7 סוגים, גרפים, ייצוא | admin, operator | ✅ |
| **HistoricalDataAnalysis** | ניתוח מגמות | admin, operator | ✅ |
| **AdvancedExport** | ייצוא מתקדם | admin, operator | ✅ |
| **FeedbackManagement** | ניהול משובים ודירוגים | admin, operator | ✅ |
| **Agents** | סוכנים וכלי AI | admin, operator | ⚠️ חלקי |

### קבוצה 7: מערכת (Admin)

| מסך | תיאור | הרשאה | סטטוס |
|-----|--------|-------|-------|
| **UserManagement** | CRUD משתמשים + תפקידים | admin | ✅ |
| **RoleManagement** | הגדרת תפקידים | admin | ✅ |
| **AuditLog** | יומן פעולות | admin | ✅ |
| **AutomationSettings** | כללי אוטומציה | admin | ✅ |
| **IntegrationSettings** | חיבורים חיצוניים | admin | ✅ |
| **NotificationSettings** | הגדרות התראות מערכתיות | admin, operator | ✅ |
| **AdminDisplaySettings** | הגדרות תצוגה | admin | ✅ |
| **Settings** | הגדרות כלליות | admin | ✅ |
| **ImportHistoricalData** | ייבוא נתונים | admin | ✅ |

### קבוצה 8: כלל-מערכתי

| מסך | תיאור | הרשאה | סטטוס |
|-----|--------|-------|-------|
| **AgentDashboard** | דשבורד טכנאי | agent | ⚠️ |
| **AgentCallManagement** | קריאות טכנאי | agent | ⚠️ |
| **MyNotificationSettings** | הגדרות אישיות | הכל | ✅ |
| **UserGuide** | מדריך למשתמש | הכל | ✅ |
| **UserProfile** | הפרופיל שלי | הכל | ✅ |
| **LandingPage** | דף נחיתה ציבורי | — | ✅ |

---

## 7. פונקציות Backend

**30 פונקציות TypeScript Serverless בתיקיית `functions/`:**

### שיבוץ וניתוב (4)

| פונקציה | תיאור |
|---------|--------|
| `autoAssignVendor.ts` | שיבוץ אוטומטי — ניקוד רב-פרמטרי (מרחק 40%, סוג שירות 20%, דירוג 20%, תגובה 10%, השלמה 10%) |
| `calculateDistanceAndETA.ts` | חישוב מרחק (OSRM/Haversine) + ETA |
| `handleAssignmentResponse.ts` | עיבוד אישור/דחייה של ספק |
| `recommendVendor.ts` | המלצת ספק מבוססת AI (LLM) |

### ניתוח AI (7)

| פונקציה | תיאור |
|---------|--------|
| `generateCallSummary.ts` | סיכום AI לקריאה שהושלמה |
| `quickCallSummary.ts` | סיכום מהיר |
| `analyzeCallPatterns.ts` | ניתוח דפוסי קריאות |
| `analyzeHistoricalPatterns.ts` | ניתוח מגמות היסטוריות |
| `categorizeCall.ts` | קטגוריזציה אוטומטית |
| `detectSmartAlerts.ts` | זיהוי חריגות — SmartAlertsTab |
| `predictCallTimes.ts` | חיזוי זמני טיפול |

### ניהול ספקים (5)

| פונקציה | תיאור |
|---------|--------|
| `analyzeVendorPerformance.ts` | מדדי ביצוע ספק |
| `updateVendorLocation.ts` | עדכון GPS (כל 30 שניות) |
| `updateVendorStatus.ts` | עדכון סטטוס זמינות |
| `getVendorScopedData.ts` | שליפת נתונים בהיקף ספק |
| `submitVendorRating.ts` | שמירת דירוג ספק |

### התראות ותקשורת (6)

| פונקציה | תיאור |
|---------|--------|
| `sendNotification.ts` | שליחת התראה In-App |
| `createNotification.ts` | יצירת רשומת Notification |
| `checkAndSendNotifications.ts` | בדיקה ושליחה תקופתית |
| `sendSMS.ts` | שליחת SMS (Twilio) |
| `sendFeedbackSMS.ts` | שליחת סקר שביעות רצון |
| `sendCallStatusUpdate.ts` | עדכון סטטוס ללקוח |

### משובים (3)

| פונקציה | תיאור |
|---------|--------|
| `createFeedbackToken.ts` | יצירת טוקן מאובטח לסקר |
| `getFeedbackTokenInfo.ts` | שליפת מידע טוקן |
| `validateAndSubmitFeedback.ts` | ולידציה ושמירת משוב |

### אינטגרציות (3)

| פונקציה | תיאור |
|---------|--------|
| `99digitalBot.ts` | עיבוד קריאות מבוט WhatsApp |
| `botWebhook.ts` | Webhook כניסה מהבוט |
| `externalCrmWebhook.ts` | Webhook ל-CRM חיצוני |

### כלים (2)

| פונקציה | תיאור |
|---------|--------|
| `logAuditAction.ts` | תיעוד פעולות ביומן |
| `checkContractExpiry.ts` | מעקב תוקף חוזים |

---

## 8. אינטגרציות חיצוניות

| # | אינטגרציה | סטטוס | תיאור |
|---|-----------|-------|-------|
| 1 | **Base44 Platform** | ✅ פעיל | Backend מלא — CRUD, Auth (JWT), Files, Real-time, LLM |
| 2 | **Leaflet + OpenStreetMap** | ✅ פעיל | מפות, מיקומים, GPS, ניתוב, אזורי כיסוי |
| 3 | **OSRM** | ✅ פעיל | חישוב מרחקים ומסלולים (חינמי) |
| 4 | **Twilio SMS** | ⚠️ קוד מוכן | עדכוני סטטוס, שיבוץ, סקרי שביעות רצון |
| 5 | **99Digital Bot** | ✅ פעיל | WhatsApp — קליטת קריאות אוטומטית |
| 6 | **iFrame CRM** | ✅ פעיל | חשבוניות במערכת CRM חיצונית |
| 7 | **PWA** | ✅ פעיל | התקנה, Offline, Push, Service Worker |
| 8 | **External CRM Webhook** | ⚠️ חלקי | סנכרון נתונים עם CRM חיצוני |
| 9 | **Waze** | ✅ פעיל | Deep links לניווט |

**ראו מסמך מפורט:** `docs/INTEGRATIONS_AND_TESTS.md`

---

## 9. מערכת עיצוב

### פלטת צבעים

| קטגוריה | צבע | שימוש |
|---------|-----|-------|
| Primary | `#FF6B6B` אדום עדין | כפתורים ראשיים, לוגו |
| Secondary | `#0EA5E9` תכלת | כפתורים משניים, קישורים |
| Success | `#22C55E` ירוק | הצלחה, הושלם |
| Warning | `#F59E0B` כתום | אזהרות, ממתין |
| Error | `#EF4444` אדום | שגיאות, בוטל |
| Info | `#8B5CF6` סגול | מידע, בדרך |

### צבעי סטטוסים

| סטטוס | רקע | טקסט |
|-------|-----|------|
| ממתין | `#FFFBEB` | `#D97706` |
| שובץ | `#E0F2FE` | `#0284C7` |
| בדרך | `#DDD6FE` | `#7C3AED` |
| בטיפול | `#DBEAFE` | `#2563EB` |
| הושלם | `#DCFCE7` | `#16A34A` |
| בוטל | `#FEE2E2` | `#DC2626` |

### טיפוגרפיה

- **גופן:** Heebo, Assistant, Arial, sans-serif
- **גדלים:** xs(12px) → 5xl(48px)
- **כיוון:** RTL

---

## 10. ביצועים ואופטימיזציה

### Bundle Splitting

| Chunk | גודל | תוכן |
|-------|------|-------|
| vendor-react | 164KB | React, React DOM, React Router |
| vendor-radix | 148KB | Radix UI components |
| vendor-maps | 155KB | Leaflet, React-Leaflet |
| vendor-motion | 114KB | Framer Motion |
| vendor-charts | 431KB | Recharts |
| vendor-pdf | 562KB | jspdf, html2canvas |
| vendor-icons | 57KB | Lucide React |
| vendor-query | 40KB | React Query |
| vendor-date | 27KB | date-fns |
| index (app) | 797KB | קוד האפליקציה |

### Lazy Loading

15+ רכיבים נטענים דינמית:
- TrackedCallsPanel, TechnicalQuestionnaire
- AI Widgets (Insights, Prediction, Recommendation)
- דוחות, מפות, SignaturePad

### תדירות רענון

| מסך | תדירות |
|-----|--------|
| ניטור תור | 15 שניות |
| דשבורד תור | 15 שניות |
| רשימת קריאות | 30 שניות |
| התור שלי | 30 שניות |
| פורטל ספקים | 30 שניות |
| שיבוץ חדש (ספק) | 10 שניות |
| צ'אט | 3 שניות |
| GPS | 30 שניות |
| התראות | מיידי (subscribe) |

---

## 11. הבהרות אפיון

הבהרות שהתקבלו מנתי גרופ במהלך האפיון:

| # | נושא | הגדרה | סטטוס |
|---|------|-------|-------|
| 1 | צי רכב | גררים + ניידות פנימיים. FleetManagement מומש | ✅ מומש |
| 2 | ניידת | כלי רכב שירות לשירותי דרך. `dispatch_type` עם המלצה אוטומטית | ✅ מומש |
| 3 | התראות ללקוחות | WhatsApp דרך בוט. SMS דרך Twilio | ⚠️ חלקי |
| 4 | חשבוניות | iFrame ל-CRM קיים (לא מערכת עצמאית) | ✅ מומש |
| 5 | תפקידים | 4 תפקידים עם מטריצת הרשאות מלאה | ✅ מומש |
| 6 | התראות בזמן אמת | SmartAlertsTab + detectSmartAlerts. ממתינים לספים | ⚠️ חלקי |
| 7 | תמחור ספק | VendorPricing מומש | ✅ מומש |
| 8 | דוחות | 7 סוגים. ממתינים לאפיון מפורט | ⚠️ חלקי |
| 9 | שיחות סגירה | recording_url + closing_call_done | ✅ מומש |
| 10 | שאלון טכני | TechnicalQuestionnaire + questionnaire_answers | ✅ מומש |
| 11 | קריאות במעקב | TrackedCallsPanel (lazy loaded) | ✅ מומש |

---

## 12. סטטוס פיתוח

### סיכום כללי

| קטגוריה | מספר |
|---------|------|
| מסכים | 47 |
| פונקציות Backend | 30 |
| Feature Modules | 11 |
| אינטגרציות | 9 |
| רכיבי UI (shadcn) | 85+ |
| Custom Hooks | 18+ |
| רכיבים עסקיים | 25+ |

### סטטוס לפי קטגוריה

| קטגוריה | סטטוס |
|---------|-------|
| UI/UX + RTL | ✅ |
| Responsive | ✅ |
| Authentication | ✅ |
| Authorization (4 roles) | ✅ |
| PWA | ✅ |
| Code Splitting | ✅ |
| Storybook | ✅ |
| ESLint + Prettier | ✅ |
| Pre-commit hooks | ✅ |

---

## 13. פיצ'רים חסרים ופערים

### עדיפות גבוהה

| # | פיצ'ר | תיאור |
|---|-------|-------|
| 1 | **WhatsApp Business API ישיר** | כיום דרך בוט 99Digital. נדרשת אינטגרציה ישירה |
| 2 | **ספים להתראות** | ממתינים להגדרות — כמה זמן לפני שמתריעים על איחור/SLA |
| 3 | **דוחות מפורטים** | ממתינים לאפיון — איחורים, דירוגים, ביצועים, חשבוניות |
| 4 | **דפי Agent** | AgentDashboard ו-AgentCallManagement מוגדרים אבל לא מומשו כדפים |
| 5 | **SMS Gateway** | קוד Twilio מוכן, חסר API Key ובדיקות |

### עדיפות בינונית

| # | פיצ'ר | תיאור |
|---|-------|-------|
| 6 | **חוויית מובייל** | PWA קיים, חוויה ייעודית יכולה להשתפר |
| 7 | **תזמון חכם** | Calendar קיים, חסר: התנגשויות, תזמון אוטומטי |
| 8 | **סטטוס הפסקה לספק** | רק available/offline — חסר "בהפסקה" |
| 9 | **מניעת שיבוץ כפול** | ספק עלול לאשר פעמיים ברשת איטית |
| 10 | **העברת קריאה בין ספקים** | ספק לא יכול להעביר אם לא מצליח לטפל |

### עדיפות נמוכה

| # | פיצ'ר | תיאור |
|---|-------|-------|
| 11 | **ERP Integration** | סנכרון מערכות ארגוניות |
| 12 | **BI / Power BI** | דשבורד אנליטי מותאם |
| 13 | **אפליקציית מובייל Native** | React Native |
| 14 | **Gamification** | נקודות ספקים, לוח מובילים |

### פערים בתהליכים (מתועדים)

- אין סיבות דחייה מוגדרות (ספק דוחה ללא פירוט)
- אין חישוב תשלום לספק לפני אישור
- אין זיהוי חפיפת קריאות (ספק מקבל 2 קריאות)
- אין תהליך אסקלציה אוטומטי (קריאה תקועה)
- אין סטטוס "לא ניתן לטיפול" (ביטול חלקי)
- ETA חישוב פשוט (לא מתחשב בפקקים)

---

## 14. מפת דרכים

### Q1 2026 (עכשיו)

- [ ] חיבור SMS Gateway (Twilio API Keys)
- [ ] השלמת מערכת התראות (SMTP, SLA Scheduler)
- [ ] מימוש דפי Agent (AgentDashboard, AgentCallManagement)
- [ ] אפיון דוחות מפורטים

### Q2 2026

- [ ] WhatsApp Business API ישיר
- [ ] שיפור אלגוריתם ETA (traffic-aware)
- [ ] מניעת שיבוץ כפול
- [ ] סטטוס "הפסקה" לספק

### Q3 2026

- [ ] AI Agents — חיבור ל-Backend + Scheduler
- [ ] אינטגרציית טלפוניה (Click-to-call, הקלטות)
- [ ] שיפור PWA — Push Notifications מלאים
- [ ] ניקוי קוד Legacy (features/)

### Q4 2026

- [ ] אפליקציית מובייל (React Native)
- [ ] Multi-tenant (מספר חברות)
- [ ] Gamification
- [ ] ERP Integration

---

## מסמכים משלימים

| מסמך | תיאור |
|------|--------|
| `docs/SYSTEM_SPECIFICATION.md` | אפיון טכני מפורט v3.0 (כולל רכיבים וקוד) |
| `docs/WORKFLOWS_SPEC.md` | אפיון זרימות עבודה טכני |
| `docs/BUSINESS_WORKFLOWS.md` | תהליכים עסקיים למנהלים |
| `docs/INTEGRATIONS_AND_TESTS.md` | אינטגרציות ותוכנית בדיקות |
| `docs/LESSONS_LEARNED.md` | לקחים ותיקונים |
| `docs/CLAUDE_WORKFLOW.md` | מדריך עבודה עם Claude Code |
| `CLAUDE.md` | הקשר לעבודה עם Claude |

---

**סוף מסמך**

*מסמך אפיון מערכת NatID CRM גרסה 3.0 — פברואר 2026. כולל 47 מסכים, 30 פונקציות backend, 4 תפקידים, 9 אינטגרציות.*
