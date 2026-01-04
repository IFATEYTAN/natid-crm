import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

export default function Register() {
  useEffect(() => {
    base44.auth.redirectToLogin();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
        <p className="text-lg text-gray-600">מעביר להרשמה...</p>
      </div>
    </div>
  );
}