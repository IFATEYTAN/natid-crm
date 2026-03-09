import { lazyRetry } from '@/lib/lazyRetry';
import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Menu, X, LogOut, ChevronDown, ChevronRight, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { cn } from '@/components/utils';

const queryKeys = {
  notifications: {
    all: () => ['notifications'],
    byUser: (userId) => ['notifications', 'user', userId],
  },
};
import { base44 } from '@/api/base44Client';
import { usePermissions, PermissionsProvider } from '@/components/permissions/PermissionsContext';

// Lazy-load AccessibilityWidget
const AccessibilityWidget = lazyRetry(() => import('@/components/AccessibilityWidget'));
const NatiAssistant = lazyRetry(() => import('@/components/NatiAssistant'));
// Lazy-load PWA and status widgets to reduce main bundle size
const InstallPrompt = lazyRetry(() => import('@/components/pwa/InstallPrompt'));
const OfflineIndicator = lazyRetry(() => import('@/components/pwa/OfflineIndicator'));
const UpdatePrompt = lazyRetry(() => import('@/components/pwa/UpdatePrompt'));
const NotificationPermissionBanner = lazyRetry(() =>
  import('@/components/notifications/PushNotifications').then((m) => ({
    default: m.NotificationPermissionBanner,
  }))
);
const ConnectionStatusIndicator = lazyRetry(() =>
  import('@/components/useRealtimeUpdates').then((m) => ({ default: m.ConnectionStatusIndicator }))
);

// Lazy Toaster to reduce main bundle
const ToasterLazy = lazyRetry(() => import('sonner').then((m) => ({ default: m.Toaster })));

function LayoutContent({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const {
    currentUser,
    canAccessPage,
    isLoading: isLoadingAuth,
    effectiveRoleName,
  } = usePermissions();
  const mainContentRef = useRef(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const hasRedirected = useRef(false);

  // Fetch Notifications - only when user is authenticated
  const { data: notifications = [] } = useQuery({
    queryKey: queryKeys.notifications.byUser(currentUser?.id),
    queryFn: async () => {
      if (!currentUser?.id) return [];
      return base44.entities.Notification.filter({ user_id: currentUser.id }, '-created_at', 20);
    },
    enabled: !!currentUser?.id && !isLoadingAuth,
    refetchInterval: 30000,
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    },
  });

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }
  };

  // Initialize with all groups expanded so menu items are visible
  const [expandedGroups, setExpandedGroups] = useState({
    'תפעול יומי': true,
    'ניהול ספקים': true,
    'צי רכב': true,
    'כלכלה ותשלומים': true,
    'ניהול ונתונים': true,
    כלים: true,
    מערכת: true,
  });

  useEffect(() => {
    document.title = 'NatID 360 Control'; // Set system name
  }, []);

  // Redirect unauthenticated users to LandingPage
  useEffect(() => {
    if (!isLoadingAuth && !currentUser && currentPageName !== 'LandingPage') {
      navigate('/LandingPage');
    }
  }, [isLoadingAuth, currentUser, currentPageName, navigate]);

  // Redirect authenticated users away from LandingPage to Dashboard
  useEffect(() => {
    if (!isLoadingAuth && currentUser && currentPageName === 'LandingPage') {
      navigate(createPageUrl('Dashboard'), { replace: true });
    }
  }, [isLoadingAuth, currentUser, currentPageName, navigate]);

  // Reset redirect flag when page changes
  useEffect(() => {
    hasRedirected.current = false;
  }, [currentPageName]);

  // Auto-redirect when user lands on a page they cannot access
  useEffect(() => {
    if (isLoadingAuth || !currentUser || hasRedirected.current) return;
    if (currentPageName === 'LandingPage') return;

    if (!canAccessPage(currentPageName)) {
      hasRedirected.current = true;
      // Find the first accessible page – covers all roles
      const fallbackPages = [
        'Dashboard',
        'Calls',
        'QueueMonitor',
        'Calendar',
        'VendorPortal',
        'VendorCallManagement',
        'UserProfile',
        'FormView',
      ];
      const firstAccessible = fallbackPages.find((p) => canAccessPage(p));
      if (firstAccessible) {
        navigate(createPageUrl(firstAccessible), { replace: true });
      } else {
        navigate(createPageUrl('UserProfile'), { replace: true });
      }
    }
  }, [isLoadingAuth, currentUser, currentPageName, canAccessPage, navigate]);

  // Auto-redirect when visiting /login (builder preview link) to the official Base44 login flow
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (path === '/login' || path.endsWith('/login')) {
        const params = new URLSearchParams(window.location.search);
        const next = params.get('from_url') || params.get('next') || '/Dashboard';
        base44.auth.redirectToLogin(next);
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (mainContentRef.current) {
      import('animejs').then(({ default: anime }) => {
        if (cancelled) return;
        anime({
          targets: mainContentRef.current,
          opacity: [0, 1],
          translateY: [10, 0],
          duration: 600,
          easing: 'easeOutQuad',
        });
      });
    }
    return () => {
      cancelled = true;
    };
  }, [currentPageName]);

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0];
    }
    return name.substring(0, 2);
  };

  const toggleGroup = (title) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const navigationGroups = [
    {
      title: 'תפעול יומי',
      items: [
        { name: 'מסך הבית', href: 'LandingPage' },
        { name: 'לוח בקרה', href: 'Dashboard' },
        { name: 'רשימת קריאות', href: 'Calls' },
        { name: 'שירות פרטי', href: 'PrivateService' },
        { name: 'ניטור תורים', href: 'QueueMonitor' },
      ],
    },
    {
      title: 'ניהול ספקים',
      items: [
        { name: 'נותני שירות', href: 'ServiceProviders' },
        { name: 'ניהול חוזים', href: 'VendorContracts' },
        { name: 'מפת ספקים', href: 'AllVendorsMap' },
        { name: 'אזורי כיסוי', href: 'CoverageAreas' },
        { name: 'פורטל ספקים', href: 'VendorPortal' },
      ],
    },
    {
      title: 'צי רכב',
      items: [{ name: 'ניהול צי רכב', href: 'FleetManagement' }],
    },
    {
      title: 'כלכלה ותשלומים',
      items: [
        { name: 'תעריפון תפעול', href: 'OperationalRates' },
        { name: 'חשבוניות', href: 'Invoices' },
        { name: 'קטלוג מוצרים', href: 'ProductCatalog' },
        { name: 'תזכורות', href: 'Reminders' },
      ],
    },
    {
      title: 'ניהול ונתונים',
      items: [
        { name: 'דוחות', href: 'Reports' },
        { name: 'ניתוח נתונים היסטוריים', href: 'HistoricalDataAnalysis' },
        { name: 'ייצוא מתקדם', href: 'AdvancedExport' },
        { name: 'לקוחות', href: 'Customers' },
        { name: 'משובי לקוחות', href: 'FeedbackManagement' },
        { name: 'הפרופיל שלי', href: 'UserProfile' },
      ],
    },
    {
      title: 'כלים',
      items: [
        { name: 'סוכנים', href: 'Agents' },
        { name: 'לוח שנה', href: 'Calendar' },
      ],
    },
    {
      title: 'מערכת',
      items: [
        { name: 'ניהול משתמשים', href: 'UserManagement' },
        { name: 'ניהול תפקידים', href: 'RoleManagement' },
        { name: 'יומן פעולות', href: 'AuditLog' },
        { name: 'אוטומציה', href: 'AutomationSettings' },
        { name: 'אינטגרציות CRM', href: 'IntegrationSettings' },
        { name: 'הגדרות התראות', href: 'NotificationSettings' },
        { name: 'הגדרות תצוגה', href: 'AdminDisplaySettings' },
        { name: 'הגדרות מערכת', href: 'Settings' },
      ],
    },
  ];

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  if (currentPageName === 'LandingPage') {
    return <>{children}</>;
  }

  if (isLoadingAuth) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentUser) return null;

  return (
    <div dir="rtl" className="min-h-screen bg-[#FAFAFA] flex">
      {/* Skip to main content link - visible on keyboard focus */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:start-2 focus:z-[100] focus:bg-white focus:px-4 focus:py-2 focus:rounded focus:shadow-lg focus:text-red-600 focus:font-medium"
      >
        דלג לתוכן הראשי
      </a>

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
      <aside
        className={cn(
          'fixed top-0 right-0 h-full w-64 bg-white border-l border-[#E0E0E0] z-50 transition-transform duration-300 ease-in-out flex flex-col',
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex-shrink-0 flex items-center justify-between px-4 border-b border-[#E0E0E0]">
          <div className="flex items-center gap-3">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6955a04a2de0845ff4cb8a71/36b225264_NatiLogoRGB.png"
              alt="נתי"
              className="h-10 w-auto object-contain"
            />
            <span className="font-bold text-lg text-[#111827] hidden md:block">
              NatID 360 Control
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="סגור תפריט"
          >
            <X className="w-5 h-5 text-[#616161]" />
          </Button>
        </div>

        {/* Navigation - scrollable area */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {navigationGroups.map((group, groupIdx) => {
            // Hide groups where the user has no accessible items
            const visibleItems = group.items.filter((item) => canAccessPage(item.href));
            if (visibleItems.length === 0) return null;

            return (
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
                    {visibleItems.map((item) => {
                      const isActive = currentPageName === item.href;
                      return (
                        <Link
                          key={item.href}
                          to={createPageUrl(item.href)}
                          onClick={() => setSidebarOpen(false)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-[4px] text-[15px] font-medium transition-all duration-200',
                            isActive
                              ? 'bg-[#F5F5F5] text-[#212121] shadow-sm border border-[#E0E0E0]'
                              : 'text-[#424242] hover:bg-[#FAFAFA] hover:text-[#212121]'
                          )}
                        >
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User Section - fixed at bottom */}
        <div className="flex-shrink-0 p-4 border-t border-[#E0E0E0]">
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
      <div className="flex-1 lg:mr-64 min-h-screen flex flex-col transition-all duration-300 overflow-x-hidden">
        {/* Top Bar */}
        <header className="sticky top-0 h-16 bg-white border-b border-[#E0E0E0] z-30 flex items-center justify-between px-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden w-10 h-10 hover:bg-[rgba(0,0,0,0.04)] active:bg-[rgba(0,0,0,0.08)] transition-colors rounded-full"
              onClick={() => setSidebarOpen(true)}
              aria-label="תפריט"
            >
              <Menu className="w-6 h-6 text-[#616161]" strokeWidth={2} />
            </Button>
            <div className="flex items-center gap-3">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6955a04a2de0845ff4cb8a71/36b225264_NatiLogoRGB.png"
                alt="נתי"
                className="h-8 w-auto object-contain lg:hidden"
              />
              <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate(-1)}>
                <ChevronRight className="w-4 h-4" />
                חזרה
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label="התראות">
                  <Bell className="w-5 h-5 text-[#616161]" />
                  {unreadCount > 0 && (
                    <span className="absolute top-2 end-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
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
                    <div className="p-8 text-center text-gray-500 text-sm">אין התראות חדשות</div>
                  ) : (
                    notifications.map((notification) => (
                      <Link
                        key={notification.id}
                        to={
                          notification.link
                            ? createPageUrl(notification.link.replace(/^\//, ''))
                            : '#'
                        }
                        onClick={() => handleNotificationClick(notification)}
                        className={cn(
                          'block p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors text-end',
                          !notification.is_read && 'bg-blue-50/50'
                        )}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs text-gray-400">
                            {notification.created_date
                              ? format(parseISO(notification.created_date), 'HH:mm')
                              : ''}
                          </span>
                          {!notification.is_read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full mt-1" />
                          )}
                        </div>
                        <h5
                          className={cn(
                            'text-sm font-medium mb-1',
                            !notification.is_read ? 'text-blue-700' : 'text-gray-900'
                          )}
                        >
                          {notification.title}
                        </h5>
                        <p className="text-xs text-gray-500 line-clamp-2">{notification.message}</p>
                      </Link>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* User Profile - Clean Design */}
            <div className="flex items-center gap-3 ps-2">
              <div className="text-end hidden sm:block">
                <p className="text-sm font-medium text-[#212121] leading-none">
                  {currentUser?.full_name || 'משתמש'}
                </p>
                <p className="text-[11px] text-[#616161] mt-1 leading-none">{currentUser?.email}</p>
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
        <Suspense fallback={null}>
          <NotificationPermissionBanner />
        </Suspense>

        {/* Page Content */}
        <main
          id="main-content"
          ref={mainContentRef}
          role="main"
          aria-live="polite"
          className="flex-1 p-4 md:p-6"
        >
          {children}
        </main>

        <Suspense fallback={null}>
          <AccessibilityWidget />
        </Suspense>

        {/* PWA Components */}
        <Suspense fallback={null}>
          <InstallPrompt />
        </Suspense>
        <Suspense fallback={null}>
          <OfflineIndicator />
        </Suspense>
        <Suspense fallback={null}>
          <UpdatePrompt />
        </Suspense>

        {/* Nati Assistant (floating) */}
        <Suspense fallback={null}>
          <NatiAssistant />
        </Suspense>

        {/* Connection Status (top left) */}
        <div className="fixed top-20 start-4 z-40">
          <Suspense fallback={null}>
            <ConnectionStatusIndicator />
          </Suspense>
        </div>
        <Suspense fallback={null}>
          <ToasterLazy position="top-center" richColors />
        </Suspense>
      </div>
    </div>
  );
}

export default function Layout(props) {
  return (
    <PermissionsProvider>
      <LayoutContent {...props} />
    </PermissionsProvider>
  );
}