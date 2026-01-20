import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function Register() {
  const navigate = useNavigate();

  useEffect(() => {
    // Attempt automatic redirect after a short delay
    const timer = setTimeout(() => {
        navigate('/AuthLogin');
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleManualRedirect = () => {
    navigate('/AuthLogin');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-6 p-4" dir="rtl">
      <div className="text-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto" />
        <h2 className="text-xl font-semibold text-gray-900">מעביר למסך ההתחברות...</h2>
        <p className="text-gray-600">אנא המתן מספר שניות</p>
      </div>
      
      <div className="text-center bg-white p-6 rounded-lg shadow-sm border border-gray-200 max-w-sm w-full">
        <p className="text-sm text-gray-600 mb-4">אם אינך מועבר אוטומטית:</p>
        <Button onClick={handleManualRedirect} className="w-full bg-blue-600 hover:bg-blue-700">
          לחץ כאן למעבר להרשמה / התחברות
        </Button>
      </div>
    </div>
  );
}