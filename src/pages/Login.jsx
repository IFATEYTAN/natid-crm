import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import FormInput from '@/components/ui/FormInput';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LogIn, ShieldCheck, AlertCircle, ArrowRight, Mail, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import backgroundImage from '@/AdobeStock_328133100.jpeg';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const navigate = useNavigate();
  const { checkAppState } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      // Use Base44 SDK login
      await base44.auth.login({ email, password });

      // Refresh auth state after successful login
      await checkAppState();

      // Navigate to dashboard
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      setError('שם משתמש או סיסמה שגויים');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!email || !email.includes('@')) {
      setError('נא להזין כתובת אימייל תקינה');
      return;
    }

    setIsLoading(true);

    try {
      await base44.auth.resetPasswordRequest(email);
      setSuccessMessage('קישור לאיפוס סיסמה נשלח לכתובת האימייל שלך');
    } catch (err) {
      console.error('Reset password error:', err);
      setError('שגיאה בשליחת בקשה לאיפוס סיסמה. נא לנסות שוב.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleForgotPassword = () => {
    setIsForgotPassword(!isForgotPassword);
    setError('');
    setSuccessMessage('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Gradient Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-soft-900/70 via-primary-soft-800/60 to-neutral-soft-900/75" />
      </div>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 z-0">
        <motion.div
          className="absolute top-20 right-20 w-64 h-64 bg-primary-soft-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-20 left-20 w-96 h-96 bg-secondary-soft-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5]
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-2 sm:pb-4 pt-4 sm:pt-6">
            <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold text-neutral-soft-800 mb-1 sm:mb-2">
              NATI GROUP SERVICE
            </CardTitle>
            <CardDescription className="text-sm sm:text-base text-neutral-soft-600">
              {isForgotPassword ? 'איפוס סיסמה' : 'מערכת ניהול CRM'}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-3 sm:pt-6 px-4 sm:px-6">
            {isForgotPassword ? (
              /* Forgot Password Form */
              <form onSubmit={handleForgotPassword} className="space-y-5">
                {/* Back Button */}
                <button
                  type="button"
                  onClick={toggleForgotPassword}
                  className="flex items-center gap-1 text-primary-soft-600 hover:text-primary-soft-700 text-sm mb-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>חזרה להתחברות</span>
                </button>

                {/* Error Alert */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 p-3 bg-error-soft-50 border border-error-soft-200 rounded-lg text-error-soft-700 text-sm flex-row-reverse"
                  >
                    <span className="text-right flex-1">{error}</span>
                    <AlertCircle className="w-5 h-5" />
                  </motion.div>
                )}

                {/* Success Alert */}
                {successMessage && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 p-3 bg-success-soft-50 border border-success-soft-200 rounded-lg text-success-soft-700 text-sm flex-row-reverse"
                  >
                    <span className="text-right flex-1">{successMessage}</span>
                    <CheckCircle className="w-5 h-5" />
                  </motion.div>
                )}

                <p className="text-neutral-soft-600 text-sm text-right">
                  הזן את כתובת האימייל שלך ונשלח לך קישור לאיפוס הסיסמה
                </p>

                {/* Email Input */}
                <FormInput
                  label="כתובת אימייל"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  disabled={isLoading}
                  className="text-right"
                />

                {/* Send Reset Link Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-primary-soft-600 to-primary-soft-500 hover:from-primary-soft-700 hover:to-primary-soft-600 text-white font-semibold py-6 text-lg rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>שולח...</span>
                    </>
                  ) : (
                    <>
                      <span>שלח קישור לאיפוס</span>
                      <Mail className="w-5 h-5" />
                    </>
                  )}
                </Button>
              </form>
            ) : (
              /* Login Form */
              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-5">
                {/* Error Alert */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 p-3 bg-error-soft-50 border border-error-soft-200 rounded-lg text-error-soft-700 text-sm flex-row-reverse"
                  >
                    <span className="text-right flex-1">{error}</span>
                    <AlertCircle className="w-5 h-5" />
                  </motion.div>
                )}

                {/* Email Input */}
                <FormInput
                  label="שם משתמש / אימייל"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  disabled={isLoading}
                  className="text-right"
                />

                {/* Password Input */}
                <FormInput
                  label="סיסמה"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  className="text-right"
                />

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between text-sm flex-row-reverse">
                  <label className="flex items-center gap-2 cursor-pointer flex-row-reverse">
                    <span className="text-neutral-soft-600">זכור אותי</span>
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-neutral-soft-300 text-primary-soft-600 focus:ring-primary-soft-500"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={toggleForgotPassword}
                    className="text-primary-soft-600 hover:text-primary-soft-700 hover:underline bg-transparent border-0 p-0 cursor-pointer text-sm"
                  >
                    שכחתי סיסמה
                  </button>
                </div>

                {/* Login Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-primary-soft-600 to-primary-soft-500 hover:from-primary-soft-700 hover:to-primary-soft-600 text-white font-semibold py-4 sm:py-6 text-base sm:text-lg rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 sm:gap-3"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>מתחבר...</span>
                    </>
                  ) : (
                    <>
                      <span>כניסה למערכת</span>
                      <LogIn className="w-5 h-5" />
                    </>
                  )}
                </Button>
              </form>
            )}

            {/* Security Badge */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-4 sm:mt-6 flex items-center justify-center gap-2 text-xs text-neutral-soft-500 flex-row-reverse"
            >
              <span>חיבור מאובטח</span>
              <ShieldCheck className="w-4 h-4 text-success-soft-500" />
            </motion.div>
          </CardContent>
        </Card>

        {/* Footer Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-4 sm:mt-6 text-center text-white/90 text-xs sm:text-sm"
        >
          <p className="font-medium mb-1">שירותי סיוע בדרכים מקצועיים</p>
          <p className="text-white/70 text-xs">זמינים 24/7 לשירותכם</p>
        </motion.div>
      </motion.div>

      {/* Decorative Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0 z-0">
        <svg
          className="w-full h-32 opacity-10"
          viewBox="0 0 1440 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 0L60 10C120 20 240 40 360 46.7C480 53 600 47 720 43.3C840 40 960 40 1080 46.7C1200 53 1320 67 1380 73.3L1440 80V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V0Z"
            fill="white"
          />
        </svg>
      </div>
    </div>
  );
}
