# סקירת מצב מערכת NatID CRM - פברואר 2026

> **תאריך:** 12/02/2026
> **גרסה:** 2.0 (מתוקן לאחר אימות מול קוד)
> **מטרה:** מסמך ממצאים מקיף לפני תחילת תהליך בדיקות מערכת

---

## תוכן עניינים

1. [סיכום מנהלים](#1-סיכום-מנהלים)
2. [מצב תיעוד קיים](#2-מצב-תיעוד-קיים)
3. [סטטוס מודולים ופיצ'רים](#3-סטטוס-מודולים-ופיצרים)
4. [תהליכי עבודה מקצה לקצה](#4-תהליכי-עבודה-מקצה-לקצה)
5. [בעלי תפקידים והרשאות](#5-בעלי-תפקידים-והרשאות)
6. [RLS ואבטחת מידע](#6-rls-ואבטחת-מידע)
7. [פונקציות Backend](#7-פונקציות-backend)
8. [פערים ידועים וסיכונים](#8-פערים-ידועים-וסיכונים)
9. [המלצות לתהליך הבדיקות](#9-המלצות-לתהליך-הבדיקות)

---

## 1. סיכום מנהלים

### מה מוכן ועובד
- **10 מודולי פיצ'רים**, מתוכם 9 במצב COMPLETE ו-1 במצב PARTIAL (הגדרות מערכת)
- **44 עמודי UI** רשומים ב-config, כולל דשבורד, ניהול קריאות, פורטל ספקים, דוחות, ותור עבודה
- **30 פונקציות Backend** - כולן מומשו במלואן (0 stubs), **19 מתוכן מחוברות לפרונטאנד**, 11 לא
- **4 תפקידי משתמש** עם מטריצת הרשאות מוגדרת: Admin, Operator (מוקדן), Agent (טכנאי), Vendor (ספק)
- **9 פונקציות AI** - סיכום שיחות, ניתוח דפוסים, המלצת ספקים, חיזוי זמנים, קטגוריזציה חכמה
- **מערכת מפות** עם GPS בזמן אמת, מעקב ספקים, חישוב ETA

### מה דורש תשומת לב מיידית
- **🔴 הפרדת נתוני ספקים לא עובדת** - `getVendorScopedData` קיים אך **לא נקרא מאף עמוד**. כל עמודי הספק טוענים את כל הנתונים ומסננים client-side
- **🔴 באג בתגובת ספק לשיבוץ** - parameter mismatch: Frontend שולח `{attemptId, response}`, Backend מצפה ל-`{attempt_id, action}` - כל קריאה נכשלת
- **אין RLS ברמת הדאטהבייס** - אבטחת מידע מסתמכת על הפרדה ברמת UI בלבד
- **11 עמודים ללא הגנת תפקידים** בנתיב (route) - נגישים לכל משתמש מאומת
- **הגדרות מערכת (Settings)** - חלקן לא נשמרות בכלל, חלקן ב-localStorage בלבד
- **SMS/Email** - הקוד מוכן אך דורש הגדרת Twilio ו-SMTP

---

## 2. מצב תיעוד קיים

| מסמך | עדכון אחרון | תיאור |
|---|---|---|
| `SYSTEM_SPECIFICATION.md` | 05/02/2026 | אפיון מלא - 11 מודולים, 7 ישויות נתונים, מטריצת הרשאות |
| `docs/WORKFLOWS.md` | 05/02/2026 | 13 תהליכים טכניים מפורטים |
| `docs/BUSINESS_WORKFLOWS.md` | 05/02/2026 | תהליכים עסקיים - שפה נגישה למנהלים |
| `docs/LESSONS_LEARNED.md` | 08/02/2026 | 2 רשומות (Convention + Tooling) |
| `docs/CLAUDE_WORKFLOW.md` | 05/02/2026 | מדריך עבודה עם Claude Code |

**הערה:** כל התיעוד נוצר ב-5/2/2026 כחלק מהקמת תשתית הפרויקט. **לא בוצע עדכון אפיון מקיף מאז** - המסמך הנוכחי הוא הראשון.

---

## 3. סטטוס מודולים ופיצ'רים

### סיכום מהיר

| מודול | סטטוס | API Layer | Hooks | עמודים | Backend |
|---|---|---|---|---|---|
| **calls** (קריאות שירות) | ✅ COMPLETE | 12 פונקציות | 12+ hooks | 3 עמודים | 8 פונקציות |
| **vendors** (ספקים) | ✅ COMPLETE | 19 פונקציות | 17 hooks | 12 עמודים | 8 פונקציות |
| **customers** (לקוחות) | ✅ COMPLETE | 7 פונקציות | 7 hooks | 3 עמודים | - |
| **queue** (תור עבודה) | ✅ COMPLETE | 9 פונקציות | 8 hooks | 2 עמודים | 1 פונקציה |
| **reports** (דוחות) | ✅ COMPLETE | 5 פונקציות | 5 hooks | 3 עמודים | 1 פונקציה |
| **dashboard** (דשבורד) | ✅ COMPLETE | inline | inline | 1 עמוד | 1 פונקציה |
| **agents** (ניהול משתמשים) | ✅ COMPLETE | 6 פונקציות | 7 hooks | 2 עמודים | - |
| **cases** (ניהול תיקים) | ✅ COMPLETE | 8 פונקציות | 8 hooks | משותף עם calls | - |
| **operators** (מוקדנים) | ✅ COMPLETE | inline | inline | - | - |
| **settings** (הגדרות) | ⚠️ PARTIAL | חלקי | חלקי | 6 עמודים | 2 פונקציות |

### פירוט מודולים מרכזיים

#### קריאות שירות (calls) - הליבה
- CRUD מלא של קריאות שירות
- מחזור חיים: `new` → `waiting_treatment` → `awaiting_assignment` → `assigning` → `vendor_enroute` → `in_progress` → `completed`
- היסטוריית שינויים (CallHistory) עם לוג אוטומטי
- צ'אט פנימי בקריאה (טקסט, תמונות, קבצים, הודעות מערכת)
- תמונות ותיעוד (CallPhoto)
- סיכום AI אוטומטי (generateCallSummary, quickCallSummary)
- קטגוריזציה חכמה (categorizeCall)

#### ספקים (vendors) - המודול השלם ביותר
- CRUD + פורטל ספק ייעודי
- מעקב GPS בזמן אמת (watchPosition, עדכון כל 30 שניות)
- מפת ספקים חיה (Leaflet + OpenStreetMap)
- אלגוריתם שיבוץ אוטומטי (ניקוד עד 110 נקודות: מרחק 40, סוג שירות 20, דירוג 20, זמן תגובה 10, שיעור השלמה 10, בונוס רכב 5, איזון עומסים +5/-5)
- תשלומים ודוחות ביצועים
- חוזים וסטטוס זמינות
- חתימה דיגיטלית בסיום קריאה

#### תור עבודה (queue)
- תצוגת "התור שלי" לטכנאים (ללא polling אוטומטי - רענון ידני בלבד)
- מוניטור תור למנהלים (feature version: polling כל 5-10 שניות, page version: 30 שניות)
- העברת קריאות בין מוקדנים
- איזון עומסים (מקסימום 5 קריאות למוקדן)
- ניקוד עדיפויות אוטומטי

#### הגדרות מערכת (settings) - PARTIAL
| תת-מודול | סטטוס | שמירה | הערות |
|---|---|---|---|
| הגדרות התראות | ⚠️ מחובר חלקית | Base44 entities | באג: חסר import של `queryClient` → cache invalidation נכשל. גם `toggleNotification` משנה רק state מקומי |
| הגדרות אוטומציה | 🔴 שבור | localStorage (כתיבה בלבד) | כותב ל-localStorage אך **לא קורא חזרה** - תמיד מאתחל עם ברירות מחדל |
| הגדרות אינטגרציה | ⚠️ localStorage בלבד | localStorage (קריאה+כתיבה) | עובד client-side, שומר API keys/secrets בטקסט גלוי ב-localStorage |
| הגדרות חברה/SLA (feature) | 🔴 לא עובד | **אין שמירה כלל** | כפתור "שמור" ללא onClick handler. כל הinputs עם defaultValue בלבד |
| הגדרות חברה/SLA (page) | ⚠️ localStorage בלבד | localStorage (קריאה+כתיבה) | הערה בקוד: `"In a real app, this would save to backend"` |
| אינטגרציית בוט | ⚠️ עמוד מידע בלבד | לא נשמר | כפתור "בדיקת Webhook" = dead button (ללא onClick) |

---

## 4. תהליכי עבודה מקצה לקצה

### תהליכים עובדים (מאומתים בקוד)

| # | תהליך | Frontend | Backend | סטטוס |
|---|---|---|---|---|
| 1 | **יצירת קריאה ידנית** | NewCase.jsx → Calls.jsx | - | ✅ E2E |
| 2 | **שיבוץ ספק אוטומטי** | QueueMonitor.jsx | autoAssignVendor.ts (OSRM routing) | ✅ E2E |
| 3 | **מעקב GPS ספק** | VendorGPSTracker.jsx → MyVendorProfile.jsx | updateVendorLocation.ts | ✅ E2E |
| 4 | **חישוב מרחק וETA** | CaseDetails.jsx | calculateDistanceAndETA.ts (Google Maps / Haversine) | ✅ E2E |
| 5 | **צ'אט בקריאה** | EnhancedCallChat.jsx (Message entities + subscribe + polling 3s) | Message entities CRUD + file upload | ✅ E2E |
| 6 | **חתימה דיגיטלית** | SignaturePad component | Call entity update | ✅ E2E |
| 7 | **משוב לקוח (טוקן)** | CallFeedbackTab → CustomerFeedback.jsx | createFeedbackToken → getFeedbackTokenInfo → validateAndSubmitFeedback (שרשרת 4 פונקציות) | ✅ E2E |
| 8 | **סיכום AI לקריאה** | CallSummaryEditor.jsx | generateCallSummary.ts / quickCallSummary.ts | ✅ E2E |
| 9 | **קטגוריזציית AI** | AICategorization.jsx | categorizeCall.ts | ✅ E2E |
| 10 | **המלצת ספק AI** | VendorRecommendation.jsx | recommendVendor.ts | ✅ E2E |
| 11 | **ניתוח היסטורי AI** | EscalationPredictionWidget, RecurringPatternsWidget | analyzeHistoricalPatterns.ts | ✅ E2E |
| 12 | **ניהול משתמשים** | UserManagement.jsx | Base44 entities | ✅ E2E |
| 13 | **ניהול תפקידים** | RoleManagement.jsx | Role + UserPermission entities | ✅ E2E |
| 14 | **Audit Log** | AuditLog.jsx | logAuditAction.ts | ✅ E2E |
| 15 | **ניהול תור עבודה** | MyQueue.jsx + QueueMonitor.jsx | WorkQueue entities | ✅ E2E |
| 16 | **דוחות וייצוא** | Reports.jsx + AdvancedExport.jsx | entities + Excel/PDF export | ✅ E2E |
| 17 | **מפת ספקים חיה** | AllVendorsMap.jsx | VendorLocation entities | ✅ E2E |

### 🔴 תהליכים שנראים E2E אך שבורים בפועל

| # | תהליך | Frontend | Backend | בעיה |
|---|---|---|---|---|
| 1 | **תגובת ספק (קבלה/דחייה)** | VendorPortal.jsx שולח `{attemptId, response}` | handleAssignmentResponse.ts מצפה ל-`{attempt_id, action}` | **באג: Parameter mismatch** - כל קריאה מחזירה 400. תהליך השיבוץ שבור |
| 2 | **קליטת קריאה מבוט 99Digital** | BotIntegration.jsx = עמוד מידע סטטי בלבד, כפתור "בדיקת webhook" ללא onClick | 99digitalBot.ts עובד אם נקרא חיצונית | Frontend לא מפעיל/מגדיר/בודק - רק מציג URL. הכפתור "בדיקת Webhook" הוא dead button |
| 3 | **דירוג ספק (ישיר)** | אין קריאת `invoke('submitVendorRating')` ב-frontend | submitVendorRating.ts קיים אך לא נקרא | Frontend משתמש ב-validateAndSubmitFeedback דרך טוקן. הפונקציה הישירה submitVendorRating = dead code |

### תהליכים עם Backend מוכן אך לא מחובר

| # | תהליך | Backend Function | חסר |
|---|---|---|---|
| 1 | **שליחת SMS ללקוח על סטטוס** | sendCallStatusUpdate.ts (171 שורות, SMS+Email+In-App) | לא נקרא מ-frontend כלל |
| 2 | **התראות רב-ערוציות (SMS+Email+In-App)** | sendNotification.ts (175 שורות) | לא נקרא מ-frontend |
| 3 | **יצירת התראות in-app** | createNotification.ts | Frontend יוצר notifications ישירות דרך entities, לא דרך הפונקציה |
| 4 | **ניטור SLA וקריאות לא משובצות** | checkAndSendNotifications.ts | צריך cron job - אין scheduler |
| 5 | **בדיקת תפוגת חוזים** | checkContractExpiry.ts | צריך cron job - אין scheduler |
| 6 | **התראות חכמות** | detectSmartAlerts.ts | מופעל live מ-SmartAlertsTab (mount + כל 5 דק'); cron בפלטפורמה עדיין מומלץ לכיסוי כשאף אחד לא מחובר |
| 7 | **ניתוח דפוסי קריאות** | analyzeCallPatterns.ts | הוחלף ע"י analyzeHistoricalPatterns - dead code |
| 8 | **Webhook בוט גנרי** | botWebhook.ts | redundant עם 99digitalBot.ts, לא נקרא מאף מקום |

---

## 5. בעלי תפקידים והרשאות

### ארבעת התפקידים

| תפקיד | שם בעברית | תיאור | גישת עמודים |
|---|---|---|---|
| **admin** | מנהל מערכת | גישה מלאה לכל | כל העמודים |
| **operator** | מוקדן | ניהול קריאות יומיומי | דשבורד, קריאות, לקוחות, ספקים, תור, דוחות, מפות |
| **agent** | טכנאי | עבודה בשטח | AgentDashboard, AgentCallManagement (**שני העמודים לא קיימים בפועל** - phantom entries ב-permissions) |
| **vendor** | ספק | פורטל ספק | VendorPortal, VendorCallManagement, MyVendorProfile, VendorGuide |

### מטריצת הרשאות גרנולריות (ברירת מחדל)

| קטגוריה | פעולה | Admin | Operator | Agent | Vendor |
|---|---|---|---|---|---|
| **קריאות** | צפייה | ✅ | ✅ | ✅ | ❌* |
| | יצירה | ✅ | ✅ | ❌ | ❌ |
| | עריכה | ✅ | ✅ | ❌ | ❌ |
| | שיבוץ | ✅ | ✅ | ❌ | ❌ |
| | מחיקה | ✅ | ❌ | ❌ | ❌ |
| **ספקים** | צפייה | ✅ | ✅ | ❌ | ❌* |
| | יצירה/עריכה/מחיקה | ✅ | ❌ | ❌ | ❌ |
| | ניהול חוזים | ✅ | ❌ | ❌ | ❌ |
| **לקוחות** | צפייה | ✅ | ✅ | ❌ | ❌ |
| | יצירה/עריכה | ✅ | ✅ | ❌ | ❌ |
| | מחיקה | ✅ | ❌ | ❌ | ❌ |
| **דוחות** | צפייה + ביצועים | ✅ | ✅ | ❌ | ❌ |
| | ייצוא + כספי + היסטורי | ✅ | ❌ | ❌ | ❌ |
| **מערכת** | משתמשים/תפקידים/הגדרות | ✅ | ❌ | ❌ | ❌ |
| | אוטומציה/אינטגרציות/Audit | ✅ | ❌ | ❌ | ❌ |
| **ניטור** | מפה חיה + מעקב + תור | ✅ | ✅ | ❌ | ❌ |

> *⚠️ ספקים אמורים לגשת לנתונים שלהם דרך `getVendorScopedData`, אך בפועל הפונקציה לא נקראת. כל עמודי הספק טוענים את כל הנתונים ומסננים client-side בלבד. ראה סעיף 6.

### מנגנון הרשאות מותאמות אישית
- מנהל יכול ליצור **תפקידים מותאמים** דרך RoleManagement
- ניתן להגדיר **הרשאות פר-משתמש** שדורסות את הרשאות התפקיד
- ניתן להגביל עמודים ספציפיים פר-משתמש
- ניתן להגביל דוחות ספציפיים פר-משתמש

### סדר רזולוציית הרשאות
1. Admin → תמיד `true`
2. הרשאות מותאמות למשתמש (אם קיימות)
3. הרשאות מהתפקיד המשויך
4. ברירת מחדל לפי סוג תפקיד בסיסי

---

## 6. RLS ואבטחת מידע

### 🔴 RLS (Row Level Security) - לא מיושם

**אין RLS ברמת הדאטהבייס.** חיפוש מקיף בקוד (src/ + functions/) לא מצא שום יישום של row-level security, database policies, או הגבלת שורות ברמת ה-DB.

### מה קיים במקום

#### שכבה 1: הגנת Route (ניתוב)
- `AuthProvider` → בדיקת אימות (token + base44.auth.me)
- `RoleGuard` → בדיקת תפקיד ברמת עמוד
- `PermissionGuard` → בדיקת הרשאה גרנולרית ברמת רכיב

#### שכבה 2: הסתרת UI
- תפריט ניווט מסנן עמודים לפי `canAccessPage()`
- רכיבי `PermissionButton`, `PermissionLink` מסתירים פעולות לא מורשות

#### שכבה 3: Backend Functions
- **18 פונקציות** עם בדיקות auth + role
- **12 פונקציות** ללא אימות (webhooks, cron jobs, public endpoints)
- `getVendorScopedData` - פונקציית backend שמבצעת data scoping אמיתי, **אבל היא DEAD CODE - אף עמוד לא קורא לה!**

#### שכבה 4: Ownership checks (client-side בלבד)
- פונקציות ספק (updateVendorStatus, updateVendorLocation) בודקות `vendor.email !== user.email`
- CallDetailsVendor בודק `call.assigned_vendor_id !== currentVendor?.id` (צד לקוח בלבד - הנתונים כבר נטענו)

### 🔴🔴 הפרדת נתוני ספקים - לא עובדת

**זהו הממצא הקריטי ביותר.** ה-hook `useVendorScopedData` ופונקציית ה-Backend `getVendorScopedData` קיימים ומיושמים נכון, אבל **אף עמוד ספק לא משתמש בהם**. כל עמודי הספק טוענים את כל הנתונים:

| עמוד ספק | מה טוען | חומרה |
|---|---|---|
| `VendorPortal.jsx` (feature) | `Vendor.list()` + `Call.list(500)` → מסנן client-side | 🔴 חושף כל הקריאות של כל הספקים |
| `CallDetailsVendor.jsx` | `Vendor.list()` + `Call.filter({id})` → בדיקת ownership בצד לקוח | 🔴 חושף רשימת כל הספקים |
| `VendorCallManagement.jsx` | `Call.filter({id: URL param})` → ללא בדיקת ownership | 🔴 ספק יכול לקרוא **ולערוך** כל קריאה דרך שינוי URL |
| `MyCallsVendor.jsx` | `Vendor.list()` + `Call.list(500)` → מסנן client-side | 🔴 חושף כל הקריאות |
| `VendorPayments.jsx` | `Vendor.list()` + `Call.list(1000)` → מסנן client-side | 🔴 חושף נתונים כספיים של כל הספקים |
| `VendorPortal.jsx` (page) | `Call.filter({assigned_vendor_id})` - סינון server-side | ⚠️ טוב יותר, אך vendorProfile.id מגיע מצד לקוח |

**מה זה אומר בפועל:** ספק שנכנס למערכת ופותח DevTools יכול לראות:
- את כל הקריאות של כל הספקים (שמות לקוחות, טלפונים, כתובות, לוחיות רכב)
- את רשימת כל הספקים (שמות, אימיילים, טלפונים, דירוגים)
- נתוני תשלומים של ספקים אחרים
- ויכול לערוך קריאות של ספקים אחרים דרך VendorCallManagement

### תהליך אימות (Authentication Flow)

```
1. Token מגיע דרך URL parameter → נשמר ב-localStorage
2. AuthProvider קורא ל-base44.auth.me() → מקבל user object
3. אם אין token / token פג → הפנייה לעמוד Login
4. אם user לא רשום → עמוד "לא רשום"
5. אם הכל תקין → טעינת האפליקציה עם context של user
```

### 🔴 פערי אבטחה קריטיים

| # | פער | חומרה | פירוט |
|---|---|---|---|
| 1 | **אין RLS** | קריטי | Base44 entities API לא מסנן לפי תפקיד. משתמש מאומת יכול תיאורטית לקרוא `base44.entities.Call.list()` ולראות את כל הקריאות |
| 2 | **11 עמודים ללא הגנת route** | גבוה | `AdminDisplaySettings`, `EditVendor`, `CustomerDetails`, `VendorDetails`, `OperationalRates`, `FeedbackManagement`, `ProductCatalog`, `Reminders`, `FormView`, `UserProfile`, `LandingPage` - נגישים לכל משתמש מאומת ללא RoleGuard |
| 3 | **99digitalBot.ts ללא אימות** | גבוה | כל גורם שמכיר את ה-URL יכול ליצור קריאות שירות שרירותיות |
| 4 | **externalCrmWebhook.ts - אימות מותנה** | גבוה | בדיקת webhook secret רק אם ENV var קיים - אם לא הוגדר, הפונקציה פתוחה |
| 5 | **sendSMS.ts ללא בדיקת תפקיד** | גבוה | כל משתמש מאומת יכול לשלוח SMS לכל מספר |
| 6 | **usePermissions fallback** | בינוני | כשנקרא מחוץ ל-Provider, מחזיר `canAccessPage: () => true` (גישה לכל) |
| 7 | **Triple AuthProvider** | בינוני | 3 ספקי auth נפרדים שיוצרים בלבול ו-redundancy |
| 8 | **Vendor client-side entity access** | **קריטי** | כל עמודי הספק קוראים `Vendor.list()` + `Call.list(500-1000)`. VendorCallManagement מאפשר **כתיבה** לכל קריאה דרך URL param. ראה סעיף 6 |
| 9 | **Token ב-URL + localStorage** | נמוך | סיכון דליפה דרך referrer headers / browser history / XSS |

---

## 7. פונקציות Backend

### סטטיסטיקה

- **סה"כ:** 30 פונקציות TypeScript (Deno serverless)
- **מומשו במלואן:** 30 (0 stubs)
- **נקראות מ-frontend (invoke):** 19
- **לא מחוברות ל-frontend:** 11 (3 cron jobs, 3 webhooks חיצוניים, 3 notification functions, submitVendorRating, analyzeCallPatterns)

### לפי קטגוריה

| קטגוריה | פונקציות | סטטוס חיבור |
|---|---|---|
| **AI (9)** | analyzeCallPatterns, analyzeHistoricalPatterns, analyzeVendorPerformance, categorizeCall, generateCallSummary, quickCallSummary, predictCallTimes, recommendVendor, detectSmartAlerts | 7 מחוברות, 2 לא (analyzeCallPatterns - מיושן?, detectSmartAlerts - cron) |
| **שיבוץ (2)** | autoAssignVendor, handleAssignmentResponse | ✅ שתיהן מחוברות |
| **תקשורת (6)** | sendSMS, sendFeedbackSMS, sendCallStatusUpdate, sendNotification, checkAndSendNotifications, createNotification | 2 מחוברות, 4 לא |
| **ספקים (4)** | updateVendorLocation, updateVendorStatus, getVendorScopedData, submitVendorRating | 2 מחוברות (location, status). getVendorScopedData = dead code. submitVendorRating = dead code |
| **משוב (3)** | createFeedbackToken, getFeedbackTokenInfo, validateAndSubmitFeedback | ✅ כולן מחוברות |
| **אינטגרציות (3)** | 99digitalBot, botWebhook, externalCrmWebhook | 99digitalBot + externalCrmWebhook מחוברות (config), botWebhook לא |
| **Admin (3)** | logAuditAction, calculateDistanceAndETA, checkContractExpiry | 2 מחוברות, checkContractExpiry = cron |

### משתני סביבה נדרשים

| Variable | נדרש ע"י | חובה? |
|---|---|---|
| `TWILIO_ACCOUNT_SID` | sendSMS, sendCallStatusUpdate, sendNotification | כן - לשליחת SMS |
| `TWILIO_AUTH_TOKEN` | sendSMS, sendCallStatusUpdate, sendNotification | כן - לשליחת SMS |
| `TWILIO_PHONE_NUMBER` | sendSMS, sendCallStatusUpdate, sendNotification | כן - לשליחת SMS |
| `GOOGLE_MAPS_API_KEY` | calculateDistanceAndETA | לא - יש fallback ל-Haversine |
| `BOT_WEBHOOK_SECRET` | botWebhook | כן - לאימות webhook |
| `WEBHOOK_SECRET` | externalCrmWebhook | ⚠️ אם לא מוגדר - הפונקציה פתוחה! |

---

## 8. פערים ידועים וסיכונים

### קריטי (חובה לפני Production)

| # | פער | מודול | תיאור |
|---|---|---|---|
| 1 | **הפרדת נתוני ספקים שבורה** | אבטחה | `getVendorScopedData` = dead code. כל עמודי הספק טוענים את **כל** הנתונים. ספק רואה קריאות, לקוחות, ותשלומים של ספקים אחרים |
| 2 | **VendorCallManagement - כתיבה ללא הרשאה** | אבטחה | ספק יכול לערוך **כל** קריאה דרך שינוי URL param. אין ownership check |
| 3 | **באג בתגובת ספק לשיבוץ** | calls | Frontend שולח `{attemptId, response}`, Backend מצפה ל-`{attempt_id, action}`. **כל קריאה נכשלת ב-400** |
| 4 | אין RLS | אבטחה | entities API פתוח לכל משתמש מאומת |
| 5 | 11 עמודים ללא הגנת route | routing | AdminDisplaySettings, EditVendor, CustomerDetails, VendorDetails, OperationalRates, FeedbackManagement ועוד 5 - נגישים לכל |
| 6 | 99digitalBot ללא אימות | webhook | יכול לקבל קריאות זדוניות |
| 7 | externalCrmWebhook אימות מותנה | webhook | בלי WEBHOOK_SECRET הפונקציה פתוחה |

### גבוה (יש לטפל לפני Launch)

| # | פער | מודול | תיאור |
|---|---|---|---|
| 8 | Settings לא נשמרות | settings | חברה/SLA: כפתור שמור ללא handler. אוטומציה: כותב ל-localStorage אך לא קורא. אינטגרציה: localStorage בלבד. התראות: באג queryClient |
| 9 | SMS ללא הגבלת תפקיד | sendSMS | כל משתמש מאומת (כולל vendor/agent) יכול לשלוח SMS לכל מספר |
| 10 | 5 פונקציות תקשורת לא מחוברות | notifications | sendCallStatusUpdate, sendNotification, createNotification, checkAndSendNotifications, botWebhook |
| 11 | 3 cron jobs ללא scheduler | scheduling | checkAndSendNotifications, checkContractExpiry, detectSmartAlerts |
| 12 | 2 רשומות phantom ב-permissions | permissions | AgentDashboard, AgentCallManagement רשומים ב-PAGE_PERMISSIONS אך **לא קיימים כעמודים** |
| 13 | Agents page = stub | agents | "Coming Soon" - עמוד AI agents |

### בינוני (שיפור לפני GA)

| # | פער | מודול | תיאור |
|---|---|---|---|
| 15 | Dual implementation pattern | architecture | עמודים רבים משתמשים ב-legacy hooks במקום feature hooks |
| 16 | Triple AuthProvider | auth | 3 ספקי auth נפרדים - בלבול ו-redundancy |
| 17 | Dead code: 4 פונקציות backend | backend | analyzeCallPatterns, submitVendorRating, getVendorScopedData, botWebhook - קיימות אך אף אחד לא קורא להן |
| 18 | ETA calculation בסיסי | vendors | Haversine distance / 40 קמ"ש כברירת מחדל |
| 19 | usePermissions fallback לא בטוח | permissions | `canAccessPage` מחזיר `true` אם נקרא מחוץ ל-Provider (אם כי לא משפיע על RoleGuard) |
| 20 | API keys ב-localStorage | settings | IntegrationSettings שומר API keys/webhook secrets בטקסט גלוי ב-localStorage |

### נמוך (שיפור מתמשך)

| # | פער | מודול | תיאור |
|---|---|---|---|
| 21 | אין מנגנון העברת קריאות בין ספקים | calls | ספק לא יכול להעביר קריאה לספק אחר |
| 22 | אין ניהול "הפסקה" לספק | vendors | אין סטטוס break מובנה |
| 23 | ספק לא רואה דירוג עצמי | vendors | דירוג מחושב אך לא מוצג לספק |
| 24 | אין זיהוי חפיפה בשיבוצים | assignments | ספק יכול להיות משובץ ל-2 קריאות במקביל |
| 25 | AppAccessDeniedError באנגלית | UI | שאר המערכת בעברית |

---

## 9. המלצות לתהליך הבדיקות

### שלב 1: בדיקות אבטחה (עדיפות עליונה)

- [ ] **🔴 בדיקת חשיפת נתוני ספקים**: התחבר כספק, פתח DevTools Network tab, וודא שרואה נתוני קריאות/ספקים/תשלומים של אחרים
- [ ] **🔴 בדיקת כתיבה ללא הרשאה**: כספק, נווט ל-VendorCallManagement?id=<קריאה של ספק אחר>, נסה לערוך
- [ ] **🔴 בדיקת באג handleAssignmentResponse**: נסה לקבל/לדחות שיבוץ כספק - צפוי שגיאה 400
- [ ] **בדיקת route protection**: נסה לנווט ל-AdminDisplaySettings, EditVendor כ-vendor/agent
- [ ] **בדיקת webhook endpoints**: שלח requests ל-99digitalBot ו-externalCrmWebhook ללא אימות
- [ ] **בדיקת sendSMS**: נסה לקרוא מתפקיד vendor/agent
- [ ] **בדיקת Agent role**: התחבר כ-agent - וודא שאין לו אף עמוד פונקציונלי (AgentDashboard/AgentCallManagement לא קיימים)

### שלב 2: בדיקות E2E לתהליכים מרכזיים

- [ ] **תהליך קריאה מלא**: יצירה → שיבוץ → קבלת ספק → GPS → טיפול → חתימה → סגירה
- [ ] **קליטת בוט**: שליחת webhook → יצירת קריאה → שיבוץ אוטומטי
- [ ] **פורטל ספק**: התחברות → קבלת קריאה → עדכון סטטוס → סיום
- [ ] **תור עבודה**: קריאה חדשה → כניסה לתור → שיוך למוקדן → טיפול → סגירה
- [ ] **משוב לקוח**: יצירת טוקן → שליחה ללקוח → מילוי → עדכון דירוג ספק

### שלב 3: בדיקות פר-תפקיד

- [ ] **Admin**: גישה לכל העמודים, ניהול משתמשים ותפקידים, audit log
- [ ] **Operator**: דשבורד, יצירת קריאות, שיבוץ, תור, דוחות, מפות
- [ ] **Agent**: ⚠️ AgentDashboard + AgentCallManagement לא קיימים - תפקיד Agent בעצם חסר עמודים. וודא שלא ניתן לגשת לעמודי admin/operator
- [ ] **Vendor**: פורטל ספק - וודא שרואה **רק** נתונים שלו (כרגע צפוי לכשל - ראה סעיף 6)

### שלב 4: בדיקות פונקציונליות

- [ ] **AI Functions**: בדוק שכל 9 פונקציות AI מחזירות תוצאות הגיוניות
- [ ] **מפות**: GPS tracking, ETA calculation, vendor map display
- [ ] **דוחות**: סינון, ייצוא Excel/PDF, KPIs
- [ ] **צ'אט**: שליחת הודעות, תמונות, הודעות מערכת
- [ ] **התראות**: הגדרת התראות, קבלת in-app notifications

### שלב 5: בדיקות UI/UX

- [ ] **RTL**: כל העמודים מוצגים נכון ב-RTL
- [ ] **עברית**: כל הטקסט בעברית (למעט שגיאות מערכת)
- [ ] **Responsive**: תצוגה תקינה במובייל (PWA)
- [ ] **Loading states**: ספינרים ו-skeletons בכל טעינה
- [ ] **Error handling**: הודעות שגיאה הגיוניות ובעברית

---

## נספח: רשימת כל העמודים (44 רשומים + 2 phantom)

| עמוד | תפקידים מורשים | שורות קוד |
|---|---|---|
| Dashboard | admin, operator | 577 |
| Calls | admin, operator | 369 |
| CallDetails | admin, operator | 568 |
| NewCase | admin, operator | 422 |
| Customers | admin, operator | 282 |
| CustomerDetails | **לא מוגדר** | 162 |
| CustomerFeedback | admin, operator | 313 |
| ServiceProviders | admin, operator | 454 |
| VendorDetails | **לא מוגדר** | 293 |
| VendorContracts | admin, operator | 479 |
| VendorTracking | admin, operator | 335 |
| AllVendorsMap | admin, operator | 329 |
| CoverageAreas | admin, operator | 350 |
| EditVendor | **לא מוגדר** | 409 |
| NewVendor | admin, operator | 435 |
| MyQueue | admin, operator | 287 |
| QueueMonitor | admin, operator | 325 |
| Reports | admin, operator | 555 |
| AdvancedExport | admin, operator | 726 |
| HistoricalDataAnalysis | admin, operator | 700 |
| Calendar | admin, operator | 353 |
| Settings | admin | 144 |
| AutomationSettings | admin | 400 |
| IntegrationSettings | admin | 179 |
| NotificationSettings | admin, operator | 233 |
| MyNotificationSettings | admin, operator, vendor, agent | 42 |
| AdminDisplaySettings | **לא מוגדר** | 200 |
| UserManagement | admin | 456 |
| RoleManagement | admin | 510 |
| AuditLog | admin | 311 |
| ImportHistoricalData | admin | 245 |
| UserProfile | **לא מוגדר** | 205 |
| UserGuide | admin, operator, vendor, agent | 375 |
| VendorGuide | vendor | 630 |
| VendorPortal | vendor | 767 |
| VendorCallManagement | vendor | 748 |
| MyVendorProfile | vendor | 529 |
| AgentDashboard | agent (ב-PAGE_PERMISSIONS) | **לא קיים כעמוד** - phantom entry |
| AgentCallManagement | agent (ב-PAGE_PERMISSIONS) | **לא קיים כעמוד** - phantom entry |
| Agents | admin, operator | 51 |
| LandingPage | **לא מוגדר** | 402 |
| FormView | **לא מוגדר** | 171 |
| OperationalRates | **לא מוגדר** | 296 |
| ProductCatalog | **לא מוגדר** | 303 |
| FeedbackManagement | **לא מוגדר** | 130 |
| Reminders | **לא מוגדר** | 18 |

> **"לא מוגדר"** = לא רשום ב-PAGE_PERMISSIONS, נגיש לכל משתמש מאומת ללא RoleGuard.
> LandingPage, FormView, UserProfile - ציבוריים מטבעם, סביר שלא צריכים הגנה.
> **הבעייתיים - דורשים הוספת הגנת route:** `AdminDisplaySettings`, `EditVendor`, `OperationalRates`, `CustomerDetails`, `VendorDetails`, `FeedbackManagement`.
> **AgentDashboard + AgentCallManagement** - רשומים ב-PAGE_PERMISSIONS עם הרשאת `agent` אך **לא קיימים כעמודים** (phantom entries). משמעות: תפקיד Agent מוגדר ב-permissions אך אין לו אף עמוד פונקציונלי.
