# NatID CRM - מסמך אפיון מערכת מלא

## תוכן עניינים

1. [סקירה כללית](#1-סקירה-כללית)
2. [ארכיטקטורה טכנית](#2-ארכיטקטורה-טכנית)
3. [מודולים ופיצ'רים](#3-מודולים-ופיצרים)
4. [ממשק משתמש (UI/UX)](#4-ממשק-משתמש-uiux)
5. [מפות וניווט](#5-מפות-וניווט)
6. [התראות ועדכונים](#6-התראות-ועדכונים)
7. [PWA - אפליקציה מותקנת](#7-pwa---אפליקציה-מותקנת)
8. [אבטחה והרשאות](#8-אבטחה-והרשאות)
9. [אינטגרציות](#9-אינטגרציות)
10. [API Reference](#10-api-reference)

---

## 1. סקירה כללית

### 1.1 תיאור המערכת
NatID CRM היא מערכת לניהול קריאות דרך (Road Service Management) המאפשרת:
- ניהול קריאות שירות דרך
- שיבוץ אוטומטי של ספקי שירות (גררים, מכונאים)
- מעקב GPS בזמן אמת
- ניהול לקוחות וספקים
- דוחות וניתוח ביצועים

### 1.2 קהל יעד
| סוג משתמש | תיאור | הרשאות |
|-----------|-------|--------|
| מוקדן | מנהל קריאות, משבץ ספקים | קריאות, לקוחות, ספקים |
| מנהל | ניהול מלא של המערכת | הכל |
| ספק שירות | צפייה בקריאות משובצות | קריאות שלו, עדכון סטטוס |
| לקוח | פתיחת קריאות, מעקב | קריאות שלו בלבד |

### 1.3 טכנולוגיות
```
Frontend:
- React 18.2 + Vite 6
- TailwindCSS 3.4
- Framer Motion (אנימציות)
- React Query (ניהול state)
- React Leaflet (מפות)

Backend:
- Base44 SDK
- Deno Functions
- PostgreSQL (via Supabase)

APIs:
- OSRM (ניתוב - חינמי)
- Google Maps API (אופציונלי)
- Waze Deep Links
```

---

## 2. ארכיטקטורה טכנית

### 2.1 מבנה תיקיות
```
natid-crm/
├── docs/                    # תיעוד
├── functions/               # Backend Functions (Deno)
│   ├── calculateDistanceAndETA.ts
│   ├── updateVendorLocation.ts
│   └── autoAssignVendor.ts
├── public/
│   ├── manifest.json        # PWA הגדרות
│   └── icons/               # אייקונים
├── src/
│   ├── api/                 # API clients
│   ├── components/
│   │   ├── ui/              # רכיבי UI בסיסיים
│   │   ├── maps/            # רכיבי מפה
│   │   ├── pwa/             # רכיבי PWA
│   │   ├── notifications/   # התראות
│   │   └── animations/      # אנימציות
│   ├── hooks/               # React hooks
│   ├── pages/               # דפי האפליקציה
│   ├── services/            # שירותים
│   └── Layout.jsx           # תבנית ראשית
└── vite.config.js
```

### 2.2 Entity Relationship Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Customer  │────<│    Call     │>────│   Vendor    │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                    │
      │                   │                    │
      ▼                   ▼                    ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Contact   │     │  CallNote   │     │VendorLocation│
└─────────────┘     └─────────────┘     └─────────────┘
                          │
                          ▼
                    ┌─────────────┐
                    │ Notification│
                    └─────────────┘
```

### 2.3 ישויות (Entities)

#### Call (קריאה)
```typescript
{
  id: string;
  call_number: string;           // מספר קריאה
  status: 'new' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  service_type: string;          // סוג שירות
  customer_id: string;
  vendor_id?: string;
  location_address: string;
  location_lat: number;
  location_lon: number;
  description: string;
  eta_minutes?: number;
  distance_km?: number;
  created_date: string;
  completed_date?: string;
}
```

#### Vendor (ספק שירות)
```typescript
{
  id: string;
  name: string;
  phone: string;
  email: string;
  service_types: string[];       // סוגי שירות
  coverage_radius_km: number;    // רדיוס כיסוי
  is_available: boolean;
  rating: number;
  total_calls: number;
  current_location?: {
    latitude: number;
    longitude: number;
  };
}
```

#### VendorLocation (מיקום ספק)
```typescript
{
  id: string;
  vendor_id: string;
  vendor_name: string;
  latitude: number;
  longitude: number;
  accuracy: number;              // דיוק GPS במטרים
  speed: number;                 // מהירות בקמ"ש
  heading: number;               // כיוון במעלות
  is_available: boolean;
  created_date: string;
}
```

#### Customer (לקוח)
```typescript
{
  id: string;
  name: string;
  phone: string;
  email: string;
  company?: string;
  address: string;
  total_calls: number;
  created_date: string;
}
```

#### Notification (התראה)
```typescript
{
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  link?: string;
  is_read: boolean;
  created_at: string;
}
```

---

## 3. מודולים ופיצ'רים

### 3.1 לוח בקרה (Dashboard)
**נתיב:** `/Dashboard`

**פיצ'רים:**
- סטטיסטיקות יומיות (קריאות חדשות, פתוחות, הושלמו)
- גרף ביצועים שבועי
- רשימת קריאות דחופות
- מפת ספקים פעילים
- התראות אחרונות

**רכיבים:**
```jsx
<StatCard title="קריאות היום" value={45} trend="+12%" />
<CallsChart data={weeklyData} />
<UrgentCallsList calls={urgentCalls} />
<VendorsMap vendors={activeVendors} />
```

### 3.2 ניהול קריאות (Calls)
**נתיב:** `/Calls`, `/CaseDetails/:id`, `/NewCase`

**פיצ'רים:**
- רשימת קריאות עם סינון ומיון
- יצירת קריאה חדשה
- שיבוץ ספק (ידני/אוטומטי)
- עדכון סטטוס
- הערות וקבצים
- היסטוריית שינויים

**מצבי קריאה:**
```
new → assigned → in_progress → completed
  ↓                              ↓
cancelled                    cancelled
```

**אלגוריתם שיבוץ אוטומטי:**
```typescript
score = (
  distance_score * 0.35 +      // מרחק מהקריאה
  availability_score * 0.25 +  // זמינות
  rating_score * 0.20 +        // דירוג
  workload_score * 0.20        // עומס נוכחי
)
```

### 3.3 ניהול ספקים (ServiceProviders)
**נתיב:** `/ServiceProviders`, `/VendorPortal`

**פיצ'רים:**
- רשימת ספקים עם סטטוס
- פרופיל ספק מפורט
- היסטוריית קריאות
- דירוג וביקורות
- אזורי כיסוי
- לוח זמנים

### 3.4 ניהול לקוחות (Customers)
**נתיב:** `/Customers`

**פיצ'רים:**
- רשימת לקוחות
- פרטי לקוח
- היסטוריית קריאות
- אנשי קשר
- הערות

### 3.5 דוחות (Reports)
**נתיב:** `/Reports`

**סוגי דוחות:**
| דוח | תיאור |
|-----|-------|
| ביצועי ספקים | זמני תגובה, דירוג, כמות קריאות |
| SLA | עמידה ביעדי שירות |
| כספי | הכנסות, עלויות |
| תפעולי | קריאות לפי סוג, אזור, זמן |

**ייצוא:**
- PDF עם לוגו ועיצוב מותג
- Excel
- CSV
- HTML

### 3.6 ניטור תורים (QueueMonitor)
**נתיב:** `/QueueMonitor`

**פיצ'רים:**
- תצוגת Kanban של קריאות
- גרירה לשינוי סטטוס
- סינון לפי עדיפות/סוג
- התראות SLA

### 3.7 מפה כללית (AllVendorsMap)
**נתיב:** `/AllVendorsMap`

**פיצ'רים:**
- כל הספקים על המפה
- קריאות פתוחות
- אזורי כיסוי
- סינון לפי סטטוס/סוג
- רענון אוטומטי (15 שניות)

---

## 4. ממשק משתמש (UI/UX)

### 4.1 מערכת עיצוב

**צבעים:**
```css
/* צבעים ראשיים */
--primary-blue: #0D47A1;
--primary-red: #FF0000;      /* כפתורים ראשיים */
--success: #4CAF50;
--warning: #FF9800;
--error: #F44336;

/* ניטרליים */
--background: #FAFAFA;
--surface: #FFFFFF;
--text-primary: #212121;
--text-secondary: #616161;
--border: #E0E0E0;
```

**טיפוגרפיה:**
```css
font-family: 'Heebo', sans-serif;

/* גדלים */
h1: 32px / 700
h2: 24px / 600
h3: 20px / 500
body: 16px / 400
caption: 12px / 400
```

### 4.2 רכיבי UI

#### StatusBadge
```jsx
<StatusBadge status="completed" />
// מצבים: new, assigned, in_progress, completed, cancelled
```

#### EmptyState
```jsx
<EmptyState
  icon={<FileIcon />}
  title="אין נתונים"
  description="לא נמצאו תוצאות"
  action={<Button>הוסף חדש</Button>}
/>
```

#### DataTable
```jsx
<DataTable
  data={calls}
  columns={columns}
  sortable
  filterable
  pagination
  exportable
/>
```

#### ExportMenu
```jsx
<ExportMenu
  data={data}
  columns={columns}
  filename="report"
  formats={['pdf', 'excel', 'csv', 'html']}
/>
```

### 4.3 אנימציות

**PageTransition:**
```jsx
<PageTransition>
  <PageContent />
</PageTransition>
// Fade in + slide up on mount
```

**AnimatedCard:**
```jsx
<AnimatedCard delay={0.1}>
  <CardContent />
</AnimatedCard>
// Hover scale + shadow
```

**AnimatedCounter:**
```jsx
<AnimatedCounter value={1234} duration={1.5} />
// Counting animation from 0 to value
```

### 4.4 נגישות (WCAG AA)

- ניגודיות צבעים מינימלית 4.5:1
- תמיכה מלאה ב-RTL
- ניווט מקלדת
- תיאורי ARIA
- גודל טקסט מינימלי 16px
- אזורי לחיצה מינימליים 44x44px

**AccessibilityWidget:**
- הגדלת טקסט
- ניגודיות גבוהה
- הדגשת קישורים
- עצירת אנימציות

---

## 5. מפות וניווט

### 5.1 רכיבי מפה

#### NavigationMap
**קובץ:** `src/components/maps/NavigationMap.jsx`

```jsx
<NavigationMap
  vendorLocation={{ lat: 31.77, lon: 35.21 }}
  callLocation={{ lat: 31.75, lon: 35.18, address: "רחוב הרצל 10" }}
  distance={5.2}
  duration={12}
  onNavigate={() => openWaze()}
/>
```

**פיצ'רים:**
- מסלול אמיתי מ-OSRM API
- הנחיות נסיעה בעברית
- 3 שכבות מפה (רגיל, לוויין, טופו)
- אנימציית מסלול
- אייקונים מותאמים

#### VendorTrailMap
**קובץ:** `src/components/maps/VendorTrailMap.jsx`

```jsx
<VendorTrailMap
  vendorId="vendor-123"
  vendorName="יוסי כהן"
  showLast={50}
/>
```

**פיצ'רים:**
- היסטוריית מיקומים
- צביעה לפי מהירות
- פקדי הפעלה (Play/Pause)
- סטטיסטיקות נסיעה

#### MultiStopRouteOptimizer
**קובץ:** `src/components/maps/MultiStopRouteOptimizer.jsx`

```jsx
<MultiStopRouteOptimizer
  startLocation={currentLocation}
  stops={callsToVisit}
  returnToStart={true}
  onRouteCalculated={(result) => console.log(result)}
/>
```

**פיצ'רים:**
- אלגוריתם Nearest Neighbor
- Drag & Drop לשינוי סדר
- חישוב מרחק וזמן
- כפתור ניווט

#### GeofenceManager
**קובץ:** `src/components/maps/GeofenceManager.jsx`

```jsx
<GeofenceManager
  zones={serviceZones}
  onZonesChange={handleZonesChange}
  checkPoint={callLocation}
/>
```

**סוגי אזורים:**
| סוג | צבע | שימוש |
|-----|-----|-------|
| service_area | ירוק | אזור שירות פעיל |
| restricted | אדום | אזור מוגבל |
| priority | כתום | אזור עדיפות |
| vendor_coverage | כחול | כיסוי ספק |

### 5.2 שירותי מיקום

#### LiveLocationTracker
```jsx
<LiveLocationTracker
  vendorId="vendor-123"
  updateInterval={10000}
  onLocationUpdate={(loc) => console.log(loc)}
/>
```

#### Distance Matrix Service
**קובץ:** `src/services/distanceMatrix.js`

```javascript
// חישוב מטריצת מרחקים
const matrix = await calculateDistanceMatrix(origins, destinations);

// מציאת ספק קרוב
const nearestVendors = await findNearestVendors(callLocation, vendors);

// חישוב מסלול אופטימלי
const route = await calculateOptimalRoute(start, stops, end);
```

### 5.3 אינטגרציית ניווט

**Waze:**
```javascript
const wazeUrl = `https://waze.com/ul?ll=${lat},${lon}&navigate=yes`;
window.open(wazeUrl, '_blank');
```

**Google Maps:**
```javascript
const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
window.open(googleUrl, '_blank');
```

---

## 6. התראות ועדכונים

### 6.1 Push Notifications
**קובץ:** `src/components/notifications/PushNotifications.jsx`

**סוגי התראות:**
```javascript
NotificationTypes = {
  NEW_CALL: 'new_call',           // קריאה חדשה
  CALL_ASSIGNED: 'call_assigned', // שובצת אליך
  CALL_STATUS_CHANGE: 'status',   // שינוי סטטוס
  VENDOR_ARRIVED: 'arrived',      // ספק הגיע
  CALL_COMPLETED: 'completed',    // הושלמה
  SLA_WARNING: 'sla_warning',     // אזהרת SLA
  SYSTEM_ALERT: 'system'          // התראת מערכת
}
```

**שימוש:**
```jsx
import { usePushNotifications, createAppNotification } from './PushNotifications';

const { permission, requestPermission, showNotification } = usePushNotifications();

// בקשת הרשאה
await requestPermission();

// שליחת התראה
createAppNotification(NotificationTypes.NEW_CALL, {
  callId: '123',
  customerName: 'יוסי',
  location: 'תל אביב'
});
```

**רכיבים:**
- `NotificationPermissionBanner` - באנר בקשת הרשאה
- `NotificationSettings` - הגדרות התראות

### 6.2 Real-time Updates
**קובץ:** `src/hooks/useRealtimeUpdates.js`

**מצבי חיבור:**
```javascript
ConnectionState = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error'
}
```

**Hooks:**
```jsx
// חיבור כללי
const { isConnected, subscribe } = useRealtimeUpdates();

// עדכוני קריאות
useRealtimeCalls({
  onNewCall: (call) => refetchCalls(),
  onCallUpdate: (call) => updateCache(call),
  showNotifications: true
});

// עדכוני מיקום ספקים
useRealtimeVendorLocations({
  vendorIds: ['v1', 'v2'],
  onLocationUpdate: (loc) => updateMap(loc)
});
```

**אירועים:**
```javascript
RealtimeEvents = {
  CALL_CREATED: 'call.created',
  CALL_UPDATED: 'call.updated',
  CALL_ASSIGNED: 'call.assigned',
  CALL_STATUS_CHANGED: 'call.status_changed',
  VENDOR_LOCATION_UPDATED: 'vendor.location_updated',
  SLA_WARNING: 'sla.warning'
}
```

### 6.3 In-App Notifications

**Bell Icon (Header):**
- ספירת התראות לא נקראו
- Popover עם רשימת התראות
- סימון כנקרא בלחיצה
- קישור לפרטים

---

## 7. PWA - אפליקציה מותקנת

### 7.1 הגדרות Manifest
**קובץ:** `public/manifest.json`

```json
{
  "name": "NatID CRM - מערכת ניהול קריאות דרך",
  "short_name": "NatID CRM",
  "display": "standalone",
  "theme_color": "#0D47A1",
  "background_color": "#ffffff",
  "orientation": "portrait-primary",
  "lang": "he",
  "dir": "rtl",
  "shortcuts": [
    { "name": "קריאה חדשה", "url": "/NewCase" },
    { "name": "מפה חיה", "url": "/AllVendorsMap" }
  ]
}
```

### 7.2 Service Worker
**הגדרות:** `vite.config.js` (vite-plugin-pwa)

**אסטרטגיית מטמון:**
| תוכן | אסטרטגיה | TTL |
|------|----------|-----|
| קבצים סטטיים | CacheFirst | 1 שנה |
| API | NetworkFirst | 24 שעות |
| תמונות | CacheFirst | 30 יום |
| פונטים | CacheFirst | 1 שנה |
| Map Tiles | CacheFirst | 7 ימים |

### 7.3 רכיבי PWA

**InstallPrompt:**
```jsx
<InstallPrompt />
// מציג כפתור התקנה (Android) או הוראות (iOS)
```

**OfflineIndicator:**
```jsx
<OfflineIndicator />
// באנר צהוב כשאין חיבור
// באנר ירוק כשהחיבור חוזר
```

**UpdatePrompt:**
```jsx
<UpdatePrompt />
// התראה כשיש גרסה חדשה
// כפתור "עדכן עכשיו"
```

---

## 8. אבטחה והרשאות

### 8.1 אימות (Authentication)
- התחברות עם email/password
- Session-based authentication
- Auto-logout after inactivity

### 8.2 הרשאות (Authorization)

**רמות הרשאה:**
```javascript
Roles = {
  ADMIN: 'admin',           // גישה מלאה
  MANAGER: 'manager',       // ניהול ללא הגדרות מערכת
  DISPATCHER: 'dispatcher', // מוקדן - קריאות וספקים
  VENDOR: 'vendor',         // ספק - קריאות שלו בלבד
  CUSTOMER: 'customer'      // לקוח - קריאות שלו בלבד
}
```

**הגבלות לפי תפקיד:**
| פעולה | Admin | Manager | Dispatcher | Vendor | Customer |
|-------|-------|---------|------------|--------|----------|
| צפייה בכל הקריאות | ✓ | ✓ | ✓ | ✗ | ✗ |
| יצירת קריאה | ✓ | ✓ | ✓ | ✗ | ✓ |
| שיבוץ ספק | ✓ | ✓ | ✓ | ✗ | ✗ |
| עדכון סטטוס | ✓ | ✓ | ✓ | ✓* | ✗ |
| ניהול ספקים | ✓ | ✓ | ✗ | ✗ | ✗ |
| הגדרות מערכת | ✓ | ✗ | ✗ | ✗ | ✗ |

*ספק יכול לעדכן רק קריאות משובצות אליו

### 8.3 אבטחת נתונים
- HTTPS only
- Input validation
- SQL injection prevention (parameterized queries)
- XSS prevention (React auto-escaping)
- CORS configuration

---

## 9. אינטגרציות

### 9.1 OSRM (Open Source Routing Machine)
**שימוש:** חישוב מסלולים ומרחקים (חינמי)

```javascript
// Route API
GET https://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}
  ?overview=full
  &geometries=geojson
  &steps=true

// Table API (Distance Matrix)
GET https://router.project-osrm.org/table/v1/driving/{coords}
  ?sources={indices}
  &destinations={indices}
  &annotations=distance,duration
```

### 9.2 Google Maps API (אופציונלי)
**שימוש:** מסלולים מדויקים יותר עם תנועה

```typescript
// Environment variable
GOOGLE_MAPS_API_KEY=your_key_here

// Directions API
GET https://maps.googleapis.com/maps/api/directions/json
  ?origin={lat},{lon}
  &destination={lat},{lon}
  &key={API_KEY}
```

### 9.3 Waze Deep Links
```javascript
// ניווט ליעד
`https://waze.com/ul?ll=${lat},${lon}&navigate=yes`

// חיפוש כתובת
`https://waze.com/ul?q=${encodeURIComponent(address)}`
```

### 9.4 Base44 SDK
**קובץ:** `src/api/base44Client.js`

```javascript
import { base44 } from '@base44/sdk';

// Entities
base44.entities.Call.filter({ status: 'new' }, '-created_date', 50);
base44.entities.Call.create({ ... });
base44.entities.Call.update(id, { status: 'completed' });
base44.entities.Call.delete(id);

// Functions
base44.functions.invoke('calculateDistanceAndETA', { ... });
base44.functions.invoke('autoAssignVendor', { callId });

// Auth
base44.auth.me();
base44.auth.logout('/SignIn');
```

---

## 10. API Reference

### 10.1 Backend Functions

#### calculateDistanceAndETA
```typescript
// Input
{
  origin: { lat: number, lon: number },
  destination: { lat: number, lon: number }
}

// Output
{
  distance_km: number,
  duration_minutes: number,
  navigation_url: string,
  source: 'google' | 'osrm' | 'haversine'
}
```

#### autoAssignVendor
```typescript
// Input
{
  call_id: string,
  service_type?: string,
  max_distance_km?: number
}

// Output
{
  success: boolean,
  vendor_id?: string,
  vendor_name?: string,
  distance_km?: number,
  eta_minutes?: number,
  score?: number,
  error?: string
}
```

#### updateVendorLocation
```typescript
// Input
{
  vendor_id: string,
  latitude: number,
  longitude: number,
  accuracy?: number,
  speed?: number,
  heading?: number,
  is_available?: boolean
}

// Output
{
  success: boolean,
  location_id?: string
}
```

### 10.2 Frontend Services

#### Distance Matrix Service
```typescript
// Calculate matrix
calculateDistanceMatrix(
  origins: Array<{latitude, longitude}>,
  destinations: Array<{latitude, longitude}>
): Promise<Array<{origin, destination, distance, duration}>>

// Find nearest
findNearestVendors(
  callLocation: {latitude, longitude},
  vendors: Array<Vendor>
): Promise<Array<VendorWithDistance>>

// Optimize route
calculateOptimalRoute(
  start: Location,
  stops: Array<Location>,
  end?: Location
): Promise<{route, totalDistance, totalDuration}>
```

#### Geofence Service
```typescript
// Check point in zones
getZonesForPoint(
  point: {latitude, longitude},
  zones: Array<Zone>
): Array<Zone>

// Check if in service area
isPointInCircle(point, center, radiusKm): boolean
isPointInPolygon(point, polygonPoints): boolean
```

---

## נספחים

### נספח א' - קודי סטטוס קריאה

| קוד | שם | תיאור |
|-----|-----|-------|
| new | חדשה | קריאה נפתחה, ממתינה לשיבוץ |
| assigned | שובצה | ספק שובץ, ממתין ליציאה |
| en_route | בדרך | ספק יצא לכיוון היעד |
| arrived | הגיע | ספק הגיע ליעד |
| in_progress | בטיפול | ספק מטפל בקריאה |
| completed | הושלמה | קריאה טופלה בהצלחה |
| cancelled | בוטלה | קריאה בוטלה |

### נספח ב' - קודי שגיאה

| קוד | תיאור | פתרון |
|-----|-------|-------|
| E001 | אין ספקים זמינים | הגדל רדיוס חיפוש |
| E002 | קריאה מחוץ לאזור שירות | בדוק אזורי כיסוי |
| E003 | שגיאת GPS | בקש הרשאות מיקום |
| E004 | שגיאת חיבור | בדוק חיבור אינטרנט |
| E005 | הרשאה נדחתה | פנה למנהל מערכת |

### נספח ג' - מדדי SLA

| מדד | יעד | אזהרה |
|-----|-----|-------|
| זמן תגובה | < 30 דקות | 80% מהיעד |
| זמן הגעה | < 60 דקות | 80% מהיעד |
| זמן טיפול | < 120 דקות | 80% מהיעד |
| שביעות רצון | > 4.0/5 | < 3.5 |

---

**גרסת מסמך:** 2.0
**תאריך עדכון:** ינואר 2026
**מחבר:** NatID CRM Team
