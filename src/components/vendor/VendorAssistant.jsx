import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Button } from '@/components/ui/button';

// Animated tow truck SVG character
function TowTruckCharacter({ size = 64, talking = false }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 120 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Truck body */}
      <motion.rect
        x="30"
        y="30"
        width="60"
        height="35"
        rx="6"
        fill="#FF0000"
        stroke="#CC0000"
        strokeWidth="2"
      />
      {/* Cabin */}
      <motion.path
        d="M70 30 L90 30 L95 50 L90 65 L70 65 Z"
        fill="#CC0000"
        stroke="#AA0000"
        strokeWidth="2"
      />
      {/* Windshield */}
      <motion.path
        d="M74 34 L88 34 L92 48 L74 48 Z"
        fill="#B3E0FF"
        stroke="#88C8EE"
        strokeWidth="1"
      />
      {/* Crane arm */}
      <motion.g>
        <motion.line
          x1="40"
          y1="30"
          x2="35"
          y2="10"
          stroke="#FF6600"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <motion.line
          x1="35"
          y1="10"
          x2="55"
          y2="8"
          stroke="#FF6600"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Hook */}
        <motion.path
          d="M55 8 L55 16 C55 20 50 20 50 16"
          stroke="#666"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          animate={talking ? { y: [0, -2, 0] } : {}}
          transition={{ repeat: Infinity, duration: 0.8 }}
        />
      </motion.g>
      {/* Eyes */}
      <motion.circle
        cx="78"
        cy="40"
        r="3"
        fill="#172B4D"
        animate={talking ? { scaleY: [1, 0.3, 1] } : {}}
        transition={{ repeat: Infinity, duration: 3, delay: 1 }}
      />
      <motion.circle
        cx="86"
        cy="40"
        r="3"
        fill="#172B4D"
        animate={talking ? { scaleY: [1, 0.3, 1] } : {}}
        transition={{ repeat: Infinity, duration: 3, delay: 1 }}
      />
      {/* Smile */}
      <motion.path
        d="M77 45 Q82 50 87 45"
        stroke="#172B4D"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        animate={
          talking
            ? { d: ['M77 45 Q82 50 87 45', 'M77 44 Q82 52 87 44', 'M77 45 Q82 50 87 45'] }
            : {}
        }
        transition={{ repeat: Infinity, duration: 0.6 }}
      />
      {/* Front wheel */}
      <motion.circle cx="78" cy="68" r="10" fill="#333" stroke="#222" strokeWidth="2" />
      <motion.circle cx="78" cy="68" r="5" fill="#666" />
      <motion.circle cx="78" cy="68" r="2" fill="#999" />
      {/* Rear wheel */}
      <motion.circle cx="45" cy="68" r="10" fill="#333" stroke="#222" strokeWidth="2" />
      <motion.circle cx="45" cy="68" r="5" fill="#666" />
      <motion.circle cx="45" cy="68" r="2" fill="#999" />
      {/* Ground line */}
      <motion.line
        x1="20"
        y1="78"
        x2="100"
        y2="78"
        stroke="#DFE1E6"
        strokeWidth="2"
        strokeDasharray="4 4"
      />
      {/* Flashing light */}
      <motion.rect
        x="72"
        y="24"
        width="8"
        height="6"
        rx="2"
        animate={{ fill: ['#FF6600', '#FFCC00', '#FF6600'] }}
        transition={{ repeat: Infinity, duration: 1 }}
      />
    </motion.svg>
  );
}

// Tips data organized by page
const pageTips = {
  VendorPortal: {
    title: 'שלום! אני נתי הגרר',
    tips: [
      'ברוכים הבאים לפורטל הספקים! כאן תנהלו את הקריאות והזמינות שלכם.',
      'הפעילו את מתג הזמינות כדי לקבל קריאות חדשות.',
      'שימו לב לקריאות הפעילות בתצוגת הקריאות למטה.',
      'לחצו על קריאה כדי לנהל אותה ולעדכן סטטוס.',
    ],
  },
  VendorCallManagement: {
    title: 'ניהול קריאה',
    tips: [
      'עדכנו "יצאתי לדרך" ברגע שאתם יוצאים לקריאה.',
      'השתמשו בכפתור Waze לניווט מהיר למיקום הלקוח.',
      'אל תשכחו לצלם תמונות לפני ואחרי הטיפול!',
      'בסיום - קבלו חתימת לקוח וסגרו את הקריאה.',
    ],
  },
  MyVendorProfile: {
    title: 'הפרופיל שלך',
    tips: [
      'ודאו שפרטי ההתקשרות שלכם מעודכנים.',
      'הגדירו את אזורי הכיסוי שלכם - זה ישפיע על הקריאות שתקבלו.',
      'עדכנו את סוגי השירות והתעריפים שלכם.',
      'הפעילו שיתוף GPS כדי שהמוקד יוכל לראות את מיקומכם.',
    ],
  },
};

const defaultTips = {
  title: 'טיפ מנתי הגרר',
  tips: [
    'תמיד עדכנו את הסטטוס שלכם בזמן אמת.',
    'חשוב לצלם תמונות לתיעוד!',
    'אם נתקלתם בבעיה - פנו למוקד מיידית.',
  ],
};

export default function VendorAssistant({ currentPageName }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTip, setCurrentTip] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);

  // Get tips for current page
  const pageData = pageTips[currentPageName] || defaultTips;

  // Show welcome bubble after 2 seconds on first visit
  useEffect(() => {
    const seen = localStorage.getItem('vendor_assistant_seen');
    if (seen) {
      setHasSeenWelcome(true);
      return;
    }
    const timer = setTimeout(() => {
      setIsOpen(true);
      setHasSeenWelcome(true);
      localStorage.setItem('vendor_assistant_seen', 'true');
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Reset tip index when page changes
  useEffect(() => {
    setCurrentTip(0);
  }, [currentPageName]);

  const nextTip = () => {
    setCurrentTip((prev) => (prev + 1) % pageData.tips.length);
  };

  const prevTip = () => {
    setCurrentTip((prev) => (prev - 1 + pageData.tips.length) % pageData.tips.length);
  };

  if (dismissed) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50" dir="rtl">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="mb-4 bg-white rounded-2xl shadow-2xl border border-[#DFE1E6] w-80 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-l from-red-600 to-red-700 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TowTruckCharacter size={32} talking={true} />
                <span className="font-bold text-sm">{pageData.title}</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tip Content */}
            <div className="p-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTip}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Speech bubble */}
                  <div className="bg-[#F4F5F7] rounded-xl p-4 relative">
                    <p className="text-sm text-[#172B4D] leading-relaxed">
                      {pageData.tips[currentTip]}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex gap-1">
                  {pageData.tips.map((_, i) => (
                    <motion.div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        i === currentTip ? 'bg-red-600' : 'bg-[#DFE1E6]'
                      }`}
                      animate={i === currentTip ? { scale: [1, 1.3, 1] } : {}}
                      transition={{ duration: 0.3 }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={prevTip}
                    className="w-7 h-7 rounded-full bg-[#F4F5F7] hover:bg-[#DFE1E6] flex items-center justify-center transition-colors"
                  >
                    <ChevronLeft className="w-3 h-3 rotate-180 text-[#6B778C]" />
                  </button>
                  <button
                    onClick={nextTip}
                    className="w-7 h-7 rounded-full bg-[#F4F5F7] hover:bg-[#DFE1E6] flex items-center justify-center transition-colors"
                  >
                    <ChevronLeft className="w-3 h-3 text-[#6B778C]" />
                  </button>
                </div>
              </div>

              {/* Footer actions */}
              <div className="flex gap-2 mt-3 pt-3 border-t border-[#DFE1E6]">
                <Link to={createPageUrl('VendorGuide')} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full text-xs gap-1.5">
                    <BookOpen className="w-3 h-3" />
                    המדריך המלא
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-[#6B778C]"
                  onClick={() => setDismissed(true)}
                >
                  הסתר
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-16 h-16 rounded-full bg-white shadow-lg border-2 border-red-100 hover:border-red-300 flex items-center justify-center transition-colors group"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        animate={{
          y: [0, -6, 0],
        }}
        transition={{
          y: { repeat: Infinity, duration: 3, ease: 'easeInOut' },
        }}
      >
        <TowTruckCharacter size={48} talking={isOpen} />

        {/* Notification dot when closed */}
        {!isOpen && !hasSeenWelcome && (
          <motion.div
            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
        )}

        {/* Tooltip */}
        {!isOpen && (
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#172B4D] text-white text-xs py-1 px-3 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            צריכים עזרה? לחצו עליי!
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-[#172B4D] rotate-45 -mt-1" />
          </div>
        )}
      </motion.button>
    </div>
  );
}
