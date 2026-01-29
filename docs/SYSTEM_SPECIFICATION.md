# אפיון מלא של מערכת NatID CRM
## מערכת ניהול שירותי דרך - נתיב

**תאריך עדכון:** 29/01/2026
**גרסה:** 3.0

---

## תוכן עניינים

1. [סקירה כללית](#1-סקירה-כללית)
2. [ארכיטקטורה וטכנולוגיות](#2-ארכיטקטורה-וטכנולוגיות)
3. [מבנה הפרויקט](#3-מבנה-הפרויקט)
4. [מערכת העיצוב (Design System)](#4-מערכת-העיצוב)
5. [מודל הנתונים (Entities)](#5-מודל-הנתונים)
6. [דפי האפליקציה (30 דפים)](#6-דפי-האפליקציה)
7. [מודולים ופיצ'רים - ניהול קריאות](#7-ניהול-קריאות-שירות)
8. [מודולים ופיצ'רים - ניהול לקוחות](#8-ניהול-לקוחות)
9. [מודולים ופיצ'רים - ניהול ספקים](#9-ניהול-ספקים)
10. [מודולים ופיצ'רים - דשבורד](#10-דשבורד-ראשי)
11. [מודולים ופיצ'רים - ניהול תור](#11-ניהול-תור)
12. [מודולים ופיצ'רים - מפות ומיקום](#12-מפות-ומיקום)
13. [מודולים ופיצ'רים - דוחות](#13-דוחות-וניתוח)
14. [מודולים ופיצ'רים - פורטל ספקים](#14-פורטל-ספקים)
15. [מודולים ופיצ'רים - ניהול משתמשים](#15-ניהול-משתמשים)
16. [מודולים ופיצ'רים - בוט 99Digital](#16-אינטגרציית-בוט-99digital)
17. [מודולים ופיצ'רים - שיבוץ חכם](#17-הקצאת-ספקים-חכמה)
18. [מודולים ופיצ'רים - הגדרות מערכת](#18-הגדרות-מערכת)
19. [מודולים ופיצ'רים - נגישות](#19-כלי-נגישות)
20. [מודולים ופיצ'רים - חוזי ספקים](#20-ניהול-חוזי-ספקים)
21. [מודולים ופיצ'רים - ייבוא וייצוא נתונים](#21-ייבוא-וייצוא-נתונים)
22. [מודולים ופיצ'רים - יומן ביקורת](#22-יומן-ביקורת)
23. [מודולים ופיצ'רים - לוח שנה](#23-לוח-שנה)
24. [מודולים ופיצ'רים - מדריך למשתמש](#24-מדריך-למשתמש)
25. [מודולים חלקיים](#25-מודולים-בפיתוח--חלקיים)
26. [מודולים שטרם פותחו](#26-מודולים-שטרם-פותחו)
27. [Backend Functions (19 פונקציות)](#27-backend-functions)
28. [Custom Hooks (18+ hooks)](#28-custom-hooks)
29. [ספריית רכיבי UI (63+ רכיבים)](#29-ספריית-רכיבי-ui)
30. [רכיבים עסקיים מותאמים](#30-רכיבים-עסקיים-מותאמים)
31. [מערכת אימות והרשאות](#31-מערכת-אימות-והרשאות)
32. [מערכת התראות](#32-מערכת-התראות)
33. [PWA ותמיכה אופליין](#33-pwa-ותמיכה-אופליין)
34. [זרימות עבודה](#34-זרימות-עבודה)
35. [אינטגרציות חיצוניות](#35-אינטגרציות-חיצוניות)
36. [משתני סביבה וקונפיגורציה](#36-משתני-סביבה-וקונפיגורציה)
37. [קבצי Features (קוד לא מנותב)](#37-קבצי-features-קוד-לא-מנותב)
38. [סיכום סטטיסטי](#38-סיכום-סטטיסטי)
39. [המלצות לפיתוח עתידי](#39-המלצות-לפיתוח-עתידי)
40. [רשימת קבצים מלאה](#40-רשימת-קבצים-מלאה)

---

## 1. סקירה כללית

**NatID CRM** (נתיב) היא מערכת ניהול שירותי דרך מקיפה המיועדת לחברת "נתי שירותי דרך". המערכת מאפשרת:

- קליטת קריאות שירות מבוטים ומוקדנים
- הקצאת ספקים חכמה באמצעות אלגוריתם ניקוד רב-פרמטרי
- מעקב בזמן אמת אחר מיקום ספקים (GPS)
- ניהול לקוחות, חוזים ו-SLA
- דוחות וניתוח ביצועים
- פורטל ספקים עצמאי
- תמיכה מלאה בעברית (RTL)
- PWA עם תמיכה אופליין

**שפת ממשק:** עברית (RTL)
**סוג אפליקציה:** SPA - Single Page Application + PWA
**פלטפורמת Backend:** Base44

---

## 2. ארכיטקטורה וטכנולוגיות

### Frontend

| רכיב | טכנולוגיה | גרסה |
|------|-----------|-------|
| Framework | React | 18.2.0 |
| Build Tool | Vite | 6.1.0 |
| שפת תכנות | JavaScript (JSX) | ES2020+ |
| UI Framework | Radix UI + shadcn/ui | 63+ רכיבים |
| סטיילינג | Tailwind CSS | 3.4.17 |
| State Management | React Query (TanStack) | 5.84.1 |
| Routing | React Router DOM | 6.26.0 |
| טפסים | React Hook Form | 7.54.2 |
| ולידציה | Zod | 3.24.2 |
| אנימציות | Framer Motion | 11.16.4 |
| אנימציות נוספות | Lottie React | 2.4.0 |
| מפות | React Leaflet | 4.2.1 |
| ניווט מפות | Leaflet Routing Machine | 3.2.12 |
| גרפים | Recharts | 2.15.4 |
| גרפים נוספים | Chart.js | 4.4.0 |
| 3D | Three.js | 0.171.0 |
| תשלומים | Stripe.js | 5.2.0 |
| PDF | jsPDF | 2.5.2 |
| צילום מסך | HTML2Canvas | 1.4.1 |
| Markdown | React Markdown | 9.0.1 |
| עורך טקסט | React Quill | 2.0.0 |
| Drag & Drop | Hello Pangea DnD | 17.0.0 |
| קרוסלה | Embla Carousel | 8.5.2 |
| Drawer | Vaul | 1.1.2 |
| OTP | Input OTP | 1.4.2 |
| תאריכים | date-fns | 3.6.0 |
| תאריכים נוספים | Moment.js | 2.30.1 |
| Utilities | Lodash | 4.17.21 |
| Toast | Sonner | 2.0.1 |
| Toast נוסף | React Hot Toast | 2.6.0 |

### Backend

| רכיב | טכנולוגיה |
|------|-----------|
| פלטפורמה | Base44 |
| SDK | @base44/sdk 0.8.3 |
| Functions Runtime | Deno TypeScript (Serverless) |
| מסד נתונים | Base44 Entities (Managed) |
| אימות | Base44 Auth (JWT) |
| אחסון קבצים | Base44 Files |
| AI/LLM | Base44 LLM Integration |

### כלי פיתוח

| כלי | גרסה |
|-----|-------|
| ESLint | 9.19.0 |
| Prettier | 3.8.0 |
| Storybook | 8.6.15 |
| Husky | 9.1.7 |
| Lint Staged | 16.2.7 |
| PostCSS | 8.5.1 |
| Autoprefixer | 10.4.20 |

---

## 3. מבנה הפרויקט

```
natid-crm/
├── .husky/                      # Git hooks (pre-commit)
├── .storybook/                  # Storybook configuration
├── dev-dist/                    # Development distribution
├── docs/                        # תיעוד
│   └── SYSTEM_SPECIFICATION.md  # מסמך זה
├── functions/                   # 19 Backend Serverless Functions (Deno)
├── public/                      # נכסים סטטיים, manifest, icons
├── src/
│   ├── api/
│   │   └── base44Client.js      # אתחול SDK של Base44
│   ├── components/
│   │   ├── ui/                  # 63+ רכיבי shadcn/ui
│   │   ├── ai/                  # 4 רכיבי AI insights
│   │   ├── animations/          # רכיב אנימציה
│   │   ├── auth/                # רכיבי אימות
│   │   ├── call/                # רכיב סיכום קריאה
│   │   ├── calls/               # רכיבי קריאות נוספים
│   │   ├── chat/                # 2 רכיבי צ'אט בקריאה
│   │   ├── contracts/           # 2 רכיבי חוזים
│   │   ├── feedback/            # טופס משוב
│   │   ├── files/               # רכיב העלאת קבצים
│   │   ├── forms/               # ולידציית טפסים
│   │   ├── hooks/               # 8 Custom Hooks
│   │   ├── layout/              # רכיבי Layout
│   │   ├── maps/                # 6 רכיבי מפות
│   │   ├── notifications/       # 3 רכיבי התראות
│   │   ├── pwa/                 # 3 רכיבי PWA
│   │   ├── reports/             # 5 רכיבי דוחות
│   │   ├── signature/           # רכיב חתימה דיגיטלית
│   │   ├── vendor/              # 4 רכיבי ספק
│   │   ├── AccessibilityWidget.jsx
│   │   ├── AgentCard.jsx
│   │   ├── ImportExport.jsx
│   │   ├── NotificationsUtils.jsx
│   │   └── UserNotRegisteredError.jsx
│   ├── features/                # קוד features (לא מנותב - Legacy)
│   │   ├── agents/
│   │   ├── auth/
│   │   ├── calls/
│   │   ├── cases/
│   │   ├── customers/
│   │   ├── dashboard/
│   │   ├── operators/
│   │   ├── queue/
│   │   ├── reports/
│   │   ├── settings/
│   │   └── vendors/
│   ├── hooks/                   # 2 Global Hooks
│   │   ├── use-mobile.jsx
│   │   └── useRealtimeUpdates.js
│   ├── lib/                     # Utility Libraries
│   │   ├── api.js
│   │   ├── app-params.js
│   │   ├── AuthContext.jsx
│   │   ├── PageNotFound.jsx
│   │   ├── query-client.js
│   │   ├── queryKeys.js
│   │   ├── utils.js
│   │   └── utils.jsx
│   ├── pages/                   # 30 דפים מנותבים
│   ├── providers/
│   │   └── AuthProvider.jsx
│   ├── services/
│   │   └── distanceMatrix.js
│   ├── App.jsx                  # רכיב ראשי + Router
│   ├── Layout.jsx               # Layout ראשי (sidebar, nav, notifications)
│   ├── main.jsx                 # Entry Point
│   ├── pages.config.js          # קונפיגורציית דפים (auto-generated)
│   └── design-system.js         # מערכת עיצוב
├── package.json
├── vite.config.js
├── tailwind.config.js
├── jsconfig.json
├── components.json              # shadcn/ui config
├── postcss.config.js
├── .prettierrc.json
├── eslint.config.js
└── .gitignore
```

---

## 4. מערכת העיצוב

### פלטת צבעים ראשית

| קטגוריה | צבע עיקרי (500) | שימוש |
|---------|-----------------|-------|
| Primary | `#FF6B6B` אדום עדין | כפתורים ראשיים, לוגו, הדגשות |
| Secondary | `#0EA5E9` תכלת | כפתורים משניים, קישורים |
| Success | `#22C55E` ירוק | הצלחה, הושלם, פעיל |
| Warning | `#F59E0B` כתום | אזהרות, ממתין |
| Error | `#EF4444` אדום | שגיאות, בוטל |
| Info | `#8B5CF6` סגול | מידע, בדרך |
| Neutral | `#737373` אפור | טקסט, גבולות |

### צבעי סטטוסים

| סטטוס | רקע | טקסט | גבול |
|-------|-----|------|------|
| ממתין (waiting) | `#FFFBEB` | `#D97706` | `#FCD34D` |
| שובץ (assigned) | `#E0F2FE` | `#0284C7` | `#7DD3FC` |
| בדרך (enRoute) | `#DDD6FE` | `#7C3AED` | `#C4B5FD` |
| בטיפול (inProgress) | `#DBEAFE` | `#2563EB` | `#93C5FD` |
| הושלם (completed) | `#DCFCE7` | `#16A34A` | `#86EFAC` |
| בוטל (cancelled) | `#FEE2E2` | `#DC2626` | `#FCA5A5` |

### טיפוגרפיה

| מאפיין | ערך |
|--------|-----|
| גופן ראשי | Heebo, Assistant, Arial, sans-serif |
| גופן Mono | Courier New, monospace |
| גודל בסיס | 1rem (16px) |
| גדלים | xs(12px), sm(14px), base(16px), lg(18px), xl(20px), 2xl(24px), 3xl(30px), 4xl(36px), 5xl(48px) |
| משקלים | light(300), normal(400), medium(500), semibold(600), bold(700) |

### מרווחים ועיצוב

| מאפיין | ערכים |
|--------|-------|
| Border Radius | none, sm(4px), base(8px), md(12px), lg(16px), xl(24px), 2xl(32px), full |
| Shadows | none, sm, base, md, lg, xl, 2xl, inner |
| Transitions | fast(150ms), base(200ms), slow(300ms) |
| Z-Index | base(0), dropdown(1000), sticky(1020), fixed(1030), modalBackdrop(1040), modal(1050), popover(1060), tooltip(1070) |

### צבעי גרפים (10 צבעים)

```
1: #FF6B6B  2: #4ECDC4  3: #45B7D1  4: #FFA07A  5: #98D8C8
6: #F7B731  7: #5F27CD  8: #00D2D3  9: #FF6348  10: #1DD1A1
```

---

## 5. מודל הנתונים

### Call (קריאת שירות)

| שדה | סוג | תיאור |
|-----|-----|--------|
| id | string | מזהה ייחודי |
| call_number | string | מספר קריאה (auto) |
| call_status | enum | waiting_treatment, awaiting_assignment, assigning, vendor_enroute, in_progress, completed, cancelled |
| call_priority | enum | normal, urgent, critical |
| customer_id | ref | מזהה לקוח |
| customer_name | string | שם לקוח |
| customer_phone | string | טלפון לקוח |
| vehicle_plate | string | מספר רכב |
| vehicle_type | string | סוג רכב |
| vehicle_model | string | דגם רכב |
| issue_type | enum | tow, mechanic, tire, locksmith, fuel, battery, combined |
| location_address | string | כתובת איסוף |
| location_lat | number | קו רוחב איסוף |
| location_lng | number | קו אורך איסוף |
| destination_address | string | כתובת יעד |
| destination_lat | number | קו רוחב יעד |
| destination_lng | number | קו אורך יעד |
| assigned_vendor_id | ref | מזהה ספק משובץ |
| assigned_vendor_name | string | שם ספק משובץ |
| call_summary | text | סיכום קריאה |
| internal_notes | text | הערות פנימיות |
| cost_to_vendor | number | עלות לספק |
| created_date | datetime | תאריך יצירה |
| updated_date | datetime | תאריך עדכון |
| completed_date | datetime | תאריך סיום |
| time_to_completion | number | זמן טיפול (דקות) |
| sla_deadline | datetime | דד-ליין SLA |

### Customer (לקוח)

| שדה | סוג | תיאור |
|-----|-----|--------|
| id | string | מזהה ייחודי |
| name | string | שם לקוח |
| customer_type | enum | insurance_company, fleet, individual, garage, other |
| contact_person | string | איש קשר |
| phone | string | טלפון |
| email | string | אימייל |
| address | string | כתובת |
| city | string | עיר |
| contract_type | enum | monthly, yearly, per_call, none |
| sla_response_minutes | number | SLA תגובה (דקות) |
| sla_arrival_minutes | number | SLA הגעה (דקות) |
| monthly_budget | number | תקציב חודשי |
| status | enum | active, inactive, suspended |
| created_date | datetime | תאריך יצירה |

### Vendor (ספק)

| שדה | סוג | תיאור |
|-----|-----|--------|
| id | string | מזהה ייחודי |
| vendor_name | string | שם ספק |
| phone | string | טלפון |
| email | string | אימייל |
| service_type | array[enum] | tow, mechanic, tire, locksmith, fuel, battery, combined |
| coverage_areas | array[string] | אזורי כיסוי |
| availability_status | enum | available, busy, on_break, offline |
| is_active | boolean | פעיל |
| is_available_now | boolean | זמין כעת |
| latitude | number | קו רוחב נוכחי |
| longitude | number | קו אורך נוכחי |
| service_radius | number | רדיוס שירות (ק"מ) |
| average_rating | number | דירוג ממוצע |
| total_calls | number | סה"כ קריאות |
| success_rate | number | אחוז הצלחה |
| payment_rate_per_call | number | תעריף לקריאה |
| operating_hours | string | שעות פעילות |
| created_date | datetime | תאריך יצירה |
| updated_date | datetime | תאריך עדכון |

### User (משתמש)

| שדה | סוג | תיאור |
|-----|-----|--------|
| id | string | מזהה ייחודי |
| full_name | string | שם מלא |
| email | string | אימייל |
| role | enum | admin, user, vendor, technician |
| profile_image | string | תמונת פרופיל |
| is_active | boolean | פעיל |
| sound_enabled | boolean | צלילים מופעלים |
| created_date | datetime | תאריך יצירה |

### WorkQueue (תור עבודה)

| שדה | סוג | תיאור |
|-----|-----|--------|
| id | string | מזהה ייחודי |
| call_id | ref | מזהה קריאה |
| queue_status | enum | waiting, assigned, in_progress, completed |
| priority_score | number | ניקוד עדיפות |
| assigned_to_agent | ref | מוקדן אחראי |
| waiting_since | datetime | ממתין מאז |
| assigned_at | datetime | שובץ בזמן |
| started_at | datetime | התחיל בזמן |
| completed_at | datetime | הושלם בזמן |
| time_to_complete | number | זמן טיפול |

### VendorLocation (מיקום ספק)

| שדה | סוג | תיאור |
|-----|-----|--------|
| id | string | מזהה ייחודי |
| vendor_id | ref | מזהה ספק |
| latitude | number | קו רוחב |
| longitude | number | קו אורך |
| address | string | כתובת |
| city | string | עיר |
| created_date | datetime | חותמת זמן |

### VendorRating (דירוג ספק)

| שדה | סוג | תיאור |
|-----|-----|--------|
| id | string | מזהה ייחודי |
| vendor_id | ref | מזהה ספק |
| overall_rating | number | דירוג כולל (1-5) |
| comment | text | הערה |
| call_id | ref | מזהה קריאה |
| created_date | datetime | תאריך |

### VendorPayment (תשלום לספק)

| שדה | סוג | תיאור |
|-----|-----|--------|
| id | string | מזהה ייחודי |
| vendor_id | ref | מזהה ספק |
| call_id | ref | מזהה קריאה |
| amount | number | סכום |
| payment_status | enum | pending, paid, overdue |
| created_date | datetime | תאריך |

### VendorContract (חוזה ספק)

| שדה | סוג | תיאור |
|-----|-----|--------|
| id | string | מזהה ייחודי |
| vendor_id | ref | מזהה ספק |
| contract_type | string | סוג חוזה |
| terms | text | תנאים |
| start_date | date | תאריך התחלה |
| end_date | date | תאריך סיום |
| status | enum | active, expired, pending |

### CallHistory (היסטוריית קריאה)

| שדה | סוג | תיאור |
|-----|-----|--------|
| id | string | מזהה ייחודי |
| call_id | ref | מזהה קריאה |
| call_number | string | מספר קריאה |
| change_type | enum | status_change, assignment, note, update |
| new_value | string | ערך חדש |
| notes | text | הערות |
| changed_by | string | שונה ע"י |
| created_date | datetime | חותמת זמן |

### CallPhoto (תמונות קריאה)

| שדה | סוג | תיאור |
|-----|-----|--------|
| id | string | מזהה ייחודי |
| call_id | ref | מזהה קריאה |
| photo_url | string | כתובת תמונה |
| description | string | תיאור |
| created_date | datetime | תאריך |

### Notification (התראה)

| שדה | סוג | תיאור |
|-----|-----|--------|
| id | string | מזהה ייחודי |
| user_id | ref | מזהה משתמש |
| title | string | כותרת |
| message | text | הודעה |
| type | enum | info, warning, error, success |
| link | string | קישור |
| related_entity_id | string | מזהה ישות קשורה |
| related_entity_type | string | סוג ישות |
| is_read | boolean | נקרא |
| created_date | datetime | תאריך |

### NotificationSetting (הגדרות התראה)

| שדה | סוג | תיאור |
|-----|-----|--------|
| id | string | מזהה ייחודי |
| user_id | ref | מזהה משתמש |
| channel | enum | in_app, email, sms |
| event_type | string | סוג אירוע |
| is_enabled | boolean | מופעל |

### CaseActivity (פעילות Case)

| שדה | סוג | תיאור |
|-----|-----|--------|
| id | string | מזהה ייחודי |
| case_id | ref | מזהה Case |
| action | string | פעולה |
| notes | text | הערות |
| timestamp | datetime | חותמת זמן |

### CallAssignmentAttempt (ניסיונות שיבוץ)

| שדה | סוג | תיאור |
|-----|-----|--------|
| id | string | מזהה ייחודי |
| call_id | ref | מזהה קריאה |
| vendor_id | ref | מזהה ספק |
| score | number | ניקוד |
| status | enum | accepted, declined, timeout |
| created_date | datetime | תאריך |

### CustomerInteraction (אינטראקציות לקוח)

| שדה | סוג | תיאור |
|-----|-----|--------|
| id | string | מזהה ייחודי |
| customer_id | ref | מזהה לקוח |
| interaction_type | string | סוג אינטראקציה |
| notes | text | הערות |
| created_date | datetime | תאריך |

---

## 6. דפי האפליקציה

30 דפים מנותבים ב-`pages.config.js`:

| # | דף | קובץ | תיאור | הרשאה |
|---|-----|------|--------|--------|
| 1 | Dashboard | `Dashboard.jsx` | דשבורד ראשי עם KPIs וגרפים | כל המשתמשים |
| 2 | Calls | `Calls.jsx` | רשימת קריאות שירות + סינון + חיפוש | כל המשתמשים |
| 3 | CallDetails | `CallDetails.jsx` | פרטי קריאה מלאים + היסטוריה + מפה | כל המשתמשים |
| 4 | NewCase | `NewCase.jsx` | יצירת קריאת שירות חדשה | כל המשתמשים |
| 5 | Customers | `Customers.jsx` | ניהול לקוחות + CRUD + חיפוש | כל המשתמשים |
| 6 | ServiceProviders | `ServiceProviders.jsx` | ניהול ספקים + סינון + ייבוא/ייצוא | כל המשתמשים |
| 7 | NewVendor | `NewVendor.jsx` | הוספת ספק חדש | admin |
| 8 | VendorPortal | `VendorPortal.jsx` | פורטל ספקים - דשבורד ספק | vendor |
| 9 | VendorCallManagement | `VendorCallManagement.jsx` | ניהול קריאות מצד הספק | vendor |
| 10 | MyVendorProfile | `MyVendorProfile.jsx` | פרופיל ספק אישי | vendor |
| 11 | VendorTracking | `VendorTracking.jsx` | מעקב GPS בזמן אמת אחרי ספק | כל המשתמשים |
| 12 | VendorContracts | `VendorContracts.jsx` | ניהול חוזי ספקים | admin |
| 13 | AllVendorsMap | `AllVendorsMap.jsx` | מפת כל הספקים עם סטטוסים | כל המשתמשים |
| 14 | CoverageAreas | `CoverageAreas.jsx` | ניהול אזורי כיסוי + Geofence | admin |
| 15 | MyQueue | `MyQueue.jsx` | תור עבודה אישי של מוקדן | כל המשתמשים |
| 16 | QueueMonitor | `QueueMonitor.jsx` | ניטור תור בזמן אמת | admin |
| 17 | Reports | `Reports.jsx` | דוחות + ניתוח + ייצוא | כל המשתמשים |
| 18 | Agents | `Agents.jsx` | ניהול סוכנים אוטומטיים (AI) | admin |
| 19 | UserManagement | `UserManagement.jsx` | ניהול משתמשים + הזמנות + תפקידים | admin |
| 20 | AuditLog | `AuditLog.jsx` | יומן ביקורת מערכתי | admin |
| 21 | Calendar | `Calendar.jsx` | לוח שנה עם קריאות ואירועים | כל המשתמשים |
| 22 | Settings | `Settings.jsx` | הגדרות מערכת כלליות | admin |
| 23 | NotificationSettings | `NotificationSettings.jsx` | הגדרות התראות מערכתיות | admin |
| 24 | MyNotificationSettings | `MyNotificationSettings.jsx` | העדפות התראות אישיות | כל המשתמשים |
| 25 | IntegrationSettings | `IntegrationSettings.jsx` | הגדרות אינטגרציות CRM | admin |
| 26 | AutomationSettings | `AutomationSettings.jsx` | הגדרות אוטומציה + SMS | admin |
| 27 | AdvancedExport | `AdvancedExport.jsx` | ייצוא נתונים מתקדם | admin |
| 28 | ImportHistoricalData | `ImportHistoricalData.jsx` | ייבוא נתונים היסטוריים | admin |
| 29 | HistoricalDataAnalysis | `HistoricalDataAnalysis.jsx` | ניתוח נתונים היסטוריים | admin |
| 30 | UserGuide | `UserGuide.jsx` | מדריך למשתמש | כל המשתמשים |

---

## 7. ניהול קריאות שירות

**סטטוס: ✅ מלא | דפים: NewCase, Calls, CallDetails**

### פיצ'רים

| פיצ'ר | סטטוס | תיאור |
|-------|--------|--------|
| יצירת קריאה חדשה | ✅ | טופס מלא: לקוח, רכב, מיקום, סוג שירות, עדיפות |
| רשימת קריאות | ✅ | טבלה עם סינון לפי סטטוס, תאריך, עיר, ספק, לקוח |
| חיפוש קריאות | ✅ | לפי מספר קריאה, שם לקוח, טלפון, לוחית רכב |
| פרטי קריאה | ✅ | צפייה ועריכה מלאה של כל השדות |
| עדכון סטטוס | ✅ | 7 סטטוסים: waiting_treatment → awaiting_assignment → assigning → vendor_enroute → in_progress → completed → cancelled |
| יומן פעילות | ✅ | תיעוד כל שינוי בקריאה (CallHistory) |
| שיוך ספק | ✅ | חיפוש ובחירת ספק, שיבוץ אוטומטי |
| מיקום איסוף והורדה | ✅ | כתובות עם קואורדינטות |
| העלאת תמונות | ✅ | תמונות לקריאה (CallPhoto) |
| סיכום קריאה | ✅ | עורך סיכום (CallSummaryEditor) |
| צ'אט בקריאה | ✅ | צ'אט בתוך קריאה (EnhancedCallChat) |
| משוב על קריאה | ✅ | טופס משוב לקוח (CallFeedbackForm) |
| חתימה דיגיטלית | ✅ | חתימה על גבי הקריאה (SignaturePad) |
| מעקב SLA | ✅ | דד-ליין לפי הגדרות לקוח |

### סטטוסים של קריאה

```
waiting_treatment → awaiting_assignment → assigning → vendor_enroute → in_progress → completed
                                                                                   → cancelled
```

### סוגי שירות

| קוד | תיאור |
|-----|--------|
| tow | גרירה |
| mechanic | מכונאי |
| tire | צמיגים |
| locksmith | מנעולן |
| fuel | דלק |
| battery | מצבר |
| combined | משולב |

### עדיפויות

| קוד | תיאור |
|-----|--------|
| normal | רגיל |
| urgent | דחוף |
| critical | קריטי |

---

## 8. ניהול לקוחות

**סטטוס: ✅ מלא | דף: Customers**

### פיצ'רים

| פיצ'ר | סטטוס | תיאור |
|-------|--------|--------|
| רשימת לקוחות | ✅ | כל הלקוחות עם סינון וחיפוש |
| הוספת לקוח | ✅ | טופס מלא בדיאלוג |
| עריכת לקוח | ✅ | עדכון פרטים קיימים |
| מחיקת לקוח | ✅ | עם דיאלוג אישור |
| סוגי לקוחות | ✅ | ביטוח, ליסינג, פרטי, מוסך, אחר |
| סוגי חוזים | ✅ | חודשי, שנתי, לפי קריאה, ללא |
| הגדרות SLA | ✅ | זמן תגובה וזמן הגעה לכל לקוח |
| מעקב תקציב | ✅ | תקציב חודשי ללקוח |
| היסטוריית אינטראקציות | ✅ | תיעוד אינטראקציות (CustomerInteraction) |
| סטטוס לקוח | ✅ | active, inactive, suspended |

---

## 9. ניהול ספקים

**סטטוס: ✅ מלא | דף: ServiceProviders, NewVendor**

### פיצ'רים

| פיצ'ר | סטטוס | תיאור |
|-------|--------|--------|
| רשימת ספקים | ✅ | כל הספקים עם סינון לפי סוג, אזור, זמינות |
| הוספת ספק | ✅ | טופס מלא (NewVendor) |
| עריכת ספק | ✅ | עדכון כל הפרטים |
| מחיקת ספק | ✅ | עם דיאלוג אישור |
| סוגי שירות | ✅ | 7 סוגים (גרר, מכונאי, צמיגים, מנעולן, דלק, מצבר, משולב) |
| אזורי כיסוי | ✅ | בחירת אזורים מרובים |
| סטטוס זמינות | ✅ | available, busy, on_break, offline |
| Toggle זמינות | ✅ | כפתור מהיר לשינוי (VendorAvailabilityToggle) |
| תעריף לקריאה | ✅ | מחיר לכל סוג קריאה |
| שעות פעילות | ✅ | 24/7 או מותאם אישית |
| דירוג ספק | ✅ | ממוצע דירוגים (VendorRating) |
| סטטיסטיקות ספק | ✅ | קריאות, הצלחה, זמנים (VendorStats) |
| GPS Tracker | ✅ | מעקב מיקום בזמן אמת (VendorGPSTracker) |
| התראת קריאה חדשה | ✅ | התראה pop-up לספק (VendorNewCallAlert) |
| ייבוא/ייצוא | ✅ | CSV (ImportExport) |

---

## 10. דשבורד ראשי

**סטטוס: ✅ מלא | דף: Dashboard**

### פיצ'רים

| פיצ'ר | סטטוס | תיאור |
|-------|--------|--------|
| מדדי KPI | ✅ | ETA ממוצע, זמן תגובה ראשון, אחוז פתרון בשטח, CSAT |
| סקירת תור | ✅ | ממתינים, משובצים, בטיפול |
| חלוקה לפי סוכנים | ✅ | עומס עבודה לכל מוקדן |
| גרפים | ✅ | התפלגות סטטוסים, מגמה שבועית, הכנסות |
| תפריט מוקדן | ✅ | פעולות מהירות, קריאות דחופות |
| רשימת קריאות פתוחות | ✅ | טבלה עם כל הפרטים |
| ספקים זמינים | ✅ | רשימה מעודכנת בזמן אמת |
| AI Insights | ✅ | תובנות AI (AIInsightsWidget) |

---

## 11. ניהול תור

**סטטוס: ✅ מלא | דפים: QueueMonitor, MyQueue**

### פיצ'רים

| פיצ'ר | סטטוס | תיאור |
|-------|--------|--------|
| תצוגת תור בזמן אמת | ✅ | רענון כל 5 שניות |
| סטטיסטיקות תור | ✅ | זמני המתנה וטיפול |
| העברת קריאות | ✅ | בין סוכנים |
| עומס סוכנים | ✅ | ויזואליזציה של עומס |
| תור אישי | ✅ | קריאות לפי מוקדן מחובר |

---

## 12. מפות ומיקום

**סטטוס: ✅ מלא | דפים: AllVendorsMap, VendorTracking, CoverageAreas**

### פיצ'רים

| פיצ'ר | סטטוס | תיאור |
|-------|--------|--------|
| מפת כל הספקים | ✅ | סימון כל הספקים על מפה (AllVendorsMap) |
| מיקום בזמן אמת | ✅ | עדכון GPS כל 30 שניות |
| חישוב מרחק | ✅ | מספק ללקוח (distanceMatrix, OSRM) |
| חישוב ETA | ✅ | זמן הגעה משוער |
| אזורי כיסוי | ✅ | מעגלים ו-Geofence על מפה (GeofenceManager) |
| ניווט Waze | ✅ | Deep link ישיר ל-Waze |
| מסלול מרובה עצירות | ✅ | אופטימיזציה (MultiStopRouteOptimizer) |
| מפת ניווט | ✅ | ניווט בתוך המערכת (NavigationMap) |
| סימון צבעים | ✅ | צבע לפי סטטוס זמינות |

### רכיבי מפות

| רכיב | קובץ | תיאור |
|-------|------|--------|
| VendorLiveMap | `maps/VendorLiveMap.jsx` | מפה חיה של ספקים |
| NavigationMap | `maps/NavigationMap.jsx` | מפת ניווט |
| MultiStopRouteOptimizer | `maps/MultiStopRouteOptimizer.jsx` | אופטימיזציית מסלולים |
| GeofenceManager | `maps/GeofenceManager.jsx` | ניהול Geofence |
| RouteMap | `maps/RouteMap.jsx` | מפת מסלול |
| VendorMap | `maps/VendorMap.jsx` | מפת ספק בודד |

---

## 13. דוחות וניתוח

**סטטוס: ✅ מלא | דף: Reports, HistoricalDataAnalysis**

### פיצ'רים

| פיצ'ר | סטטוס | תיאור |
|-------|--------|--------|
| סינון לפי תאריך | ✅ | 7/30 יום או טווח מותאם |
| סינון לפי ספק | ✅ | כל הספקים או ספציפי |
| סינון לפי לקוח | ✅ | כל הלקוחות או ספציפי |
| דוח ביצועי ספקים | ✅ | קריאות, זמני תגובה, דירוג |
| דוח SLA | ✅ | חריגות ועמידה ביעדים |
| דוח הכנסות | ✅ | עלויות ותשלומים לספקים |
| גרף סטטוסים | ✅ | עוגה לפי סטטוס |
| גרף זמני תגובה | ✅ | מגמות לאורך זמן |
| ייצוא CSV | ✅ | הורדת דוחות |
| ניתוח היסטורי | ✅ | ניתוח מגמות ודפוסים (HistoricalDataAnalysis) |

### רכיבי דוחות

| רכיב | קובץ | תיאור |
|-------|------|--------|
| CallStatusChart | `reports/CallStatusChart.jsx` | גרף סטטוסים |
| VendorPerformanceReport | `reports/VendorPerformanceReport.jsx` | דוח ביצועי ספק |
| RevenueChart | `reports/RevenueChart.jsx` | גרף הכנסות |
| SLAComplianceReport | `reports/SLAComplianceReport.jsx` | דוח SLA |
| ExportButton | `reports/ExportButton.jsx` | כפתור ייצוא |

---

## 14. פורטל ספקים

**סטטוס: ✅ מלא | דפים: VendorPortal, VendorCallManagement, MyVendorProfile**

### פיצ'רים

| פיצ'ר | סטטוס | תיאור |
|-------|--------|--------|
| דשבורד ספק | ✅ | סקירה כללית עם KPIs |
| קריאות פעילות | ✅ | קריאות המשויכות לספק |
| פרטי קריאה | ✅ | לקוח, מיקום, סוג שירות |
| התקשרות ישירה | ✅ | לחיצה להתקשרות (click-to-call) |
| ניווט ל-Waze | ✅ | קישור ישיר |
| עדכון סטטוס | ✅ | ספק מעדכן התקדמות |
| סגירת קריאה | ✅ | סימון כהושלם |
| דירוג לקוח | ✅ | ספק מדרג את הלקוח |
| סיכום שבועי | ✅ | ביצועים |
| תשלומים | ✅ | סיכום רווחים חודשי |
| גרף רווחים | ✅ | 6 חודשים אחרונים |
| פרופיל אישי | ✅ | עדכון פרטים, זמינות, אזורים |
| Toggle זמינות | ✅ | שינוי מהיר של סטטוס |
| מעקב GPS | ✅ | שיתוף מיקום בזמן אמת |

---

## 15. ניהול משתמשים

**סטטוס: ✅ מלא | דף: UserManagement**

### פיצ'רים

| פיצ'ר | סטטוס | תיאור |
|-------|--------|--------|
| רשימת משתמשים | ✅ | כל המשתמשים עם חיפוש וסינון |
| הזמנת משתמש | ✅ | שליחת הזמנה באימייל |
| עריכת משתמש | ✅ | שינוי פרטים ותפקיד |
| מחיקת משתמש | ✅ | הסרה מהמערכת |
| תפקידים | ✅ | admin, user, vendor, technician |
| העלאת תמונה | ✅ | תמונת פרופיל |

---

## 16. אינטגרציית בוט 99Digital

**סטטוס: ✅ מלא | Functions: 99digitalBot.ts, botWebhook.ts**

### פיצ'רים

| פיצ'ר | סטטוס | תיאור |
|-------|--------|--------|
| קליטת Webhook | ✅ | קבלת קריאות מהבוט |
| מיפוי שדות | ✅ | המרה לפורמט המערכת |
| יצירת קריאה אוטומטית | ✅ | קריאה נוצרת מיידית |
| חישוב עדיפות | ✅ | לפי VIP, דחיפות, סוג |
| שאלון נהג | ✅ | שמירת תשובות השאלון |
| הפעלת שיבוץ אוטומטי | ✅ | לאחר יצירת הקריאה |

---

## 17. הקצאת ספקים חכמה

**סטטוס: ✅ מלא | Function: autoAssignVendor.ts**

### אלגוריתם ניקוד

| פרמטר | משקל | תיאור |
|--------|------|--------|
| מרחק | 35% | נוסחת Haversine - קרבה למיקום הקריאה |
| זמינות | 25% | סטטוס נוכחי של הספק |
| דירוג | 20% | ממוצע דירוגים היסטורי |
| זמן תגובה | 10% | ממוצע זמן תגובה היסטורי |
| חוזה | 10% | העדפה לבעלי חוזה פעיל |

### תהליך שיבוץ

1. שליפת ספקים פעילים עם חוזה
2. סינון לפי סוג שירות
3. סינון לפי אזור כיסוי
4. חישוב ניקוד לכל ספק
5. בחירת ספק עם ניקוד גבוה ביותר
6. שליחת SMS לספק
7. תיעוד ניסיון שיבוץ (CallAssignmentAttempt)

---

## 18. הגדרות מערכת

**סטטוס: ✅ מלא | דפים: Settings, NotificationSettings, AutomationSettings, IntegrationSettings**

### פיצ'רים

| פיצ'ר | סטטוס | תיאור |
|-------|--------|--------|
| פרטי חברה | ✅ | שם, טלפון, מייל, כתובת |
| SLA ברירת מחדל | ✅ | זמנים לכל לקוח חדש |
| ניהול סוגי שירות | ✅ | הוספה/עריכה/מחיקה |
| הגדרות התראות | ✅ | העדפות למשתמש |
| העדפות אישיות | ✅ | MyNotificationSettings |
| הגדרות אוטומציה | ✅ | כללי SMS, שיבוץ אוטומטי |
| הגדרות אינטגרציה | ✅ | Webhook URL, מיפוי שדות |

---

## 19. כלי נגישות

**סטטוס: ✅ מלא | רכיב: AccessibilityWidget.jsx**

### פיצ'רים

| פיצ'ר | סטטוס | תיאור |
|-------|--------|--------|
| שינוי גודל טקסט | ✅ | רגיל / גדול / ענק |
| ניגודיות גבוהה | ✅ | מצב High Contrast |
| גווני אפור | ✅ | Grayscale mode |
| גופן קריא | ✅ | החלפה ל-Arial |
| הדגשת קישורים | ✅ | Highlight Links |
| כפתור צף | ✅ | נגיש מכל מקום במערכת |

---

## 20. ניהול חוזי ספקים

**סטטוס: ✅ מלא | דף: VendorContracts**

### פיצ'רים

| פיצ'ר | סטטוס | תיאור |
|-------|--------|--------|
| רשימת חוזים | ✅ | כל החוזים עם סינון |
| יצירת חוזה | ✅ | טופס בדיאלוג (ContractFormDialog) |
| צפייה בחוזה | ✅ | פרטים מלאים (ContractDetailsDialog) |
| סטטוס חוזה | ✅ | active, expired, pending |
| בדיקת תוקף | ✅ | Backend Function (checkContractExpiry) |

---

## 21. ייבוא וייצוא נתונים

**סטטוס: ✅ מלא | דפים: AdvancedExport, ImportHistoricalData**

### פיצ'רים

| פיצ'ר | סטטוס | תיאור |
|-------|--------|--------|
| ייצוא CSV | ✅ | ייצוא דוחות ונתונים |
| ייצוא מתקדם | ✅ | בחירת שדות, סינון (AdvancedExport) |
| ייבוא CSV ספקים | ✅ | ImportExport component |
| ייבוא נתונים היסטוריים | ✅ | ImportHistoricalData |

---

## 22. יומן ביקורת

**סטטוס: ✅ מלא | דף: AuditLog**

### פיצ'רים

| פיצ'ר | סטטוס | תיאור |
|-------|--------|--------|
| יומן פעולות | ✅ | תיעוד כל הפעולות במערכת |
| סינון לפי תאריך | ✅ | טווח תאריכים |
| סינון לפי משתמש | ✅ | פעולות של משתמש ספציפי |
| סינון לפי סוג | ✅ | סוגי פעולות |
| Hook: useAuditLog | ✅ | שליפת נתוני ביקורת |

---

## 23. לוח שנה

**סטטוס: ✅ מלא | דף: Calendar**

### פיצ'רים

| פיצ'ר | סטטוס | תיאור |
|-------|--------|--------|
| תצוגת חודש | ✅ | קריאות מסומנות בלוח |
| תצוגת שבוע | ✅ | פירוט יומי |
| תצוגת יום | ✅ | כל קריאות היום |
| סימון צבעים | ✅ | לפי סטטוס/עדיפות |

---

## 24. מדריך למשתמש

**סטטוס: ✅ מלא | דף: UserGuide**

### פיצ'רים

| פיצ'ר | סטטוס | תיאור |
|-------|--------|--------|
| הסברים לכל מודול | ✅ | תיעוד מובנה |
| חיפוש | ✅ | חיפוש בתוך המדריך |
| תמונות | ✅ | צילומי מסך |

---

## 25. מודולים בפיתוח / חלקיים

### סוכנים אוטומטיים (AI Agents) ⚠️

**דף: Agents.jsx | רכיב: AgentCard.jsx**

| פיצ'ר | סטטוס | הערות |
|-------|--------|--------|
| רשימת סוכנים | ⚠️ Mock Data | 6 סוכנים מוגדרים |
| הפעלה/כיבוי סוכן | ⚠️ UI בלבד | אין חיבור לבקאנד |
| יומן פעילות | ⚠️ Mock Data | לוג פעולות סוכנים |
| סוכן תזמון | ⚠️ לא מחובר | |
| סוכן התראות | ⚠️ לא מחובר | |
| סוכן הקצאה | ⚠️ לא מחובר | |
| סוכן מעקב | ⚠️ לא מחובר | |
| סוכן דוחות | ⚠️ לא מחובר | |
| סוכן סנכרון | ⚠️ לא מחובר | |

**חסר:** חיבור ל-Backend Functions, Scheduler להרצה תקופתית, הגדרות לכל סוכן

### אוטומציות SMS ⚠️

**דף: AutomationSettings.jsx**

| פיצ'ר | סטטוס | הערות |
|-------|--------|--------|
| תבניות SMS | ⚠️ מוכן, לא פעיל | יש תבניות, צריך Gateway |
| SMS בשיבוץ | ⚠️ מוכן, לא פעיל | הקוד קיים (sendSMS.ts) |
| SMS בשינוי סטטוס | ⚠️ מוכן, לא פעיל | הקוד קיים |
| SMS בסיום | ⚠️ מוכן, לא פעיל | הקוד קיים |
| שיבוץ אוטומטי | ✅ עובד | |
| התראות מנהל על SLA | ⚠️ חלקי | |

**חסר:** חיבור ל-SMS Gateway (Twilio/MessageBird), הגדרת API Key

### פיצ'רים AI ⚠️

**Functions: recommendVendor.ts, predictCallTimes.ts, analyzeCallPatterns.ts**

| פיצ'ר | סטטוס | הערות |
|-------|--------|--------|
| המלצות ספקים | ⚠️ חלקי | LLM Integration קיים |
| תחזיות זמנים | ⚠️ חלקי | Function קיים |
| Insights Widget | ⚠️ חלקי | UI קיים (AIInsightsWidget) |
| ניתוח דפוסי קריאות | ⚠️ חלקי | Function קיים |
| סיכום AI לקריאה | ⚠️ חלקי | generateCallSummary.ts |

**חסר:** איסוף מספיק נתונים היסטוריים, Training, חיבור Insights Widget לנתונים אמיתיים

### התראות ⚠️

**Function: checkAndSendNotifications.ts, sendNotification.ts, createNotification.ts**

| פיצ'ר | סטטוס | הערות |
|-------|--------|--------|
| התראות In-App | ✅ | Notification entity + RealtimeNotifications |
| התראות Email | ⚠️ | קוד קיים (Base44 SendEmail), צריך בדיקה |
| התראות SMS | ⚠️ | קוד קיים (Twilio), צריך Gateway |
| התראות Push | ⚠️ | PushNotifications component קיים |
| התראות SLA | ⚠️ חלקי | לוגיקה קיימת |
| העדפות משתמש | ✅ | UserNotificationPreferences |

### אינטגרציית CRM חיצוני ⚠️

**דף: IntegrationSettings.jsx | Function: externalCrmWebhook.ts**

| פיצ'ר | סטטוס | הערות |
|-------|--------|--------|
| Webhook URL | ✅ | מוגדר |
| מיפוי שדות | ⚠️ UI קיים | צריך בדיקה |
| סנכרון דו-כיווני | ⚠️ לא מומש | צריך פיתוח |
| Salesforce | ⚠️ בסיסי | |
| HubSpot | ⚠️ בסיסי | |

---

## 26. מודולים שטרם פותחו

### טלפוניה / VoIP ❌

| פיצ'ר | סטטוס |
|-------|--------|
| Click-to-Call מהמערכת | ❌ |
| הקלטת שיחות | ❌ |
| Pop-up שיחה נכנסת | ❌ |
| IVR Integration | ❌ |

### אפליקציית מובייל ❌

| פיצ'ר | סטטוס |
|-------|--------|
| אפליקציית Android | ❌ |
| אפליקציית iOS | ❌ |
| Push Notifications native | ❌ |
| Background GPS | ❌ |

### Gamification ❌

| פיצ'ר | סטטוס |
|-------|--------|
| נקודות לספקים | ❌ |
| לוח מובילים | ❌ |
| הישגים ותגמולים | ❌ |

### Multi-Tenant ❌

| פיצ'ר | סטטוס |
|-------|--------|
| מספר חברות | ❌ |
| הפרדת נתונים | ❌ |
| Branding מותאם | ❌ |

---

## 27. Backend Functions

**19 פונקציות Serverless ב-Deno TypeScript:**

### קריאות וספקים

| # | Function | קובץ | תיאור |
|---|----------|------|--------|
| 1 | Auto Assign Vendor | `autoAssignVendor.ts` | אלגוריתם שיבוץ חכם רב-פרמטרי |
| 2 | Handle Assignment Response | `handleAssignmentResponse.ts` | טיפול בתגובת ספק (אישור/דחייה) |
| 3 | Send Call Status Update | `sendCallStatusUpdate.ts` | עדכון סטטוס קריאה + התראות |
| 4 | Calculate Distance & ETA | `calculateDistanceAndETA.ts` | חישוב מרחק וזמן הגעה (OSRM/Haversine) |
| 5 | Update Vendor Location | `updateVendorLocation.ts` | עדכון מיקום GPS של ספק |
| 6 | Submit Vendor Rating | `submitVendorRating.ts` | שליחת דירוג לספק |

### בוט ואינטגרציות

| # | Function | קובץ | תיאור |
|---|----------|------|--------|
| 7 | 99Digital Bot | `99digitalBot.ts` | עיבוד קריאות מבוט 99Digital |
| 8 | Bot Webhook | `botWebhook.ts` | נקודת כניסה Webhook לבוט |
| 9 | External CRM Webhook | `externalCrmWebhook.ts` | Webhook לאינטגרציית CRM |

### התראות והודעות

| # | Function | קובץ | תיאור |
|---|----------|------|--------|
| 10 | Send SMS | `sendSMS.ts` | שליחת SMS (Twilio) |
| 11 | Send Notification | `sendNotification.ts` | שליחה רב-ערוצית (In-App + Email + SMS) |
| 12 | Create Notification | `createNotification.ts` | יצירת Notification entity |
| 13 | Check & Send Notifications | `checkAndSendNotifications.ts` | בדיקה ושליחת התראות SLA |

### AI ולמידה

| # | Function | קובץ | תיאור |
|---|----------|------|--------|
| 14 | Recommend Vendor | `recommendVendor.ts` | המלצת ספק באמצעות LLM |
| 15 | Predict Call Times | `predictCallTimes.ts` | חיזוי זמני טיפול |
| 16 | Analyze Call Patterns | `analyzeCallPatterns.ts` | ניתוח דפוסי קריאות |
| 17 | Analyze Vendor Performance | `analyzeVendorPerformance.ts` | ניתוח ביצועי ספק |
| 18 | Generate Call Summary | `generateCallSummary.ts` | סיכום AI לקריאה |

### חוזים

| # | Function | קובץ | תיאור |
|---|----------|------|--------|
| 19 | Check Contract Expiry | `checkContractExpiry.ts` | בדיקת תוקף חוזים |

---

## 28. Custom Hooks

### Hooks ב-`/src/components/hooks/` (8)

| Hook | קובץ | תיאור |
|------|------|--------|
| useCalls | `useCalls.jsx` | שליפה, סינון, יצירה, עדכון, מחיקה של קריאות |
| useCases | `useCases.jsx` | שליפה וניהול Cases |
| useCustomers | `useCustomers.jsx` | CRUD לקוחות |
| useVendors | `useVendors.jsx` | CRUD ספקים + זמינות + מיקום |
| useWorkQueue | `useWorkQueue.jsx` | ניהול תור עבודה |
| useNotifications | `useNotifications.jsx` | שליפה ועדכון התראות |
| useAuditLog | `useAuditLog.jsx` | שליפת יומן ביקורת |
| useAuth | `useAuth.jsx` | גישה ל-AuthContext |

### Hooks ב-`/src/hooks/` (2)

| Hook | קובץ | תיאור |
|------|------|--------|
| useMobile | `use-mobile.jsx` | זיהוי מכשיר מובייל (responsive) |
| useRealtimeUpdates | `useRealtimeUpdates.js` | הרשמה לעדכונים בזמן אמת (subscribe) |

### Hooks ב-`/src/features/*/hooks/` (8 - Legacy)

| Hook | מיקום | תיאור |
|------|-------|--------|
| useUsers | `features/agents/hooks/` | ניהול משתמשים |
| useCalls | `features/calls/hooks/` | קריאות (גרסה ישנה) |
| useCases | `features/cases/hooks/` | Cases (גרסה ישנה) |
| useCustomers | `features/customers/hooks/` | לקוחות (גרסה ישנה) |
| useQueue | `features/queue/hooks/` | תור (גרסה ישנה) |
| useReports | `features/reports/hooks/` | דוחות (גרסה ישנה) |
| useSettings | `features/settings/hooks/` | הגדרות (גרסה ישנה) |
| useVendors | `features/vendors/hooks/` | ספקים (גרסה ישנה) |

---

## 29. ספריית רכיבי UI

**63+ רכיבי shadcn/ui ב-`/src/components/ui/`:**

| קטגוריה | רכיבים |
|---------|--------|
| **Navigation** | breadcrumb, menubar, navigation-menu, pagination, sidebar, tabs |
| **Inputs** | button, checkbox, input, input-otp, label, radio-group, select, slider, switch, textarea, toggle, toggle-group |
| **Layout** | accordion, aspect-ratio, card, collapsible, resizable, scroll-area, separator, table |
| **Overlays** | alert-dialog, command, context-menu, dialog, drawer, dropdown-menu, hover-card, popover, sheet, tooltip |
| **Feedback** | alert, badge, progress, skeleton, sonner (toast), use-toast |
| **Display** | avatar, calendar, carousel |
| **Forms** | form |

---

## 30. רכיבים עסקיים מותאמים

### רכיבי AI (4)

| רכיב | קובץ | תיאור |
|-------|------|--------|
| AIInsightsWidget | `ai/AIInsightsWidget.jsx` | תובנות AI על דשבורד |
| AIPredictionCard | `ai/AIPredictionCard.jsx` | כרטיס חיזוי AI |
| AIRecommendation | `ai/AIRecommendation.jsx` | המלצת AI |
| AIAnalysisPanel | `ai/AIAnalysisPanel.jsx` | פאנל ניתוח AI |

### רכיבי צ'אט (2)

| רכיב | קובץ | תיאור |
|-------|------|--------|
| CallChat | `chat/CallChat.jsx` | צ'אט בתוך קריאה |
| EnhancedCallChat | `chat/EnhancedCallChat.jsx` | צ'אט מתקדם עם הודעות סטטוס |

### רכיבי חוזים (2)

| רכיב | קובץ | תיאור |
|-------|------|--------|
| ContractDetailsDialog | `contracts/ContractDetailsDialog.jsx` | דיאלוג פרטי חוזה |
| ContractFormDialog | `contracts/ContractFormDialog.jsx` | טופס יצירת/עריכת חוזה |

### רכיבי ספק (4)

| רכיב | קובץ | תיאור |
|-------|------|--------|
| VendorAvailabilityToggle | `vendor/VendorAvailabilityToggle.jsx` | Toggle זמינות ספק |
| VendorGPSTracker | `vendor/VendorGPSTracker.jsx` | מעקב GPS ספק |
| VendorNewCallAlert | `vendor/VendorNewCallAlert.jsx` | התראת קריאה חדשה לספק |
| VendorStats | `vendor/VendorStats.jsx` | סטטיסטיקות ספק |

### רכיבי התראות (3)

| רכיב | קובץ | תיאור |
|-------|------|--------|
| PushNotifications | `notifications/PushNotifications.jsx` | התראות Push |
| RealtimeNotifications | `notifications/RealtimeNotifications.jsx` | עדכונים בזמן אמת |
| UserNotificationPreferences | `notifications/UserNotificationPreferences.jsx` | העדפות התראות |

### רכיבי PWA (3)

| רכיב | קובץ | תיאור |
|-------|------|--------|
| InstallPrompt | `pwa/InstallPrompt.jsx` | הנחיית התקנת אפליקציה |
| UpdatePrompt | `pwa/UpdatePrompt.jsx` | הנחיית עדכון גרסה |
| OfflineIndicator | `pwa/OfflineIndicator.jsx` | מחוון מצב אופליין |

### רכיבים נוספים

| רכיב | קובץ | תיאור |
|-------|------|--------|
| SignaturePad | `signature/SignaturePad.jsx` | חתימה דיגיטלית על canvas |
| FileUploader | `files/FileUploader.jsx` | העלאת קבצים עם drag & drop |
| CallSummaryEditor | `call/CallSummaryEditor.jsx` | עורך סיכום קריאה |
| CallFeedbackForm | `feedback/CallFeedbackForm.jsx` | טופס משוב |
| ImportExport | `ImportExport.jsx` | ייבוא/ייצוא CSV |
| AccessibilityWidget | `AccessibilityWidget.jsx` | ווידג'ט נגישות |
| AgentCard | `AgentCard.jsx` | כרטיס סוכן אוטומטי |
| NotificationsUtils | `NotificationsUtils.jsx` | פונקציות עזר להתראות |
| UserNotRegisteredError | `UserNotRegisteredError.jsx` | שגיאת משתמש לא רשום |

---

## 31. מערכת אימות והרשאות

### זרימת אימות

1. משתמש נכנס דרך `base44.auth` (JWT)
2. `AuthProvider` בודק את מצב האפליקציה (`app-params`)
3. Token נשמר ב-localStorage
4. כל בקשת API כוללת את ה-Token דרך Base44 SDK
5. בשגיאה 401/403 → הפניה להתחברות

### AuthProvider Context

```javascript
// State
user              // פרטי המשתמש המחובר
isAuthenticated   // האם מאומת
isLoadingAuth     // טוען אימות
authError         // שגיאת אימות
appPublicSettings // הגדרות ציבוריות

// Methods
logout()          // התנתקות
navigateToLogin() // הפניה להתחברות
checkAppState()   // בדיקת מצב אפליקציה
```

### תפקידים (RBAC)

```
┌─────────────────────────────────────────────────────────────┐
│                         ADMIN                                │
│  • כל המודולים והדפים                                        │
│  • הגדרות מערכת, ניהול משתמשים, יומן ביקורת                  │
│  • חוזים, ייבוא/ייצוא, אוטומציות                             │
├─────────────────────────────────────────────────────────────┤
│                       TECHNICIAN                             │
│  • דשבורד, קריאות, תור עבודה                                 │
│  • ספקים (צפייה), לקוחות, דוחות                              │
├─────────────────────────────────────────────────────────────┤
│                         USER                                 │
│  • דשבורד, קריאות, תור אישי                                  │
│  • לקוחות, ספקים (צפייה)                                     │
├─────────────────────────────────────────────────────────────┤
│                         VENDOR                               │
│  • פורטל ספקים בלבד                                          │
│  • VendorPortal, VendorCallManagement, MyVendorProfile      │
└─────────────────────────────────────────────────────────────┘
```

### סוגי שגיאות אימות

| שגיאה | תיאור | טיפול |
|-------|--------|--------|
| auth_required | לא מאומת | הפניה ל-Login |
| user_not_registered | משתמש לא רשום | הצגת UserNotRegisteredError |
| app_private | אפליקציה פרטית | הצגת AppAccessDeniedError |

---

## 32. מערכת התראות

### ערוצי התראה

| ערוץ | סטטוס | טכנולוגיה |
|------|--------|-----------|
| In-App | ✅ פעיל | Notification entity + subscribe() |
| Email | ⚠️ קוד מוכן | Base44 SendEmail integration |
| SMS | ⚠️ קוד מוכן | Twilio API (דורש API Key) |
| Push | ⚠️ קוד מוכן | PWA Service Worker |

### סוגי התראות

| סוג | כותרת | הודעה |
|-----|--------|--------|
| call_assigned | קריאה שובצה | נציג בדרך אליך |
| vendor_enroute | ספק בדרך | הספק יצא לדרך |
| call_completed | קריאה הושלמה | הטיפול הושלם |
| eta_update | עדכון זמן הגעה | זמן הגעה עודכן |
| sla_warning | אזהרת SLA | חריגה צפויה |

### רכיבי Frontend

- `RealtimeNotifications` - הרשמה לעדכונים בזמן אמת
- `PushNotifications` - התראות Push
- `UserNotificationPreferences` - העדפות אישיות

---

## 33. PWA ותמיכה אופליין

### קונפיגורציה (vite.config.js)

| מאפיין | ערך |
|--------|-----|
| סוג | PWA עם Service Worker |
| אסטרטגיית Cache | StaleWhileRevalidate + CacheFirst |
| Cache API | 5 דקות |
| Cache תמונות | 30 יום |
| Cache גופנים | שנה |
| Cache מפות | 7 ימים |

### רכיבי PWA

| רכיב | תיאור |
|-------|--------|
| InstallPrompt | הנחיית התקנה למסך הבית |
| UpdatePrompt | עדכון אוטומטי כשיש גרסה חדשה |
| OfflineIndicator | סימון מצב אופליין |

---

## 34. זרימות עבודה

### זרימת קריאה חדשה

```
┌──────────────────┐
│   קריאה נכנסת     │
│  (בוט/מוקדן/Web)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│    NEW (חדש)     │
│   יצירת Call     │
│   Entity         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  חישוב עדיפות    │
│  (VIP, דחיפות,   │
│   סוג שירות)     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐
│  שיבוץ אוטומטי?  │──לא──▶│  המתנה לשיבוץ    │
│                  │      │  ידני            │
└────────┬─────────┘      └──────────────────┘
         │ כן
         ▼
┌──────────────────┐     ┌──────────────────┐
│  autoAssignVendor│◄────│   AI Scoring     │
│  Algorithm       │     │  (35% מרחק,      │
└────────┬─────────┘     │   25% זמינות,    │
         │               │   20% דירוג,     │
         │               │   10% תגובה,     │
         │               │   10% חוזה)      │
         │               └──────────────────┘
         ▼
┌──────────────────┐
│ ASSIGNED (שובץ)  │
│  + SMS לספק      │
│  + התראה In-App  │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌──────────────┐
│ דחייה  │ │ VENDOR_ENROUTE│
│       │ │  (ספק בדרך)  │
└───┬───┘ └──────┬───────┘
    │            │
    │            ▼
    │     ┌──────────────┐
    │     │ IN_PROGRESS  │
    │     │  (בטיפול)    │
    │     └──────┬───────┘
    │            │
    │            ▼
    │     ┌──────────────┐
    │     │  COMPLETED   │
    │     │  (הושלם)     │
    │     │  + דירוג     │
    │     │  + תשלום     │
    │     └──────────────┘
    │
    ▼
┌──────────────────┐
│   CANCELLED      │
│   (בוטל)         │
└──────────────────┘
```

### זרימת Webhook מבוט 99Digital

```
99Digital Bot → botWebhook.ts → מיפוי שדות → יצירת Call → חישוב עדיפות → autoAssignVendor
```

### זרימת התראה רב-ערוצית

```
Event (שינוי סטטוס) → sendNotification.ts → ┬─ In-App (Notification entity)
                                             ├─ Email (Base44 SendEmail)
                                             └─ SMS (Twilio API)
```

---

## 35. אינטגרציות חיצוניות

| שירות | סטטוס | שימוש |
|-------|--------|-------|
| **Base44 Platform** | ✅ פעיל | Backend, DB, Auth, Files, LLM |
| **OSRM** | ✅ פעיל | חישוב מסלולים, מרחקים, ETA |
| **Waze** | ✅ פעיל | Deep Links לניווט |
| **Base44 LLM** | ✅ פעיל | המלצות AI, ניתוח דפוסים, סיכומים |
| **99Digital Bot** | ✅ פעיל | קליטת קריאות אוטומטית |
| **OpenStreetMap/Leaflet** | ✅ פעיל | הצגת מפות |
| **Twilio (SMS)** | ⚠️ Framework מוכן | דורש API Key |
| **Twilio (Voice)** | ❌ לא מומש | טלפוניה עתידית |
| **Email (SMTP/SendGrid)** | ⚠️ Framework מוכן | דורש הגדרה |
| **Google Maps** | ⚠️ אופציונלי | דורש API Key |
| **Stripe** | ⚠️ ספריה מותקנת | דורש הגדרה |
| **Salesforce** | ⚠️ בסיסי | דורש בדיקה |
| **HubSpot** | ⚠️ בסיסי | דורש בדיקה |

---

## 36. משתני סביבה וקונפיגורציה

### Environment Variables

```
VITE_BASE44_APP_ID          # מזהה אפליקציה
VITE_BASE44_APP_BASE_URL    # כתובת Backend
VITE_BASE44_FUNCTIONS_VERSION # גרסת Functions
```

### משתני Backend (Functions)

```
TWILIO_ACCOUNT_SID    # Twilio Account SID
TWILIO_AUTH_TOKEN     # Twilio Auth Token
TWILIO_PHONE_NUMBER   # מספר טלפון Twilio
```

### Scripts

```bash
npm run dev         # שרת פיתוח
npm run build       # בנייה לייצור
npm run lint        # בדיקת ESLint
npm run format      # עיצוב Prettier
npm run typecheck   # בדיקת TypeScript
npm run storybook   # שרת Storybook
```

### Path Aliases (jsconfig.json)

```
@/components  → src/components
@/features    → src/features
@/lib         → src/lib
@/hooks       → src/hooks
@/providers   → src/providers
@/assets      → src/assets
@/styles      → src/styles
```

---

## 37. קבצי Features (קוד לא מנותב)

**תיקיית `/src/features/` מכילה קוד שאינו מנותב ב-`pages.config.js`.**
דפים אלה **לא נגישים** מהממשק. ייתכן שמדובר בקוד Legacy או בגרסאות ישנות.

### דפים קיימים (לא בשימוש)

| דף | מיקום | הערה |
|----|-------|------|
| Cases | `features/cases/index.jsx` | גרסה ישנה של Calls |
| CaseDetails | `features/cases/CaseDetails.jsx` | גרסה ישנה של CallDetails |
| CallDetailsVendor | `features/calls/CallDetailsVendor.jsx` | לא מנותב |
| MyCallsVendor | `features/vendors/MyCallsVendor.jsx` | לא מנותב |
| VendorPayments | `features/vendors/VendorPayments.jsx` | לא מנותב |
| VendorProfile | `features/vendors/VendorProfile.jsx` | לא מנותב |
| CustomerDetails | `features/customers/CustomerDetails.jsx` | לא מנותב |
| QueueSettings | `features/queue/QueueSettings.jsx` | לא מנותב |
| OperatorDashboard | `features/operators/index.jsx` | לא מנותב |
| AuthLogin | `features/auth/AuthLogin.jsx` | גרסה ישנה |
| Login | `features/auth/Login.jsx` | גרסה ישנה |
| Register | `features/auth/Register.jsx` | גרסה ישנה |

**המלצה:** יש להחליט אם למחוק קוד זה או לשלב אותו בניתוב.

---

## 38. סיכום סטטיסטי

### סטטיסטיקות טכניות

```
דפי אפליקציה מנותבים:    30
רכיבי UI (shadcn):       63+
רכיבים עסקיים:           25+
פונקציות Backend:        19
Custom Hooks:            18+
שורות קוד Frontend:      ~12,500
שורות קוד Backend:       ~1,500
```

### סטטוס פיצ'רים

| קטגוריה | כמות | אחוז |
|---------|------|------|
| פיצ'רים עובדים (✅) | ~95 | ~70% |
| פיצ'רים חלקיים (⚠️) | ~25 | ~18% |
| פיצ'רים חסרים (❌) | ~16 | ~12% |

### פירוט לפי מודול

| מודול | סטטוס | השלמה |
|-------|--------|-------|
| ניהול קריאות | ✅ | 14/14 |
| ניהול לקוחות | ✅ | 10/10 |
| ניהול ספקים | ✅ | 15/15 |
| דשבורד | ✅ | 8/8 |
| ניהול תור | ✅ | 5/5 |
| מפות ומיקום | ✅ | 9/9 |
| דוחות | ✅ | 10/10 |
| פורטל ספקים | ✅ | 14/14 |
| ניהול משתמשים | ✅ | 6/6 |
| בוט 99Digital | ✅ | 6/6 |
| שיבוץ חכם | ✅ | 7/7 |
| הגדרות מערכת | ✅ | 7/7 |
| נגישות | ✅ | 6/6 |
| חוזי ספקים | ✅ | 5/5 |
| ייבוא/ייצוא | ✅ | 4/4 |
| יומן ביקורת | ✅ | 4/4 |
| לוח שנה | ✅ | 4/4 |
| מדריך למשתמש | ✅ | 3/3 |
| PWA | ✅ | 3/3 |
| סוכנים AI | ⚠️ | 3/9 |
| אוטומציות SMS | ⚠️ | 1/6 |
| פיצ'רי AI | ⚠️ | 2/5 |
| התראות | ⚠️ | 3/6 |
| CRM חיצוני | ⚠️ | 1/5 |
| טלפוניה | ❌ | 0/4 |
| אפליקציית מובייל | ❌ | 0/4 |
| Gamification | ❌ | 0/3 |
| Multi-Tenant | ❌ | 0/3 |

---

## 39. המלצות לפיתוח עתידי

### עדיפות גבוהה (שבועיים-חודש)

1. **חיבור SMS Gateway** - בחירת ספק (Twilio), הגדרת API Keys, בדיקת שליחה בפועל
2. **השלמת מערכת ההתראות** - הגדרת SMTP, Scheduler להתראות SLA, בדיקות
3. **ניקוי תיקיית Features** - מחיקת קוד Legacy או שילובו בניתוב
4. **בדיקות QA מקיפות** - בדיקת כל הזרימות, תיקון באגים

### עדיפות בינונית (1-3 חודשים)

5. **אפליקציית ספקים PWA** - שיפור PWA + Push notifications
6. **שיפור AI** - איסוף נתונים, Training, Insights אמיתיים
7. **חיבור סוכנים אוטומטיים** - Backend Functions + Scheduler
8. **אינטגרציית טלפוניה** - Click-to-call, הקלטות

### עדיפות נמוכה (3+ חודשים)

9. **אפליקציית מובייל Native** - React Native
10. **ניהול חוזים מתקדם** - תבניות, חתימה דיגיטלית, תזכורות
11. **Gamification** - נקודות, לוח מובילים
12. **Multi-tenant** - מספר חברות

---

## 40. רשימת קבצים מלאה

### דפים (30 קבצים)
```
src/pages/
├── AdvancedExport.jsx
├── Agents.jsx
├── AllVendorsMap.jsx
├── AuditLog.jsx
├── AutomationSettings.jsx
├── Calendar.jsx
├── CallDetails.jsx
├── Calls.jsx
├── CoverageAreas.jsx
├── Customers.jsx
├── Dashboard.jsx
├── HistoricalDataAnalysis.jsx
├── ImportHistoricalData.jsx
├── IntegrationSettings.jsx
├── MyNotificationSettings.jsx
├── MyQueue.jsx
├── MyVendorProfile.jsx
├── NewCase.jsx
├── NewVendor.jsx
├── NotificationSettings.jsx
├── QueueMonitor.jsx
├── Reports.jsx
├── ServiceProviders.jsx
├── Settings.jsx
├── UserGuide.jsx
├── UserManagement.jsx
├── VendorCallManagement.jsx
├── VendorContracts.jsx
├── VendorPortal.jsx
└── VendorTracking.jsx
```

### Backend Functions (19 קבצים)
```
functions/
├── 99digitalBot.ts
├── analyzeCallPatterns.ts
├── analyzeVendorPerformance.ts
├── autoAssignVendor.ts
├── botWebhook.ts
├── calculateDistanceAndETA.ts
├── checkAndSendNotifications.ts
├── checkContractExpiry.ts
├── createNotification.ts
├── externalCrmWebhook.ts
├── generateCallSummary.ts
├── handleAssignmentResponse.ts
├── predictCallTimes.ts
├── recommendVendor.ts
├── sendCallStatusUpdate.ts
├── sendNotification.ts
├── sendSMS.ts
├── submitVendorRating.ts
└── updateVendorLocation.ts
```

### רכיבים (90+ קבצים)
```
src/components/
├── ui/                    # 63+ רכיבי shadcn/ui
├── ai/                    # 4 רכיבי AI
│   ├── AIInsightsWidget.jsx
│   ├── AIPredictionCard.jsx
│   ├── AIRecommendation.jsx
│   └── AIAnalysisPanel.jsx
├── animations/            # 1 רכיב אנימציה
├── auth/                  # רכיבי אימות
├── call/
│   └── CallSummaryEditor.jsx
├── calls/                 # רכיבי קריאות נוספים
├── chat/
│   ├── CallChat.jsx
│   └── EnhancedCallChat.jsx
├── contracts/
│   ├── ContractDetailsDialog.jsx
│   └── ContractFormDialog.jsx
├── feedback/
│   └── CallFeedbackForm.jsx
├── files/
│   └── FileUploader.jsx
├── forms/                 # ולידציה
├── hooks/                 # 8 Custom Hooks
│   ├── useAuditLog.jsx
│   ├── useAuth.jsx
│   ├── useCalls.jsx
│   ├── useCases.jsx
│   ├── useCustomers.jsx
│   ├── useNotifications.jsx
│   ├── useVendors.jsx
│   └── useWorkQueue.jsx
├── layout/                # Layout wrappers
├── maps/                  # 6 רכיבי מפות
│   ├── GeofenceManager.jsx
│   ├── MultiStopRouteOptimizer.jsx
│   ├── NavigationMap.jsx
│   ├── RouteMap.jsx
│   ├── VendorLiveMap.jsx
│   └── VendorMap.jsx
├── notifications/
│   ├── PushNotifications.jsx
│   ├── RealtimeNotifications.jsx
│   └── UserNotificationPreferences.jsx
├── pwa/
│   ├── InstallPrompt.jsx
│   ├── OfflineIndicator.jsx
│   └── UpdatePrompt.jsx
├── reports/               # 5 רכיבי דוחות
├── signature/
│   └── SignaturePad.jsx
├── vendor/
│   ├── VendorAvailabilityToggle.jsx
│   ├── VendorGPSTracker.jsx
│   ├── VendorNewCallAlert.jsx
│   └── VendorStats.jsx
├── AccessibilityWidget.jsx
├── AgentCard.jsx
├── ImportExport.jsx
├── NotificationsUtils.jsx
└── UserNotRegisteredError.jsx
```

### קבצי Core
```
src/
├── App.jsx                # React Router + Providers
├── Layout.jsx             # Sidebar + Navigation + Notifications
├── main.jsx               # Entry Point
├── pages.config.js        # Route Configuration (auto-generated)
├── design-system.js       # Design Tokens
├── api/base44Client.js    # Base44 SDK Init
├── providers/AuthProvider.jsx  # Auth Context Provider
├── services/distanceMatrix.js  # Distance Calculations
├── hooks/use-mobile.jsx        # Mobile Detection
├── hooks/useRealtimeUpdates.js # Realtime Subscriptions
├── lib/api.js             # API Client
├── lib/app-params.js      # App Parameters
├── lib/query-client.js    # React Query Config
├── lib/queryKeys.js       # Query Key Factory
├── lib/utils.js           # Utility Functions
├── lib/utils.jsx          # JSX Utilities
├── lib/AuthContext.jsx    # Legacy Auth Context
└── lib/PageNotFound.jsx   # 404 Page
```

### קבצי קונפיגורציה
```
Root:
├── package.json
├── vite.config.js
├── tailwind.config.js
├── jsconfig.json
├── components.json
├── postcss.config.js
├── .prettierrc.json
├── eslint.config.js
├── .gitignore
├── .gitattributes
└── .husky/pre-commit
```

---

*מסמך זה עודכן לאחרונה ב-29/01/2026 | גרסה 3.0*
*כולל: 30 דפים, 19 Backend Functions, 18+ Hooks, 90+ רכיבים, 16 Entities*
