import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Shield, Headset, MapPin, Clock, Truck, BarChart3, Zap, CheckCircle } from 'lucide-react';

const getLoginUrl = (next) => {
  const appBaseUrl = window.location.origin; // always use current app origin
  const nextUrl = next || `${appBaseUrl}/Dashboard`;
  return `${appBaseUrl}/login?from_url=${encodeURIComponent(nextUrl)}`;
};

const unregisterServiceWorkers = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    } catch {
      // Ignore SW cleanup errors
    }
  }
};

const features = [
  { icon: Headset, title: 'מוקד חכם', desc: 'ניהול קריאות שירות בזמן אמת' },
  { icon: Truck, title: 'שיבוץ אוטומטי', desc: 'התאמת ספק אופטימלית לכל קריאה' },
  { icon: MapPin, title: 'מעקב GPS', desc: 'מיקום ספקים בזמן אמת על המפה' },
  { icon: Clock, title: 'ETA מדויק', desc: 'חישוב זמן הגעה חכם ללקוח' },
  { icon: BarChart3, title: 'דוחות מתקדמים', desc: 'ניתוח ביצועים ומגמות' },
  { icon: Shield, title: 'אבטחה מלאה', desc: 'הרשאות לפי תפקיד ויומן פעולות' },
];

const stats = [
  { value: '24/7', label: 'זמינות מערכת' },
  { value: 'GPS', label: 'מעקב בזמן אמת' },
  { value: 'AI', label: 'שיבוץ חכם' },
  { value: 'SMS', label: 'עדכונים אוטומטיים' },
];

function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 500 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-lg"
    >
      <motion.g
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <motion.circle
          cx="250"
          cy="200"
          r="160"
          fill="#FEE2E2"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.g>
      <motion.g
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
      >
        <motion.circle
          cx="250"
          cy="200"
          r="120"
          fill="#FECACA"
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />
      </motion.g>
      <motion.path
        d="M50 300 Q150 280 250 290 Q350 300 450 280"
        stroke="#94A3B8"
        strokeWidth="30"
        strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, delay: 0.5 }}
      />
      <motion.path
        d="M80 298 Q180 278 250 288 Q320 298 420 278"
        stroke="#F8FAFC"
        strokeWidth="2"
        strokeDasharray="12 8"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, delay: 0.8 }}
      />
      <motion.g
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 1, delay: 1.2, ease: 'easeOut' }}
      >
        <motion.g
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <rect x="140" y="240" width="80" height="40" rx="4" fill="#DC2626" />
          <rect x="220" y="250" width="40" height="30" rx="3" fill="#B91C1C" />
          <rect x="224" y="253" width="20" height="16" rx="2" fill="#BFDBFE" />
          <motion.line
            x1="155"
            y1="240"
            x2="130"
            y2="200"
            stroke="#7F1D1D"
            strokeWidth="4"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 1.8 }}
          />
          <motion.line
            x1="130"
            y1="200"
            x2="160"
            y2="200"
            stroke="#7F1D1D"
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3, delay: 2.1 }}
          />
          <motion.path
            d="M160 200 L160 215 Q160 220 155 220 Q150 220 150 215"
            stroke="#7F1D1D"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3, delay: 2.3 }}
          />
          <circle cx="170" cy="283" r="10" fill="#1E293B" />
          <circle cx="170" cy="283" r="4" fill="#94A3B8" />
          <circle cx="240" cy="283" r="10" fill="#1E293B" />
          <circle cx="240" cy="283" r="4" fill="#94A3B8" />
          <text
            x="165"
            y="265"
            fill="white"
            fontSize="11"
            fontWeight="bold"
            fontFamily="Heebo, sans-serif"
          >
            NatID
          </text>
        </motion.g>
      </motion.g>
      <motion.g
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.6, type: 'spring', bounce: 0.5 }}
      >
        <path d="M370 230 Q370 210 385 200 Q400 210 400 230 L385 260 Z" fill="#DC2626" />
        <circle cx="385" cy="222" r="7" fill="white" />
      </motion.g>
      <motion.circle
        cx="385"
        cy="230"
        r="15"
        stroke="#DC2626"
        strokeWidth="2"
        fill="none"
        initial={{ scale: 1, opacity: 0.8 }}
        animate={{ scale: 2.5, opacity: 0 }}
        transition={{ duration: 2, repeat: Infinity, delay: 2 }}
      />
      <motion.g
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <rect
          x="310"
          y="100"
          width="90"
          height="55"
          rx="12"
          fill="white"
          stroke="#E2E8F0"
          strokeWidth="2"
        />
        <polygon points="340,155 330,170 350,155" fill="white" stroke="#E2E8F0" strokeWidth="2" />
        <polygon points="340,155 330,167 350,155" fill="white" />
        <rect x="325" y="115" width="60" height="4" rx="2" fill="#CBD5E1" />
        <rect x="325" y="125" width="45" height="4" rx="2" fill="#CBD5E1" />
        <rect x="325" y="135" width="50" height="4" rx="2" fill="#CBD5E1" />
        <circle cx="335" cy="180" r="16" fill="#1E40AF" />
        <path
          d="M327 176 Q327 168 335 168 Q343 168 343 176"
          stroke="white"
          strokeWidth="2"
          fill="none"
        />
        <rect x="325" y="175" width="5" height="8" rx="2" fill="white" />
        <rect x="340" y="175" width="5" height="8" rx="2" fill="white" />
      </motion.g>
      <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }}>
        <motion.path
          d="M200 230 Q205 220 210 230"
          stroke="#DC2626"
          strokeWidth="2"
          fill="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <motion.path
          d="M195 222 Q205 208 215 222"
          stroke="#DC2626"
          strokeWidth="1.5"
          fill="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
        />
      </motion.g>
    </svg>
  );
}

export default function LandingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (e) {
        // Not logged in
      }
    };
    checkAuth();

    const link = document.createElement('link');
    link.href =
      'https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  const handleLogin = async () => {
    setIsLoading(true);
    await unregisterServiceWorkers();

    // Clean local/session tokens just in case
    try {
      localStorage.removeItem('base44_access_token');
      localStorage.removeItem('token');
      sessionStorage.clear();
    } catch {}

    // Always navigate the TOP window to the platform login (works inside editor iframe)
    const loginUrl = getLoginUrl();
    (window.top || window).location.href = loginUrl;
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white"
      style={{ fontFamily: "'Heebo', sans-serif" }}
    >
      <motion.header
        className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100"
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">NatID 360 Control</span>
          </div>
          {user ? (
            <Link
              to="/Dashboard"
              className="px-6 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              חזרה לדשבורד
            </Link>
          ) : (
            <a
              href={getLoginUrl()}
              target="_top"
              className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              onClick={() => setIsLoading(true)}
            >
              כניסה למערכת
            </a>
          )}
        </div>
      </motion.header>

      <section className="pt-24 pb-8 md:pt-28 md:pb-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
                ניהול קריאות שירות <span className="text-red-600">חכם ומהיר</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-600 leading-relaxed mb-8 max-w-xl">
                מערכת CRM מתקדמת לניהול קריאות שירות, שיבוץ ספקים אוטומטי, מעקב GPS בזמן אמת, ודוחות
                ביצועים מקיפים.
              </p>

              <div className="grid grid-cols-4 gap-4 mt-8">
                {stats.map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    className="text-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 + i * 0.1 }}
                  >
                    <p className="text-2xl font-bold text-red-600">{stat.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            <motion.div
              className="flex justify-center lg:justify-start"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <HeroIllustration />
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-10 md:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">הכל במקום אחד</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              כל הכלים שצריך לניהול מוקד שירות מקצועי ויעיל
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-red-100 transition-all group"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-red-100 transition-colors">
                  <feature.icon className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-500">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>



      <footer className="py-8 border-t border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6955a04a2de0845ff4cb8a71/94c28994a_image.png" 
            alt="Nati Road Services" 
            className="h-10 md:h-12 w-auto object-contain"
          />
          <p className="text-gray-500 text-sm font-medium">מערכת ניהול קריאות שירות מתקדמת</p>
        </div>
      </footer>
    </div>
  );
}