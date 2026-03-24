# מדריך טכני - פורטל הספקים (Vendor Portal)

> מסמך זה מתאר את המודול המלא של פורטל הספקים במערכת NatID CRM, כולל ארכיטקטורה, קבצים, תהליכים והרשאות.

## תוכן עניינים
1. [סקירה כללית](#סקירה-כללית)
2. [תהליך רישום ספק חדש](#תהליך-רישום-ספק-חדש)
3. [עמודים זמינים לספק](#עמודים-זמינים-לספק)
4. [זרימת מסכים](#זרימת-מסכים---מה-הספק-רואה)
5. [תהליך קריאה מקצה לקצה](#תהליך-קריאה-מקצה-לקצה)
6. [הרשאות ואבטחה](#הרשאות-ואבטחה)
7. [קבצי מקור](#קבצי-מקור)
8. [API ו-Hooks](#api-ו-hooks)
9. [פונקציות Backend](#פונקציות-backend)
10. [אינטגרציות חסרות](#אינטגרציות-חסרות--לשיפור-עתידי)

---

## סקירה כללית

פורטל הספקים מאפשר לספקי שירות (גררים, מנעולנים, שמשגיסטים וכו') לנהל את הקריאות שלהם, לעדכן סטטוסים, לצפות בסטטיסטיקות ולתקשר עם המוקד.

**תפקידים:**
- **ספק (vendor)** - גישה לפורטל שלו בלבד, ניהול קריאות, עדכון פרופיל
- **מנהל (admin)** - גישה מלאה + יכולת לצפות בפורטל של כל ספק (impersonation)
- **מוקדן (operator)** - ניהול ספקים, מעקב מיקום, חוזים

---

## תהליך רישום ספק חדש

### שלב 1: יצירת פרופיל על ידי מנהל
- מנהל המערכת נכנס לעמוד **"נותני שירות"** (`ServiceProviders`)
- לוחץ **"הוסף ספק חדש"** → עמוד `NewVendor`
- ממלא: שם ספק, אימייל, טלפון, סוגי שירות, אזורי כיסוי, תעריפים
- **חשוב:** האימייל שמוזן כאן חייב להיות זהה לאימייל שבו הספק יתחבר

### שלב 2: יצירת חשבון משתמש
- מנהל יוצר חשבון משתמש עם role = `vendor` בפלטפורמת Base44
- שולח לספק אימייל + סיסמה זמנית

### שלב 3: התחברות ראשונה של הספק
- הספק נכנס לקישור האפליקציה הראשי
- מתחבר עם האימייל והסיסמה שקיבל
- המערכת מזהה אוטומטית שה-role הוא `vendor`
- מפנה אותו ל-**VendorPortal** (או לעמוד הנגיש הראשון מתוך fallbackPages)

### שלב 4: הגדרת פרופיל
- הספק נכנס ל**"הפרופיל שלי"** (`MyVendorProfile`)
- מעדכן: פרטי קשר, שעות פעילות, סוגי שירות, תעריפים, אזורי כיסוי
- מאשר שיתוף GPS ו-Push Notifications

---

## עמודים זמינים לספק

| עמוד | שם טכני | תיאור |
|------|----------|--------|
| פורטל ספקים | `VendorPortal` | דף הבית - מתג זמינות, סטטיסטיקות, טבלת קריאות, התראות קריאה חדשה |
| ניהול קריאה | `VendorCallManagement` | ניהול קריאה בודדת - סטטוס, תמונות, חתימה, צ'אט, הערות |
| הפרופיל שלי | `MyVendorProfile` | עדכון פרטים אישיים, שירותים, תעריפים, שעות |
| מדריך לספק | `VendorGuide` | מדריך מלא עם שלבים, FAQ, וטיפים |
| אפליקציה ניידת | `VendorMobileApp` | ממשק מותאם מובייל עם ניווט תחתון |
| פרופיל משתמש | `UserProfile` | הגדרות חשבון כלליות |
| מדריך משתמש | `UserGuide` | מדריך כללי למערכת |
| הגדרות התראות | `MyNotificationSettings` | הגדרת העדפות התראות |

### עמודים חסומים לספק
ספקים **אינם** רואים: Dashboard, Calls, Customers, Reports, Settings, ServiceProviders, וכל עמודי הניהול והדוחות.

### עמודים נגישים למנהל/מוקדן בלבד
| עמוד | קובץ | תיאור |
|------|-------|--------|
| ניהול ספקים | `src/features/vendors/index.jsx` | CRUD מלא לספקים + סינון סטטוס |
| מפת ספקים | `src/features/vendors/AllVendorsMap.jsx` | מפה אינטראקטיבית של כל הספקים |
| פרטי ספק | `src/pages/VendorDetails.jsx` | צפייה מפורטת בספק ספציפי |
| חוזים | `src/pages/VendorContracts.jsx` | ניהול חוזי ספקים |
| מעקב GPS | `src/pages/VendorTracking.jsx` | מעקב מיקום בזמן אמת |
| ספק חדש | `src/pages/NewVendor.jsx` | טופס הוספת ספק |
| עריכת ספק | `src/pages/EditVendor.jsx` | עריכת פרטי ספק קיים |

---

## זרימת מסכים - מה הספק רואה

### כניסה למערכת
```
התחברות (Base44 Auth)
    ↓
PermissionsContext מזהה role = "vendor"
    ↓
Redirect → VendorPortal (fallback page עבור vendor)
    ↓
vendorQuery מחפש פרופיל ספק לפי email
    ↓
    ├── נמצא → מציג את הפורטל
    └── לא נמצא → הודעת "פרופיל ספק לא נמצא"
```

### פורטל ספקים (VendorPortal)
```
┌─────────────────────────────────────┐
│  שלום, [שם הספק]                    │
│  [מדריך] [הפרופיל שלי] [רענן]      │
├─────────────────────────────────────┤
│  מתג זמינות: [זמין / לא זמין]      │
├─────────────────────────────────────┤
│  סטטיסטיקות: קריאות, הושלמו, דירוג │
├─────────────────────────────────────┤
│  קריאות פעילות שדורשות טיפול        │
│  [יצא לדרך] [הגעתי] [סיים וחתם]    │
│  [חייג] [נווט ב-Waze]              │
├─────────────────────────────────────┤
│  טבלת קריאות: [כל] [פעילות] [הושלמו]│
└─────────────────────────────────────┘
```

### ניהול קריאה (VendorCallManagement)
```
┌─────────────────────────────────────┐
│  [←] קריאה #1234                    │
│  סוג: גרירה                         │
├─────────────────────────────────────┤
│  Progress Bar: שובץ → בדרך → בטיפול │
├─────────────────────────────────────┤
│  פרטי לקוח: שם, טלפון, כתובת       │
│  פרטי רכב: יצרן, דגם, מספר רכב     │
├─────────────────────────────────────┤
│  [מסע לקוח] [תמונות] [הערות] [צ'אט] │
│  [משוב] (רק אחרי השלמה)            │
├─────────────────────────────────────┤
│  כפתורי פעולה (fixed bottom):       │
│  [יצאתי לדרך] / [הגעתי] / [סיים]   │
│  [חתימת לקוח]                       │
└─────────────────────────────────────┘
```

---

## תהליך קריאה מקצה לקצה

### קבלת קריאה
1. המוקד יוצר קריאה ומשבץ ספק (אוטומטי או ידני)
2. הספק מקבל **alert** עם פרטי הקריאה (אם זמין)
3. יש **5 דקות** לאשר - "קבל" או "דחה" עם סיבה
4. דחייה → הקריאה משובצת לספק הבא (auto-reassign)

### מעבר בין סטטוסים
```
assigned → vendor_enroute → in_progress → completed
(שובץ)    (בדרך)          (בטיפול)     (הושלם)
```

### חובות הספק בכל שלב
- **בדרך:** לחיצה על "יצאתי לדרך", שימוש בניווט Waze
- **בטיפול:** לחיצה על "הגעתי" (זמן הגעה נרשם אוטומטית)
- **תיעוד:** צילום לפני/אחרי טיפול, הוספת הערות
- **סיום:** חתימת לקוח דיגיטלית (חובה!) → "סיים קריאה"

### צ'אט עם המוקד
- כל קריאה מכילה צ'אט ישיר (`EnhancedCallChat`)
- עדכוני סטטוס נשלחים אוטומטית כהודעות
- ניתן לשלוח הודעות טקסט, תמונות, מסמכים

**Real-time Updates:**
- קריאות מתרעננות כל 30 שניות
- ניסיונות שיבוץ ממתינים מתרעננים כל 10 שניות
- התראת קריאה חדשה עם countdown של 120 שניות

---

## הרשאות ואבטחה

### הגדרות הרשאות (`src/config/permissions.js`)

```javascript
// ספק בלבד
MyVendorProfile: ['vendor'],
VendorCallManagement: ['vendor'],
VendorGuide: ['vendor'],
VendorMobileApp: ['vendor'],

// כל התפקידים
VendorPortal: ['admin', 'operator', 'vendor'],

// מנהל + מוקדן בלבד
AllVendorsMap: ['admin', 'operator'],
VendorContracts: ['admin', 'operator'],
VendorDetails: ['admin', 'operator'],
VendorTracking: ['admin', 'operator'],
```

### Server-side Security
- **getVendorScopedData** - פונקציית backend שמחזירה רק נתונים של הספק המחובר
- **updateVendorCall** - עדכון קריאה עם בדיקת בעלות (ownership check) ו-field whitelisting
- **handleAssignmentResponse** - קבלה/דחייה של שיבוץ עם race condition protection

### בידוד נתונים (Data Isolation)
- ספק רואה **רק** את הקריאות שלו - באמצעות `getVendorScopedData()`
- מנהל יכול לצפות בפורטל של כל ספק (impersonation) עם `VendorPortalAdminTab`
- זיהוי הספק נעשה לפי **אימייל** (vendor email = user email)
- `effectiveRole === 'vendor'` → הרשאות מוגבלות בלבד

### מה עובד
- רישום ספק על ידי מנהל ✅
- התחברות וזיהוי ספק אוטומטי ✅
- פורטל ספקים עם מתג זמינות ✅
- התראות קריאה חדשה עם timeout ✅
- קבלה/דחייה של שיבוצים ✅
- ניהול סטטוס קריאה מקצה לקצה ✅
- תמונות לפני/אחרי + קטגוריות ✅
- חתימת לקוח דיגיטלית ✅
- צ'אט עם מוקד (הודעות + סטטוסים אוטומטיים) ✅
- משוב לאחר סיום ✅
- פרופיל ספק עם עדכון פרטים ✅
- GPS tracking ✅
- אפליקציה ניידת (PWA) ✅
- Loading state נכון (תוקן - היה מראה שגיאה לפני סיום טעינה) ✅

---

## קבצי מקור

### Pages
| קובץ | שורות | תפקיד |
|-------|--------|--------|
| `src/pages/VendorPortal.jsx` | ~610 | דף הבית של הספק |
| `src/pages/VendorCallManagement.jsx` | ~508 | ניהול קריאה בודדת |
| `src/pages/MyVendorProfile.jsx` | ~543 | עדכון פרופיל |
| `src/pages/VendorGuide.jsx` | ~700+ | מדריך מלא |
| `src/pages/VendorMobileApp.jsx` | ~702 | ממשק מובייל |

### קומפוננטות UI (`src/components/vendor/`)
| קומפוננטה | תיאור |
|-----------|--------|
| `VendorAvailabilityToggle.jsx` | מתג זמינות + הפסקות (15/30/60 דק') |
| `VendorNewCallAlert.jsx` | מודאל התראת קריאה חדשה + countdown |
| `VendorStats.jsx` | 6 כרטיסי סטטיסטיקות |
| `VendorPortalAdminTab.jsx` | טאב מנהל - בחירת ספק לצפייה |
| `VendorCallStatusProgress.jsx` | ויזואליזציה של שלבי הקריאה |
| `VendorCallCustomerInfo.jsx` | כרטיס פרטי לקוח |
| `VendorCallVehicleInfo.jsx` | כרטיס פרטי רכב |
| `VendorCallActionBar.jsx` | כפתורי פעולה (שיחה, ניווט, ניהול) |
| `VendorCustomerJourney.jsx` | ציר זמן מסע לקוח |
| `VendorGPSTracker.jsx` | מעקב GPS בזמן אמת |

### קומפוננטות AI/דוחות
| קומפוננטה | תיאור |
|-----------|--------|
| `VendorAIInsights.jsx` | תובנות AI על ביצועי ספק |
| `VendorRecommendation.jsx` | המלצות AI לשיבוץ |
| `VendorDelaysWidget.jsx` | ניתוח עיכובים |
| `VendorPerformanceReport.jsx` | דוח ביצועים |
| `VendorParetoReport.jsx` | ניתוח פארטו |

---

## API ו-Hooks

### API Functions (`src/features/vendors/api.js`)
```
getVendors()                  // כל הספקים
getVendorById(id)             // ספק לפי ID
getVendorByEmail(email)       // ספק לפי אימייל
getAvailableVendors()         // ספקים זמינים (is_active + available)
createVendor(data)            // יצירת ספק
updateVendor(id, data)        // עדכון ספק
deleteVendor(id)              // מחיקת ספק
getVendorRatings(vendorId)    // דירוגים
getVendorPayments(vendorId)   // תשלומים
getVendorContracts(vendorId)  // חוזים
getVendorLocations(vendorId)  // היסטוריית מיקומים
getAssignmentAttempts(filter) // ניסיונות שיבוץ
```

### React Query Hooks (`src/features/vendors/useVendors.js`)
```
useVendors()                    // רשימת ספקים (staleTime: 5 דק')
useVendor(id)                   // ספק בודד
useVendorByEmail(email)         // חיפוש לפי אימייל
useAvailableVendors()           // ספקים זמינים (refetch: 30 שניות)
useCreateVendor()               // mutation יצירה
useUpdateVendor()               // mutation עדכון
useDeleteVendor()               // mutation מחיקה
useUpdateVendorAvailability()   // mutation זמינות
useVendorRatings(vendorId)      // דירוגים
useVendorPayments(vendorId)     // תשלומים
useVendorContracts(vendorId)    // חוזים
useVendorLocations(vendorId)    // מיקומים
useAssignmentAttempts(filter)   // ניסיונות שיבוץ
```

---

## פונקציות Backend

### פונקציות שרת רלוונטיות (`functions/`)
| פונקציה | תיאור |
|---------|--------|
| `auto-assign-vendor.ts` | שיבוץ אוטומטי של ספק לקריאה לפי מרחק, זמינות ודירוג |
| `calculate-distance-eta.ts` | חישוב מרחק וזמן הגעה משוער |
| `vendor-recommendation.ts` | המלצת AI לספק מתאים |
| `send-sms-notification.ts` | שליחת SMS לספק (Twilio) |
| `update-status-notifications.ts` | עדכון סטטוס + שליחת התראות |
| `vendor-feedback.ts` | עיבוד משוב ספק |
| `getVendorScopedData.ts` | שליפת נתונים מאובטחת לספק |
| `updateVendorCall.ts` | עדכון קריאה עם אימות |
| `handleAssignmentResponse.ts` | קבלה/דחייה של שיבוץ |

### Permissions
- `src/config/permissions.js` - הגדרת הרשאות דפים
- `src/components/permissions/PermissionsContext.jsx` - ניהול הרשאות runtime

---

## אינטגרציות חסרות / לשיפור עתידי

| תכונה | סטטוס | תיאור |
|--------|--------|--------|
| Push Notifications | ⚠️ חלקי | PWA notifications מוגדרים אבל לא מחוברים לשרת |
| תשלומים אוטומטיים | ❌ חסר | חישוב בלבד, אין חיבור למערכת תשלומים |
| דוח PDF לספק | ❌ חסר | ספק לא יכול להוריד דוח ביצועים |
| היסטוריית הפסקות | ❌ חסר | הפסקות לא נשמרות להיסטוריה |
| צ'אט real-time | ⚠️ חלקי | polling כל 30 שניות, לא WebSocket |
| חתימה דיגיטלית מוצפנת | ⚠️ חלקי | חתימה נשמרת כ-canvas image, ללא הצפנה |
| SMS לספק על קריאה חדשה | ⚠️ חלקי | Twilio קיים אבל צריך לוודא integration |
| ניהול חוזים לספק | ❌ חסר | VendorContracts לא נגיש לספק |
| דוח רווחים/הכנסות לספק | ❌ חסר | כרגע רק סיכום בסיסי |
| מפה באפליקציה הניידת | ❌ חסר | מוצג "בקרוב" |
| הרשמה עצמאית לספקים | ❌ חסר | כרגע רק דרך מנהל |

---

*מסמך זה עודכן לאחרונה: מרץ 2026*
