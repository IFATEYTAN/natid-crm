# Skill: RTL & Accessibility (RTL ונגישות)

## מתי להשתמש
אחרי הוספת קומפוננטות חדשות, לפני שחרור גרסה, או כשמתקנים בעיות תצוגה בעברית.

## תהליך בדיקה

### שלב 1: סריקת כיווניות Tailwind (LTR Hardcoding)
```
"סרוק את כל קבצי JSX ב-src/ וחפש שימוש בכיתות Tailwind שלא תומכות ב-RTL:

1. חפש ml- (margin-left) - צריך להיות ms- (margin-start)
2. חפש mr- (margin-right) - צריך להיות me- (margin-end)
3. חפש pl- (padding-left) - צריך להיות ps- (padding-start)
4. חפש pr- (padding-right) - צריך להיות pe- (padding-end)
5. חפש left- - צריך להיות start-
6. חפש right- - צריך להיות end-
7. חפש text-left - צריך להיות text-start
8. חפש text-right - צריך להיות text-end
9. חפש rounded-l- - צריך להיות rounded-s-
10. חפש rounded-r- - צריך להיות rounded-e-
11. חפש border-l- - צריך להיות border-s-
12. חפש border-r- - צריך להיות border-e-

הערה: חלק מהמקרים לגיטימיים (למשל, אייקונים מסוימים).
סמן כל מקרה עם ציון האם הוא באג או לגיטימי."
```

פקודות חיפוש מהירות:
```bash
# חיפוש margin/padding שלא תומך ב-RTL
grep -rn 'className.*\b[mp][lr]-' src/ --include='*.jsx' --include='*.js'

# חיפוש left/right positioning
grep -rn 'className.*\b(left|right)-' src/ --include='*.jsx' --include='*.js'

# חיפוש text alignment
grep -rn 'text-(left|right)' src/ --include='*.jsx' --include='*.js'
```

### שלב 2: בדיקת aria-labels ונגישות בסיסית
```
"בדוק נגישות בקומפוננטות:

1. כל אייקון לחיץ (button עם אייקון בלבד) -
   האם יש aria-label בעברית?
2. כל תמונה - האם יש alt text בעברית?
3. כל טופס - האם יש label לכל input?
4. כל dialog/modal - האם יש aria-labelledby או aria-label?
5. כל dropdown/select - האם נגיש למקלדת?
6. כל toast/notification - האם יש role='alert'?
7. כל טבלה - האם יש caption או aria-label?"
```

### שלב 3: בדיקת ניווט מקלדת
```
"בדוק ניווט מקלדת:
1. כל אלמנט אינטראקטיבי - האם נגיש עם Tab?
2. סדר ה-Tab order - האם הגיוני ב-RTL (מימין לשמאל)?
3. כפתורי Escape - האם סוגרים modal/dialog?
4. כפתורי Enter - האם מפעילים את הפעולה הראשית?
5. חיצי מקלדת - האם עובדים נכון ב-RTL בתפריטים?
6. focus indicators - האם נראים (outline, ring)?"
```

### שלב 4: עקביות טקסט בעברית
```
"בדוק עקביות בטקסט העברי:
1. חפש טקסט באנגלית שצריך להיות בעברית
   (לא כולל מונחים טכניים כמו SMS, API, ID)
2. חפש שגיאות כתיב נפוצות בעברית
3. בדוק שכל placeholder בטפסים בעברית
4. בדוק שכל error message בעברית
5. בדוק שכל tooltip בעברית
6. בדוק שכל כפתור פעולה בעברית
7. בדוק שמצב ריק (empty state) מציג הודעה בעברית"
```

### שלב 5: נגישות טפסים
```
"בדוק נגישות טפסים בכל דפי הטפסים:
1. NewCase, NewVendor, EditVendor -
   - האם כל שדה חובה מסומן visually ועם aria-required?
   - האם יש htmlFor בכל label שמצביע ל-id של ה-input?
   - האם הודעות שגיאה מקושרות עם aria-describedby?
   - האם aria-invalid מוגדר כשיש שגיאת ולידציה?
2. טפסי חיפוש וסינון -
   - האם יש label (ולו visually hidden) לכל input חיפוש?
   - האם autocomplete suggestions נגישות למקלדת?
3. טפסי login/auth -
   - האם יש autocomplete attributes נכונים?
   - האם שגיאות התחברות מוצגות בצורה נגישה?"
```

### שלב 6: בדיקת design-system.js
```
"בדוק את src/design-system.js:
1. האם כל הטוקנים תומכים ב-RTL?
2. האם הצללים (shadows) נכונים ל-RTL?
3. האם ה-transitions/animations עובדים נכון ב-RTL?
4. האם ה-spacing scale עקבי?"
```

## דוח בדיקה
```markdown
# דוח RTL ונגישות - [תאריך]

## כיווניות (RTL)
- סה"כ שימושים שגויים ב-margin/padding: X
- סה"כ שימושים שגויים ב-positioning: X
- סה"כ שימושים שגויים ב-text alignment: X

## נגישות
- אייקונים ללא aria-label: X
- טפסים ללא labels: X
- אלמנטים לא נגישים למקלדת: X

## טקסט עברי
- טקסטים באנגלית שצריכים תרגום: X
- שגיאות כתיב: X

## רשימת תיקונים
| # | קובץ | שורה | בעיה | חומרה |
|---|-------|------|------|--------|
| 1 | ...   | ...  | ...  | ...    |
```

## דגשים
- הפרויקט משתמש ב-Radix UI (shadcn/ui) שתומך ב-RTL - ודא שלא דורסים את ההתנהגות
- `dir="rtl"` צריך להיות מוגדר ב-root של האפליקציה
- שים לב לקומפוננטות Leaflet (מפות) - הן LTR מטבען
- Recharts (גרפים) עשוי לדרוש התאמות RTL מפורשות
- בדוק שה-Sidebar נפתח מימין (RTL) ולא משמאל
