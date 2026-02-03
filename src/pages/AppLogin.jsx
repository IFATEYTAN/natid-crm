import React from 'react';
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { ArrowLeft, Truck, ShieldCheck, Clock } from "lucide-react";

export default function AppLogin() {
  const handleLogin = async () => {
    // Redirects to the Base44 login flow (Google/Email)
    // After login, it will return to the dashboard
    await base44.auth.redirectToLogin('/Dashboard');
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white overflow-hidden" dir="rtl">
      
      {/* Right Side - Content & Login */}
      <div className="w-full md:w-1/2 lg:w-[40%] flex flex-col items-center justify-center p-8 md:p-12 relative z-10">
        <div className="w-full max-w-md space-y-8">
          
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6955a04a2de0845ff4cb8a71/36b225264_NatiLogoRGB.png" 
              alt="Nati Group" 
              className="h-16 md:h-20 object-contain"
            />
          </div>

          <div className="text-center space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
              ברוכים הבאים
            </h1>
            <p className="text-gray-500 text-lg">
              מערכת ניהול שירותי דרך וגרירה
            </p>
          </div>

          {/* Login Button */}
          <div className="pt-8 space-y-6">
            <Button 
              onClick={handleLogin}
              className="w-full h-14 text-lg bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-3 group"
            >
              <span>כניסה למערכת</span>
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </Button>

            <div className="text-center">
              <p className="text-sm text-gray-400">
                הכניסה מאובטחת באמצעות Base44
              </p>
            </div>
          </div>

          {/* Features / Badges */}
          <div className="grid grid-cols-3 gap-4 pt-12 border-t border-gray-100 mt-12">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <Truck className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-gray-600">ניהול צי</span>
            </div>
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-gray-600">זמינות 24/7</span>
            </div>
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-gray-600">אבטחת מידע</span>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="absolute bottom-6 text-center w-full text-xs text-gray-300">
          © {new Date().getFullYear()} Nati Group Service. כל הזכויות שמורות.
        </div>
      </div>

      {/* Left Side - Image/Background */}
      <div className="hidden md:block w-1/2 lg:w-[60%] relative bg-gray-900 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900/80 to-transparent z-10 mix-blend-multiply" />
        <div className="absolute inset-0 bg-blue-900/20 z-10 mix-blend-overlay" />
        
        <img 
          src="https://images.unsplash.com/photo-1597561845610-ac3b5c46b107?q=80&w=2000&auto=format&fit=crop" 
          alt="Road Service" 
          className="w-full h-full object-cover opacity-90"
        />

        <div className="absolute bottom-12 right-12 z-20 text-white max-w-lg">
          <h2 className="text-4xl font-bold mb-4 leading-tight">
            שירות מקצועי בדרכים
          </h2>
          <p className="text-gray-200 text-lg leading-relaxed">
            מערכת מתקדמת לניהול קריאות שירות, ספקים ולקוחות בזמן אמת.
            הפתרון המקיף לניהול מערך השירות בדרכים.
          </p>
        </div>
      </div>
    </div>
  );
}