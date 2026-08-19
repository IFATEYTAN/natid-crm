import { useState } from 'react';
import { motion } from 'framer-motion';
import { LogIn, Loader2 } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginForm() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password || isSubmitting) return;

    setError('');
    setIsSubmitting(true);
    try {
      // Success flips isAuthenticated in AuthProvider; AuthenticatedApp
      // re-renders into the main app on its own — no navigation needed here.
      await login(username.trim(), password);
    } catch (err) {
      setError(err.message || 'שגיאה בהתחברות. נסה שוב מאוחר יותר');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-3"
        dir="rtl"
        noValidate
      >
        <div className="space-y-1.5 text-right">
          <Label htmlFor="login-username">שם משתמש</Label>
          <Input
            id="login-username"
            name="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="space-y-1.5 text-right">
          <Label htmlFor="login-password">סיסמה</Label>
          <Input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600 text-center">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-3 h-12 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <LogIn className="w-5 h-5" />
          )}
          התחברות
        </button>
      </motion.form>
    </div>
  );
}
