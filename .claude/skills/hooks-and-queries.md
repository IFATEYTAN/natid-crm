# Skill: Hooks & Queries (ניהול Hooks ו-React Query)

## מתי להשתמש
כשמוסיפים hooks חדשים, משנים שאילתות, מתקנים בעיות cache, או רוצים לוודא עקביות בשימוש ב-React Query.

## תהליך בדיקה

### שלב 1: בדיקת שימוש ב-queryKeys מרכזיים
```
"בדוק שכל ה-hooks משתמשים ב-queryKeys מ-src/lib/queryKeys.js:

1. סרוק את כל הקבצים ב-src/features/*/hooks/*.js
2. חפש כל שימוש ב-useQuery, useInfiniteQuery
3. וודא שה-queryKey מגיע מ-queryKeys ולא כתוב inline:
   - נכון: queryKey: queryKeys.calls.all()
   - שגוי: queryKey: ['calls']
4. רשום כל hook שמשתמש ב-query key ישירות"
```

hooks לבדיקה:
- `src/features/calls/hooks/useCalls.js`
- `src/features/cases/hooks/useCases.js`
- `src/features/customers/hooks/useCustomers.js`
- `src/features/vendors/hooks/useVendors.js`
- `src/features/queue/hooks/useQueue.js`
- `src/features/reports/hooks/useReports.js`
- `src/features/settings/hooks/useSettings.js`
- `src/features/agents/hooks/useUsers.js`

### שלב 2: בדיקת הגדרות כפולות
```
"חפש הגדרות כפולות של hooks:

1. חפש hooks עם שם זהה בקבצים שונים
2. חפש useQuery עם אותו queryKey בקבצים שונים
3. בדוק שכל feature module מייצא hooks דרך index.js
4. וודא שאין hooks ב-src/hooks/ שכפולים מ-src/features/*/hooks/
5. חפש פונקציות fetch שמוגדרות יותר מפעם אחת"
```

פקודות חיפוש:
```bash
# חיפוש כל הגדרות useQuery
grep -rn 'useQuery(' src/features/ src/hooks/ --include='*.js' --include='*.jsx'

# חיפוש כל ה-exports מ-hooks
grep -rn 'export.*use[A-Z]' src/features/*/hooks/ --include='*.js'
```

### שלב 3: בדיקת טיפול בשגיאות ומצבי טעינה
```
"בדוק שכל hook מטפל נכון בשגיאות וטעינה:

1. כל useQuery צריך להחזיר: { data, isLoading, isError, error }
2. כל קומפוננטה שמשתמשת ב-hook צריכה לטפל ב:
   - isLoading → הצגת skeleton/spinner
   - isError → הצגת הודעת שגיאה בעברית
   - data === undefined/null → הצגת empty state
3. חפש hooks שלא מטפלים ב-onError
4. בדוק שיש onError גלובלי ב-QueryClient (src/lib/queryClient.js)
5. וודא שהודעות שגיאה מוצגות עם toast (Sonner)"
```

### שלב 4: בדיקת Cache Invalidation
```
"בדוק דפוסי invalidation:

1. כל useMutation צריך לעשות invalidateQueries אחרי הצלחה
2. בדוק שה-invalidation מכסה את כל ה-queries המושפעים:
   - יצירת קריאה → invalidate calls.all(), calls.list(*)
   - עדכון ספק → invalidate vendors.detail(id), vendors.all()
   - שיוך קריאה לספק → invalidate calls.detail(id), vendors.detail(id)
3. חפש mutations בלי invalidation - סכנה ל-stale data
4. בדוק שאין optimistic updates שלא מטפלים ב-rollback
5. וודא שאין invalidation מוגזם (invalidating everything)"
```

### שלב 5: בדיקת Query Options
```
"בדוק את הגדרות ה-query options:

1. staleTime - האם מוגדר בצורה הגיונית?
   - נתונים שמשתנים לעתים רחוקות (settings) → staleTime גבוה
   - נתונים שמשתנים תכופות (calls, queue) → staleTime נמוך
2. gcTime (cacheTime) - האם cache לא נמחק מוקדם מדי?
3. refetchOnWindowFocus - האם מופעל כשצריך?
4. refetchInterval - האם יש polling שמיותר?
5. enabled - האם queries מותנים מופעלים רק כשיש נתונים?
   - דוגמה: useQuery שתלוי ב-vendorId צריך enabled: !!vendorId
6. retry - האם מספר הניסיונות מוגבל?"
```

### שלב 6: בדיקת מבנה ה-Hooks
```
"בדוק את מבנה ה-hooks:

1. כל hook ב-features/*/hooks/ צריך:
   - ייצוא דרך index.js של ה-hooks directory
   - שם שמתחיל ב-use (convention)
   - JSDoc תיעוד עם תיאור קצר
2. hooks שיתופיים ב-src/hooks/ צריכים:
   - להיות כלליים ולא ספציפיים לפיצ'ר
   - לא לייבא מ-features/ (תלויות חד-כיווניות)
3. בדוק שאין business logic ישירות בקומפוננטות -
   כל query/mutation צריך להיות ב-hook"
```

## דוח בדיקה
```markdown
# דוח Hooks & Queries - [תאריך]

## queryKeys
- Hooks שמשתמשים ב-queryKeys מרכזיים: X/Y
- Hooks עם query keys inline: X

## כפילויות
- hooks כפולים: X
- queries כפולים: X

## טיפול בשגיאות
- hooks ללא טיפול בשגיאות: X
- קומפוננטות ללא loading state: X

## Cache Invalidation
- mutations ללא invalidation: X
- invalidation מוגזם: X

## המלצות
...
```

## דגשים
- `src/lib/queryKeys.js` הוא מקור האמת - כל query key חדש צריך להתווסף שם
- React Query 5 שינה את ה-API - ודא שימוש ב-syntax החדש (`gcTime` ולא `cacheTime`)
- הימנע משימוש ב-`useEffect` + `setState` כשאפשר להשתמש ב-`useQuery` ישירות
- כל fetch ל-Base44 API צריך לעבור דרך `src/api/` ולא ישירות מ-hook
