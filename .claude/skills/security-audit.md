# Skill: Security Audit (ביקורת אבטחה)

## מתי להשתמש
כשרוצים לבצע סקירת אבטחה מקיפה של המערכת - לפני שחרור גרסה, אחרי הוספת פיצ'ר חדש, או כבדיקה תקופתית.

## תהליך ביקורת

### שלב 1: בדיקת הרשאות בפונקציות Backend
סרוק את כל הפונקציות ב-`functions/` ובדוק:

```
"בדוק את כל 28 הפונקציות ב-functions/ וודא:
1. כל פונקציה בודקת authentication (האם המשתמש מזוהה?)
2. כל פונקציה בודקת authorization (האם יש לו הרשאה לפעולה?)
3. פונקציות vendor בודקות ownership (האם הנתונים שייכים לספק?)
4. רשום כל פונקציה שחסרה בה בדיקת הרשאה"
```

פונקציות קריטיות לבדיקה:
- `updateVendorLocation.ts` - האם בודק שהספק מעדכן רק את עצמו?
- `updateVendorStatus.ts` - האם בודק הרשאת admin/operator?
- `handleAssignmentResponse.ts` - האם בודק שהתגובה מגיעה מהספק הנכון?
- `submitVendorRating.ts` - האם מוודא שהמדרג מורשה?
- `logAuditAction.ts` - האם רושם את כל הפעולות הרגישות?

### שלב 2: עקביות מערכת ההרשאות
```
"בדוק את מערכת ההרשאות:
1. קרא את src/config/permissions.js
2. וודא שכל דף מוגדר ב-PAGE_PERMISSIONS
3. וודא שכל route ב-App.jsx עטוף ב-RoleGuard
4. חפש דפים שנגישים ללא הרשאה
5. בדוק שאין סתירה בין ההרשאות בצד הלקוח לצד השרת"
```

תפקידים לבדיקה:
- **admin** - גישה מלאה
- **operator (מוקדן)** - ניהול קריאות ולקוחות
- **vendor (ספק)** - רק דפי VendorPortal, VendorCallManagement, MyVendorProfile, VendorGuide

### שלב 3: בדיקת דליפת נתונים
```
"חפש דפוסי דליפת נתונים:
1. סינון בצד הלקוח בלבד (client-side filtering) ללא אכיפה בשרת
2. שליחת נתונים רגישים ב-API response שלא נדרשים בצד הלקוח
3. חשיפת IDs פנימיים של רשומות של ספקים/לקוחות אחרים
4. console.log עם מידע רגיש
5. נתוני debug שנשארו בקוד production"
```

### שלב 4: בדיקת Webhooks
```
"בדוק את אבטחת ה-Webhooks:
1. botWebhook.ts - האם מוודא את מקור הבקשה?
2. externalCrmWebhook.ts - האם יש אימות token/signature?
3. 99digitalBot.ts - האם יש rate limiting?
4. האם כל webhook מוודא את תקינות הנתונים (input validation)?
5. האם יש הגנה מפני replay attacks?"
```

### שלב 5: בדיקת Rate Limiting
```
"בדוק rate limiting בנקודות קצה ציבוריות:
1. validateAndSubmitFeedback.ts - טופס משוב חיצוני
2. getFeedbackTokenInfo.ts - שליפת מידע לפי token
3. createFeedbackToken.ts - יצירת token משוב
4. sendSMS.ts - שליחת SMS (עלות כספית!)
5. sendFeedbackSMS.ts - SMS משוב
6. האם יש הגבלה על כמות הבקשות?"
```

### שלב 6: בדיקות נוספות
```
"בדוק גם:
1. האם ה-API keys מאוחסנים ב-.env ולא בקוד?
2. האם ה-.env.local לא נמצא ב-git?
3. האם יש XSS protection בהצגת תוכן מהמשתמש?
4. האם יש input sanitization בטפסים?
5. האם Twilio credentials מוגנים?"
```

## דוח ביקורת
בסיום הביקורת, הפק דוח בפורמט:

```markdown
# דוח ביקורת אבטחה - [תאריך]

## סיכום
- ממצאים קריטיים: X
- ממצאים בינוניים: X
- ממצאים נמוכים: X

## ממצאים קריטיים
### [תיאור]
- **קובץ:** [path]
- **בעיה:** [תיאור]
- **פתרון מומלץ:** [תיאור]

## ממצאים בינוניים
...

## ממצאים נמוכים
...

## המלצות כלליות
...
```

## דגשים
- בדוק כל פונקציה ב-functions/ ולא רק את הקריטיות
- שים לב לפונקציות AI (generateCallSummary, recommendVendor) - האם הן חושפות נתונים?
- וודא שפונקציות SMS לא ניתנות לניצול לשליחת ספאם
- בדוק שה-audit log מכסה את כל הפעולות הרגישות
