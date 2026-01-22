import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import {
  Menu,
  X,
  Plus,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Bell
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { cn } from "@/lib/utils";
import { base44 } from '@/api/base44Client';
import AccessibilityWidget from '@/components/AccessibilityWidget';
import InstallPrompt from '@/components/pwa/InstallPrompt';
import OfflineIndicator from '@/components/pwa/OfflineIndicator';
import UpdatePrompt from '@/components/pwa/UpdatePrompt';
import { NotificationPermissionBanner } from '@/components/notifications/PushNotifications';
import { ConnectionStatusIndicator } from '@/components/useRealtimeUpdates';
import { Toaster } from 'sonner';
import anime from 'animejs';

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const mainContentRef = useRef(null);
  const queryClient = useQueryClient();

  // Fetch Notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', currentUser?.id],
    queryFn: () => base44.entities.Notification.filter({ user_id: currentUser.id }, '-created_at', 20),
    enabled: !!currentUser?.id,
    refetchInterval: 30000
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }
    // Link handling handled by Link component
  };

  // Initialize with the first group expanded ("תפעול יומי")
  const [expandedGroups, setExpandedGroups] = useState({ 'תפעול יומי': true });

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

  useEffect(() => {
    if (mainContentRef.current) {
      anime({
        targets: mainContentRef.current,
        opacity: [0, 1],
        translateY: [10, 0],
        duration: 600,
        easing: 'easeOutQuad'
      });
    }
  }, [currentPageName]);

  // Don't wrap auth pages in the main layout
  if (currentPageName === 'SignIn' || currentPageName === 'Register' || currentPageName === 'AuthLogin' || currentPageName === 'Login') {
    return children;
  }

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
        { name: 'הפרופיל שלי', href: 'MyVendorProfile' },
        ]
        },
    {
      title: 'כלים',
      items: [
        { name: 'סוכנים', href: 'Agents' },
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
    await base44.auth.logout('/AuthLogin');
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
          color: #212121;
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
              alt="נתי" 
              className="h-12 w-auto object-contain"
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
        <nav className="p-4 space-y-2">
          {navigationGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="mb-2">
              <button
                onClick={() => toggleGroup(group.title)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-[#9E9E9E] uppercase tracking-wider hover:bg-gray-50 rounded transition-colors"
              >
                <span>{group.title}</span>
                {expandedGroups[group.title] ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
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
                          "flex items-center gap-3 px-3 py-2 rounded-[4px] text-[15px] font-medium transition-all duration-200",
                          isActive 
                            ? "bg-[#F5F5F5] text-[#212121] shadow-sm border border-[#E0E0E0]" 
                            : "text-[#424242] hover:bg-[#FAFAFA] hover:text-[#212121]"
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

        {/* Quick Actions */}
        <div className="absolute bottom-20 left-4 right-4">
          <Link to={createPageUrl('NewCase')}>
            <Button 
              className="w-full bg-[#FF0000] hover:bg-[#CC0000] active:scale-[0.98] text-white gap-2 shadow-[0_2px_4px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_8px_rgba(0,0,0,0.15)] transition-all duration-200 rounded-[4px] px-6 py-2.5 font-bold"
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
        <header className="sticky top-0 h-16 bg-white border-b border-[#E0E0E0] z-30 flex items-center justify-between px-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
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
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5 text-[#616161]" />
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                  <h4 className="font-semibold text-sm">התראות</h4>
                  <span className="text-xs text-gray-500">{unreadCount} חדשות</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-sm">
                      אין התראות חדשות
                    </div>
                  ) : (
                    notifications.map(notification => (
                      <Link 
                        key={notification.id} 
                        to={notification.link ? createPageUrl(notification.link.replace(/^\//, '')) : '#'}
                        onClick={() => handleNotificationClick(notification)}
                        className={cn(
                          "block p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors text-right",
                          !notification.is_read && "bg-blue-50/50"
                        )}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs text-gray-400">
                            {format(parseISO(notification.created_at), 'HH:mm')}
                          </span>
                          {!notification.is_read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full mt-1" />
                          )}
                        </div>
                        <h5 className={cn("text-sm font-medium mb-1", !notification.is_read ? "text-blue-700" : "text-gray-900")}>
                          {notification.title}
                        </h5>
                        <p className="text-xs text-gray-500 line-clamp-2">
                          {notification.message}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* User Profile - Clean Design */}
            <div className="flex items-center gap-3 pl-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-[#212121] leading-none">
                  {currentUser?.full_name || 'משתמש'}
                </p>
                <p className="text-[11px] text-[#616161] mt-1 leading-none">
                  {currentUser?.email}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#F5F5F5] border border-[#E0E0E0] flex items-center justify-center overflow-hidden">
                {currentUser?.profile_image ? (
                  <img 
                    src={currentUser.profile_image} 
                    alt={currentUser.full_name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[#616161] text-xs font-medium">
                    {getInitials(currentUser?.full_name)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Notification Permission Banner */}
        <NotificationPermissionBanner />

        {/* Page Content */}
        <main ref={mainContentRef} className="p-4 md:p-6">
          {children}
        </main>

        <AccessibilityWidget />

        {/* PWA Components */}
        <InstallPrompt />
        <OfflineIndicator />
        <UpdatePrompt />

        {/* Connection Status (bottom left) */}
        <div className="fixed bottom-4 left-4 z-40">
          <ConnectionStatusIndicator />
        </div>
        <Toaster position="top-center" richColors />
        </div>
    </div>
  );
}