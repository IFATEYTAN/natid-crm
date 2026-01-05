import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import {
  Menu,
  X,
  Plus,
  LogOut,
  ChevronDown,
  ChevronLeft
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { base44 } from '@/api/base44Client';
import AccessibilityWidget from '@/components/AccessibilityWidget';
import backgroundImage from '@/AdobeStock_328133100.jpeg';

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({ 'תפעול יומי': true });

  if (currentPageName === 'SignIn' || currentPageName === 'Register') {
    return children;
  }

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (e) {
        // User not logged in
      }
    };
    fetchUser();
  }, []);

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0];
    }
    return name.substring(0, 2);
  };

  const toggleGroup = (title) => {
    setExpandedGroups(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const navigationGroups = [
    {
      title: 'תפעול יומי',
      items: [
        { name: 'לוח בקרה', href: 'Dashboard' },
        { name: 'ניטור תורים', href: 'QueueMonitor' },
        { name: 'מפת ספקים', href: 'AllVendorsMap' },
        { name: 'אזורי כיסוי', href: 'CoverageAreas' },
      ]
    },
    {
      title: 'ניהול ונתונים',
      items: [
        { name: 'דוחות', href: 'Reports' },
        { name: 'לקוחות', href: 'Customers' },
        { name: 'נותני שירות', href: 'ServiceProviders' },
        { name: 'פורטל ספקים', href: 'VendorPortal' },
      ]
    },
    {
      title: 'מערכת',
      items: [
        { name: 'ניהול משתמשים', href: 'UserManagement' },
        { name: 'אוטומציה', href: 'AutomationSettings' },
        { name: 'אינטגרציות CRM', href: 'IntegrationSettings' },
        { name: 'הגדרות התראות', href: 'NotificationSettings' },
        { name: 'הגדרות מערכת', href: 'Settings' },
      ]
    }
  ];

  const handleLogout = async () => {
    await base44.auth.logout('/SignIn');
  };

  return (
    <div dir="rtl" className="min-h-screen relative flex">
      {/* Background - Clean Gradient */}
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-gray-50 to-gray-100" />

      {/* Content Container - z-index to stay above background */}
      <div className="relative z-10 w-full flex">
        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar - Glassmorphism */}
        <aside className={cn(
          "fixed top-0 right-0 h-full w-64 bg-white/80 backdrop-blur-md border-l border-white/40 shadow-xl z-50 transition-transform duration-300 ease-in-out",
          "lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}>
          {/* Logo */}
          <div className="h-20 flex items-center justify-between px-6 border-b border-gray-100/50">
            <div className="flex items-center gap-3">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6955a04a2de0845ff4cb8a71/36b225264_NatiLogoRGB.png" 
                alt="נתי" 
                className="h-14 w-auto object-contain drop-shadow-sm"
              />
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5 text-gray-500" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-180px)]">
            {navigationGroups.map((group, groupIdx) => (
              <div key={groupIdx} className="mb-2">
                <button
                  onClick={() => toggleGroup(group.title)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
                >
                  <span>{group.title}</span>
                  {expandedGroups[group.title] ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronLeft className="w-3 h-3" />
                  )}
                </button>
                
                {expandedGroups[group.title] && (
                  <div className="space-y-1 mt-1">
                    {group.items.map((item) => {
                      const isActive = currentPageName === item.href;
                      return (
                        <Link
                          key={item.href}
                          to={createPageUrl(item.href)}
                          onClick={() => setSidebarOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-4 py-2.5 rounded-lg text-[15px] font-medium transition-all duration-200",
                            isActive 
                              ? "bg-gradient-to-l from-red-50 to-transparent text-[var(--color-primary)] border-r-2 border-[var(--color-primary)]" 
                              : "text-gray-600 hover:bg-gray-50/80 hover:text-gray-900"
                          )}
                        >
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* User Section */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100/50 bg-white/50 backdrop-blur-sm">
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 text-gray-600 hover:text-red-600 hover:bg-red-50/50"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5" />
              התנתק
            </Button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 lg:mr-64 min-h-screen flex flex-col">
          {/* Top Bar - Glassmorphism */}
          <header className="sticky top-0 h-20 bg-white/80 backdrop-blur-md border-b border-white/40 z-30 flex items-center justify-between px-8 shadow-sm">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                className="lg:hidden w-10 h-10 rounded-full bg-white/50 hover:bg-white/80"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-6 h-6 text-gray-600" strokeWidth={2} />
              </Button>
              <div className="lg:hidden">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6955a04a2de0845ff4cb8a71/36b225264_NatiLogoRGB.png" 
                  alt="נתי" 
                  className="h-10 w-auto object-contain"
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              {/* Quick Action Button in Header */}
              <Link to={createPageUrl('NewCase')} className="hidden sm:block">
                <Button 
                  className="btn-primary flex items-center gap-2 shadow-lg shadow-red-500/20"
                >
                  <Plus className="w-5 h-5" />
                  קריאה חדשה
                </Button>
              </Link>

              {/* User Profile */}
              <div className="flex items-center gap-3 pl-2 border-r border-gray-200 pr-6 mr-2">
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-semibold text-gray-800 leading-none">
                    {currentUser?.full_name || 'משתמש'}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1 leading-none">
                    {currentUser?.email}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-white border-2 border-white shadow-sm flex items-center justify-center overflow-hidden ring-1 ring-gray-100">
                  {currentUser?.profile_image ? (
                    <img 
                      src={currentUser.profile_image} 
                      alt={currentUser.full_name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-500 text-sm font-bold">
                      {getInitials(currentUser?.full_name)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="p-6 md:p-8 flex-1 overflow-x-hidden">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
          
          <AccessibilityWidget />
        </div>
      </div>
    </div>
  );
}