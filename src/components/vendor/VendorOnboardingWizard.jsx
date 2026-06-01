import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  User,
  Bell,
  MapPin,
  ToggleRight,
  Phone,
  Navigation,
  Camera,
  Pencil,
  Star,
  BookOpen,
  Truck,
  Shield,
  Zap,
} from 'lucide-react';

const STEPS = [
  { id: 'welcome', title: 'ברוכים הבאים', icon: Truck },
  { id: 'profile', title: 'השלמת פרופיל', icon: User },
  { id: 'permissions', title: 'הרשאות מכשיר', icon: Bell },
  { id: 'availability', title: 'זמינות', icon: ToggleRight },
  { id: 'call_flow', title: 'מחזור קריאה', icon: Phone },
  { id: 'tips', title: 'טיפים להצלחה', icon: Star },
  { id: 'done', title: 'מוכן לעבודה!', icon: CheckCircle },
];

export default function VendorOnboardingWizard({ vendorProfile, onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(0);

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;
  const isFirst = currentStep === 0;

  const next = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prev = () => {
    if (!isFirst) setCurrentStep((prev) => prev - 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col" dir="rtl">
      {/* Progress bar */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              שלב {currentStep + 1} מתוך {STEPS.length}
            </span>
            <button onClick={onSkip} className="text-xs text-gray-400 hover:text-gray-600">
              דלג על ההדרכה
            </button>
          </div>
          <div className="flex gap-1">
            {STEPS.map((s, idx) => (
              <div
                key={s.id}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  idx <= currentStep ? 'bg-blue-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-2xl w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
            >
              {step.id === 'welcome' && <WelcomeStep vendor={vendorProfile} />}
              {step.id === 'profile' && <ProfileStep vendor={vendorProfile} />}
              {step.id === 'permissions' && <PermissionsStep />}
              {step.id === 'availability' && <AvailabilityStep />}
              {step.id === 'call_flow' && <CallFlowStep />}
              {step.id === 'tips' && <TipsStep />}
              {step.id === 'done' && <DoneStep vendor={vendorProfile} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="sticky bottom-0 bg-white/90 backdrop-blur border-t px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {!isFirst && (
            <Button variant="outline" onClick={prev} className="gap-1">
              <ChevronRight className="w-4 h-4" />
              הקודם
            </Button>
          )}
          <div className="flex-1" />
          <Button onClick={next} className="gap-1 bg-blue-600 hover:bg-blue-700 px-8">
            {isLast ? 'התחל לעבוד!' : 'הבא'}
            {!isLast && <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function WelcomeStep({ vendor }) {
  return (
    <div className="text-center space-y-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', bounce: 0.5, delay: 0.2 }}
        className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto"
      >
        <Truck className="w-12 h-12 text-blue-600" />
      </motion.div>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          ברוך הבא, {vendor?.vendor_name || 'ספק'}!
        </h1>
        <p className="text-lg text-gray-500">
          הפורטל שלך מוכן. בואו נעבור יחד על כל מה שצריך כדי להתחיל לעבוד.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl mb-1">📋</div>
            <div className="text-xs font-medium text-blue-800">השלמת פרופיל</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl mb-1">📱</div>
            <div className="text-xs font-medium text-green-800">הגדרת מכשיר</div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl mb-1">🚀</div>
            <div className="text-xs font-medium text-orange-800">תחילת עבודה</div>
          </CardContent>
        </Card>
      </div>
      <p className="text-sm text-gray-400">ההדרכה תיקח כ-2 דקות</p>
    </div>
  );
}

function ProfileStep({ vendor }) {
  const checks = [
    { label: 'שם ספק', done: !!vendor?.vendor_name },
    { label: 'טלפון', done: !!vendor?.phone },
    { label: 'אימייל', done: !!vendor?.email },
    { label: 'סוגי שירות', done: vendor?.service_type?.length > 0 },
    { label: 'אזורי כיסוי', done: vendor?.coverage_areas?.length > 0 },
    { label: 'שעות עבודה', done: !!vendor?.works_24_7 || !!vendor?.working_hours_start },
  ];

  const completedCount = checks.filter((c) => c.done).length;
  const pct = Math.round((completedCount / checks.length) * 100);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <User className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">השלמת הפרופיל</h2>
        <p className="text-gray-500 mt-1">הפרופיל שלך — ככל שמלא יותר, כך תקבל יותר קריאות</p>
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">מוכנות הפרופיל</span>
            <span className="text-sm font-bold text-blue-600">{pct}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
            <motion.div
              className="bg-blue-500 h-3 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, delay: 0.3 }}
            />
          </div>
          <div className="space-y-2">
            {checks.map((check) => (
              <div key={check.label} className="flex items-center gap-2">
                <CheckCircle
                  className={`w-4 h-4 ${check.done ? 'text-green-500' : 'text-gray-300'}`}
                />
                <span className={`text-sm ${check.done ? 'text-gray-700' : 'text-gray-400'}`}>
                  {check.label}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-sm text-amber-800">
        <strong>💡 טיפ:</strong> ניתן לעדכן פרטים בכל שלב דרך עמוד "הפרופיל שלי"
      </div>
    </div>
  );
}

function PermissionsStep() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Bell className="w-8 h-8 text-purple-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">הרשאות מכשיר</h2>
        <p className="text-gray-500 mt-1">כדי לעבוד בצורה מיטבית, נצטרך שתאשר:</p>
      </div>

      <div className="space-y-4">
        <PermissionCard
          icon={Bell}
          title="התראות Push"
          desc="תקבל עדכון מיידי כשקריאה חדשה משובצת אליך — גם כשהמסך כבוי"
          color="purple"
          action="הדפדפן יבקש אישור כשתלחץ ׳התחל לעבוד׳"
        />
        <PermissionCard
          icon={MapPin}
          title="שיתוף מיקום (GPS)"
          desc="מאפשר למערכת לשבץ אליך קריאות קרובות ולחשב ETA מדויק ללקוח"
          color="blue"
          action="ניתן להפעיל מעמוד הפורטל"
        />
        <PermissionCard
          icon={Camera}
          title="מצלמה"
          desc="לצילום לפני ואחרי טיפול, תיעוד נזק ואיסוף חתימת לקוח דיגיטלית"
          color="green"
          action="הדפדפן יבקש אישור בעת צילום"
        />
      </div>
    </div>
  );
}

function PermissionCard({ icon: Icon, title, desc, color, action }) {
  const bgMap = { purple: 'bg-purple-50', blue: 'bg-blue-50', green: 'bg-green-50' };
  const iconBgMap = { purple: 'bg-purple-100', blue: 'bg-blue-100', green: 'bg-green-100' };
  const iconColorMap = {
    purple: 'text-purple-600',
    blue: 'text-blue-600',
    green: 'text-green-600',
  };

  return (
    <Card className={bgMap[color]}>
      <CardContent className="p-4 flex items-start gap-3">
        <div
          className={`w-10 h-10 ${iconBgMap[color]} rounded-lg flex items-center justify-center shrink-0`}
        >
          <Icon className={`w-5 h-5 ${iconColorMap[color]}`} />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-sm">{title}</h3>
          <p className="text-xs text-gray-600 mt-0.5">{desc}</p>
          <p className="text-xs text-gray-400 mt-1">📌 {action}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AvailabilityStep() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <ToggleRight className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">ניהול זמינות</h2>
        <p className="text-gray-500 mt-1">המערכת משבצת קריאות רק כשאתה מסומן כ"זמין"</p>
      </div>

      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-9 bg-green-500 rounded-full relative">
              <div className="w-7 h-7 bg-white rounded-full absolute top-1 start-1 shadow" />
            </div>
            <div>
              <div className="font-bold text-green-800">זמין ✅</div>
              <div className="text-xs text-green-700">מקבל קריאות חדשות</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-red-50 border-red-200">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-9 bg-red-400 rounded-full relative">
              <div className="w-7 h-7 bg-white rounded-full absolute top-1 end-1 shadow" />
            </div>
            <div>
              <div className="font-bold text-red-800">לא זמין ❌</div>
              <div className="text-xs text-red-700">לא מקבל קריאות</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 text-sm text-blue-800">
        <strong>💡 טיפ:</strong> ככל שתהיה זמין יותר שעות, כך תקבל יותר קריאות ותשפר את הדירוג שלך
      </div>
    </div>
  );
}

function CallFlowStep() {
  const steps = [
    {
      icon: Bell,
      label: 'קריאה נכנסת',
      desc: 'קריאה חדשה משובצת אליך — יש לאשר תוך 5 דקות',
      color: 'bg-blue-500',
    },
    {
      icon: Navigation,
      label: 'יצאתי לדרך',
      desc: 'לחץ "יצאתי לדרך" + נווט עם Waze ישירות מהאפליקציה',
      color: 'bg-purple-500',
    },
    {
      icon: MapPin,
      label: 'הגעתי למקום',
      desc: 'לחץ "הגעתי" — המוקד רואה בזמן אמת',
      color: 'bg-orange-500',
    },
    {
      icon: Camera,
      label: 'צלם ותעד',
      desc: "צלם לפני ואחרי + הערות + צ'אט עם המוקד",
      color: 'bg-green-500',
    },
    {
      icon: Pencil,
      label: 'חתימת לקוח',
      desc: 'חובה! החתם את הלקוח דיגיטלית על גבי המסך',
      color: 'bg-red-500',
    },
    {
      icon: CheckCircle,
      label: 'סיים קריאה',
      desc: 'לחץ "סיים קריאה" — הקריאה עוברת ל"סגור"',
      color: 'bg-gray-800',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Phone className="w-8 h-8 text-orange-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">מחזור חיי קריאה</h2>
        <p className="text-gray-500 mt-1">כך נראה התהליך מקצה לקצה</p>
      </div>

      <div className="space-y-3">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex items-start gap-3"
            >
              <div className="flex flex-col items-center">
                <div
                  className={`w-9 h-9 ${s.color} rounded-full flex items-center justify-center text-white`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                {idx < steps.length - 1 && <div className="w-0.5 h-6 bg-gray-200" />}
              </div>
              <div className="pt-1">
                <div className="text-sm font-bold text-gray-900">{s.label}</div>
                <div className="text-xs text-gray-500">{s.desc}</div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function TipsStep() {
  const tips = [
    { icon: Zap, text: 'הגב מהר לקריאות — זמן תגובה קצר = יותר שיבוצים' },
    { icon: Camera, text: 'תעד הכל בתמונות — זה מגן עליך ומשפר אמינות' },
    { icon: Phone, text: "עדכן את המוקד דרך הצ'אט על כל שינוי" },
    { icon: Star, text: 'שירות מקצועי = דירוג גבוה = יותר קריאות' },
    { icon: Shield, text: 'חתימת לקוח היא חובה — אל תשכח!' },
    { icon: BookOpen, text: 'תמיד אפשר לחזור למדריך הספקים לקבלת עזרה' },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Star className="w-8 h-8 text-yellow-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">טיפים להצלחה</h2>
        <p className="text-gray-500 mt-1">כמה דברים שכדאי לזכור</p>
      </div>

      <div className="space-y-3">
        {tips.map((tip, idx) => {
          const Icon = tip.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
            >
              <Card className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-9 h-9 bg-yellow-50 rounded-lg flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-yellow-600" />
                  </div>
                  <p className="text-sm text-gray-700">{tip.text}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function DoneStep({ vendor }) {
  return (
    <div className="text-center space-y-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', bounce: 0.5, delay: 0.2 }}
        className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto"
      >
        <CheckCircle className="w-14 h-14 text-green-600" />
      </motion.div>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">הכל מוכן!</h1>
        <p className="text-lg text-gray-500">{vendor?.vendor_name}, אתה מוכן להתחיל לקבל קריאות.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <ToggleRight className="w-6 h-6 text-blue-600 mx-auto mb-1" />
            <div className="text-xs font-medium text-blue-800">הפעל זמינות</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 text-center">
            <Bell className="w-6 h-6 text-green-600 mx-auto mb-1" />
            <div className="text-xs font-medium text-green-800">אשר התראות</div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4 text-center">
            <MapPin className="w-6 h-6 text-orange-600 mx-auto mb-1" />
            <div className="text-xs font-medium text-orange-800">שתף מיקום</div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4 text-center">
            <Star className="w-6 h-6 text-purple-600 mx-auto mb-1" />
            <div className="text-xs font-medium text-purple-800">תן שירות מעולה</div>
          </CardContent>
        </Card>
      </div>

      <p className="text-sm text-gray-400">לחץ "התחל לעבוד!" כדי להגיע לפורטל הספקים</p>
    </div>
  );
}
