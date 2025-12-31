import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import {
  LayoutDashboard,
  FileText,
  Users,
  Truck,
  Settings,
  Menu,
  X,
  Plus,
  ChevronLeft,
  Phone,
  LogOut,
  User
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { base44 } from '@/api/base44Client';


export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: 'לוח בקרה', href: 'Dashboard', icon: LayoutDashboard },
    { name: 'קריאות שירות', href: 'Cases', icon: FileText },
    { name: 'ניטור תורים', href: 'QueueMonitor', icon: LayoutDashboard },
    { name: 'דוחות', href: 'Reports', icon: FileText },
    { name: 'לקוחות', href: 'Customers', icon: Users },
    { name: 'נותני שירות', href: 'ServiceProviders', icon: Truck },
    { name: 'אוטומציה', href: 'AutomationSettings', icon: Settings },
    { name: 'הגדרות', href: 'Settings', icon: Settings },
  ];

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#FAFAFA]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700&display=swap');
        
        * {
          font-family: 'Heebo', sans-serif;
        }
        
        /* Typography Scale */
        h1 {
          font-size: 32px;
          font-weight: 700;
          color: #0D47A1;
          line-height: 1.2;
        }
        
        h2 {
          font-size: 24px;
          font-weight: 600;
          color: #212121;
          line-height: 1.3;
        }
        
        h3 {
          font-size: 20px;
          font-weight: 500;
          color: #212121;
          line-height: 1.4;
        }
        
        body, .body-1 {
          font-size: 16px;
          font-weight: 400;
          color: #212121;
          line-height: 1.5;
        }
        
        .body-2 {
          font-size: 14px;
          font-weight: 400;
          color: #616161;
          line-height: 1.5;
        }
        
        .caption {
          font-size: 12px;
          font-weight: 400;
          color: #616161;
          line-height: 1.4;
        }
        
        button {
          font-size: 16px;
          font-weight: 500;
          line-height: 1;
        }
        
        /* Scrollbar */
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        ::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #a1a1a1;
        }
        
        /* Card Hover Effect */
        .card-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .card-hover:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          transform: translateY(-2px);
        }
      `}</style>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 right-0 h-full w-64 bg-white border-l border-[#E0E0E0] z-50 transition-transform duration-300 ease-in-out",
        "lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#E0E0E0]">
          <div className="flex items-center gap-3">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6955a04a2de0845ff4cb8a71/36b225264_NatiLogoRGB.png" 
              alt="נתי לוגו" 
              className="h-10 w-auto object-contain"
            />
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5 text-[#616161]" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = currentPageName === item.href;
            return (
              <Link
                key={item.href}
                to={createPageUrl(item.href)}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-[4px] text-base font-medium transition-all duration-200",
                  isActive 
                    ? "bg-[#0078D4] text-white shadow-[0_2px_4px_rgba(0,0,0,0.1)]" 
                    : "text-[#616161] hover:bg-[#FAFAFA] hover:text-[#212121]"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Quick Actions */}
        <div className="absolute bottom-20 left-4 right-4">
          <Link to={createPageUrl('NewCase')}>
            <Button 
              className="w-full bg-[#0078D4] hover:bg-[#1976D2] active:scale-[0.98] text-white gap-2 shadow-[0_2px_4px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_8px_rgba(0,0,0,0.15)] transition-all duration-200 rounded-[4px] px-6 py-2.5"
            >
              <Plus className="w-5 h-5" />
              קריאה חדשה
            </Button>
          </Link>
        </div>

        {/* User Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#E0E0E0]">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-[#616161] hover:text-[#D32F2F] hover:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" />
            התנתק
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:mr-64">
        {/* Top Bar */}
        <header className="sticky top-0 h-16 bg-white border-b border-[#E0E0E0] z-[1100] flex items-center justify-between px-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden w-10 h-10 hover:bg-[rgba(0,0,0,0.04)] active:bg-[rgba(0,0,0,0.08)] transition-colors rounded-full"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6 text-[#616161]" strokeWidth={2} />
            </Button>
            <div className="flex items-center gap-3">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6955a04a2de0845ff4cb8a71/36b225264_NatiLogoRGB.png" 
                alt="נתי" 
                className="h-8 w-auto object-contain lg:hidden"
              />
              <h2 className="text-xl md:text-2xl font-semibold text-[#212121] leading-tight">
                {navigation.find(n => n.href === currentPageName)?.name || 'נתי שירותי דרך'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Emergency Phone */}
            <a 
              href="tel:*6283"
              className="hidden md:flex items-center gap-2 bg-[#E3F2FD] text-[#0078D4] px-4 py-2 rounded-[4px] font-medium text-sm hover:bg-[#BBDEFB] transition-colors"
            >
              <Phone className="w-4 h-4" strokeWidth={2} />
              <span className="font-semibold">*6283</span>
            </a>
            
            {/* User Avatar Placeholder */}
            <div className="w-10 h-10 rounded-full bg-[#0078D4] flex items-center justify-center">
              <User className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}