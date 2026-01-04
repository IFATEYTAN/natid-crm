import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import FormInput from '@/components/ui/FormInput';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LogIn, ShieldCheck, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import backgroundImage from '@/AdobeStock_328133100.jpeg';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { checkAppState } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await base44.auth.login({ email, password });
      await checkAppState();
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      setError('שם משתמש או סיסמה שגויים');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" dir="rtl">
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
        <div className="absolute inset-0 bg-gradient-to-br from-primary-soft-900/60 via-primary-soft-800/50 to-neutral-soft-900/60" />
      </div>

      {/* Animated Background Elements - Reduced opacity */}
      <div className="absolute inset-0 z-0">
        <motion.div
          className="absolute top-20 right-20 w-64 h-64 bg-primary-soft-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2]
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
            opacity: [0.4, 0.2, 0.4]
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
        className="relative z-10 w-full max-w-[340px] mx-4" 
      >
        <Card className="border-0 shadow-xl bg-white/85 backdrop-blur-sm"> 
          <CardHeader className="text-center pb-2 pt-6 px-4">
            <CardTitle className="text-xl font-bold text-neutral-soft-800 mb-1">
              NATI GROUP SERVICE
            </CardTitle>
            <CardDescription className="text-xs text-neutral-soft-600">
              מערכת ניהול CRM
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2 px-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Alert */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 p-2 bg-error-soft-50 border border-error-soft-200 rounded-lg text-error-soft-700 text-xs flex-row-reverse"
                >
                  <span className="text-right flex-1">{error}</span>
                  <AlertCircle className="w-4 h-4" />
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
                className="text-right h-10 text-sm"
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
                className="text-right h-10 text-sm"
              />

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-xs flex-row-reverse mt-2">
                <label className="flex items-center gap-2 cursor-pointer flex-row-reverse">
                  <span className="text-neutral-soft-600">זכור אותי</span>
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 rounded border-neutral-soft-300 text-primary-soft-600 focus:ring-primary-soft-500"
                  />
                </label>
                <button 
                  type="button"
                  onClick={() => base44.auth.redirectToLogin()}
                  className="text-primary-soft-600 hover:text-primary-soft-700 hover:underline bg-transparent border-none p-0 cursor-pointer"
                >
                  שכחתי סיסמה
                </button>
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-primary-soft-600 to-primary-soft-500 hover:from-primary-soft-700 hover:to-primary-soft-600 text-white font-semibold py-5 text-sm rounded-lg shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>מתחבר...</span>
                  </>
                ) : (
                  <>
                    <span>כניסה למערכת</span>
                  </>
                )}
              </Button>
              
              <div className="text-center mt-4 text-xs text-neutral-soft-600">
                <span>עדיין אין לך חשבון? </span>
                <button 
                  type="button"
                  onClick={() => base44.auth.redirectToLogin()} 
                  className="text-primary-soft-600 hover:text-primary-soft-700 font-semibold hover:underline bg-transparent border-none p-0 cursor-pointer"
                >
                  הרשמה למערכת
                </button>
              </div>
            </form>

            {/* Security Badge */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-neutral-soft-500 flex-row-reverse"
            >
              <span>חיבור מאובטח</span>
              <ShieldCheck className="w-3 h-3 text-success-soft-500" />
            </motion.div>
          </CardContent>
        </Card>

        {/* Footer Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-4 text-center text-white/90 text-xs"
        >
          <p className="font-medium mb-0.5">שירותי סיוע בדרכים מקצועיים</p>
          <p className="text-white/70 text-[10px]">זמינים 24/7 לשירותכם</p>
        </motion.div>
      </motion.div>

      {/* Decorative Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0 z-0">
        <svg
          className="w-full h-24 opacity-10"
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