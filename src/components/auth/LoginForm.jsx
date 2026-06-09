import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Mail, LogIn, PlayCircle } from 'lucide-react';

export default function LoginForm() {
  const returnTo = new URLSearchParams(window.location.search).get('returnTo') || '/Dashboard';

  // All login/signup/password-reset is handled by the official platform login flow.
  // This avoids broken manual email/password flows and invalid reset links.
  const handleLogin = () => {
    base44.auth.redirectToLogin(returnTo);
  };

  // Enter demo mode: activates mock-data mode and lands on the dashboard.
  const handleDemoLogin = () => {
    window.location.href = '/Dashboard?demo=true';
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-3"
      >
        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 h-12 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors font-semibold"
        >
          <LogIn className="w-5 h-5" />
          התחברות / הרשמה
        </button>

        <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1.5">
          <Mail className="w-3.5 h-3.5" />
          התחברות מאובטחת עם אימייל או Google
        </p>

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-xs text-gray-400">או</span>
          </div>
        </div>

        <button
          onClick={handleDemoLogin}
          className="w-full flex items-center justify-center gap-2 h-12 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors font-medium text-blue-700"
        >
          <PlayCircle className="w-5 h-5" />
          כניסה למצב הדגמה
        </button>
        <p className="text-center text-xs text-gray-400">
          סיור במערכת עם נתונים לדוגמה — ללא צורך בהתחברות
        </p>
      </motion.div>
    </div>
  );
}