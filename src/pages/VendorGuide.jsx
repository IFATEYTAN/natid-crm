import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Truck,
  Phone,
  MapPin,
  CheckCircle,
  Camera,
  Navigation,
  Clock,
  Bell,
  UserCog,
  Shield,
  AlertCircle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Star,
  Pen,
  Zap,
  Globe,
} from 'lucide-react';
import {
  SlideUp,
  StaggeredList,
  StaggeredItem,
  FadeIn,
} from '@/components/animations/AnimatedComponents';

// Animated tow truck hero for the top
function HeroTruck() {
  return (
    <motion.div className="flex justify-center my-6">
      <motion.svg
        width="200"
        height="120"
        viewBox="0 0 200 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        animate={{ x: [0, 10, 0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
      >
        {/* Road */}
        <motion.line x1="0" y1="105" x2="200" y2="105" stroke="#DFE1E6" strokeWidth="3" />
        <motion.line
          x1="0"
          y1="105"
          x2="200"
          y2="105"
          stroke="#FF0000"
          strokeWidth="1"
          strokeDasharray="8 8"
          animate={{ strokeDashoffset: [0, -32] }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        />
        {/* Truck body */}
        <motion.rect
          x="50"
          y="45"
          width="80"
          height="42"
          rx="8"
          fill="#FF0000"
          stroke="#CC0000"
          strokeWidth="2"
        />
        {/* Company name */}
        <text
          x="90"
          y="72"
          textAnchor="middle"
          fill="white"
          fontSize="12"
          fontWeight="bold"
          fontFamily="Arial"
        >
          נתי
        </text>
        {/* Cabin */}
        <motion.path
          d="M115 45 L145 45 L155 70 L150 87 L115 87 Z"
          fill="#CC0000"
          stroke="#AA0000"
          strokeWidth="2"
        />
        {/* Windshield */}
        <motion.path
          d="M120 50 L142 50 L150 68 L120 68 Z"
          fill="#B3E0FF"
          stroke="#88C8EE"
          strokeWidth="1"
        />
        {/* Crane arm */}
        <motion.g
          animate={{ rotate: [0, -3, 0, 3, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
          style={{ transformOrigin: '65px 45px' }}
        >
          <line
            x1="65"
            y1="45"
            x2="55"
            y2="15"
            stroke="#FF6600"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <line
            x1="55"
            y1="15"
            x2="85"
            y2="12"
            stroke="#FF6600"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <motion.path
            d="M85 12 L85 24 C85 30 78 30 78 24"
            stroke="#666"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            animate={{ y: [0, 3, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
        </motion.g>
        {/* Eyes */}
        <motion.circle
          cx="130"
          cy="58"
          r="4"
          fill="#172B4D"
          animate={{ scaleY: [1, 0.2, 1] }}
          transition={{ repeat: Infinity, duration: 4, delay: 2 }}
        />
        <motion.circle
          cx="140"
          cy="58"
          r="4"
          fill="#172B4D"
          animate={{ scaleY: [1, 0.2, 1] }}
          transition={{ repeat: Infinity, duration: 4, delay: 2 }}
        />
        {/* Smile */}
        <path
          d="M128 63 Q135 70 142 63"
          stroke="#172B4D"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
        {/* Front wheel */}
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          style={{ transformOrigin: '130px 90px' }}
        >
          <circle cx="130" cy="90" r="14" fill="#333" stroke="#222" strokeWidth="2" />
          <circle cx="130" cy="90" r="7" fill="#666" />
          <circle cx="130" cy="90" r="3" fill="#999" />
          <line x1="130" y1="80" x2="130" y2="85" stroke="#888" strokeWidth="1" />
          <line x1="130" y1="95" x2="130" y2="100" stroke="#888" strokeWidth="1" />
          <line x1="120" y1="90" x2="125" y2="90" stroke="#888" strokeWidth="1" />
          <line x1="135" y1="90" x2="140" y2="90" stroke="#888" strokeWidth="1" />
        </motion.g>
        {/* Rear wheel */}
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          style={{ transformOrigin: '75px 90px' }}
        >
          <circle cx="75" cy="90" r="14" fill="#333" stroke="#222" strokeWidth="2" />
          <circle cx="75" cy="90" r="7" fill="#666" />
          <circle cx="75" cy="90" r="3" fill="#999" />
          <line x1="75" y1="80" x2="75" y2="85" stroke="#888" strokeWidth="1" />
          <line x1="75" y1="95" x2="75" y2="100" stroke="#888" strokeWidth="1" />
          <line x1="65" y1="90" x2="70" y2="90" stroke="#888" strokeWidth="1" />
          <line x1="80" y1="90" x2="85" y2="90" stroke="#888" strokeWidth="1" />
        </motion.g>
        {/* Flashing light */}
        <motion.rect
          x="118"
          y="38"
          width="10"
          height="7"
          rx="3"
          animate={{ fill: ['#FF6600', '#FFCC00', '#FF6600'] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
        />
        {/* Exhaust */}
        <motion.circle
          cx="48"
          cy="85"
          r="4"
          fill="#DFE1E6"
          animate={{ x: [-5, -20], y: [-5, -15], opacity: [0.6, 0], scale: [0.5, 1.5] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        />
        <motion.circle
          cx="48"
          cy="85"
          r="3"
          fill="#DFE1E6"
          animate={{ x: [-8, -25], y: [-8, -20], opacity: [0.4, 0], scale: [0.3, 1.2] }}
          transition={{ repeat: Infinity, duration: 1.5, delay: 0.5 }}
        />
      </motion.svg>
    </motion.div>
  );
}

// Interactive step component
function GuideStep({ number, icon: Icon, title, description, color = 'red', tips }) {
  const [expanded, setExpanded] = useState(false);
  const colors = {
    red: { bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-200' },
    green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200' },
  };
  const c = colors[color] || colors.red;

  return (
    <motion.div
      className={`border rounded-xl overflow-hidden transition-colors ${expanded ? c.border : 'border-[#DFE1E6]'}`}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-4 text-right hover:bg-[#F4F5F7] transition-colors"
      >
        <div className={`w-10 h-10 rounded-full ${c.bg} flex items-center justify-center shrink-0`}>
          <span className={`font-bold ${c.text}`}>{number}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${c.text}`} />
            <h3 className="font-semibold text-[#172B4D]">{title}</h3>
          </div>
          <p className="text-sm text-[#6B778C] mt-0.5 line-clamp-1">{description}</p>
        </div>
        <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronLeft className="w-5 h-5 text-[#6B778C]" />
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4 space-y-3">
              <div className="bg-[#F4F5F7] rounded-lg p-4">
                <p className="text-sm text-[#172B4D] leading-relaxed">{description}</p>
              </div>
              {tips && tips.length > 0 && (
                <div className="space-y-2">
                  {tips.map((tip, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-2"
                    >
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-[#172B4D]">{tip}</span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function VendorGuidePage() {
  const [activeSection, setActiveSection] = useState('start');

  const sections = [
    { id: 'start', label: 'התחלת עבודה', icon: Zap },
    { id: 'calls', label: 'ניהול קריאות', icon: Phone },
    { id: 'profile', label: 'הפרופיל שלי', icon: UserCog },
    { id: 'tips', label: 'טיפים וטריקים', icon: Star },
    { id: 'faq', label: 'שאלות נפוצות', icon: HelpCircle },
  ];

  return (
    <SlideUp>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Hero */}
        <FadeIn>
          <div className="text-center">
            <HeroTruck />
            <motion.h1
              className="text-3xl font-bold text-[#172B4D]"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              המדריך שלי - פורטל ספקים
            </motion.h1>
            <motion.p
              className="text-[#6B778C] mt-2 text-lg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              אני נתי, ואלווה אתכם בכל מה שצריך לדעת!
            </motion.p>
          </div>
        </FadeIn>

        {/* Section Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {sections.map((section, i) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <motion.button
                key={section.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-white text-[#172B4D] border border-[#DFE1E6] hover:bg-[#F4F5F7]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {section.label}
              </motion.button>
            );
          })}
        </div>

        {/* Section Content */}
        <AnimatePresence mode="wait">
          {activeSection === 'start' && (
            <motion.div
              key="start"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Card className="bg-gradient-to-l from-green-50 to-green-100 border-green-200">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center shrink-0">
                      <Zap className="w-5 h-5 text-green-700" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#172B4D] text-lg">ברוכים הבאים למערכת נתי!</h3>
                      <p className="text-sm text-[#6B778C] mt-1">
                        ב-4 צעדים פשוטים תהיו מוכנים לקבל קריאות ולהתחיל לעבוד.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <GuideStep
                number={1}
                icon={Globe}
                title="התחברו למערכת"
                description="היכנסו עם הפרטים שקיבלתם באימייל ההזמנה. לחצו על הקישור בדוא״ל, הגדירו סיסמה, ואתם בפנים!"
                color="green"
                tips={[
                  'בדקו גם בתיקיית הספאם אם לא מצאתם את האימייל',
                  'שמרו את הסיסמה שלכם במקום בטוח',
                  'ניתן להתחבר גם מהנייד - המערכת מותאמת למובייל',
                ]}
              />
              <GuideStep
                number={2}
                icon={UserCog}
                title="עדכנו את הפרופיל"
                description="מלאו את הפרטים שלכם: סוגי שירות, אזורי כיסוי, שעות עבודה ותעריפים. ככל שהפרופיל מלא יותר, כך תקבלו קריאות מתאימות יותר."
                color="blue"
                tips={[
                  'ודאו שמספר הטלפון שלכם נכון',
                  'הגדירו את כל סוגי השירות שאתם מספקים',
                  'סמנו את כל אזורי הפעילות שלכם',
                ]}
              />
              <GuideStep
                number={3}
                icon={MapPin}
                title="אפשרו שיתוף מיקום"
                description="כשתפעילו את הזמינות, המערכת תבקש גישה למיקום שלכם. אשרו - זה מאפשר למוקד לשבץ אתכם לקריאות קרובות ולחסוך לכם זמן נסיעה."
                color="orange"
                tips={[
                  'המיקום משותף רק כשאתם מסומנים כ״זמינים״',
                  'המיקום מתעדכן כל 30 שניות',
                  'ניתן לכבות שיתוף מיקום בכל עת דרך הפרופיל',
                ]}
              />
              <GuideStep
                number={4}
                icon={Bell}
                title="הפעילו את הזמינות"
                description="סמנו 'זמין' בפורטל הראשי - מרגע זה תוכלו לקבל קריאות חדשות! ניתן לקחת הפסקה בלחיצה ולחזור אוטומטית."
                color="red"
                tips={[
                  'כשאתם בהפסקה, לא תקבלו קריאות חדשות',
                  'הפסקות אוטומטיות: 15, 30 או 60 דקות',
                  'בסיום המשמרת - כבו את הזמינות',
                ]}
              />
            </motion.div>
          )}

          {activeSection === 'calls' && (
            <motion.div
              key="calls"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Card className="bg-gradient-to-l from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5 text-blue-700" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#172B4D] text-lg">מחזור חיי קריאה</h3>
                      <p className="text-sm text-[#6B778C] mt-1">
                        כל קריאה עוברת 5 שלבים - מהרגע שהיא נכנסת ועד הסגירה.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <GuideStep
                number={1}
                icon={Bell}
                title="קבלת קריאה חדשה"
                description="כשמשובצת לכם קריאה, תקבלו התראה עם ספירה לאחור של 2 דקות. תראו את סוג התקלה, מיקום הלקוח, מרחק משוער ופרטי תשלום."
                color="red"
                tips={[
                  'לחצו ״קבל קריאה״ כדי לאשר',
                  'אם לא מתאים - לחצו ״דחה״ ובחרו סיבה',
                  'אם לא עניתם תוך 2 דקות - הקריאה מועברת לספק אחר',
                ]}
              />
              <GuideStep
                number={2}
                icon={Navigation}
                title="יצאתי לדרך"
                description="ברגע שקיבלתם את הקריאה, לחצו ״יצאתי לדרך״. המערכת תציג ניווט Waze ישירות למיקום הלקוח."
                color="blue"
                tips={[
                  'עדכנו סטטוס מיד - הלקוח רואה את הסטטוס שלכם',
                  'ניתן להתקשר ללקוח ישירות מהמערכת',
                  'שלחו הודעת צ׳אט דרך המערכת לתיאום',
                ]}
              />
              <GuideStep
                number={3}
                icon={MapPin}
                title="הגעתי למקום"
                description="כשהגעתם ללקוח, עדכנו ״הגעתי למקום״. צלמו תמונות של הרכב לפני התחלת הטיפול."
                color="orange"
                tips={[
                  'צלמו תמונות ברורות של מצב הרכב',
                  'תעדו נזקים קיימים לפני שמתחילים',
                  'בחרו קטגוריה מתאימה לכל תמונה',
                ]}
              />
              <GuideStep
                number={4}
                icon={Camera}
                title="תיעוד וטיפול"
                description="בצעו את הטיפול הנדרש. צלמו תמונות של התהליך ותוצאת הטיפול. הוסיפו הערות אם צריך."
                color="green"
                tips={[
                  'צלמו לפני ואחרי - חשוב לתיעוד!',
                  'הוסיפו הערות על הטיפול בשדה ההערות',
                  'אם צריך עזרה - שלחו הודעה למוקד בצ׳אט',
                ]}
              />
              <GuideStep
                number={5}
                icon={Pen}
                title="חתימה וסגירה"
                description="בסיום הטיפול, בקשו מהלקוח לחתום על גבי המסך. לאחר החתימה, סגרו את הקריאה. התשלום יופיע בחשבון שלכם."
                color="blue"
                tips={[
                  'ודאו שהלקוח חתם על המסך',
                  'החתימה מהווה אישור לסיום מוצלח',
                  'לאחר הסגירה תוכלו למלא משוב',
                ]}
              />
            </motion.div>
          )}

          {activeSection === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Card className="bg-gradient-to-l from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center shrink-0">
                      <UserCog className="w-5 h-5 text-purple-700" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#172B4D] text-lg">ניהול הפרופיל שלך</h3>
                      <p className="text-sm text-[#6B778C] mt-1">
                        פרופיל מעודכן = קריאות מתאימות יותר = רווח גבוה יותר!
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="w-5 h-5 text-red-600" />
                    מה ניתן לעדכן בפרופיל?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <StaggeredList className="space-y-3">
                    {[
                      { icon: Phone, label: 'מספרי טלפון', desc: 'עדכנו טלפון ראשי ומשני' },
                      {
                        icon: Truck,
                        label: 'סוגי שירות',
                        desc: 'גרר, מכונאי, צמיגים, מנעולן, דלק',
                      },
                      { icon: MapPin, label: 'אזורי כיסוי', desc: 'הגדירו אזורים וערים ספציפיות' },
                      { icon: Clock, label: 'שעות פעילות', desc: 'שעות עבודה או 24/7' },
                      { icon: Star, label: 'תעריפים', desc: 'תעריף בסיס ותעריף לק״מ' },
                      { icon: Globe, label: 'שיתוף GPS', desc: 'הפעלה/כיבוי שיתוף מיקום' },
                    ].map((item, i) => (
                      <StaggeredItem key={i}>
                        <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#F4F5F7] transition-colors">
                          <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                            <item.icon className="w-4 h-4 text-red-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-sm text-[#172B4D]">{item.label}</h4>
                            <p className="text-xs text-[#6B778C]">{item.desc}</p>
                          </div>
                        </div>
                      </StaggeredItem>
                    ))}
                  </StaggeredList>
                </CardContent>
              </Card>

              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-800">שימו לב</h4>
                      <p className="text-sm text-yellow-700">
                        שם הספק וכתובת האימייל לא ניתנים לשינוי עצמאי - פנו למוקד לעדכון.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeSection === 'tips' && (
            <motion.div
              key="tips"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Card className="bg-gradient-to-l from-orange-50 to-orange-100 border-orange-200">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-200 flex items-center justify-center shrink-0">
                      <Star className="w-5 h-5 text-orange-700" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#172B4D] text-lg">טיפים מנתי הגרר</h3>
                      <p className="text-sm text-[#6B778C] mt-1">
                        הטיפים שיעזרו לכם לקבל דירוג גבוה ויותר קריאות!
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <StaggeredList className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    title: 'זמן תגובה מהיר',
                    desc: 'קבלו קריאות תוך שניות ועדכנו ״יצאתי לדרך״ מיד. ספקים מהירים מקבלים יותר קריאות!',
                    icon: '⚡',
                  },
                  {
                    title: 'תיעוד מקצועי',
                    desc: 'צלמו תמונות ברורות לפני ואחרי כל טיפול. זה מגן עליכם ומעלה אמינות.',
                    icon: '📸',
                  },
                  {
                    title: 'תקשורת עם הלקוח',
                    desc: 'עדכנו את הלקוח כשאתם בדרך, כשמגיעים וכשסיימתם. שקיפות = דירוג גבוה.',
                    icon: '💬',
                  },
                  {
                    title: 'זמינות יציבה',
                    desc: 'שמרו על זמינות בשעות שהגדרתם. ביטולים ואי-זמינות משפיעים על הדירוג.',
                    icon: '🟢',
                  },
                  {
                    title: 'בקשו משוב',
                    desc: 'לאחר סגירת קריאה, הלקוח מתבקש לדרג. שירות טוב = ביקורות מעולות!',
                    icon: '⭐',
                  },
                  {
                    title: 'עדכנו פרופיל',
                    desc: 'ככל שהפרופיל מלא ומעודכן יותר, כך תשובצו לקריאות מתאימות יותר.',
                    icon: '📝',
                  },
                ].map((tip, i) => (
                  <StaggeredItem key={i}>
                    <motion.div
                      className="bg-white border border-[#DFE1E6] rounded-xl p-4 hover:shadow-md transition-shadow"
                      whileHover={{ y: -2 }}
                    >
                      <div className="text-2xl mb-2">{tip.icon}</div>
                      <h4 className="font-semibold text-[#172B4D] mb-1">{tip.title}</h4>
                      <p className="text-sm text-[#6B778C] leading-relaxed">{tip.desc}</p>
                    </motion.div>
                  </StaggeredItem>
                ))}
              </StaggeredList>
            </motion.div>
          )}

          {activeSection === 'faq' && (
            <motion.div
              key="faq"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-red-600" />
                    שאלות נפוצות
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="join">
                      <AccordionTrigger>איך מצטרפים למערכת?</AccordionTrigger>
                      <AccordionContent>
                        המוקד שולח לכם הזמנה באימייל עם קישור להרשמה. לחצו על הקישור, הגדירו סיסמה,
                        ואתם בפנים! אם לא קיבלתם אימייל, בדקו בתיקיית הספאם או פנו למוקד.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="cancel">
                      <AccordionTrigger>מה עושים אם הלקוח מבטל?</AccordionTrigger>
                      <AccordionContent>
                        עדכנו את המוקד דרך הצ׳אט והם יטפלו בביטול. אל תעזבו את המקום לפני אישור
                        מהמוקד.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="problem">
                      <AccordionTrigger>מה אם אני לא יכול לטפל בתקלה?</AccordionTrigger>
                      <AccordionContent>
                        צרו קשר מיידי עם המוקד. הם יסייעו למצוא פתרון או ישלחו ספק נוסף. חשוב: אל
                        תעזבו את הלקוח לבד!
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="payment">
                      <AccordionTrigger>איך מקבלים תשלום?</AccordionTrigger>
                      <AccordionContent>
                        התשלומים מחושבים אוטומטית ומועברים בסוף כל חודש. ניתן לראות פירוט תשלומים
                        בדף ״הפרופיל שלי״. עבור כל קריאה תראו את סכום התשלום לפני שמקבלים אותה.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="break">
                      <AccordionTrigger>איך לוקחים הפסקה?</AccordionTrigger>
                      <AccordionContent>
                        לחצו על כפתור ההפסקה בפורטל הראשי ובחרו משך (15, 30 או 60 דקות). המערכת
                        תחזיר אתכם לזמינות אוטומטית בסוף ההפסקה. במהלך הפסקה לא תקבלו קריאות חדשות.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="location">
                      <AccordionTrigger>למה שיתוף מיקום חשוב?</AccordionTrigger>
                      <AccordionContent>
                        שיתוף המיקום מאפשר למערכת לשבץ אתכם לקריאות הקרובות ביותר. זה חוסך לכם זמן
                        נסיעה ומבטיח שתקבלו קריאות באזור שלכם. המיקום משותף רק כשאתם מסומנים
                        כזמינים.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="rating">
                      <AccordionTrigger>איך הדירוג שלי נקבע?</AccordionTrigger>
                      <AccordionContent>
                        הדירוג מבוסס על: זמן תגובה, איכות שירות (משוב לקוחות), אחוז השלמת קריאות,
                        ותיעוד מקצועי. שמרו על ביצועים גבוהים כדי לקבל יותר קריאות ועדיפות בשיבוץ.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>

              {/* Contact */}
              <Card className="bg-gradient-to-l from-red-50 to-red-100 border-red-200">
                <CardContent className="pt-6 text-center">
                  <h3 className="text-lg font-semibold text-[#172B4D] mb-2">צריכים עזרה נוספת?</h3>
                  <p className="text-[#6B778C] mb-4">צוות המוקד שלנו כאן בשבילכם 24/7</p>
                  <div className="flex justify-center gap-4">
                    <Button variant="outline" className="gap-2">
                      <Phone className="w-4 h-4" />
                      התקשרו למוקד
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SlideUp>
  );
}
