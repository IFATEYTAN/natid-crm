import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  ChevronUp,
  LogIn,
  ToggleRight,
  Bell,
  MapPin,
  Navigation,
  CheckCircle,
  Camera,
  Pencil,
  Star,
  Clock,
  Phone,
  MessageSquare,
  Shield,
  Zap,
  Award,
  ThumbsUp,
  ArrowRight,
} from 'lucide-react';

/* ──────── Animated Hero Tow Truck ──────── */
function HeroTruck() {
  return (
    <svg
      viewBox="0 0 600 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-2xl"
    >
      {/* Road */}
      <rect x="0" y="160" width="600" height="30" rx="4" fill="#94A3B8" />
      <motion.line
        x1="0"
        y1="175"
        x2="600"
        y2="175"
        stroke="#F8FAFC"
        strokeWidth="2"
        strokeDasharray="20 15"
        initial={{ strokeDashoffset: 0 }}
        animate={{ strokeDashoffset: -70 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      />

      {/* Truck moving */}
      <motion.g
        initial={{ x: -200 }}
        animate={{ x: 180 }}
        transition={{ duration: 2, ease: 'easeOut' }}
      >
        {/* Truck body */}
        <rect x="50" y="105" width="120" height="50" rx="5" fill="#DC2626" />
        {/* Cabin */}
        <rect x="170" y="115" width="50" height="40" rx="4" fill="#B91C1C" />
        {/* Window */}
        <rect x="176" y="120" width="28" height="18" rx="3" fill="#BFDBFE" />
        {/* Crane */}
        <motion.g
          animate={{ rotate: [0, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ originX: '80px', originY: '105px' }}
        >
          <line
            x1="80"
            y1="105"
            x2="55"
            y2="55"
            stroke="#7F1D1D"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <line
            x1="55"
            y1="55"
            x2="85"
            y2="55"
            stroke="#7F1D1D"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <motion.path
            d="M85 55 L85 75 Q85 80 82 80 Q79 80 79 75"
            stroke="#7F1D1D"
            strokeWidth="2.5"
            fill="none"
          />
        </motion.g>
        {/* NatID */}
        <text
          x="85"
          y="137"
          fill="white"
          fontSize="16"
          fontWeight="bold"
          fontFamily="Heebo, sans-serif"
        >
          NatID
        </text>
        {/* Front wheels */}
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{ originX: '185px', originY: '158px' }}
        >
          <circle cx="185" cy="158" r="12" fill="#1E293B" />
          <circle cx="185" cy="158" r="5" fill="#94A3B8" />
          <line x1="185" y1="148" x2="185" y2="168" stroke="#64748B" strokeWidth="1" />
          <line x1="175" y1="158" x2="195" y2="158" stroke="#64748B" strokeWidth="1" />
        </motion.g>
        {/* Rear wheels */}
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{ originX: '95px', originY: '158px' }}
        >
          <circle cx="95" cy="158" r="12" fill="#1E293B" />
          <circle cx="95" cy="158" r="5" fill="#94A3B8" />
          <line x1="95" y1="148" x2="95" y2="168" stroke="#64748B" strokeWidth="1" />
          <line x1="85" y1="158" x2="105" y2="158" stroke="#64748B" strokeWidth="1" />
        </motion.g>
        {/* Exhaust smoke */}
        <motion.circle
          cx="45"
          cy="140"
          r="4"
          fill="#E2E8F0"
          animate={{ x: [-5, -30], y: [0, -20], opacity: [0.5, 0], scale: [0.5, 2] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 0.3 }}
        />
        <motion.circle
          cx="42"
          cy="145"
          r="3"
          fill="#E2E8F0"
          animate={{ x: [-5, -25], y: [0, -25], opacity: [0.4, 0], scale: [0.5, 1.8] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
        />
        {/* Signal light */}
        <motion.rect
          x="220"
          y="140"
          width="4"
          height="4"
          rx="1"
          fill="#FBBF24"
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 0.6, repeat: Infinity }}
        />
        {/* Eyes on cabin */}
        <motion.circle
          cx="182"
          cy="123"
          r="3"
          fill="#1E293B"
          animate={{ scaleY: [1, 0.1, 1] }}
          transition={{ duration: 0.3, repeat: Infinity, repeatDelay: 3 }}
        />
        <motion.circle
          cx="194"
          cy="123"
          r="3"
          fill="#1E293B"
          animate={{ scaleY: [1, 0.1, 1] }}
          transition={{ duration: 0.3, repeat: Infinity, repeatDelay: 3 }}
        />
        {/* Smile */}
        <path
          d="M183 130 Q188 134 193 130"
          stroke="#7F1D1D"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </motion.g>

      {/* Map pin at destination */}
      <motion.g
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.5, type: 'spring', bounce: 0.5 }}
      >
        <path d="M500 130 Q500 110 515 100 Q530 110 530 130 L515 160 Z" fill="#DC2626" />
        <circle cx="515" cy="120" r="8" fill="white" />
      </motion.g>
      <motion.circle
        cx="515"
        cy="130"
        r="15"
        stroke="#DC2626"
        strokeWidth="2"
        fill="none"
        initial={{ scale: 1, opacity: 0.6 }}
        animate={{ scale: 2.5, opacity: 0 }}
        transition={{ duration: 2, repeat: Infinity, delay: 2 }}
      />
    </svg>
  );
}

/* ──────── Section Data ──────── */
const gettingStartedSteps = [
  {
    icon: LogIn,
    title: 'התחברות למערכת',
    desc: 'היכנס עם האימייל והסיסמה שקיבלת מהמנהל. אם שכחת סיסמה, פנה למנהל המערכת.',
  },
  {
    icon: ToggleRight,
    title: 'הפעל זמינות',
    desc: 'בעמוד הפורטל, הפעל את מתג הזמינות. רק כשאתה "זמין" תקבל קריאות חדשות. סטטוסים: זמין, עסוק, לא מחובר, בהפסקה.',
  },
  {
    icon: Bell,
    title: 'אשר התראות',
    desc: 'אשר קבלת התראות push כדי לקבל עדכון מיידי על קריאות חדשות, גם כשהמסך סגור.',
  },
  {
    icon: MapPin,
    title: 'אפשר GPS',
    desc: 'אפשר שיתוף מיקום כדי שהמערכת תוכל לחשב מרחק ולשבץ קריאות קרובות אליך. המיקום משפיע ישירות על שיבוץ קריאות.',
  },
];

const callLifecycleSteps = [
  {
    icon: Bell,
    title: 'קבלת קריאה',
    desc: 'כשמשובצת אליך קריאה, תקבל התראה. לחץ "קבל" כדי לאשר, או "דחה" עם סיבה.',
    color: 'bg-blue-100 text-blue-700',
  },
  {
    icon: Navigation,
    title: 'יצאתי לדרך',
    desc: 'לחץ "יצאתי לדרך" והמערכת תעדכן את המוקד. השתמש ב-Waze לניווט ישיר.',
    color: 'bg-purple-100 text-purple-700',
  },
  {
    icon: CheckCircle,
    title: 'הגעתי למקום',
    desc: 'כשהגעת, לחץ "הגעתי". זמן ההגעה נשמר אוטומטית לצורך דיוק ETA עתידי.',
    color: 'bg-orange-100 text-orange-700',
  },
  {
    icon: Camera,
    title: 'תיעוד ותמונות',
    desc: "צלם לפני ואחרי הטיפול. הוסף הערות ותקשר עם המוקד דרך הצ'אט.",
    color: 'bg-green-100 text-green-700',
  },
  {
    icon: Pencil,
    title: 'חתימה וסיום',
    desc: 'קבל חתימה דיגיטלית מהלקוח ולחץ "סיים קריאה". הקריאה תעבור לסטטוס הושלם.',
    color: 'bg-red-100 text-red-700',
  },
];

const profileTips = [
  { field: 'פרטי קשר', desc: 'טלפון ראשי ומשני, איש קשר' },
  { field: 'סוגי שירות', desc: 'גרירה, החלפת גלגל, מצבר, דלק ועוד + תעריף לכל שירות' },
  { field: 'אזורי כיסוי', desc: 'בחר אזורים גיאוגרפיים + ערים ספציפיות' },
  { field: 'שעות פעילות', desc: 'הגדר שעות עבודה או סמן 24/7' },
  { field: 'תעריפים', desc: 'תעריף בסיס + תעריף לק"מ' },
];

const proTips = [
  { icon: Zap, title: 'הגב מהר', desc: 'ככל שתקבל קריאות מהר יותר, כך תקבל יותר שיבוצים.' },
  {
    icon: Clock,
    title: 'הגע בזמן',
    desc: 'המערכת מודדת את ה-ETA שלך. דיוק בזמנים משפר את הדירוג.',
  },
  { icon: Camera, title: 'תעד הכל', desc: 'צלם לפני ואחרי כל טיפול. זה מגן עליך ומשפר אמינות.' },
  {
    icon: MessageSquare,
    title: 'תקשר עם המוקד',
    desc: "עדכן דרך הצ'אט על כל שינוי או בעיה. שקיפות = אמון.",
  },
  { icon: ThumbsUp, title: 'שירות מקצועי', desc: 'יחס טוב ללקוח מתורגם לדירוג גבוה ויותר קריאות.' },
  { icon: Shield, title: 'הישאר זמין', desc: 'ככל שתהיה זמין יותר שעות, כך תקבל יותר הזדמנויות.' },
];

const faqData = [
  {
    q: 'איך מקבלים קריאות?',
    a: 'כשאתה מסומן כ"זמין" וקריאה חדשה מגיעה באזור הכיסוי שלך, המערכת משבצת אותך אוטומטית לפי מרחק, זמינות ודירוג. תקבל התראה עם פרטי הקריאה.',
  },
  {
    q: 'מה קורה אם אני דוחה קריאה?',
    a: "אתה יכול לדחות קריאה עם סיבה (עסוק, רחוק מדי, וכו'). הקריאה תשובץ לספק הבא. דחיות רבות עלולות להשפיע על סדר העדיפויות בשיבוץ.",
  },
  {
    q: 'איך מעדכנים סטטוס של קריאה?',
    a: 'בעמוד ניהול הקריאה יש כפתורים ברורים: "יצאתי לדרך" → "הגעתי" → "סיימתי". כל עדכון מתועד ונשלח למוקד.',
  },
  {
    q: 'חייבים חתימת לקוח?',
    a: 'כן. לפני סיום הקריאה, יש לקבל חתימה דיגיטלית מהלקוח. זה משמש כאישור שהשירות בוצע ומגן על שני הצדדים.',
  },
  {
    q: 'איך רואים את הרווחים שלי?',
    a: 'בעמוד הפורטל מופיע סיכום חודשי. פירוט מלא של תשלומים נמצא בחשבונית שמופקת בסוף כל חודש.',
  },
  {
    q: 'מה עושים אם יש בעיה בדרך?',
    a: "שלח הודעה למוקד דרך הצ'אט של הקריאה. אם יש בעיה דחופה, התקשר למוקד ישירות.",
  },
  {
    q: 'איך לשפר את הדירוג?',
    a: 'הגב מהר לקריאות, הגע בזמן, תעד הכל בתמונות, ותן שירות אדיב ומקצועי.',
  },
];

/* ──────── Expandable Section ──────── */
function Section({ title, icon: Icon, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className="bg-white overflow-hidden">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors text-right"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
            <Icon className="w-5 h-5 text-red-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <CardContent className="pt-0 pb-6 px-5">{children}</CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

/* ──────── FAQ Accordion Item ──────── */
function FaqItem({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between py-4 text-right hover:text-red-600 transition-colors"
      >
        <span className="font-medium text-sm">{question}</span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-400 shrink-0 mr-2" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 mr-2" />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p className="text-sm text-gray-600 pb-4 leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ──────── Main Page ──────── */
export default function VendorGuide() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12" dir="rtl">
      {/* Hero */}
      <motion.div
        className="text-center pt-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex justify-center mb-4">
          <HeroTruck />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">המדריך לספק</h1>
        <p className="text-gray-500 text-lg">כל מה שצריך לדעת כדי לעבוד עם NatID CRM</p>
      </motion.div>

      {/* Quick Navigation */}
      <motion.div
        className="flex justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Link to={createPageUrl('VendorPortal')}>
          <Button variant="outline" className="gap-2">
            <ArrowRight className="w-4 h-4" />
            חזרה לפורטל
          </Button>
        </Link>
      </motion.div>

      {/* Section 1: Getting Started */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Section title="התחלת עבודה" icon={LogIn} defaultOpen>
          <div className="space-y-4">
            {gettingStartedSteps.map((step, idx) => {
              const StepIcon = step.icon;
              return (
                <motion.div
                  key={step.title}
                  className="flex items-start gap-4"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <StepIcon className="w-4 h-4 text-red-500" />
                      <h4 className="font-bold text-sm text-gray-900">{step.title}</h4>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Section>
      </motion.div>

      {/* Section 2: Call Lifecycle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Section title="ניהול קריאות" icon={Phone}>
          <div className="space-y-4">
            <p className="text-sm text-gray-500 mb-4">מחזור חיי קריאה מלא - מהשיבוץ ועד הסיום:</p>
            {callLifecycleSteps.map((step, idx) => {
              const StepIcon = step.icon;
              return (
                <motion.div
                  key={step.title}
                  className="flex items-start gap-4"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <div className="flex-shrink-0 relative">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${step.color}`}
                    >
                      <StepIcon className="w-5 h-5" />
                    </div>
                    {idx < callLifecycleSteps.length - 1 && (
                      <div className="absolute top-10 right-1/2 w-0.5 h-4 bg-gray-200" />
                    )}
                  </div>
                  <div className="flex-1 pb-2">
                    <h4 className="font-bold text-sm text-gray-900 mb-1">{step.title}</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Section>
      </motion.div>

      {/* Section 3: Profile */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Section title="הפרופיל שלי" icon={Award}>
          <div className="space-y-3">
            <p className="text-sm text-gray-500 mb-3">
              בעמוד{' '}
              <Link
                to={createPageUrl('MyVendorProfile')}
                className="text-red-600 hover:underline font-medium"
              >
                הפרופיל שלי
              </Link>{' '}
              ניתן לעדכן:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profileTips.map((tip) => (
                <div key={tip.field} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="font-bold text-sm text-gray-900 mb-1">{tip.field}</div>
                  <div className="text-xs text-gray-500">{tip.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </Section>
      </motion.div>

      {/* Section 4: Pro Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Section title="טיפים וטריקים" icon={Star}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {proTips.map((tip, idx) => {
              const TipIcon = tip.icon;
              return (
                <motion.div
                  key={tip.title}
                  className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 hover:shadow-sm transition-shadow"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                      <TipIcon className="w-4 h-4 text-red-600" />
                    </div>
                    <h4 className="font-bold text-sm text-gray-900">{tip.title}</h4>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{tip.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </Section>
      </motion.div>

      {/* Section 5: FAQ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Section title="שאלות נפוצות" icon={MessageSquare}>
          <div>
            {faqData.map((item) => (
              <FaqItem key={item.q} question={item.q} answer={item.a} />
            ))}
          </div>
        </Section>
      </motion.div>

      {/* Back to Portal CTA */}
      <motion.div
        className="text-center pt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <Link to={createPageUrl('VendorPortal')}>
          <Button className="bg-red-600 hover:bg-red-700 gap-2 px-8 py-3">
            <ArrowRight className="w-4 h-4" />
            חזרה לפורטל הספקים
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}