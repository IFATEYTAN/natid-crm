# Skill: CI/Build Check (בדיקת בנייה)

## מתי להשתמש
לפני כל commit, אחרי שינויים, או כשיש שגיאות בנייה.

## תהליך בדיקה מלא

### 1. Lint Check
```bash
npm run lint
```
אם יש שגיאות:
```bash
npm run lint:fix
```
בדוק שוב אחרי ה-fix - חלק מהשגיאות דורשות תיקון ידני.

### 2. Format Check
```bash
npm run format:check
```
אם יש בעיות:
```bash
npm run format
```

### 3. Type Check
```bash
npm run typecheck
```

### 4. Build
```bash
npm run build
```

### 5. ניתוח שגיאות
אם הבנייה נכשלת:
1. קרא את הודעת השגיאה במלואה
2. זהה את הקובץ והשורה
3. בדוק האם זו שגיאת import, type, או runtime
4. תקן את השגיאה
5. הרץ שוב את הבדיקה

## פקודת בדיקה מהירה (הכל ביחד)
```bash
npm run lint && npm run format:check && npm run typecheck && npm run build
```

## דגשים
- **Pre-commit hooks** כבר מריצים lint-staged אוטומטית
- שגיאות TypeScript הכי נפוצות: missing imports, wrong prop types
- שגיאות Vite: בדרך כלל קשורות ל-path aliases או missing modules
