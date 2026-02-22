# אינטגרציות ותוכנית בדיקות - NatID CRM
## מסמך טכני: חיבורים חיצוניים, APIs ותוכנית בדיקות

**תאריך:** 22/02/2026
**גרסה:** 1.0

---

## תוכן עניינים

### חלק א': אינטגרציות
1. [Base44 Platform](#1-base44-platform)
2. [Leaflet + OpenStreetMap + OSRM](#2-leaflet--openstreetmap--osrm)
3. [Twilio SMS](#3-twilio-sms)
4. [99Digital Bot (WhatsApp)](#4-99digital-bot-whatsapp)
5. [iFrame CRM (חשבוניות)](#5-iframe-crm-חשבוניות)
6. [PWA + Service Worker](#6-pwa--service-worker)
7. [External CRM Webhook](#7-external-crm-webhook)

### חלק ב': תוכנית בדיקות
8. [אסטרטגיית בדיקות](#8-אסטרטגיית-בדיקות)
9. [בדיקות יחידה (Unit Tests)](#9-בדיקות-יחידה)
10. [בדיקות אינטגרציה](#10-בדיקות-אינטגרציה)
11. [בדיקות E2E](#11-בדיקות-e2e)
12. [בדיקות ביצועים](#12-בדיקות-ביצועים)
13. [בדיקות אבטחה](#13-בדיקות-אבטחה)
14. [תרחישי בדיקה מפורטים](#14-תרחישי-בדיקה-מפורטים)

---

# חלק א': אינטגרציות

## 1. Base44 Platform

### סקירה כללית

Base44 היא פלטפורמת ה-Backend המרכזית של המערכת. מספקת CRUD, אימות, אחסון קבצים, ו-Serverless Functions.

### חיבור

**קובץ:** `src/api/base44Client.js`
**SDK:** `@base44/sdk` v0.8.3

```javascript
// אתחול
import { Base44 } from '@base44/sdk';
const base44 = new Base44({ appId: 'APP_ID' });
```

### שירותים

| שירות | שימוש | קובץ/רכיב |
|-------|-------|-----------|
| **Auth** | JWT Authentication, Login/Logout, me() | `AuthProvider.jsx`, `AuthContext.jsx` |
| **Entities** | CRUD לכל הישויות (Call, Customer, Vendor...) | `base44Client.js` — exports כל הישויות |
| **Functions** | 30 Serverless Functions (Deno TypeScript) | `functions/` directory |
| **Files** | העלאת/הורדת קבצים ותמונות | `CallPhoto`, File uploads |
| **Real-time** | Subscription לעדכונים | `useRealtimeUpdates.js` |
| **LLM** | AI Integration (סיכום, המלצות) | `generateCallSummary.ts`, `recommendVendor.ts` |
| **SendEmail** | שליחת אימיילים | `checkAndSendNotifications.ts` |

### Entities (ישויות נתונים)

| ישות | שימוש עיקרי |
|------|-------------|
| `Call` | קריאות שירות |
| `Customer` | לקוחות |
| `Vendor` | ספקים/נותני שירות |
| `User` | משתמשי מערכת |
| `WorkQueue` | תור עבודה |
| `VendorLocation` | מיקומי GPS ספקים |
| `VendorRating` | דירוגי ספקים |
| `VendorPayment` | תשלומים לספקים |
| `VendorContract` | חוזי ספקים |
| `CallHistory` | היסטוריית קריאה |
| `CallPhoto` | תמונות/קבצים |
| `CallAssignmentAttempt` | ניסיונות שיבוץ |
| `Notification` | התראות |
| `NotificationSetting` | העדפות התראות |
| `CustomerInteraction` | אינטראקציות לקוח |
| `CaseActivity` | פעילות Case |

### State Management

**ספרייה:** React Query (TanStack Query) v5.84.1
**קובץ מפתחות:** `src/lib/queryKeys.js`

```javascript
// דוגמה לשימוש
const { data: calls } = useQuery({
  queryKey: queryKeys.calls.list(filters),
  queryFn: () => Call.filter(filters)
});
```

### משתני סביבה

| משתנה | תיאור | חובה |
|-------|-------|------|
| `VITE_BASE44_APP_ID` | מזהה האפליקציה ב-Base44 | ✅ |

---

## 2. Leaflet + OpenStreetMap + OSRM

### סקירה כללית

מערכת מפות מלאה לתצוגת ספקים, מעקב GPS, ניתוב ואזורי כיסוי.

### חבילות

| חבילה | גרסה | שימוש |
|-------|-------|-------|
| `leaflet` | 1.9.x | ספריית מפות בסיסית |
| `react-leaflet` | 4.2.1 | עטיפת React ל-Leaflet |
| `leaflet-routing-machine` | 3.2.12 | ניתוב ומסלולים |

### רכיבי מפה

| רכיב | קובץ | תיאור |
|------|-------|-------|
| `VendorLiveMap` | `components/maps/VendorLiveMap.jsx` | מפה חיה של כל הספקים |
| `NavigationMap` | `components/maps/NavigationMap.jsx` | מפת ניווט |
| `MultiStopRouteOptimizer` | `components/maps/MultiStopRouteOptimizer.jsx` | אופטימיזציית מסלולים |
| `GeofenceManager` | `components/maps/GeofenceManager.jsx` | ניהול גבולות גיאוגרפיים |
| `RouteMap` | `components/maps/RouteMap.jsx` | מפת מסלול |
| `VendorMap` | `components/maps/VendorMap.jsx` | מפת ספק בודד |

### שירותי מרחק

**קובץ:** `src/services/distanceMatrix.js`
**API:** OSRM (Open Source Routing Machine) — חינמי, ללא מפתח

```
GET https://router.project-osrm.org/route/v1/driving/{lng1},{lat1};{lng2},{lat2}
```

**Backend Function:** `calculateDistanceAndETA.ts`

### Tile Server

**ספק:** OpenStreetMap
**URL:** `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
**עלות:** חינם (עם attribution)

---

## 3. Twilio SMS

### סקירה כללית

שליחת הודעות SMS ללקוחות ולספקים — עדכוני סטטוס, שיבוץ, סקר שביעות רצון.

### חיבור

**Function:** `functions/sendSMS.ts`
**סטטוס:** ⚠️ קוד מוכן, חסר הגדרת API Key

### Functions שמשתמשות ב-SMS

| Function | מתי | למי | תוכן |
|----------|-----|-----|-------|
| `sendSMS.ts` | כללי | כל נמען | הודעת SMS גנרית |
| `sendCallStatusUpdate.ts` | שינוי סטטוס | לקוח | "הספק בדרך אליך" |
| `sendFeedbackSMS.ts` | אחרי סיום | לקוח | קישור לסקר שביעות רצון |
| `autoAssignVendor.ts` | שיבוץ | ספק | "קריאה חדשה!" |

### משתני סביבה

| משתנה | תיאור | חובה |
|-------|-------|------|
| `TWILIO_ACCOUNT_SID` | מזהה חשבון Twilio | ✅ |
| `TWILIO_AUTH_TOKEN` | טוקן אימות | ✅ |
| `TWILIO_PHONE_NUMBER` | מספר השולח | ✅ |

### הערות

- SMS פועל דרך Twilio REST API
- תבניות SMS מוגדרות ב-`AutomationSettings.jsx`
- שפת ההודעות: עברית
- אין rate limiting מצד המערכת (Twilio עצמו מגביל)

---

## 4. 99Digital Bot (WhatsApp)

### סקירה כללית

בוט WhatsApp לקליטת קריאות שירות מלקוחות. הלקוח שולח הודעה, הבוט מנהל שאלון, ושולח Webhook למערכת.

### חיבור

**Functions:**
- `functions/botWebhook.ts` — מקבל Webhook מהבוט
- `functions/99digitalBot.ts` — מעבד נתונים ויוצר קריאה

### זרימת נתונים

```
לקוח WhatsApp ──▶ בוט 99Digital ──Webhook──▶ botWebhook.ts ──▶ 99digitalBot.ts ──▶ Call נוצר
                                                                       │
                                                                       ▼
                                                              תגובה לבוט:
                                                              מספר קריאה + קוד אימות
```

### נתונים שהבוט שולח

| קטגוריה | שדות |
|---------|------|
| לקוח | שם, טלפון, טלפון 2, ת.ז., אימייל, כתובת, חברת ביטוח, חבילה, מספר חבר |
| רכב | מספר רכב, דגם, שנה, סוג, סוג דלק |
| תקלה | סוג, תיאור, מיקום איסוף (כתובת+עיר+אזור+lat/lng), מיקום יעד |
| שאלון בטיחות | הכביש נגיש? חניון? הילוך סרק? הגה? בלם יד? אגרה? לקוח ליד רכב? מפתח? |

### Webhook Format

```json
{
  "source": "99digital",
  "customer": { "name": "...", "phone": "...", ... },
  "vehicle": { "plate": "...", "model": "...", ... },
  "issue": { "type": "...", "description": "...", "location": { ... } },
  "safety_questionnaire": { ... }
}
```

### הגדרות

**דף:** `IntegrationSettings.jsx`
**הגדרות:** Webhook URL, מיפוי שדות, הפעלה/כיבוי

---

## 5. iFrame CRM (חשבוניות)

### סקירה כללית

חשבוניות מנוהלות במערכת CRM חיצונית. NatID CRM מציגה iFrame.

### חיבור

**דף:** `Invoices.jsx`
**מנגנון:** `<iframe>` שמצביע ל-URL של ה-CRM החיצוני

### הרשאה

Admin בלבד — מוגדר ב-`PAGE_PERMISSIONS`

---

## 6. PWA + Service Worker

### סקירה כללית

Progressive Web App עם תמיכה בהתקנה, עבודה אופליין, ו-Push Notifications.

### חבילות

| חבילה | שימוש |
|-------|-------|
| `vite-plugin-pwa` v1.2.0 | יצירת Service Worker |
| `workbox` | אסטרטגיות caching |

### רכיבי PWA

| רכיב | קובץ | תיאור |
|------|-------|-------|
| `InstallPWA` | `components/pwa/InstallPWA.jsx` | כפתור התקנה |
| `OfflineIndicator` | `components/pwa/OfflineIndicator.jsx` | חיווי אופליין |
| `UpdateNotification` | `components/pwa/UpdateNotification.jsx` | התראת עדכון |
| `PushNotifications` | `components/notifications/PushNotifications.jsx` | Push Notifications |

### אסטרטגיית Caching

- **Static Assets:** Cache-first (JS, CSS, images)
- **API Calls:** Network-first with cache fallback
- **Icons/Fonts:** Cache-first, long TTL

---

## 7. External CRM Webhook

### סקירה כללית

Webhook לסנכרון נתונים עם מערכות CRM חיצוניות.

### חיבור

**Function:** `functions/externalCrmWebhook.ts`
**הגדרות:** `IntegrationSettings.jsx`

### יכולות

- שליחת עדכוני סטטוס קריאה ל-CRM חיצוני
- מיפוי שדות מותאם אישית
- Retry logic למקרה של כשל

---

# חלק ב': תוכנית בדיקות

## 8. אסטרטגיית בדיקות

### פירמידת בדיקות

```
          ┌─────┐
         /  E2E  \           ← מעט, איטיות, מכסות זרימות שלמות
        /─────────\
       / Integration \       ← בינוני, בודקות חיבורים
      /───────────────\
     /    Unit Tests    \    ← הרבה, מהירות, בודקות לוגיקה
    /─────────────────────\
```

### כלים מומלצים

| סוג | כלי | הסבר |
|-----|-----|------|
| Unit | Vitest | תואם Vite, מהיר, compatible עם Jest API |
| Component | React Testing Library | בדיקות רכיבי React |
| E2E | Playwright | Cross-browser, מהיר, תמיכה ב-PWA |
| API Mock | MSW (Mock Service Worker) | Mock ל-API calls ברמת הרשת |
| Coverage | c8 / istanbul | כיסוי קוד |

### מדדי כיסוי מומלצים

| אזור | יעד כיסוי | עדיפות |
|------|----------|--------|
| Backend Functions | 90% | 🔴 קריטי |
| Business Logic (hooks) | 80% | 🔴 קריטי |
| UI Components | 60% | 🟡 בינוני |
| Pages | 50% | 🟡 בינוני |
| Utils | 95% | 🟢 גבוה |

---

## 9. בדיקות יחידה (Unit Tests)

### 9.1 Backend Functions

כל 30 הפונקציות צריכות בדיקות יחידה:

#### autoAssignVendor.ts — שיבוץ אוטומטי

| # | תרחיש | קלט | תוצאה צפויה |
|---|--------|-----|-------------|
| 1 | שיבוץ רגיל — ספק זמין | קריאה + ספקים זמינים | ספק עם ניקוד הגבוה ביותר נבחר |
| 2 | אין ספקים זמינים | קריאה + כל הספקים offline | `{ success: false, reason: 'no_vendors' }` |
| 3 | כל הספקים דחו | קריאה + כל ספקים declined | סטטוס → awaiting_assignment |
| 4 | ספק אחד בלבד | קריאה + ספק יחיד | ספק נבחר ללא חלופות |
| 5 | ניקוד מרחק — 5 ק"מ | ספק ב-5km | ניקוד מרחק = 40 |
| 6 | ניקוד מרחק — 50+ ק"מ | ספק ב-60km | ניקוד מרחק = 5 |
| 7 | בונוס — פחות מ-3 קריאות | ספק עם 2 קריאות היום | +5 נקודות |
| 8 | קנס — יותר מ-10 קריאות | ספק עם 12 קריאות היום | -5 נקודות |
| 9 | סינון — סוג שירות | קריאת גרירה + ספק מכונאי | ספק מסונן |
| 10 | סינון — ספק שדחה | ספק שכבר דחה | ספק מסונן |

#### calculateDistanceAndETA.ts — חישוב מרחק

| # | תרחיש | קלט | תוצאה צפויה |
|---|--------|-----|-------------|
| 1 | מרחק רגיל | 2 נקודות 10km | ETA = (10×2)+10 = 30 דקות |
| 2 | מרחק 0 | אותה נקודה | ETA = 10 דקות (minimum buffer) |
| 3 | קואורדינטות לא תקינות | null/undefined | שגיאה מטופלת |

#### handleAssignmentResponse.ts — תגובת ספק

| # | תרחיש | קלט | תוצאה צפויה |
|---|--------|-----|-------------|
| 1 | ספק אישר | response: 'accepted' | סטטוס → vendor_enroute |
| 2 | ספק דחה | response: 'declined' | מעבר לספק הבא |
| 3 | Timeout | 2+ דקות ללא תגובה | מעבר לספק הבא |
| 4 | אישור כפול | 2 אישורים על אותה קריאה | רק הראשון מתקבל |

#### sendSMS.ts — שליחת SMS

| # | תרחיש | קלט | תוצאה צפויה |
|---|--------|-----|-------------|
| 1 | שליחה רגילה | מספר תקין + הודעה | SMS נשלח, return success |
| 2 | מספר לא תקין | מספר קצר | שגיאה מטופלת |
| 3 | Twilio down | API error | Retry + error log |

#### generateCallSummary.ts — סיכום AI

| # | תרחיש | קלט | תוצאה צפויה |
|---|--------|-----|-------------|
| 1 | קריאה רגילה | קריאה שהושלמה | סיכום בעברית |
| 2 | קריאה ללא נתונים | קריאה מינימלית | סיכום בסיסי |

### 9.2 Hooks (Business Logic)

#### useCalls

| # | תרחיש | תוצאה צפויה |
|---|--------|-------------|
| 1 | טעינת רשימת קריאות | data מוחזר, loading=false |
| 2 | סינון לפי סטטוס | רק קריאות מהסטטוס המבוקש |
| 3 | חיפוש לפי מספר קריאה | תוצאה מדויקת |
| 4 | יצירת קריאה חדשה | mutation success, cache invalidation |
| 5 | עדכון סטטוס | CallHistory נוצר |

#### useVendors

| # | תרחיש | תוצאה צפויה |
|---|--------|-------------|
| 1 | טעינת ספקים | רשימה מלאה |
| 2 | סינון לפי זמינות | רק ספקים available |
| 3 | עדכון מיקום | lat/lng מתעדכנים |
| 4 | Toggle זמינות | שינוי status |

#### useQueue

| # | תרחיש | תוצאה צפויה |
|---|--------|-------------|
| 1 | טעינת תור | פריטים ממוינים לפי priority_score |
| 2 | העברת קריאה | assigned_to_agent מתעדכן |
| 3 | חישוב עומס | ספירת קריאות לכל מוקדן |

### 9.3 Utils

| פונקציה | בדיקות |
|---------|--------|
| `queryKeys.js` | מפתחות ייחודיים, לא מתנגשים |
| `utils.js` / `utils.jsx` | פורמט תאריכים, חישובים, ולידציות |
| `distanceMatrix.js` | חישוב Haversine, טיפול ב-nulls |

---

## 10. בדיקות אינטגרציה

### 10.1 Base44 API

| # | תרחיש | מה בודקים |
|---|--------|-----------|
| 1 | CRUD Call | יצירה → קריאה → עדכון → מחיקה |
| 2 | CRUD Customer | יצירה → קריאה → עדכון → מחיקה |
| 3 | CRUD Vendor | יצירה → קריאה → עדכון → מחיקה |
| 4 | Auth flow | Login → me() → role verification |
| 5 | File upload | העלאת תמונה → URL חוזר |
| 6 | Filter + Sort | סינון ומיון ישויות |
| 7 | Real-time subscription | שינוי → callback מופעל |

### 10.2 בוט 99Digital

| # | תרחיש | מה בודקים |
|---|--------|-----------|
| 1 | Webhook תקין | Webhook → קריאה נוצרת |
| 2 | Webhook עם שדות חסרים | שדות חובה חסרים → שגיאה מטופלת |
| 3 | Webhook כפול | אותו Webhook פעמיים → קריאה אחת |
| 4 | חישוב עדיפות | VIP → ניקוד גבוה |
| 5 | הפעלת שיבוץ | קריאה נוצרת → autoAssign נקרא |

### 10.3 GPS + Maps

| # | תרחיש | מה בודקים |
|---|--------|-----------|
| 1 | עדכון מיקום | GPS update → VendorLocation נשמר |
| 2 | חישוב ETA | 2 נקודות → ETA סביר |
| 3 | מפה מרנדרת | VendorLiveMap → markers מוצגים |
| 4 | Geofence | נקודה בתוך/מחוץ לאזור |

---

## 11. בדיקות E2E

### 11.1 זרימות קריטיות

#### Flow 1: פתיחת קריאה ושיבוץ ספק

```
1. Login כמוקדן
2. לחיצה על "קריאה חדשה"
3. מילוי כל השדות
4. שליחה → אימות שהקריאה נוצרה
5. אימות שמופיע בדשבורד
6. אימות שמופיע בתור
7. שיבוץ ספק → אימות שסטטוס השתנה
```

#### Flow 2: מחזור חיים מלא של ספק

```
1. Login כספק
2. Toggle "זמין"
3. קבלת קריאה → אישור
4. "יצאתי לדרך" → אימות GPS
5. "הגעתי" → אימות סטטוס
6. העלאת תמונה
7. חתימה דיגיטלית
8. "סיום קריאה" → אימות completed
```

#### Flow 3: הרשאות

```
1. Login כספק → אימות שלא רואה Dashboard
2. Login כמוקדן → אימות שלא רואה VendorPricing
3. Login כמנהל → אימות שרואה הכל
4. ניסיון גישה ישירה ל-URL אסור → Redirect
```

#### Flow 4: קליטה מבוט

```
1. שליחת Webhook mock
2. אימות שקריאה נוצרה
3. אימות שאלון בטיחות נשמר
4. אימות customer_source = 'bot'
5. אימות שיבוץ אוטומטי הופעל
```

### 11.2 מצבי קצה

| # | תרחיש | אימות |
|---|--------|-------|
| 1 | ניתוק רשת באמצע פעולה | Toast שגיאה, retry |
| 2 | Session expired | Redirect ל-Login |
| 3 | קריאה בוטלה תוך כדי שיבוץ | סטטוס מתעדכן תקין |
| 4 | 2 מוקדנים עורכים אותה קריאה | אין דריסת נתונים |
| 5 | Mobile responsive | כל המסכים מרנדרים ב-375px |
| 6 | RTL rendering | כל הטקסט והלייאוט ב-RTL |

---

## 12. בדיקות ביצועים

### 12.1 מדדי יעד

| מדד | יעד | כלי מדידה |
|-----|-----|-----------|
| LCP (Largest Contentful Paint) | < 2.5 שניות | Lighthouse |
| FID (First Input Delay) | < 100ms | Lighthouse |
| CLS (Cumulative Layout Shift) | < 0.1 | Lighthouse |
| TTI (Time to Interactive) | < 3.5 שניות | Lighthouse |
| Bundle Size (total) | < 2.5MB | Vite build report |
| API Response Time | < 500ms | Network tab / monitoring |

### 12.2 בדיקות עומס

| # | תרחיש | מדד |
|---|--------|-----|
| 1 | 100 קריאות פתוחות בדשבורד | Render time < 1s |
| 2 | 50 ספקים על המפה | Map smooth at 60fps |
| 3 | 1000 הודעות צ'אט | Scroll smooth |
| 4 | 500 שורות בטבלת קריאות | Pagination works |

### 12.3 Bundle Splitting

| Chunk | גודל מרבי | בדיקה |
|-------|----------|-------|
| vendor-react | < 200KB | ✅ |
| vendor-radix | < 200KB | ✅ |
| vendor-maps | < 200KB | ✅ |
| vendor-charts | < 500KB | ✅ |
| vendor-pdf | < 600KB | ✅ |
| index (app) | < 900KB | ✅ |

---

## 13. בדיקות אבטחה

### 13.1 OWASP Top 10

| # | סיכון | בדיקה | סטטוס |
|---|-------|-------|-------|
| A01 | Broken Access Control | RoleGuard חוסם גישה, PermissionGuard פנימי | ✅ בדיקה נדרשת |
| A02 | Cryptographic Failures | JWT מ-Base44 (managed) | ✅ |
| A03 | Injection | React escaping, Zod validation | ✅ |
| A04 | Insecure Design | 3-layer auth enforcement | ✅ |
| A05 | Security Misconfiguration | CSP headers, HTTPS | ⚠️ בדיקה נדרשת |
| A07 | Auth Failures | Session management via Base44 | ✅ |

### 13.2 בדיקות ספציפיות

| # | בדיקה | תיאור |
|---|-------|-------|
| 1 | **XSS** | הזרקת script ב-call_summary, internal_notes |
| 2 | **IDOR** | ספק מנסה לגשת לקריאה של ספק אחר |
| 3 | **Privilege Escalation** | Operator מנסה לגשת ל-UserManagement |
| 4 | **CSRF** | בדיקת tokens ב-mutations |
| 5 | **Rate Limiting** | Webhook spam prevention |
| 6 | **Data Exposure** | ספק לא רואה שדות פיננסיים |

### 13.3 אבטחת ספקים

| בדיקה | מצופה |
|-------|-------|
| ספק גולש ל-`/dashboard` | RoleGuard → redirect ל-VendorPortal |
| ספק שולח API request ל-Call.list() | רואה רק קריאות שלו |
| ספק מנסה לערוך קריאה של ספק אחר | `assigned_vendor_id !== vendorProfile.id` → blocked |
| ספק מנסה לשנות מחיר | אין גישה ל-VendorPricing |

---

## 14. תרחישי בדיקה מפורטים

### 14.1 Regression — קריאת שירות

| # | תרחיש | שלבים | תוצאה צפויה | חומרה |
|---|--------|-------|-------------|-------|
| RC-01 | יצירת קריאה מינימלית | שם + טלפון + כתובת + סוג שירות | קריאה נוצרת | 🔴 |
| RC-02 | יצירת קריאה מלאה | כל השדות | כל השדות נשמרים | 🔴 |
| RC-03 | שאלון טכני | בחירת issue_type | שאלון מתאים נטען | 🟡 |
| RC-04 | ולידציית טלפון | מספר לא תקין | שגיאת ולידציה | 🔴 |
| RC-05 | שדה חובה ריק | כתובת ריקה | אי-אפשר לשלוח | 🔴 |
| RC-06 | עדכון סטטוס | waiting → assigned | CallHistory נוצר | 🔴 |
| RC-07 | ביטול קריאה | ביטול מצב כלשהו | סטטוס → cancelled | 🟡 |
| RC-08 | חתימה דיגיטלית | SignaturePad → save | חתימה נשמרת בקריאה | 🔴 |
| RC-09 | העלאת תמונה | צילום → upload | CallPhoto נוצר | 🟡 |
| RC-10 | סיכום AI | סיום קריאה | סיכום נוצר אוטומטית | 🟢 |

### 14.2 Regression — ספקים

| # | תרחיש | שלבים | תוצאה צפויה | חומרה |
|---|--------|-------|-------------|-------|
| RV-01 | יצירת ספק חדש | טופס NewVendor | ספק נוצר | 🔴 |
| RV-02 | Toggle זמינות | available ↔ offline | סטטוס מתעדכן + GPS | 🔴 |
| RV-03 | קבלת קריאה | אישור בתוך 2 דק' | סטטוס → vendor_enroute | 🔴 |
| RV-04 | דחיית קריאה | דחייה | CallAssignmentAttempt declined | 🔴 |
| RV-05 | סיום קריאה + חתימה | חתימה → סיום | completed + signature saved | 🔴 |
| RV-06 | GPS tracking | שליחת מיקום | VendorLocation updated | 🟡 |
| RV-07 | צ'אט עם מוקדן | שליחת הודעה | Message נוצר | 🟡 |

### 14.3 Regression — הרשאות

| # | תרחיש | תוצאה צפויה | חומרה |
|---|--------|-------------|-------|
| RP-01 | Admin → כל הדפים | גישה מלאה | 🔴 |
| RP-02 | Operator → דפי תפעול | גישה | 🔴 |
| RP-03 | Operator → VendorPricing | blocked | 🔴 |
| RP-04 | Operator → financial_summary | blocked | 🔴 |
| RP-05 | Vendor → VendorPortal | גישה | 🔴 |
| RP-06 | Vendor → Dashboard | blocked | 🔴 |
| RP-07 | Vendor → קריאה של ספק אחר | blocked | 🔴 |
| RP-08 | Agent → AgentDashboard | גישה | 🟡 |
| RP-09 | URL ישיר לדף אסור | redirect | 🔴 |

---

**סוף מסמך**

*מסמך טכני המתאר את כל האינטגרציות ותוכנית הבדיקות של NatID CRM. פברואר 2026.*
