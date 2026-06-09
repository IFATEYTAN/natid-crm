# תוכנית יישום: מעקב מיקום אמין ברקע (Capacitor)

## הבעיה
מעקב המיקום הנוכחי מבוסס על `navigator.geolocation` בדפדפן (`VendorGPSTracker`).
דפדפנים **לא** מאפשרים מעקב מיקום אמין ברקע:
- **iOS Safari** — אין מעקב רקע כלל. נעילת מסך / מעבר ל-Waze עוצרים את השידור.
- **Android Chrome** — תמיכה חלקית ונחנקת.

התוצאה: ברגע שהספק נוסע עם מסך נעול או על אפליקציית ניווט, ה-CRM מאבד את מיקומו.

## הפתרון: עטיפת האפליקציה ב-Capacitor + plugin מעקב-רקע
Capacitor עוטף את אפליקציית ה-React/Vite הקיימת כאפליקציה נייטיב (iOS/Android)
**בלי לכתוב מחדש** — אותו קוד, אותו פורטל. נוסיף plugin שמספק מעקב מיקום נייטיב
אמיתי (גם מסך נעול, מבוסס-תנועה, חסכוני בסוללה, עם buffering אופליין).

## מה כבר מוטמע בריפו (scaffold — בוצע)
החלק שנכנס לקוד **כבר קיים בברנצ'**, וה-web build נשאר ירוק (הכל מאחורי guard נייטיב):
- ✅ חבילות: `@capacitor/core,cli,ios,android` + `@capacitor-community/background-geolocation` (חינמי) ב-`package.json`.
- ✅ `capacitor.config.ts` (appId `co.natid.crm`, `webDir: dist`).
- ✅ `src/services/backgroundLocation.js` — מאזין מיקומי-רקע (דרך `registerPlugin`) שמזין את **`updateVendorLocation` הקיימת**.
- ✅ חיווט ב-`VendorGPSTracker.jsx` — בנייטיב מפעיל מעקב-רקע ומדלג על ה-watch של הדפדפן; ב-web no-op מוחלט.
- ✅ npm scripts: `cap:sync`, `cap:ios`, `cap:android`.

**מה שנשאר (רץ מקומית על מחשב מפתח):**
1. `npx cap add ios && npx cap add android` (יוצר את תיקיות הנייטיב).
2. הוספת ההרשאות (סעיף "הרשאות" למטה).
3. build והרצה על מכשיר + הפצה.

> הערה: ה-scaffold משתמש ב-plugin הקהילתי החינמי. לשדרוג production (מבוסס-תנועה, חסכוני יותר) אפשר להחליף ל-`@transistorsoft/capacitor-background-geolocation` — אותו מבנה, API דומה.

## דרישות מקדימות
- חשבון Apple Developer (להפצת iOS) + חשבון Google Play (Android), או הפצה פנימית (MDM / TestFlight / APK).
- macOS + Xcode ל-build של iOS; Android Studio ל-Android.
- מפתח/CI שיתחזק build נייטיב.

## שלבי יישום

### 1. התקנת Capacitor
```bash
npm i @capacitor/core @capacitor/cli
npx cap init "NatID CRM" "co.natid.crm" --web-dir=dist
npm i @capacitor/ios @capacitor/android
npm run build && npx cap add ios && npx cap add android
```

### 2. plugin מעקב-רקע
מומלץ **`@transistorsoft/capacitor-background-geolocation`** (בשל, מבוסס-תנועה, חסכוני).
חלופה חינמית: `@capacitor-community/background-geolocation`.
```bash
npm i @transistorsoft/capacitor-background-geolocation
```

### 3. אתחול וקונפיגורציה (בעת התחברות ספק / קריאה פעילה)
```js
import BackgroundGeolocation from '@transistorsoft/capacitor-background-geolocation';

await BackgroundGeolocation.ready({
  desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
  distanceFilter: 50,            // מטרים בין עדכונים
  stopTimeout: 5,                // דקות עד מצב "עצירה"
  stopOnTerminate: false,        // ממשיך גם אחרי סגירת האפליקציה
  startOnBoot: true,
  batchSync: true,
  autoSync: true,
});
BackgroundGeolocation.onLocation((location) => {
  // לשלוח לאותו endpoint קיים:
  base44.functions.invoke('updateVendorLocation', {
    vendor_id, latitude: location.coords.latitude, longitude: location.coords.longitude,
    accuracy: location.coords.accuracy, speed: location.coords.speed,
    heading: location.coords.heading, battery_level: Math.round(location.battery.level * 100),
  });
});
await BackgroundGeolocation.start();
```
> **נקודת אינטגרציה מרכזית:** ה-plugin מזין את **אותה פונקציה `updateVendorLocation`** הקיימת — אין שינוי בצד השרת/הנתונים. כל מסכי המעקב והחיווי (כולל "מיקום לא עדכני") ממשיכים לעבוד כמו שהם.

### 4. הרשאות
- **iOS** (`Info.plist`): `NSLocationAlwaysAndWhenInUseUsageDescription`, `NSLocationWhenInUseUsageDescription`, יכולת רקע `location`.
- **Android** (`AndroidManifest.xml`): `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION` + foreground-service notification ("NatID — שיתוף מיקום פעיל").

### 5. הפעלה מותנית
להפעיל מעקב-רקע **רק כשיש קריאה פעילה** (`vendor_enroute`/`vendor_arrived`/`in_progress`)
ולעצור בסיום — חוסך סוללה ומכבד פרטיות (לא עוקבים מחוץ למשמרת/קריאה).

### 6. הפצה
- **iOS:** TestFlight (פנימי) או App Store. הערה: רקע-מיקום דורש הצדקה בבדיקת אפל.
- **Android:** Play Internal Testing / APK ישיר / MDM. `ACCESS_BACKGROUND_LOCATION` דורש הצדקה ב-Play.

## פרטיות וסוללה
- שקיפות לספק: התראת foreground-service קבועה ("שיתוף מיקום פעיל").
- מעקב מוגבל לקריאה פעילה בלבד; כיבוי מלא דרך הטוגל הקיים `is_location_sharing_enabled`.
- `distanceFilter` + מצב מבוסס-תנועה → צריכת סוללה נמוכה.

## הערכת מאמץ
- הקמת Capacitor + build ראשון: ~1–2 ימים.
- אינטגרציית plugin + הרשאות + בדיקות מכשיר: ~2–4 ימים.
- הפצה ראשונית (TestFlight/Play internal): ~1–3 ימים (תלוי באישורי חנות).
- **סה"כ ~1–2 שבועות** ל-MVP פנימי.

## מצב ביניים (כבר מיושם — רמה 1)
עד שרמה 2 תיושם, פעילים כבר:
- **Wake Lock** — מסך דולק בזמן מעקב פעיל (`VendorGPSTracker`).
- **Push "עדכון מיקום נדרש"** — `nudgeStaleVendorLocations` (cron ~5 דק') לספק בקריאה פעילה עם מיקום שהתיישן.
- **חיווי "מיקום לא עדכני"** במסכי המעקב (`LocationFreshnessBadge`).

## נקודות החלטה לפני התחלה
1. iOS + Android, או אחד מהם בלבד?
2. הפצה פנימית (MDM/TestFlight) או חנויות ציבוריות?
3. plugin בתשלום (Transistorsoft, בשל יותר) או קהילתי חינמי?
