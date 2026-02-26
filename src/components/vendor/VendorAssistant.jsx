import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { X, ChevronLeft, ChevronRight, BookOpen, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'natid_vendor_assistant';

const contextualTips = {
  VendorPortal: [
    { title: 'ברוכים הבאים! 🚛', text: 'כאן תוכל לראות את כל הקריאות שלך ולנהל את הזמינות.' },
    {
      title: 'זמינות',
      text: 'הפעל את מתג הזמינות כדי לקבל קריאות חדשות. כשאתה לא זמין, לא ישובצו אליך קריאות.',
    },
    {
      title: 'קריאות פעילות',
      text: 'קריאות פעילות מופיעות בראש העמוד. לחץ "נהל" כדי לעדכן סטטוס ולנווט.',
    },
    { title: 'סטטיסטיקות', text: 'עקוב אחרי הביצועים שלך - מספר קריאות, דירוג, ואחוז השלמה.' },
  ],
  VendorCallManagement: [
    {
      title: 'ניהול קריאה 📋',
      text: 'כאן מנהלים את הקריאה - מעדכנים סטטוס, מעלים תמונות ומתקשרים עם המוקד.',
    },
    { title: 'עדכון סטטוס', text: 'עדכן את הסטטוס לפי ההתקדמות: יצאתי לדרך → הגעתי → סיימתי.' },
    { title: 'תמונות', text: 'צלם תמונות לפני ואחרי הטיפול. זה חשוב לתיעוד ולדירוג.' },
    { title: 'חתימת לקוח', text: 'לפני סיום הקריאה, קבל חתימה דיגיטלית מהלקוח.' },
  ],
  MyVendorProfile: [
    { title: 'הפרופיל שלך 👤', text: 'כאן ניתן לעדכן את פרטי הקשר, סוגי שירות, ואזורי כיסוי.' },
    { title: 'סוגי שירות', text: 'סמן את כל סוגי השירות שאתה מספק והגדר תעריפים לכל שירות.' },
    { title: 'אזורי כיסוי', text: 'ככל שתכסה יותר אזורים, כך תקבל יותר קריאות.' },
    { title: 'שעות פעילות', text: 'הגדר שעות עבודה או סמן 24/7 לקבלת קריאות בכל שעה.' },
  ],
  default: [
    {
      title: 'שלום! אני נתי 🚛',
      text: 'אני כאן לעזור לך להשתמש במערכת. לחץ על החצים כדי לראות טיפים.',
    },
    { title: 'המדריך המלא', text: 'רוצה ללמוד את כל המערכת? לחץ על "המדריך המלא" למטה.' },
  ],
};

function TowTruckSVG({ isTalking }) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      {/* === VW Beetle "נתי הגרר" === */}

      {/* Lower body with wheel arches */}
      <path
        d="M8 48 Q6 48 6 50 L6 55 Q6 58 9 58 L15 58 Q15 53 21 53 Q27 53 27 58 L53 58 Q53 53 59 53 Q65 53 65 58 L71 58 Q74 58 74 55 L74 50 Q74 48 72 48 Z"
        fill="#DC2626"
      />

      {/* Upper body - beetle dome */}
      <path
        d="M16 48 Q13 40 17 32 Q23 22 35 20 Q43 18 47 20 Q59 22 63 32 Q67 40 64 48 Z"
        fill="#DC2626"
      />

      {/* Roof panel - darker */}
      <path
        d="M20 48 Q17 40 21 33 Q27 24 37 22 Q45 20 49 22 Q57 24 59 33 Q63 40 60 48 Z"
        fill="#B91C1C"
      />

      {/* Front windshield (car faces right) */}
      <path
        d="M44 48 L46 30 Q52 26 58 32 L58 48 Z"
        fill="#BFDBFE"
        stroke="#991B1B"
        strokeWidth="0.5"
      />

      {/* Rear window */}
      <path
        d="M22 48 L22 32 Q28 26 34 30 L36 48 Z"
        fill="#BFDBFE"
        stroke="#991B1B"
        strokeWidth="0.5"
      />

      {/* B-pillar (window divider) */}
      <rect x="36" y="27" width="8" height="21" rx="2" fill="#991B1B" />

      {/* Running board */}
      <rect x="27" y="56" width="26" height="2" rx="1" fill="#7F1D1D" />

      {/* Front bumper */}
      <rect x="73" y="52" width="4" height="2.5" rx="1.25" fill="#D1D5DB" />

      {/* Rear bumper */}
      <rect x="3" y="52" width="4" height="2.5" rx="1.25" fill="#D1D5DB" />

      {/* Headlight (front) */}
      <circle cx="72" cy="50" r="2.5" fill="#FBBF24" />
      <circle cx="72" cy="50" r="1" fill="#FEF3C7" />

      {/* Taillight (rear) */}
      <circle cx="8" cy="50" r="2" fill="#FCA5A5" />

      {/* Door handle */}
      <rect x="48" y="47" width="3" height="1" rx="0.5" fill="#991B1B" />

      {/* NatID text */}
      <text
        x="40"
        y="54"
        fill="white"
        fontSize="5.5"
        fontWeight="bold"
        fontFamily="Heebo, sans-serif"
        textAnchor="middle"
      >
        NatID
      </text>

      {/* Wheels */}
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        style={{ originX: '21px', originY: '60px' }}
      >
        <circle cx="21" cy="60" r="5.5" fill="#1E293B" />
        <circle cx="21" cy="60" r="2" fill="#94A3B8" />
      </motion.g>
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        style={{ originX: '59px', originY: '60px' }}
      >
        <circle cx="59" cy="60" r="5.5" fill="#1E293B" />
        <circle cx="59" cy="60" r="2" fill="#94A3B8" />
      </motion.g>

      {/* Eyes */}
      <AnimatePresence>
        {isTalking ? (
          <>
            <motion.ellipse
              cx="48"
              cy="38"
              rx="2.5"
              ry="3"
              fill="#1E293B"
              animate={{ scaleY: [1, 0.2, 1] }}
              transition={{ duration: 0.4, repeat: Infinity, repeatDelay: 1.5 }}
            />
            <motion.ellipse
              cx="55"
              cy="38"
              rx="2.5"
              ry="3"
              fill="#1E293B"
              animate={{ scaleY: [1, 0.2, 1] }}
              transition={{ duration: 0.4, repeat: Infinity, repeatDelay: 1.5 }}
            />
          </>
        ) : (
          <>
            <circle cx="48" cy="38" r="2.5" fill="#1E293B" />
            <circle cx="55" cy="38" r="2.5" fill="#1E293B" />
          </>
        )}
      </AnimatePresence>

      {/* Eye highlights */}
      <circle cx="49" cy="37" r="0.8" fill="white" />
      <circle cx="56" cy="37" r="0.8" fill="white" />

      {/* Mouth */}
      {isTalking ? (
        <motion.ellipse
          cx="51"
          cy="44"
          rx="2.5"
          fill="#7F1D1D"
          initial={{ ry: 1.5 }}
          animate={{ ry: [1, 2, 1] }}
          transition={{ duration: 0.3, repeat: Infinity }}
        />
      ) : (
        <path d="M48 44 Q51 46 54 44" stroke="#7F1D1D" strokeWidth="1.5" fill="none" />
      )}

      {/* Exhaust smoke (VW Beetle has rear engine) */}
      <motion.circle
        cx="4"
        cy="54"
        r="2"
        fill="#CBD5E1"
        animate={{ x: [-2, -8], y: [0, -6], opacity: [0.6, 0], scale: [0.5, 1.5] }}
        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5 }}
      />

      {/* Headlight glow */}
      <motion.circle
        cx="72"
        cy="50"
        r="4"
        fill="#FBBF24"
        animate={{ opacity: [0.3, 0.1, 0.3] }}
        transition={{ duration: 0.8, repeat: Infinity }}
      />
    </svg>
  );
}

export default function VendorAssistant({ isVendor = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(true);
  const location = useLocation();

  // Determine current page context
  const getPageKey = useCallback(() => {
    const path = location.pathname.replace(/^\//, '').split('/')[0];
    if (contextualTips[path]) return path;
    return 'default';
  }, [location.pathname]);

  const pageKey = getPageKey();
  const tips = contextualTips[pageKey];

  // Load saved state
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      setIsHidden(!!saved.hidden);
      setHasSeenWelcome(!!saved.seenWelcome);
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Auto-welcome on first visit
  useEffect(() => {
    if (!hasSeenWelcome && isVendor && !isHidden) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        setHasSeenWelcome(true);
        try {
          const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...saved, seenWelcome: true }));
        } catch {
          // Ignore
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [hasSeenWelcome, isVendor, isHidden]);

  // Reset tip index when page changes
  useEffect(() => {
    setCurrentTipIndex(0);
  }, [pageKey]);

  const handleHide = () => {
    setIsHidden(true);
    setIsOpen(false);
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...saved, hidden: true }));
    } catch {
      // Ignore
    }
  };

  const handleShow = () => {
    setIsHidden(false);
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...saved, hidden: false }));
    } catch {
      // Ignore
    }
  };

  if (!isVendor) return null;

  if (isHidden) {
    return (
      <motion.button
        className="fixed bottom-4 left-4 z-50 w-10 h-10 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center text-gray-400 hover:text-red-600 hover:border-red-200 transition-colors"
        onClick={handleShow}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        title="הצג את נתי"
      >
        🚛
      </motion.button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50" dir="rtl">
      {/* Speech Bubble */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="absolute bottom-20 left-0 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-red-50 border-b border-red-100">
              <span className="font-bold text-red-800 text-sm">נתי הגרר</span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tip Content */}
            <div className="p-4 min-h-[100px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${pageKey}-${currentTipIndex}`}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <h4 className="font-bold text-gray-900 text-sm mb-2">
                    {tips[currentTipIndex]?.title}
                  </h4>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {tips[currentTipIndex]?.text}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentTipIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentTipIndex === 0}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="flex gap-1">
                  {tips.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentTipIndex(idx)}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        idx === currentTipIndex ? 'bg-red-500' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setCurrentTipIndex((prev) => Math.min(tips.length - 1, prev + 1))}
                  disabled={currentTipIndex === tips.length - 1}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100">
              <Link to={createPageUrl('VendorGuide')} onClick={() => setIsOpen(false)}>
                <Button size="sm" variant="default" className="gap-1 bg-red-600 hover:bg-red-700">
                  <BookOpen className="w-3.5 h-3.5" />
                  המדריך המלא
                </Button>
              </Link>
              <button
                onClick={handleHide}
                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
              >
                <EyeOff className="w-3 h-3" />
                הסתר
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-16 h-16 rounded-full bg-white shadow-lg border-2 border-red-100 hover:border-red-300 flex items-center justify-center overflow-hidden transition-colors"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <TowTruckSVG isTalking={isOpen} />
      </motion.button>
    </div>
  );
}
