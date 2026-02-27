import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Phone,
  Truck,
  Users,
  MapPin,
  CheckCircle,
  AlertCircle,
  BarChart3,
  FileText,
  Clock,
  Star,
  Shield,
  CreditCard,
  Bell,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Settings,
  Eye,
  Pencil,
  Navigation,
  Camera,
  Package,
  Calculator,
  Calendar,
  Search,
  TrendingUp,
  Zap,
  MessageSquare,
  Layers,
  User,
  Lock,
} from 'lucide-react';
import {
  callStatusFlow,
  issueTypes,
  systemRoles,
  systemModules,
} from '@/components/guides/guideConstants';

function Section({ title, icon: Icon, children, defaultOpen = false, color = 'blue' }) {
  const [open, setOpen] = useState(defaultOpen);
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };
  return (
    <Card className="bg-white overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors text-end"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        </div>
        {open ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CardContent className="pt-0 pb-6 px-5">{children}</CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function StepList({ steps }) {
  return (
    <div className="space-y-4">
      {steps.map((step, idx) => (
        <div key={idx} className="flex items-start gap-4">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
            {idx + 1}
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-sm text-gray-900 mb-1">{step.title}</h4>
            <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function UserGuidePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12" dir="rtl">
      <div className="text-center mb-8">
        <BookOpen className="w-16 h-16 mx-auto text-[#3b82f6] mb-4" />
        <h1 className="text-3xl font-bold text-[#111827]">מרכז הידע - NatID 360 Control</h1>
        <p className="text-[#6b7280] mt-2">כל מה שצריך לדעת כדי לעבוד עם המערכת בצורה יעילה</p>
      </div>

      <Tabs defaultValue="operator" className="space-y-6" dir="rtl">
        <TabsList className="grid w-full grid-cols-4 text-xs md:text-sm">
          <TabsTrigger value="operator">מדריך למוקדן</TabsTrigger>
          <TabsTrigger value="manager">מדריך למנהל</TabsTrigger>
          <TabsTrigger value="customer_flow">מסע לקוח</TabsTrigger>
          <TabsTrigger value="operations">תפעול ודוחות</TabsTrigger>
        </TabsList>

        {/* ===== טאב 1: מדריך למוקדן / מתפעל ===== */}
        <TabsContent value="operator" className="space-y-4">
          <Section title="סטטוסי קריאה - מילון מונחים" icon={Layers} defaultOpen color="blue">
            <p className="text-sm text-gray-500 mb-4">כל הסטטוסים העדכניים במערכת ומשמעותם:</p>
            <div className="grid gap-2">
              {callStatusFlow.map((s) => (
                <div
                  key={s.key}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
                >
                  <Badge className="bg-[#3b82f6] text-white text-[11px] min-w-[100px] justify-center">
                    {s.label}
                  </Badge>
                  <span className="text-sm text-gray-700">{s.description}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="פתיחת קריאה חדשה" icon={Phone} color="green">
            <StepList
              steps={[
                { title: 'לחץ על "קריאה חדשה"', desc: 'הכפתור האדום בתפריט הצד או בראש הדשבורד' },
                {
                  title: 'מלא פרטי לקוח',
                  desc: 'שם, טלפון, ת.ז., חברת ביטוח, מספר מנוי אם רלוונטי',
                },
                {
                  title: 'פרטי רכב',
                  desc: 'מספר רכב, דגם, שנה, סוג רכב (פרטי/מסחרי/משאית/אופנוע), סוג דלק',
                },
                {
                  title: 'סוג תקלה ומיקום',
                  desc: "בחר סוג תקלה, הזן כתובת מדויקת ופרטי נגישות (חניון תת קרקעי, כביש אגרה, הילוכים על N וכו')",
                },
                { title: 'כתובת יעד (אם רלוונטית)', desc: 'שם מוסך, כתובת יעד, טלפון מוסך' },
                {
                  title: 'שמור ושבץ',
                  desc: 'לאחר שמירה - שבץ ספק מהרשימה לפי מרחק, זמינות ודירוג. הספק יקבל התראה.',
                },
              ]}
            />
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-800">טיפ: שימוש בהמלצת AI</h4>
                  <p className="text-sm text-blue-700">
                    המערכת מציעה ספקים מומלצים באמצעות AI - לפי קרבה, זמינות, דירוג ומתמחות. השתמשו
                    בהמלצה לשיבוץ מהיר ואופטימלי.
                  </p>
                </div>
              </div>
            </div>
          </Section>

          <Section title="ניהול קריאה פעילה" icon={FileText} color="purple">
            <p className="text-sm text-gray-500 mb-3">
              לאחר פתיחת קריאה, דף פרטי הקריאה מכיל את הלשוניות הבאות:
            </p>
            <div className="grid gap-2">
              {[
                { label: 'מידע כללי', desc: 'כל פרטי הלקוח, הרכב, המיקום והספק המשובץ' },
                { label: 'פיננסים', desc: 'עלות לספק, תשלום מלקוח, עירבונות, מוצרים שנמכרו' },
                {
                  label: 'תזכורות',
                  desc: 'תזכורות ידניות ואוטומטיות (פקיעת עירבון, שירות עתידי, מעקב)',
                },
                { label: "צ'אט", desc: 'תקשורת בזמן אמת עם הספק והלקוח + עדכוני סטטוס אוטומטיים' },
                { label: 'היסטוריה', desc: 'לוג מלא של כל השינויים - מי שינה, מתי ומה' },
                { label: 'קבצים', desc: 'תמונות לפני/אחרי, מסמכי לקוח, חתימות דיגיטליות' },
                { label: 'סיכום', desc: 'סיכום קריאה אוטומטי עם AI - טיוטה + סיכום סופי' },
                { label: 'בדיקות זכאות', desc: 'בדיקת כיסוי ביטוחי, מנוי בתוקף, מגבלת שירותים' },
                { label: 'בקרת איכות', desc: 'סימון האם הקריאה עברה בקרת איכות ומי ביצע' },
              ].map((tab, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="font-bold text-sm text-gray-900 min-w-[100px]">{tab.label}</span>
                  <span className="text-sm text-gray-600">{tab.desc}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="סוגי תקלות" icon={AlertCircle} color="red">
            <div className="grid gap-2">
              {issueTypes.map((t) => (
                <div key={t.key} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="font-bold text-sm text-gray-900 min-w-[120px]">{t.label}</span>
                  <span className="text-sm text-gray-600">{t.description}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="מעקב SLA ותורים" icon={Clock} color="orange">
            <div className="space-y-3">
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <h4 className="font-medium text-orange-800 mb-2">מה זה SLA?</h4>
                <p className="text-sm text-orange-700">
                  SLA (Service Level Agreement) הוא זמן התגובה וההגעה המובטח ללקוח. כל לקוח/חברת
                  ביטוח יכולה להגדיר SLA שונה. המערכת מסמנת בצבעים: <strong>ירוק</strong> = בזמן,{' '}
                  <strong>כחול</strong> = קרוב לחריגה, <strong>אדום</strong> = חרג מה-SLA.
                </p>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">ניטור תורים</h4>
                <p className="text-sm text-blue-700">
                  דף "ניטור תורים" מציג את כל הקריאות הממתינות לפי סדר עדיפות. ציון עדיפות מחושב
                  אוטומטית לפי: זמן המתנה, עדיפות הקריאה, VIP, וחריגת SLA.
                </p>
              </div>
            </div>
          </Section>

          <Section title="תקשורת וצ'אט" icon={MessageSquare} color="blue">
            <StepList
              steps={[
                {
                  title: "צ'אט בתוך הקריאה",
                  desc: "לכל קריאה יש צ'אט פנימי בזמן אמת בין המוקדן לספק. עדכוני סטטוס (יצא לדרך, הגיע, סיים) נשלחים אוטומטית לצ'אט.",
                },
                {
                  title: 'העלאת קבצים',
                  desc: 'ניתן לשלוח תמונות ומסמכים דרך הצ\'אט, או להעלות קבצים ללשונית "קבצים" עם קטגוריות (לפני/אחרי טיפול, נזק, מסמך לקוח).',
                },
                {
                  title: 'הערות מוקדן',
                  desc: 'שדה "הערות מוקדן" נפרד מהצ\'אט - מיועד לרישום מידע פנימי שלא מגיע לספק.',
                },
              ]}
            />
          </Section>
        </TabsContent>

        {/* ===== טאב 2: מדריך למנהל ===== */}
        <TabsContent value="manager" className="space-y-4">
          <Section title="תפקידים והרשאות" icon={Lock} defaultOpen color="purple">
            <div className="space-y-4">
              {systemRoles.map((role) => (
                <div key={role.key} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <h4 className="font-bold text-gray-900 mb-1">{role.label}</h4>
                  <p className="text-sm text-gray-600 mb-3">{role.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {role.permissions.map((p, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="ניהול ספקים" icon={Truck} color="blue">
            <StepList
              steps={[
                {
                  title: 'הוספת ספק חדש',
                  desc: 'דף "נותני שירות" → "ספק חדש" - הזן שם, טלפון, סוגי שירות (גרירה, מנעולן, מצבר...), אזורי כיסוי, תעריפים ושעות פעילות.',
                },
                {
                  title: 'ניהול זמינות',
                  desc: 'ניתן להפעיל/לכבות זמינות של ספק ישירות מרשימת הספקים. סטטוס: זמין, עסוק, לא מחובר, בהפסקה.',
                },
                {
                  title: 'מעקב ביצועים',
                  desc: 'כל ספק מציג: קריאות פתוחות/סגורות, דירוג ממוצע, זמן תגובה, אחוז השלמה.',
                },
                {
                  title: 'חוזים',
                  desc: 'דף "חוזי ספקים" - ניהול חוזים עם תעריף, בונוסים, קנסות, תקופה, וחידוש אוטומטי. התראה על פקיעת חוזה.',
                },
              ]}
            />
          </Section>

          <Section title="ניהול לקוחות" icon={Users} color="green">
            <StepList
              steps={[
                {
                  title: 'סוגי לקוחות',
                  desc: 'חברת ביטוח, פארק רכב (Fleet), לקוח פרטי, מוסך, אחר. כל סוג עם שדות ייעודיים.',
                },
                {
                  title: 'הסכם SLA',
                  desc: 'כל לקוח מגדיר זמן תגובה (response) וזמן הגעה (arrival) ב-SLA. המערכת מפקחת אוטומטית.',
                },
                {
                  title: 'סוג חוזה',
                  desc: 'חודשי, שנתי, לפי מקרה, או ללא חוזה. עם תקציב חודשי אם רלוונטי.',
                },
              ]}
            />
          </Section>

          <Section title="מוצרים ומחירון" icon={Package} color="orange">
            <div className="space-y-3">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-bold text-sm mb-2">קטלוג מוצרים</h4>
                <p className="text-sm text-gray-600">
                  ניהול מוצרים: מצברים, צמיגים, דלק, מנעולים, אביזרים. לכל מוצר: מק"ט, מחיר מכירה,
                  מחיר עלות, כמות במלאי.
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-bold text-sm mb-2">מחירון תפעולי</h4>
                <p className="text-sm text-gray-600">
                  תעריפי בסיס + תוספות לפי: שעות (לילה/חגים), אזורים, כביש אגרה, סוג רכב, סוג שירות.
                  כל תעריף עם סדר עדיפות.
                </p>
              </div>
            </div>
          </Section>

          <Section title="הרשאות ומשתמשים" icon={Shield} color="red">
            <StepList
              steps={[
                {
                  title: 'ניהול משתמשים',
                  desc: 'דף "ניהול משתמשים" - הזמנת משתמשים חדשים, הגדרת תפקיד (מנהל/משתמש).',
                },
                {
                  title: 'ניהול הרשאות',
                  desc: 'דף "ניהול הרשאות" - הגדרת מה כל תפקיד יכול לגשת: דוחות כספיים, ייצוא, ביצועי ספקים, ניהול ספקים/לקוחות.',
                },
                {
                  title: 'יומן פעולות (Audit Log)',
                  desc: 'כל פעולה רגישה (ייצוא נתונים, גישה לדוחות כספיים) מתועדת ביומן מבוקר.',
                },
              ]}
            />
          </Section>
        </TabsContent>

        {/* ===== טאב 3: מסע לקוח ===== */}
        <TabsContent value="customer_flow" className="space-y-4">
          <Section title="מסע הלקוח מקצה לקצה" icon={Navigation} defaultOpen color="green">
            <p className="text-sm text-gray-500 mb-4">
              תהליך הקריאה המלא מנקודת המבט של לקוח הקצה:
            </p>
            <div className="space-y-4">
              {[
                {
                  step: 'פנייה למוקד',
                  desc: 'הלקוח פונה למוקד "נתי שירותי דרך" בטלפון, או דרך אפליקציה/בוט. המוקדן רושם את כל הפרטים ופותח קריאה.',
                  icon: Phone,
                  color: 'bg-blue-100 text-blue-700',
                },
                {
                  step: 'אימות זכאות',
                  desc: 'אם הלקוח דרך חברת ביטוח - המוקדן מבצע בדיקת זכאות: מנוי בתוקף, כיסוי ביטוחי, מגבלת שירותים.',
                  icon: Shield,
                  color: 'bg-purple-100 text-purple-700',
                },
                {
                  step: 'שיבוץ ספק',
                  desc: 'המערכת ממליצה על ספק לפי קרבה, זמינות, דירוג ומתמחות. הספק מקבל התראה ו-5 דקות לאשר.',
                  icon: Truck,
                  color: 'bg-orange-100 text-orange-700',
                },
                {
                  step: 'הספק בדרך',
                  desc: 'הלקוח מעודכן שספק יצא לדרך. ניתן לעקוב אחרי המיקום ב-GPS. זמן הגעה משוער מחושב אוטומטית.',
                  icon: Navigation,
                  color: 'bg-indigo-100 text-indigo-700',
                },
                {
                  step: 'הגעת הספק',
                  desc: 'הספק מגיע, מאשר הגעה, ומתחיל בטיפול. צילום "לפני" מתועד.',
                  icon: Camera,
                  color: 'bg-green-100 text-green-700',
                },
                {
                  step: 'ביצוע השירות',
                  desc: "הספק מטפל בתקלה: גרירה, החלפת גלגל, מצבר, פתיחת רכב נעול וכו'. מתעד הכל בצ'אט ובתמונות.",
                  icon: Zap,
                  color: 'bg-yellow-100 text-yellow-700',
                },
                {
                  step: 'חתימה וסיום',
                  desc: 'הלקוח חותם חתימה דיגיטלית. צילום "אחרי". הספק מסיים את הקריאה.',
                  icon: Pencil,
                  color: 'bg-red-100 text-red-700',
                },
                {
                  step: 'תשלום (אם נדרש)',
                  desc: 'אם הלקוח משלם - עירבון או תשלום ישיר (אשראי/מזומן/העברה). אם דרך ביטוח - החיוב לחברה.',
                  icon: CreditCard,
                  color: 'bg-pink-100 text-pink-700',
                },
                {
                  step: 'משוב ודירוג',
                  desc: 'הלקוח מתבקש לתת דירוג (1-5 כוכבים) ומשוב חופשי. המשוב משפיע על דירוג הספק.',
                  icon: Star,
                  color: 'bg-amber-100 text-amber-700',
                },
                {
                  step: 'סגירת קריאה',
                  desc: 'בקרת איכות → סיכום אוטומטי עם AI → סגירה סופית. הקריאה עוברת לסטטוס "הושלם".',
                  icon: CheckCircle,
                  color: 'bg-emerald-100 text-emerald-700',
                },
              ].map((s, idx) => {
                const Icon = s.icon;
                return (
                  <div key={idx} className="flex items-start gap-4">
                    <div className="flex-shrink-0 relative">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      {idx < 9 && (
                        <div className="absolute top-10 right-1/2 w-0.5 h-4 bg-gray-200" />
                      )}
                    </div>
                    <div className="flex-1 pb-2">
                      <h4 className="font-bold text-sm text-gray-900 mb-1">{s.step}</h4>
                      <p className="text-sm text-gray-600 leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title="מקרים מיוחדים" icon={AlertCircle} color="red">
            <div className="space-y-3">
              {[
                {
                  title: 'ביטול קריאה',
                  desc: 'הלקוח או המוקד מבטלים - נדרשת סיבת ביטול. אם ספק כבר שובץ - מעודכן אוטומטית.',
                },
                {
                  title: 'שירות עתידי',
                  desc: 'הלקוח מבקש שירות בתאריך עתידי - הקריאה עוברת לסטטוס "שירות עתידי" עם תאריך וטווח שעות.',
                },
                {
                  title: 'אחסנה',
                  desc: 'הרכב נגרר למגרש/מוסך ונשאר באחסנה - הקריאה עוברת ל"באחסנה" עם מונה ימים.',
                },
                {
                  title: 'המשך טיפול',
                  desc: 'אם הטיפול לא הסתיים בפעם אחת - הקריאה עוברת ל"המשך טיפול" וחוזרת למוקדן.',
                },
                {
                  title: 'לקוח VIP',
                  desc: 'לקוחות VIP מסומנים במערכת ומקבלים עדיפות גבוהה בשיבוץ ובתור.',
                },
                {
                  title: 'פקיעת עירבון',
                  desc: 'עירבון תקף ל-21 יום. תזכורת אוטומטית נשלחת לפני הפקיעה. אם לא נוצל - ניתן לחייב או להחזיר.',
                },
              ].map((item, i) => (
                <div key={i} className="p-3 bg-red-50 border border-red-100 rounded-lg">
                  <h4 className="font-bold text-sm text-red-800">{item.title}</h4>
                  <p className="text-sm text-red-700">{item.desc}</p>
                </div>
              ))}
            </div>
          </Section>
        </TabsContent>

        {/* ===== טאב 4: תפעול ודוחות ===== */}
        <TabsContent value="operations" className="space-y-4">
          <Section title="מודולי המערכת" icon={Layers} defaultOpen color="blue">
            <div className="grid gap-2">
              {systemModules.map((m) => (
                <div
                  key={m.key}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
                >
                  <span className="font-bold text-sm text-gray-900 min-w-[120px]">{m.label}</span>
                  <span className="text-sm text-gray-600">{m.description}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="דוחות מתקדמים" icon={BarChart3} color="purple">
            <p className="text-sm text-gray-500 mb-3">דף הדוחות מכיל 6 לשוניות מתקדמות:</p>
            <div className="space-y-3">
              {[
                {
                  label: 'יעילות תפעולית',
                  desc: 'זמן תגובה ממוצע, זמני טיפול, אחוז השלמה, ניתוח SLA, מגמות ביצועים לאורך זמן.',
                },
                {
                  label: 'ביצועי ספקים',
                  desc: 'דירוג ספקים, אחוזי השלמה, זמני הגעה, מספר קריאות, בונוסים וקנסות.',
                },
                {
                  label: 'ניתוח לקוחות',
                  desc: 'התפלגות קריאות לפי לקוח/חברת ביטוח, שביעות רצון, ומגמות שימוש.',
                },
                {
                  label: 'מרכז חברות',
                  desc: 'סקירה כוללת לפי חברת ביטוח - כמות קריאות, עלויות, SLA ושביעות רצון.',
                },
                {
                  label: 'פיננסי',
                  desc: 'הכנסות, עלויות ספקים, רווח גולמי, מרווח רווחיות. נדרשת הרשאה מיוחדת.',
                },
                {
                  label: 'שימושים',
                  desc: 'ניתוח דפוסי שימוש - שעות שיא, ימים עמוסים, אזורים פעילים.',
                },
              ].map((r, i) => (
                <div key={i} className="p-3 bg-purple-50 border border-purple-100 rounded-lg">
                  <h4 className="font-bold text-sm text-purple-800">{r.label}</h4>
                  <p className="text-sm text-purple-700">{r.desc}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="ניהול כספים ועירבונות" icon={CreditCard} color="green">
            <div className="space-y-3">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">עירבונות</h4>
                <p className="text-sm text-green-700">
                  הפקדת עירבון בכרטיס אשראי/מזומן/העברה/צ'ק. תוקף 21 יום. סטטוסים: פעיל → חויב /
                  הוחזר / פג תוקף. תזכורת אוטומטית לפני פקיעה.
                </p>
              </div>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">תשלומים לספקים</h4>
                <p className="text-sm text-green-700">
                  תשלום לפי קריאה, דמי חודש, בונוס, או תיקון. סטטוס: ממתין → מאושר → שולם / במחלוקת.
                  מעקב חשבוניות וסיכום חודשי.
                </p>
              </div>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">מוצרים שנמכרו</h4>
                <p className="text-sm text-green-700">
                  ניתן לשייך מוצרים לקריאה (מצבר, צמיג וכו') עם כמות, מחיר, הנחה וסה"כ. המערכת
                  מעדכנת מלאי אוטומטית.
                </p>
              </div>
            </div>
          </Section>

          <Section title="אוטומציות ותזכורות" icon={Bell} color="orange">
            <div className="space-y-3">
              {[
                {
                  title: 'תזכורת מעקב',
                  desc: 'נוצרת אוטומטית כשקריאה מגיעה לסטטוס "במעקב" - מזכירה למוקדן לטפל.',
                },
                { title: 'פקיעת עירבון', desc: 'נוצרת אוטומטית 3 ימים לפני שעירבון פג תוקף.' },
                { title: 'שירות עתידי', desc: 'נוצרת אוטומטית יום לפני מועד שירות עתידי מתוזמן.' },
                {
                  title: 'תזכורות ידניות',
                  desc: 'כל משתמש יכול ליצור תזכורת ידנית עם תאריך ושעה, עדיפות, ושיוך לנמען.',
                },
                {
                  title: 'התראות חכמות',
                  desc: 'המערכת מזהה אוטומטית: קריאות שחורגות מ-SLA, ספקים עם ביצועים נמוכים, דפוסים חוזרים.',
                },
              ].map((item, i) => (
                <div key={i} className="p-3 bg-orange-50 border border-orange-100 rounded-lg">
                  <h4 className="font-bold text-sm text-orange-800">{item.title}</h4>
                  <p className="text-sm text-orange-700">{item.desc}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="ייצוא נתונים" icon={TrendingUp} color="blue">
            <StepList
              steps={[
                {
                  title: 'ייצוא מטבלאות',
                  desc: 'בכל טבלה בממשק (קריאות, ספקים, לקוחות) יש כפתור ייצוא ל-CSV או PDF.',
                },
                {
                  title: 'ייצוא מדוחות',
                  desc: 'כל דוח ניתן לייצוא עם סינונים שנבחרו. נדרשת הרשאת "ייצוא".',
                },
                {
                  title: 'ייצוא מתקדם',
                  desc: 'דף "ייצוא מתקדם" - בחירת ישויות, שדות, ותקופה לייצוא מותאם אישית.',
                },
              ]}
            />
          </Section>
        </TabsContent>
      </Tabs>

      {/* Contact */}
      <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
        <CardContent className="pt-6 text-center">
          <h3 className="text-lg font-semibold text-[#111827] mb-2">צריך עזרה נוספת?</h3>
          <p className="text-[#6b7280] mb-4">צוות התמיכה כאן בשבילך</p>
          <div className="flex justify-center gap-4">
            <Link to={createPageUrl('VendorGuide')}>
              <Button variant="outline" className="gap-2">
                <Truck className="w-4 h-4" />
                מדריך לספקים
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
