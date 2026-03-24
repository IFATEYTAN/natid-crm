# מדריך טכני - פורטל הספקים (Vendor Portal)

> מסמך זה מתאר את המודול המלא של פורטל הספקים במערכת NatID CRM, כולל ארכיטקטורה, קבצים, תהליכים והרשאות.

## תוכן עניינים
1. [סקירה כללית](#סקירה-כללית)
2. [תהליך רישום ספק חדש](#תהליך-רישום-ספק-חדש)
3. [מסכי הספק](#מסכי-הספק)
4. [מחזור חיי קריאה](#מחזור-חיי-קריאה)
5. [הרשאות ואבטחה](#הרשאות-ואבטחה)
6. [קבצי מקור](#קבצי-מקור)
7. [API ו-Hooks](#api-ו-hooks)
8. [פונקציות Backend](#פונקציות-backend)
9. [אינטגרציות חסרות](#אינטגרציות-חסרות)

---

## סקירה כללית

פורטל הספקים מאפשר לספקי שירות (גררים, מנעולנים, שמשגיסטים וכו') לנהל את הקריאות שלהם, לעדכן סטטוסים, לצפות בסטטיסטיקות ולתקשר עם המוקד.

**תפקידים:**
- **ספק (vendor)** - גישה לפורטל שלו בלבד, ניהול קריאות, עדכון פרופיל
- **מנהל (admin)** - גישה מלאה + יכולת לצפות בפורטל של כל ספק (impersonation)
- **מוקדן (operator)** - ניהול ספקים, מעקב מיקום, חוזים

---

## תהליך רישום ספק חדש

```
┌──────────────────────────────────────────────────────────────┐
│  1. מנהל יוצר פרופיל ספק (NewVendor / ניהול ספקים)         │
│     ├── פרטי קשר (שם, טלפון, אימייל)                       │
│     ├── סוגי שירות (גרירה, מנעולנות, שמשות...)             │
│     ├── אזורי כיסוי (מרכז, שרון, צפון...)                  │
│     └── תעריפים ושעות פעילות                                │
│                         ▼                                    │
│  2. ספק מקבל פרטי התחברות (אימייל + סיסמה ראשונית)         │
│     ⚠️ האימייל חייב להיות זהה לאימייל בפרופיל              │
│                         ▼                                    │
│  3. ספק מתחבר ומשלים פרופיל (MyVendorProfile)               │
│     ├── שעות פעילות מדויקות                                 │
│     ├── ציוד מיוחד                                          │
│     └── אזורי כיסוי מפורטים                                 │
│                         ▼                                    │
│  4. ספק מפעיל GPS + התראות push                             │
│                         ▼                                    │
│  5. ספק מפעיל זמינות → מתחיל לקבל קריאות                   │
└──────────────────────────────────────────────────────────────┘
```

---

## מסכי הספק

### עמודים נגישים לספק בלבד
| עמוד | קובץ | תיאור |
|------|-------|--------|
| פורטל הספקים | `src/pages/VendorPortal.jsx` | דשבורד ראשי - סטטיסטיקות, קריאות, זמינות |
| ניהול קריאה | `src/pages/VendorCallManagement.jsx` | פרטי קריאה, חתימה, תמונות, צ'אט, מסע לקוח |
| הפרופיל שלי | `src/pages/MyVendorProfile.jsx` | עדכון פרטים אישיים, תעריפים, אזורי כיסוי |
| מדריך ספקים | `src/pages/VendorGuide.jsx` | מדריך שימוש מלא עם FAQ |
| אפליקציה מובייל | `src/pages/VendorMobileApp.jsx` | מדריך התקנת הגרסה הניידת |

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

### פורטל הספקים - מבנה הדשבורד

```
┌─────────────────────────────────────────┐
│  Header: שם ספק + מתג זמינות + הפסקות  │
├─────────────────────────────────────────┤
│  6 כרטיסי סטטיסטיקות:                   │
│  [קריאות החודש] [הושלמו] [דירוג]       │
│  [זמן הגעה]  [% השלמה] [תשלומים]       │
├─────────────────────────────────────────┤
│  טאבים: [כל הקריאות] [פעילות] [הושלמו] │
│  ┌─────────────────────────────────┐    │
│  │ טבלת קריאות עם סטטוס, לקוח,   │    │
│  │ כתובת, סוג, תאריך              │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

---

## מחזור חיי קריאה (מנקודת מבט הספק)

```
  שובץ (assigned)
     │
     ▼
  קיבל/דחה (accepted/declined) ← 120 שניות timeout
     │
     ▼
  יצא לדרך (en_route) → ניווט Waze
     │
     ▼
  הגיע (arrived) → זמן הגעה נשמר אוטומטית
     │
     ▼
  בטיפול (in_progress) → צילום, הערות, צ'אט
     │
     ▼
  חתימת לקוח (signature) → חובה לפני סיום
     │
     ▼
  הושלם (completed) → משוב + סיכום
```

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

### בידוד נתונים (Data Isolation)
- ספק רואה **רק** את הקריאות שלו - באמצעות `getVendorScopedData()`
- מנהל יכול לצפות בפורטל של כל ספק (impersonation) עם `VendorPortalAdminTab`
- זיהוי הספק נעשה לפי **אימייל** (vendor email = user email)

---

## קבצי מקור

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

---

*מסמך זה עודכן לאחרונה: מרץ 2026*
