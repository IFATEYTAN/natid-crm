import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Mail, LogIn } from 'lucide-react';

export default function LoginForm() {
  const returnTo = new URLSearchParams(window.location.search).get('returnTo') || '/Dashboard';

  // All login/signup/password-reset is handled by the official platform login flow.
  // This avoids broken manual email/password flows and invalid reset links.
  const handleLogin = () => {
    base44.auth.redirectToLogin(returnTo);
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
      </motion.div>
    </div>
  );
}
