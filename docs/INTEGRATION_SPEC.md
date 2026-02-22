# נתוני התממשקות והתוכניות הנדרשות - NatID CRM

## מסמך טכני: אינטגרציות, APIs, שירותים חיצוניים ותוכניות פיתוח

**תאריך:** 22/02/2026
**גרסה:** 1.0

---

## תוכן עניינים

1. [סקירת אינטגרציות](#1-סקירת-אינטגרציות)
2. [פלטפורמת Base44 — Backend](#2-פלטפורמת-base44--backend)
3. [בוט 99Digital — קליטת קריאות](#3-בוט-99digital--קליטת-קריאות)
4. [Twilio — שליחת SMS](#4-twilio--שליחת-sms)
5. [OSRM — חישוב מרחק ומסלול](#5-osrm--חישוב-מרחק-ומסלול)
6. [Google Maps — Directions API](#6-google-maps--directions-api)
7. [Leaflet / OpenStreetMap — מפות](#7-leaflet--openstreetmap--מפות)
8. [AI / LLM — בינה מלאכותית](#8-ai--llm--בינה-מלאכותית)
9. [Webhook חיצוני — CRM אחר](#9-webhook-חיצוני--crm-אחר)
10. [PWA — Progressive Web App](#10-pwa--progressive-web-app)
11. [ישויות נתונים (Entities)](#11-ישויות-נתונים-entities)
12. [מפת API פנימי — Backend Functions](#12-מפת-api-פנימי--backend-functions)
13. [סביבות עבודה ומשתני סביבה](#13-סביבות-עבודה-ומשתני-סביבה)
14. [תוכניות פיתוח נדרשות](#14-תוכניות-פיתוח-נדרשות)
15. [מפת תלויות (Dependencies)](#15-מפת-תלויות-dependencies)

---

## 1. סקירת אינטגרציות

### 1.1 מפת אינטגרציות

```
                                ┌──────────────┐
                                │  99Digital   │
                                │  Bot (WA)    │
                                └──────┬───────┘
                                       │ Webhook POST
                                       ▼
┌──────────┐    REST API     ┌─────────────────────┐     SMS API      ┌──────────┐
│  Leaflet │◄───────────────►│                     │────────────────►│  Twilio  │
│  Maps    │                 │    NatID CRM        │                 │  SMS     │
│  (OSM)   │                 │                     │                 └──────────┘
└──────────┘                 │  React 18 + Vite    │
                             │  Base44 Backend     │     Route API    ┌──────────┐
┌──────────┐    SDK          │                     │────────────────►│  OSRM    │
│  Base44  │◄───────────────►│                     │                 │  Router  │
│ Platform │                 │                     │                 └──────────┘
└──────────┘                 │                     │
                             │                     │     Directions   ┌──────────┐
┌──────────┐    InvokeLLM    │                     │────────────────►│  Google  │
│  AI/LLM  │◄───────────────►│                     │                 │  Maps    │
│  Engine  │                 └─────────────────────┘                 └──────────┘
└──────────┘                         │
                                     │ Webhook POST
                                     ▼
                              ┌──────────────┐
                              │ External CRM │
                              │ (iFrame +    │
                              │  Webhook)    │
                              └──────────────┘
```

### 1.2 סטטוס אינטגרציות

| אינטגרציה | סטטוס | הערות |
|-----------|--------|-------|
| Base44 Platform | ✅ פעיל | SDK 0.8.3, Auth, Entities, Functions |
| 99Digital Bot | ✅ פעיל | Webhook קליטת קריאות מ-WhatsApp |
| Twilio SMS | ⚠️ קוד מוכן | חסר הגדרת חשבון production |
| OSRM Router | ✅ פעיל | שרת ציבורי חינמי |
| Google Maps | ⚠️ אופציונלי | fallback לחישוב ETA, דורש API key |
| Leaflet/OSM | ✅ פעיל | מפות בזמן אמת |
| AI/LLM | ✅ פעיל | Base44 Core.InvokeLLM |
| External CRM | ⚠️ קוד מוכן | Webhook + iFrame, חסר הגדרה |
| PWA | ✅ פעיל | Offline mode, Install prompt |
| Email | ⚠️ קוד מוכן | Base44.SendEmail, חסר הגדרה |
| Push Notifications | ⚠️ קוד מוכן | PWA Service Worker, חסר הגדרה |

---

## 2. פלטפורמת Base44 — Backend

### 2.1 תיאור כללי

Base44 היא פלטפורמת no-code/low-code שמספקת:
- **Authentication** — ניהול משתמשים, JWT tokens
- **Entities** — מסד נתונים (CRUD), סינון, מיון
- **Functions** — 30 פונקציות Serverless (Deno/TypeScript)
- **Email** — שליחת מיילים
- **AI/LLM** — גישה למודלי שפה

### 2.2 אתחול SDK

**קובץ:** `src/api/base44Client.js`

```javascript
import { createClient } from '@base44/sdk';

const base44 = createClient({
  appId,              // VITE_BASE44_APP_ID
  token,              // JWT access token
  functionsVersion,   // VITE_BASE44_FUNCTIONS_VERSION
  serverUrl: '',      // ברירת מחדל Base44
  requiresAuth: false,
  appBaseUrl,         // VITE_BASE44_APP_BASE_URL
});
```

### 2.3 Authentication Flow

```
1. משתמש נכנס → Base44 Auth → JWT Token
2. Token נשמר ב-localStorage
3. כל בקשה כוללת Token ב-Header
4. base44.auth.me() → { id, email, full_name, role }
5. AuthProvider → AuthContext → כל הקומפוננטות
```

**Error States:**
- `auth_required` — אין טוקן / טוקן פג תוקף
- `user_not_registered` — משתמש לא רשום לאפליקציה

### 2.4 Entities API

**פעולות CRUD:**
```javascript
// קריאה
base44.entities.Call.filter({ status: 'active' }, '-created_date', 100)
base44.entities.Call.get(id)

// כתיבה
base44.entities.Call.create({ ...data })
base44.entities.Call.update(id, { ...data })
base44.entities.Call.delete(id)
```

### 2.5 Functions API

**הפעלת פונקציה:**
```javascript
const result = await base44.functions.invoke('autoAssignVendor', {
  call_id: 'xxx',
  exclude_vendor_ids: []
});
```

### 2.6 רשימת Entities

| Entity | תיאור | שדות עיקריים |
|--------|--------|-------------|
| Call | קריאת שירות | call_number, status, customer_name, customer_phone, service_type, assigned_vendor_id, pickup_location_*, priority, sla_* |
| Vendor | ספק שירות | vendor_name, phone, email, service_type[], coverage_areas[], availability_status, average_rating, current_lat/lon |
| Customer | לקוח | name, phone, email, address, customer_type, sla_response_minutes, sla_arrival_minutes |
| User | משתמש מערכת | email, full_name, role, push_enabled |
| CallHistory | היסטוריית שינויים | call_id, action, old_value, new_value, changed_by, timestamp |
| CallAssignmentAttempt | ניסיון שיבוץ | call_id, vendor_id, status (pending/accepted/declined/expired), expires_at, response_time_seconds |
| VendorLocation | מיקום GPS | vendor_id, latitude, longitude, accuracy, speed, heading, battery_level |
| VendorRating | דירוג ספק | vendor_id, call_id, overall_rating, service_quality_rating, response_time_rating, professionalism_rating |
| VendorContract | חוזה ספק | vendor_id, contract_number, start_date, end_date, terms |
| FeedbackToken | טוקן משוב | call_id, token (64-char hex), expires_at, is_used, rating, feedback_text |
| Notification | התראה | user_id, title, message, type, is_read, link, related_entity_id |
| NotificationSetting | העדפות התראות | user_id, channel, event_type, is_enabled |
| Message | הודעת צ'אט | call_id, sender_type, sender_name, content, message_type |
| CallPhoto | תמונת קריאה | call_id, photo_url, photo_type, description |
| WorkQueue | תור עבודה | call_id, priority_score, status, assigned_agent_email |
| AuditLog | לוג ביקורת | action, entity_type, entity_id, user_id, severity, ip_address, user_agent |
| VendorPricing | תמחור ספק | vendor_id, service_type, area, price |
| Product | מוצר/שירות | name, description, price, category |
| Fleet | צי רכב | plate, type, status, assigned_vendor_id |
| SystemSettings | הגדרות מערכת | key, value |

---

## 3. בוט 99Digital — קליטת קריאות

### 3.1 תיאור

בוט WhatsApp של חברת 99Digital מקיים שיחה עם לקוחות, אוסף פרטים, ושולח את המידע למערכת דרך Webhook.

### 3.2 Webhook Endpoint

**URL:** `POST /functions/botWebhook`

**Headers נדרשים:**
```
Content-Type: application/json
x-webhook-secret: {BOT_WEBHOOK_SECRET}
```

### 3.3 מבנה Request

```json
{
  "customer_name": "ישראל ישראלי",
  "customer_phone": "0541234567",
  "customer_phone_2": "0521234567",
  "customer_id_number": "123456789",
  "customer_email": "israel@example.com",
  "customer_address": "רחוב הרצל 1, תל אביב",
  "insurance_company": "הראל",
  "membership_number": "MEM-123",
  "membership_package": "גולד",
  "vehicle_plate": "12-345-67",
  "vehicle_model": "טויוטה קורולה",
  "vehicle_year": "2022",
  "vehicle_type": "רכב פרטי",
  "fuel_type": "בנזין",
  "issue_type": "mechanical",
  "issue_description": "הרכב לא מניע",
  "pickup_location_address": "שדרות רוטשילד 5",
  "pickup_location_city": "תל אביב",
  "pickup_location_area": "מרכז",
  "pickup_location_lat": 32.0636,
  "pickup_location_lon": 34.7729,
  "dropoff_location_address": "מוסך שלום",
  "dropoff_location_city": "רמת גן",
  "dropoff_garage_name": "מוסך שלום",
  "dropoff_garage_phone": "0312345678",
  "questionnaire": {
    "is_road_accessible": true,
    "is_underground_parking": false,
    "is_gear_neutral": true,
    "is_steering_locked": false,
    "is_handbrake_released": true,
    "is_toll_road": false,
    "is_customer_with_vehicle": true,
    "has_key": true,
    "customer_response_code": "1234"
  },
  "is_urgent": false
}
```

### 3.4 מבנה Response

```json
{
  "success": true,
  "call_id": "abc123",
  "call_number": "C-12345678",
  "customer_response_code": "1234",
  "message": "הקריאה נוצרה בהצלחה"
}
```

### 3.5 לוגיקה פנימית

1. **אימות** — בדיקת `x-webhook-secret`
2. **מיפוי שדות** — המרת שדות בוט לפורמט מערכת
3. **חישוב אזור** — מיפוי עיר → אזור (מרכז/צפון/דרום/ירושלים/שרון/שפלה)
4. **חישוב עדיפות** — בסיס 50 + VIP 30 + דחוף 25 + מרכז 5 + תאונה 20
5. **יצירת Call** — `customer_source: 'bot'`, סטטוס `waiting_treatment`
6. **הקצאה למוקדן** — איזון עומסים (מקסימום 5 קריאות למוקדן)
7. **שיבוץ אוטומטי** — הפעלת `autoAssignVendor`
8. **אימייל אישור** — שליחה ללקוח עם מספר קריאה וקוד אימות

### 3.6 ממשק 99digitalBot.ts (Extended)

**URL:** `POST /functions/99digitalBot`

**מבנה Request מורחב:**
```json
{
  "customer": {
    "name": "ישראל ישראלי",
    "phone": "0541234567",
    "is_vip": true
  },
  "vehicle": {
    "plate": "12-345-67",
    "model": "טויוטה קורולה"
  },
  "incident": {
    "type": "accident",
    "description": "תאונה קלה",
    "priority": "דחוף",
    "pickup_location": {
      "address": "כביש 1, ק\"מ 50",
      "city": "ירושלים",
      "lat": 31.7683,
      "lon": 35.2137
    },
    "dropoff_location": {
      "address": "מוסך ירושלים"
    }
  },
  "questionnaire": {
    "is_road_accessible": true,
    "is_customer_with_vehicle": true,
    "has_key": true
  },
  "channel": "WhatsApp",
  "bot_session_id": "session-xyz"
}
```

---

## 4. Twilio — שליחת SMS

### 4.1 תיאור

Twilio משמש לשליחת הודעות SMS ללקוחות ולספקים.

### 4.2 API Endpoint

```
POST https://api.twilio.com/2010-04-01/Accounts/{ACCOUNT_SID}/Messages.json
```

### 4.3 Authentication

```
Authorization: Basic {base64(ACCOUNT_SID:AUTH_TOKEN)}
```

### 4.4 Request Body

```
To=+972541234567
From=+972XXXXXXXXX
Body=שלום, הספק בדרך אליך. צפי הגעה: 15 דקות
```

### 4.5 פורמט טלפון ישראלי

```
קלט: 054-1234567 / 0541234567
המרה: הסרת מקפים → הסרת 0 מתחילה → הוספת +972
פלט: +972541234567
```

### 4.6 משתני סביבה

| משתנה | תיאור | סטטוס |
|-------|--------|-------|
| `TWILIO_ACCOUNT_SID` | מזהה חשבון Twilio | ⚠️ נדרש |
| `TWILIO_AUTH_TOKEN` | טוקן אימות | ⚠️ נדרש |
| `TWILIO_PHONE_NUMBER` | מספר שולח | ⚠️ נדרש |

### 4.7 פונקציות שמשתמשות ב-Twilio

| פונקציה | שימוש |
|---------|-------|
| `sendSMS.ts` | שליחה ישירה |
| `sendCallStatusUpdate.ts` | עדכון סטטוס ללקוח |
| `sendNotification.ts` | התראה רב-ערוצית |
| `sendFeedbackSMS.ts` | קישור סקר משוב |

### 4.8 Error Codes

| קוד | משמעות |
|-----|--------|
| 400 | חסר טלפון או הודעה |
| 502 | Twilio API נכשל |
| 503 | Twilio לא מוגדר (חסרים ENV vars) |

---

## 5. OSRM — חישוב מרחק ומסלול

### 5.1 תיאור

OSRM (Open Source Routing Machine) — שירות ניתוב חינמי מבוסס OpenStreetMap.

### 5.2 שימוש במערכת

**Frontend:** `src/services/distanceMatrix.js`
**Backend:** `functions/autoAssignVendor.ts`, `functions/calculateDistanceAndETA.ts`

### 5.3 API Endpoints

#### Table API (חישוב מטריצת מרחקים)

```
GET https://router.project-osrm.org/table/v1/driving/{coordinates}
    ?sources={source_indices}
    &destinations={destination_indices}
    &annotations=distance,duration
```

**דוגמה:**
```
GET https://router.project-osrm.org/table/v1/driving/34.77,32.06;34.78,32.07;34.79,32.08
    ?sources=0
    &destinations=1;2
    &annotations=distance,duration
```

**Response:**
```json
{
  "code": "Ok",
  "distances": [[1234.5, 5678.9]],
  "durations": [[300, 720]]
}
```

#### Route API (חישוב מסלול בודד)

```
GET https://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}
    ?overview=false
```

**Response:**
```json
{
  "code": "Ok",
  "routes": [{
    "distance": 12345.6,
    "duration": 900.5
  }]
}
```

### 5.4 Fallback Strategy

```
1. OSRM Table API ──(נכשל)──→ 2. OSRM Route API ──(נכשל)──→ 3. Haversine Formula
         ▲                              ▲                              ▲
    מהיר, batch                    בודד, מדויק               קו ישר, מקורב
  source: 'osrm'            source: 'osrm-route'        source: 'haversine'
```

### 5.5 Haversine Formula

```javascript
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // רדיוס כדור הארץ בק"מ
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
            Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
```

### 5.6 מגבלות OSRM ציבורי

- Rate limiting: לא מתועד אך קיים
- אין SLA על uptime
- לא מתאים ל-production עם עומס כבד
- מומלץ: להקים שרת OSRM פרטי עם נתוני ישראל

---

## 6. Google Maps — Directions API

### 6.1 תיאור

Google Maps Directions API משמש כ-fallback אופציונלי לחישוב מרחק ו-ETA.

### 6.2 API Endpoint

```
GET https://maps.googleapis.com/maps/api/directions/json
    ?origin={lat},{lon}
    &destination={lat},{lon}
    &key={GOOGLE_MAPS_API_KEY}
```

### 6.3 Response (רלוונטי)

```json
{
  "status": "OK",
  "routes": [{
    "legs": [{
      "distance": { "value": 12345, "text": "12.3 km" },
      "duration": { "value": 900, "text": "15 mins" }
    }]
  }]
}
```

### 6.4 משתני סביבה

| משתנה | תיאור | סטטוס |
|-------|--------|-------|
| `GOOGLE_MAPS_API_KEY` | מפתח API | ⚠️ אופציונלי |

### 6.5 שימוש

- **Backend:** `calculateDistanceAndETA.ts` בלבד
- **Fallback:** אם אין API key → Haversine + הנחת 60 קמ"ש

---

## 7. Leaflet / OpenStreetMap — מפות

### 7.1 תיאור

Leaflet עם tiles של OpenStreetMap משמש להצגת מפות אינטראקטיביות.

### 7.2 שימוש במערכת

| קומפוננטה | מסך | תיאור |
|-----------|-----|-------|
| `VendorLiveMap` | CallDetails | מפת מעקב GPS של ספק בקריאה |
| `AllVendorsMap` | AllVendorsMap | כל הספקים על מפה אחת |
| `VendorMap` | VendorDetails | מפת ספק בודד |
| `CoverageAreasMap` | CoverageAreas | אזורי כיסוי |

### 7.3 Tile Server

```
https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```

### 7.4 ספריות

| ספריה | גרסה | שימוש |
|-------|-------|-------|
| `react-leaflet` | 4.2.1 | React wrapper |
| `leaflet-routing-machine` | 3.2.12 | מסלולים |
| `leaflet.locatecontrol` | 0.85.1 | מיקום משתמש |

---

## 8. AI / LLM — בינה מלאכותית

### 8.1 תיאור

המערכת משתמשת ב-AI דרך Base44 Core.InvokeLLM לניתוח טקסט, סיווג, והמלצות.

### 8.2 שימוש

```javascript
// Backend function
const result = await Core.InvokeLLM({
  prompt: "...",
  response_format: "json"  // אופציונלי
});
```

### 8.3 פונקציות AI

| פונקציה | יכולת | שפת Output |
|---------|-------|-----------|
| `categorizeCall.ts` | סיווג קריאה (סוג בעיה, שירות, עדיפות) | עברית |
| `generateCallSummary.ts` | סיכום מקצועי של קריאה | עברית |
| `quickCallSummary.ts` | סיכום מהיר + נקודות מפתח | עברית |
| `analyzeCallPatterns.ts` | זיהוי דפוסים ב-50 קריאות אחרונות | עברית |
| `analyzeHistoricalPatterns.ts` | ניתוח היסטורי (3 מודים) | עברית |
| `analyzeVendorPerformance.ts` | ניתוח ביצועי ספק | עברית |
| `predictCallTimes.ts` | חיזוי זמני תגובה והשלמה | עברית |
| `recommendVendor.ts` | המלצת ספק מבוססת AI | עברית |
| `detectSmartAlerts.ts` | זיהוי חריגות תפעוליות | עברית |

### 8.4 מגבלות

- אין שליטה על המודל (Base44 בוחרת)
- Response time לא מובטח
- כל הפרומפטים בעברית

---

## 9. Webhook חיצוני — CRM אחר

### 9.1 תיאור

ממשק לקליטת קריאות ממערכות CRM חיצוניות.

### 9.2 Webhook Endpoint

**URL:** `POST /functions/externalCrmWebhook`

**Headers:**
```
Content-Type: application/json
x-webhook-secret: {WEBHOOK_SECRET}
```

### 9.3 מבנה Request

```json
{
  "customer": {
    "name": "ישראל ישראלי",
    "phone": "0541234567",
    "email": "israel@example.com"
  },
  "case": {
    "type": "towing",
    "description": "רכב תקוע",
    "priority": "high",
    "location": {
      "address": "דרך נמיר 50",
      "city": "תל אביב",
      "lat": 32.0853,
      "lon": 34.7818
    },
    "vehicle": {
      "plate": "12-345-67",
      "model": "הונדה סיוויק",
      "type": "רכב פרטי"
    }
  },
  "metadata": {
    "source": "external-crm-name",
    "crm_id": "CRM-12345"
  }
}
```

### 9.4 מבנה Response

```json
{
  "success": true,
  "call_id": "abc123",
  "call_number": "C-12345678",
  "queue_id": "q-123",
  "message": "הקריאה נוצרה בהצלחה",
  "status": "created"
}
```

### 9.5 מיפוי סוגי בעיה

| קלט CRM | סוג בעיה פנימי |
|----------|---------------|
| mechanical, engine | mechanical |
| towing, stuck, stopped | stopped_driving |
| flat_tire, tire, puncture | flat_tire |
| battery, dead_battery | dead_battery |
| lock, lockout, keys | locked_keys |
| fuel, no_fuel | no_fuel |
| accident | accident |
| אחר | other |

---

## 10. PWA — Progressive Web App

### 10.1 תיאור

המערכת תומכת בהתקנה כאפליקציה על מכשירים ניידים.

### 10.2 יכולות

| יכולת | סטטוס | הערות |
|-------|--------|-------|
| Offline Mode | ✅ | Workbox caching, נתונים מקומיים |
| Install Prompt | ✅ | כפתור התקנה מובנה |
| Push Notifications | ⚠️ | קוד מוכן, חסר הגדרת Service Worker |
| Background Sync | ⚠️ | קוד מוכן |

### 10.3 כלים

| כלי | גרסה | שימוש |
|-----|-------|-------|
| `vite-plugin-pwa` | 1.2.0 | Generate SW |
| `workbox-window` | 7.4.0 | SW Registration |

---

## 11. ישויות נתונים (Entities)

### 11.1 דיאגרמת קשרים

```
                    ┌─────────┐
                    │Customer │
                    └────┬────┘
                         │ 1:N
                    ┌────▼────┐        ┌──────────────┐
                    │  Call   │───────►│ CallHistory  │ (1:N)
                    └────┬────┘        └──────────────┘
                    │    │    │
            ┌───────┤    │    ├────────┐
            │       │    │    │        │
     ┌──────▼──┐    │    │    │  ┌─────▼──────┐
     │ Message │    │    │    │  │ CallPhoto  │
     └─────────┘    │    │    │  └────────────┘
              ┌─────▼──┐ │    │
              │Feedback│ │    │
              │ Token  │ │    │
              └────────┘ │    │
                   ┌─────▼──────────────┐
                   │CallAssignment      │
                   │Attempt             │
                   └─────┬──────────────┘
                         │ N:1
                    ┌────▼────┐        ┌──────────────┐
                    │ Vendor  │───────►│VendorLocation│ (1:N)
                    └────┬────┘        └──────────────┘
                    │    │    │
            ┌───────┤    │    ├────────┐
            │       │    │             │
     ┌──────▼────┐  │    │       ┌────▼─────────┐
     │VendorRating│  │    │       │VendorContract│
     └───────────┘  │    │       └──────────────┘
              ┌─────▼──────┐
              │VendorPricing│
              └────────────┘

                    ┌────────┐
                    │  User  │
                    └────┬───┘
                    │    │
            ┌───────┤    ├────────┐
            │              │      │
     ┌──────▼──────┐  ┌───▼──────────────┐
     │Notification │  │NotificationSetting│
     └─────────────┘  └──────────────────┘

     ┌──────────┐    ┌───────────┐    ┌─────────┐
     │ AuditLog │    │ WorkQueue │    │  Fleet  │
     └──────────┘    └───────────┘    └─────────┘
```

---

## 12. מפת API פנימי — Backend Functions

### 12.1 פונקציות לפי קטגוריה

#### שיבוץ ספקים (4 פונקציות)

| פונקציה | Input | Output | Auth |
|---------|-------|--------|------|
| `autoAssignVendor` | `{ call_id, exclude_vendor_ids? }` | `{ success, recommendation, alternatives }` | admin/operator |
| `handleAssignmentResponse` | `{ attempt_id, action, decline_reason? }` | `{ success, action, next_recommendation? }` | admin/vendor |
| `updateVendorStatus` | `{ vendor_id, status }` | `{ success, status }` | admin/vendor (own) |
| `updateVendorLocation` | `{ vendor_id, lat, lon, accuracy?, speed?, heading?, battery?, call_id? }` | `{ success, location_id }` | admin/vendor (own) |

#### חישוב מרחק (2 פונקציות)

| פונקציה | Input | Output | Auth |
|---------|-------|--------|------|
| `calculateDistanceAndETA` | `{ callId, vendorId }` | `{ straightDistance, roadDistance, duration, eta, navigationUrl }` | ללא |
| `predictCallTimes` | `{ location, service_type, time_of_day, vehicle_type }` | `{ estimated_response_minutes, estimated_completion_minutes, factors }` | ללא |

#### התראות ו-SMS (6 פונקציות)

| פונקציה | Input | Output | Auth |
|---------|-------|--------|------|
| `sendSMS` | `{ phone, message, callId? }` | `{ success, sid }` | ללא |
| `sendNotification` | `{ recipient_type, notification_type, channels, ... }` | `{ success, results }` | admin/operator |
| `createNotification` | `{ user_ids, title, message, type, ... }` | `{ success, notifications_created }` | admin/operator |
| `sendCallStatusUpdate` | `{ call_id, status, eta?, custom_message? }` | `{ success, sent_message }` | admin/operator/vendor |
| `sendFeedbackSMS` | `{ call_id }` | `{ success, token, feedback_url }` | authenticated |
| `checkAndSendNotifications` | `{}` | `{ success, notifications_created }` | scheduled |

#### AI ואנליטיקס (6 פונקציות)

| פונקציה | Input | Output | Auth |
|---------|-------|--------|------|
| `categorizeCall` | `{ problem_description, location?, vehicle_type? }` | `{ issue_type, service_type, priority, confidence }` | authenticated |
| `generateCallSummary` | `{ call_id }` | `{ success, summary }` | admin/operator |
| `quickCallSummary` | `{ call_id }` | `{ summary, key_points, action_items }` | authenticated |
| `analyzeCallPatterns` | `{}` | `{ patterns, bottlenecks, recommendations }` | authenticated |
| `analyzeHistoricalPatterns` | `{ analysis_type }` | varies by type | authenticated |
| `analyzeVendorPerformance` | `{ vendor_id }` | `{ strengths, weaknesses, patterns, trend }` | ללא |

#### משוב ודירוג (4 פונקציות)

| פונקציה | Input | Output | Auth |
|---------|-------|--------|------|
| `createFeedbackToken` | `{ call_id }` | `{ success, token, expires_at }` | authenticated |
| `getFeedbackTokenInfo` | `{ token }` | `{ valid, customer_name?, error? }` | ללא (rate limited) |
| `validateAndSubmitFeedback` | `{ token, rating, feedback_text?, would_recommend? }` | `{ success, message }` | ללא |
| `submitVendorRating` | `{ vendorId, callId, overallRating, ... }` | `{ success, rating }` | authenticated (not vendor) |

#### Webhooks (3 פונקציות)

| פונקציה | Input | Output | Auth |
|---------|-------|--------|------|
| `botWebhook` | See section 3.3 | `{ success, call_id, call_number }` | webhook secret |
| `99digitalBot` | See section 3.6 | `{ success, call_id, call_number, customer_response_code }` | webhook secret |
| `externalCrmWebhook` | See section 9.3 | `{ success, call_id, queue_id }` | webhook secret |

#### ספק ואבטחה (4 פונקציות)

| פונקציה | Input | Output | Auth |
|---------|-------|--------|------|
| `getVendorScopedData` | `{ entity_type, sort?, limit? }` | `{ success, data, count }` | vendor only |
| `recommendVendor` | `{ call_details }` | `{ recommendations }` | authenticated |
| `logAuditAction` | `{ action, entity_type, entity_id?, details?, severity? }` | `{ success, audit_id }` | admin/operator |
| `checkContractExpiry` | `{}` | `{ success, results }` | scheduled |
| `detectSmartAlerts` | `{}` | `{ success, alerts_created }` | scheduled |

---

## 13. סביבות עבודה ומשתני סביבה

### 13.1 משתני Frontend (Vite)

| משתנה | תיאור | חובה |
|-------|--------|------|
| `VITE_BASE44_APP_ID` | מזהה אפליקציה Base44 | ✅ |
| `VITE_BASE44_FUNCTIONS_VERSION` | גרסת Functions | ✅ |
| `VITE_BASE44_APP_BASE_URL` | URL בסיסי | ✅ |

### 13.2 משתני Backend (Functions)

| משתנה | תיאור | חובה | שירות |
|-------|--------|------|-------|
| `BOT_WEBHOOK_SECRET` | סוד Webhook בוט | ✅ | 99Digital |
| `WEBHOOK_SECRET` | סוד Webhook חיצוני | ✅ | External CRM |
| `TWILIO_ACCOUNT_SID` | חשבון Twilio | ⚠️ | Twilio |
| `TWILIO_AUTH_TOKEN` | טוקן Twilio | ⚠️ | Twilio |
| `TWILIO_PHONE_NUMBER` | מספר שולח | ⚠️ | Twilio |
| `GOOGLE_MAPS_API_KEY` | מפתח Google Maps | ❌ | Google (optional) |

---

## 14. תוכניות פיתוח נדרשות

### 14.1 אינטגרציות חסרות — עדיפות גבוהה

| # | תוכנית | תיאור | מורכבות | תלויות |
|---|--------|-------|---------|--------|
| 1 | **הפעלת SMS Production** | הגדרת חשבון Twilio + מספר ישראלי | נמוכה | Twilio account, ENV vars |
| 2 | **WhatsApp Business API** | שליחה ישירה מהמערכת (לא דרך בוט) | בינונית | WhatsApp Business account, Twilio WhatsApp |
| 3 | **Push Notifications** | הגדרת VAPID keys + Service Worker | בינונית | VAPID keys, SW config |
| 4 | **Email Templates** | עיצוב תבניות HTML לאימייל | נמוכה | Base44 SendEmail config |

### 14.2 שיפורי אינטגרציה — עדיפות בינונית

| # | תוכנית | תיאור | מורכבות | תלויות |
|---|--------|-------|---------|--------|
| 5 | **OSRM פרטי** | הקמת שרת OSRM עם נתוני ישראל | בינונית | שרת, Docker, OSM data |
| 6 | **Geocoding Service** | המרת כתובות לקואורדינטות | בינונית | Google/Nominatim API |
| 7 | **Payment Gateway** | אינטגרציה לתשלומים/חשבוניות | גבוהה | ספק תשלומים |
| 8 | **Calendar Sync** | סנכרון עם Google Calendar | בינונית | Google Calendar API |

### 14.3 פיצ'רים חדשים — עדיפות בינונית-נמוכה

| # | תוכנית | תיאור | מורכבות | תלויות |
|---|--------|-------|---------|--------|
| 9 | **Agent Dashboard** | מסכי טכנאי שטח | בינונית | עיצוב UI |
| 10 | **Vendor Break Status** | ספק בהפסקה (עם מנגנון חזרה אוטומטי) | נמוכה | UI + Backend |
| 11 | **Call Transfer** | העברת קריאה בין ספקים | בינונית | Backend logic |
| 12 | **Escalation Flow** | אסקלציה אוטומטית לקריאות תקועות | בינונית | Business rules |
| 13 | **Smart Scheduling** | תזמון חכם של שיבוצים עתידיים | גבוהה | AI + Calendar |
| 14 | **Call Overlap Detection** | זיהוי קריאות כפולות לאותו לקוח/רכב | נמוכה | Backend logic |
| 15 | **Vendor Decline Reasons** | סיבות דחייה מובנות + ניתוח | נמוכה | UI + Analytics |

### 14.4 אבטחה ותשתית

| # | תוכנית | תיאור | מורכבות | תלויות |
|---|--------|-------|---------|--------|
| 16 | **Rate Limiting** | הגנה על כל ה-endpoints | בינונית | Backend middleware |
| 17 | **Webhook Signature Validation** | חתימה קריפטוגרפית (HMAC) | נמוכה | Backend |
| 18 | **Data Encryption** | הצפנת PII (טלפון, ת.ז.) | גבוהה | Backend + DB |
| 19 | **Backup & Recovery** | גיבוי נתונים אוטומטי | בינונית | Base44 infra |
| 20 | **Monitoring & Alerts** | ניטור בריאות שירותים חיצוניים | בינונית | Monitoring tool |

---

## 15. מפת תלויות (Dependencies)

### 15.1 תלויות ליבה

```
@base44/sdk: 0.8.3          → Backend platform
react: 18.2.0               → UI framework
react-dom: 18.2.0           → DOM rendering
react-router-dom: 6.26.0    → Routing
@tanstack/react-query: 5.84.1 → State management
tailwindcss: 3.4.17          → Styling
vite: 6.1.0                  → Build tool
```

### 15.2 תלויות UI

```
@radix-ui/*: (25+ packages) → Accessible UI primitives
lucide-react: 0.475.0        → Icons
framer-motion: 11.16.4       → Animations
recharts: 2.15.4             → Charts
sonner: 2.0.1                → Toast notifications
cmdk: 1.0.0                  → Command palette
```

### 15.3 תלויות מפות

```
react-leaflet: 4.2.1        → Map component
leaflet-routing-machine: 3.2.12 → Route display
leaflet.locatecontrol: 0.85.1  → Location button
```

### 15.4 תלויות טפסים

```
react-hook-form: 7.54.2     → Form state
zod: 3.24.2                  → Validation schemas
@hookform/resolvers: 4.1.2   → Zod integration
```

### 15.5 תלויות ייצוא

```
jspdf: 2.5.2                → PDF generation
html2canvas: 1.4.1           → Screenshot to canvas
```

### 15.6 תלויות PWA

```
vite-plugin-pwa: 1.2.0      → Service Worker generation
workbox-window: 7.4.0        → SW registration
```

### 15.7 פגיעויות ידועות

| ספריה | פגיעות | חומרה | פתרון |
|-------|--------|-------|-------|
| jspdf | npm audit | moderate | דורש --force |
| react-quill | npm audit | moderate | דורש --force |
| 2 נוספות | npm audit | low | דורש breaking changes |

---

**סוף מסמך**

*מסמך טכני המפרט את כל נתוני ההתממשקות, שירותים חיצוניים, ותוכניות פיתוח נדרשות למערכת NatID CRM. מבוסס על ניתוח הקוד בפועל — פברואר 2026.*
