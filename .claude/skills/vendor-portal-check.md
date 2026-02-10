# Skill: Vendor Portal Check (בדיקת פורטל ספקים)

## מתי להשתמש
אחרי שינויים בפיצ'רים של ספקים, בדיקת בידוד נתונים, או כשמוסיפים פונקציונליות חדשה לפורטל הספקים.

## תהליך בדיקה

### שלב 1: בדיקת בידוד נתונים (Data Isolation)
```
"בדוק בידוד נתונים של ספקים:
1. סרוק את src/features/vendors/hooks/useVendors.js -
   האם כל query מסנן לפי vendorId של המשתמש המחובר?
2. בדוק את src/features/vendors/api.js -
   האם ה-API calls כוללים את ה-vendorId כפרמטר סינון?
3. חפש שימוש ב-queryKeys.vendors -
   האם byVendor(vendorId) משמש בכל מקום שצריך?
4. בדוק שספק לא יכול לראות:
   - קריאות שירות של ספקים אחרים
   - פרטי לקוחות שלא שייכים לו
   - דירוגים של ספקים אחרים
   - תשלומים של ספקים אחרים"
```

### שלב 2: בדיקת Ownership בפונקציות Backend
```
"בדוק ownership checks בפונקציות הספקים:
1. updateVendorLocation.ts - האם בודק vendor_id === current_user.vendor_id?
2. updateVendorStatus.ts - האם רק admin/operator או הספק עצמו יכולים לעדכן?
3. handleAssignmentResponse.ts - האם הספק יכול להגיב רק לשיבוצים שלו?
4. submitVendorRating.ts - האם מונע מספק לדרג את עצמו?
5. autoAssignVendor.ts - האם שומר על הפרדת נתונים?
6. analyzeVendorPerformance.ts - האם מחזיר רק נתוני הספק המבוקש?"
```

### שלב 3: בדיקת גישה לדפי ספק
```
"בדוק את הגישה לדפי הספק:
1. VendorPortal (src/pages/VendorPortal.jsx) -
   האם עטוף ב-RoleGuard עם role='vendor'?
2. VendorCallManagement (src/pages/VendorCallManagement.jsx) -
   האם מציג רק קריאות של הספק המחובר?
3. MyVendorProfile (src/pages/MyVendorProfile.jsx) -
   האם מציג רק את הפרופיל של הספק המחובר?
4. VendorGuide (src/pages/VendorGuide.jsx) -
   האם נגיש רק לספקים?
5. בדוק ב-src/config/permissions.js שההרשאות תואמות:
   VendorPortal: ['vendor']
   VendorCallManagement: ['vendor']
   MyVendorProfile: ['vendor']
   VendorGuide: ['vendor']"
```

### שלב 4: בדיקת דפים שספקים לא צריכים לראות
```
"וודא שספקים חסומים מדפים לא מורשים:
1. Dashboard - רק admin, operator
2. Customers - רק admin, operator
3. Settings - רק admin
4. UserManagement - רק admin
5. AuditLog - רק admin
6. Reports - רק admin, operator
7. QueueMonitor - רק admin, operator
8. בדוק שב-Layout.jsx או ב-Sidebar תפריטי ניווט
   מוסתרים בהתאם ל-role של המשתמש"
```

### שלב 5: בדיקת תזרים התראות לספקים
```
"בדוק את תזרים ההתראות של ספקים:
1. sendNotification.ts - האם התראות ספק נשלחות רק לספק הרלוונטי?
2. checkAndSendNotifications.ts - האם יש סינון לפי vendorId?
3. sendCallStatusUpdate.ts - האם ספק מקבל עדכון רק על קריאות שלו?
4. sendFeedbackSMS.ts - האם ה-SMS נשלח רק לספק הנכון?
5. handleAssignmentResponse.ts - האם ההתראה על תגובה מגיעה למוקדן הנכון?"
```

### שלב 6: בדיקת קומפוננטות ספק
```
"בדוק את קומפוננטות הספק ב-src/features/vendors/:
1. VendorPortal.jsx - האם טוען נתונים רק של הספק המחובר?
2. MyCallsVendor.jsx - האם מציג רק קריאות של הספק?
3. MyVendorProfile.jsx - האם מונע עריכה של שדות רגישים?
4. VendorPayments.jsx - האם מציג רק תשלומים של הספק?
5. VendorMap.jsx - האם מציג רק מיקומים רלוונטיים?
6. AllVendorsMap.jsx - האם דף זה חסום מספקים?
7. CoverageAreas.jsx - האם חסום מספקים?"
```

## דוח בדיקה
```markdown
# דוח בדיקת פורטל ספקים - [תאריך]

## בידוד נתונים
- [ ] ספק לא יכול לראות קריאות של ספקים אחרים
- [ ] ספק לא יכול לראות לקוחות שלא שלו
- [ ] ספק לא יכול לראות דירוגים של ספקים אחרים
- [ ] ספק לא יכול לעדכן מיקום/סטטוס של ספק אחר

## הרשאות דפים
- [ ] כל דפי הספק מוגנים ב-RoleGuard
- [ ] דפי admin/operator חסומים מספקים
- [ ] תפריט ניווט מותאם ל-role

## התראות
- [ ] התראות מגיעות רק לספק הרלוונטי
- [ ] SMS נשלח רק למספר הנכון
- [ ] עדכוני סטטוס מסוננים לפי ספק

## ממצאים
...
```

## דגשים
- בידוד נתונים הוא קריטי - ספק שרואה נתונים של ספק אחר זו דליפת מידע חמורה
- בדוק גם את צד ה-API וגם את צד הלקוח - סינון בצד הלקוח בלבד לא מספיק
- שים לב ל-React Query cache - האם cache מנוקה כשספק מתנתק?
- בדוק שבתצוגת מפה (VendorMap) לא מוצגים מיקומי ספקים אחרים
