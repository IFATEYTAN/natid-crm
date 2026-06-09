import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Mail, Lock, Eye, EyeOff, User, Loader2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MODES = {
  BUTTONS: 'buttons',
  EMAIL_LOGIN: 'email_login',
  SIGNUP: 'signup',
  FORGOT: 'forgot',
};

export default function LoginForm({ onSuccess }) {
  const [mode, setMode] = useState(MODES.BUTTONS);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const returnTo = new URLSearchParams(window.location.search).get('returnTo') || '/Dashboard';

  const handleSocialLogin = () => {
    base44.auth.redirectToLogin(returnTo);
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }
    setIsLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      if (onSuccess) onSuccess();
      else window.location.href = returnTo;
    } catch (err) {
      const msg = err?.message || err?.data?.detail || '';
      if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('incorrect')) {
        setError('אימייל או סיסמה שגויים');
      } else {
        setError('שגיאה בהתחברות. נסו שנית.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }
    setIsLoading(true);
    try {
      await base44.auth.register({ email, password, full_name: fullName });
      await base44.auth.loginViaEmailPassword(email, password);
      if (onSuccess) onSuccess();
      else window.location.href = returnTo;
    } catch (err) {
      const msg = err?.message || err?.data?.detail || '';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exists')) {
        setError('אימייל כבר רשום במערכת');
      } else {
        setError('שגיאה בהרשמה. נסו שנית.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setForgotSuccess(false);
    if (!forgotEmail) {
      setError('נא להזין כתובת אימייל');
      return;
    }
    setIsLoading(true);
    try {
      await base44.auth.resetPasswordRequest(forgotEmail);
      setForgotSuccess(true);
    } catch {
      setError('שגיאה בשליחת בקשת איפוס. בדקו את כתובת האימייל.');
    } finally {
      setIsLoading(false);
    }
  };

  const formVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <AnimatePresence mode="wait">
        {/* ===== BUTTONS MODE ===== */}
        {mode === MODES.BUTTONS && (
          <motion.div
            key="buttons"
            variants={formVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-3"
          >
            <button
              onClick={() => handleSocialLogin()}
              className="w-full flex items-center justify-center gap-3 h-12 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors font-medium text-gray-700"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              התחברות עם Google
            </button>

            <button
              onClick={() => setMode(MODES.EMAIL_LOGIN)}
              className="w-full flex items-center justify-center gap-3 h-12 rounded-xl bg-gray-900 text-white hover:bg-gray-800 transition-colors font-medium"
            >
              <Mail className="w-5 h-5" />
              התחברות עם אימייל
            </button>

            <div className="text-center pt-2">
              <button
                onClick={() => setMode(MODES.SIGNUP)}
                className="text-sm text-gray-500 hover:text-red-600 transition-colors"
              >
                אין לך חשבון? <span className="font-semibold underline">הרשמה</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* ===== EMAIL LOGIN MODE ===== */}
        {mode === MODES.EMAIL_LOGIN && (
          <motion.form
            key="email_login"
            variants={formVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onSubmit={handleEmailLogin}
            className="space-y-4"
          >
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                placeholder="אימייל"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-12 pr-11 pl-4 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-right"
              />
            </div>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="סיסמה"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full h-12 pr-11 pl-11 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-right"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {error && <p className="text-red-500 text-sm text-right">{error}</p>}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'התחברות'}
            </Button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => setMode(MODES.FORGOT)}
                className="text-gray-500 hover:text-red-600 transition-colors"
              >
                שכחתי סיסמה
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode(MODES.BUTTONS);
                  setError('');
                }}
                className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ChevronRight className="w-4 h-4 icon-flip-rtl" />
                חזרה
              </button>
            </div>
          </motion.form>
        )}

        {/* ===== SIGNUP MODE ===== */}
        {mode === MODES.SIGNUP && (
          <motion.form
            key="signup"
            variants={formVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onSubmit={handleSignup}
            className="space-y-4"
          >
            <div className="relative">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="שם מלא"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full h-12 pr-11 pl-4 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-right"
              />
            </div>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                placeholder="אימייל"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-12 pr-11 pl-4 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-right"
              />
            </div>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="סיסמה (6 תווים לפחות)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full h-12 pr-11 pl-11 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-right"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {error && <p className="text-red-500 text-sm text-right">{error}</p>}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'הרשמה'}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setMode(MODES.BUTTONS);
                  setError('');
                }}
                className="flex items-center gap-1 mx-auto text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ChevronRight className="w-4 h-4 icon-flip-rtl" />
                חזרה לאפשרויות התחברות
              </button>
            </div>
          </motion.form>
        )}

        {/* ===== FORGOT PASSWORD MODE ===== */}
        {mode === MODES.FORGOT && (
          <motion.form
            key="forgot"
            variants={formVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onSubmit={handleForgotPassword}
            className="space-y-4"
          >
            <p className="text-sm text-gray-600 text-right mb-2">
              הזינו את כתובת האימייל ונשלח לכם קישור לאיפוס הסיסמה
            </p>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                placeholder="אימייל"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                className="w-full h-12 pr-11 pl-4 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-right"
              />
            </div>

            {error && <p className="text-red-500 text-sm text-right">{error}</p>}
            {forgotSuccess && (
              <p className="text-green-600 text-sm text-right">
                קישור לאיפוס סיסמה נשלח לאימייל שלך
              </p>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'שלח קישור איפוס'}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setMode(MODES.EMAIL_LOGIN);
                  setError('');
                  setForgotSuccess(false);
                }}
                className="flex items-center gap-1 mx-auto text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ChevronRight className="w-4 h-4 icon-flip-rtl" />
                חזרה להתחברות
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}