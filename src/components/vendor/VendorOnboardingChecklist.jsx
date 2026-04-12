import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  UserPlus,
  Mail,
  Link2,
  ToggleRight,
  MapPin,
  Bell,
  FileText,
  Smartphone,
} from 'lucide-react';

const adminSteps = [
  {
    icon: UserPlus,
    title: 'יצירת פרופיל ספק',
    desc: 'צור פרופיל ספק חדש בעמוד "נותני שירות" עם שם, טלפון, סוגי שירות ואזורי כיסוי.',
  },
  {
    icon: Mail,
    title: 'הזמנת הספק כמשתמש',
    desc: 'בלשונית "הזמנה וקישור", הזן את האימייל של הספק ולחץ "שלח הזמנה". הספק יקבל מייל עם קישור להרשמה.',
  },
  {
    icon: Link2,
    title: 'קישור אימייל לפרופיל',
    desc: 'לאחר ההזמנה, לחץ "קשר ספק למשתמש" כדי לקשר את האימייל לפרופיל הספק. הפעולה אוטומטית מגדירה role=vendor.',
  },
  {
    icon: FileText,
    title: 'הגדרת חוזה',
    desc: 'הגדר תנאי חוזה כולל תעריפים, אזורי כיסוי ותנאי תשלום בעמוד "חוזי ספקים".',
  },
];

const vendorSteps = [
  {
    icon: Mail,
    title: 'קבלת הזמנה והרשמה',
    desc: 'הספק מקבל מייל עם הזמנה ונרשם למערכת. האימייל חייב להיות זהה למה שהוגדר בפרופיל.',
  },
  {
    icon: ToggleRight,
    title: 'הפעלת זמינות',
    desc: 'בכניסה ראשונה לפורטל, הספק מפעיל את מתג הזמינות כדי להתחיל לקבל קריאות.',
  },
  {
    icon: Bell,
    title: 'אישור התראות Push',
    desc: 'הספק מאשר קבלת התראות כדי לקבל עדכונים מיידיים על קריאות חדשות.',
  },
  {
    icon: MapPin,
    title: 'הפעלת GPS',
    desc: 'הספק מאשר שיתוף מיקום כדי שהמערכת תוכל לשבץ קריאות קרובות אליו.',
  },
  {
    icon: Smartphone,
    title: 'התקנת אפליקציה',
    desc: 'הספק יכול להתקין את האפליקציה כ-PWA (הוספה למסך הבית) לחוויה מיטבית.',
  },
];

const callFlowSteps = [
  {
    step: '1',
    title: 'קריאה חדשה מתקבלת',
    desc: 'המוקד פותח קריאה ומשבץ ספק. הספק מקבל SMS + התראת Push.',
  },
  {
    step: '2',
    title: 'אישור/דחיית הקריאה',
    desc: 'לספק יש 5 דקות לאשר. אם דוחה, הקריאה מועברת לספק הבא.',
  },
  {
    step: '3',
    title: 'יציאה לדרך',
    desc: 'הספק לוחץ "יצאתי לדרך". המוקד רואה את הסטטוס בזמן אמת.',
  },
  {
    step: '4',
    title: 'הגעה למקום',
    desc: 'הספק לוחץ "הגעתי". זמן ההגעה נרשם ומשפיע על ETA עתידי.',
  },
  {
    step: '5',
    title: 'ביצוע + תיעוד',
    desc: "הספק מצלם לפני/אחרי, מוסיף הערות, ומתקשר עם המוקד בצ'אט.",
  },
  {
    step: '6',
    title: 'חתימה וסיום',
    desc: 'חתימה דיגיטלית מהלקוח → סגירת קריאה → משוב (אופציונלי).',
  },
];

function StepList({ steps, showNumbers = false }) {
  return (
    <div className="space-y-3">
      {steps.map((step, idx) => {
        const Icon = step.icon;
        return (
          <div key={idx} className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
              {showNumbers ? (
                <span className="text-sm font-bold">{step.step || idx + 1}</span>
              ) : (
                <Icon className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-sm text-gray-900">{step.title}</h4>
              <p className="text-xs text-gray-600 leading-relaxed">{step.desc}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function VendorOnboardingChecklist() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">שלבי מנהל - הכנת ספק חדש</CardTitle>
        </CardHeader>
        <CardContent>
          <StepList steps={adminSteps} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">שלבי הספק - תחילת עבודה</CardTitle>
        </CardHeader>
        <CardContent>
          <StepList steps={vendorSteps} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">זרימת קריאה מקצה לקצה</CardTitle>
        </CardHeader>
        <CardContent>
          <StepList steps={callFlowSteps} showNumbers />
        </CardContent>
      </Card>
    </div>
  );
}
