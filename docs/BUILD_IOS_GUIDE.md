# מדריך בנייה: אפליקציית iOS (למפתח)

מדריך תמציתי להפקת גרסת ה-iOS. הקוד והפרויקט הנייטיבי כבר קיימים בריפו
(`ios/`, מחווטים עם `@capacitor-community/background-geolocation`). נדרש **macOS**.

## דרישות מקדימות (להתקנה)
- **macOS** + **Xcode** (מ-App Store).
- **CocoaPods**: `sudo gem install cocoapods` (או `brew install cocoapods`).
- **Node.js** (LTS) + התלויות: `npm install` בשורש הפרויקט.
- **חשבון Apple Developer** (99$/שנה) — נדרש להרצה על מכשיר פיזי ולהפצה.

## בנייה
```bash
# בשורש הפרויקט:
npm install
npm run cap:ios          # build web + cap sync ios + פותח את Xcode
# בפעם הראשונה, אם pod install לא רץ אוטומטית:
cd ios/App && pod install && cd ../..
```

## ב-Xcode
1. לבחור את פרויקט **App** → טאב **Signing & Capabilities**.
2. לסמן **Automatically manage signing** ולבחור את ה-**Team** (חשבון ה-Apple Developer).
3. לוודא שקיים ה-capability **Background Modes → Location updates** (מגיע מ-`Info.plist`,
   שכבר כולל `UIBackgroundModes: [location]` + מפתחי ה-`NSLocation…UsageDescription`).
4. לחבר iPhone, לבחור אותו כיעד, וללחוץ **Run (▶)**.

## הרשאות שכבר מוגדרות בקוד (`ios/App/App/Info.plist`)
- `NSLocationWhenInUseUsageDescription` (עברית)
- `NSLocationAlwaysAndWhenInUseUsageDescription` (עברית)
- `UIBackgroundModes: [location]`

אין צורך להוסיף הרשאות ידנית — הכל כבר בקובץ.

## בדיקת מכשיר
כספק: להדליק "שתף מיקום" → לאשר הרשאת מיקום → **"Always"** כשנשאל. לנעול מסך / לעבור
לניווט ולנסוע — המיקום צריך להמשיך להתעדכן ברקע.

## הפצה
- **פנימי:** TestFlight (דרך App Store Connect) — הכי מהיר לבדיקות בשטח.
- **חנות:** App Store. הערה: שימוש במיקום-רקע דורש הצדקה בטופס הביקורת של אפל
  ("שיתוף מיקום של טכנאי בזמן קריאה פעילה בלבד").

פרטים נוספים ורקע: `docs/LIVE_TRACKING_CAPACITOR_PLAN.md`.
