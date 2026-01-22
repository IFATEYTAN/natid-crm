import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import {
  Menu,
  X,
  Plus,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Bell,
  LayoutDashboard,
  Phone,
  Users,
  Truck,
  Map,
  BarChart3,
  Settings,
  UserCog,
  Zap,
  Link2,
  BellRing,
  MapPin,
  ListChecks,
  Bot
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
import { Toaster } from 'sonner';

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({ 'תפעול יומי': true });
  const queryClient = useQueryClient();

  // Fetch current user
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

  // Fetch Notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', currentUser?.id],
    queryFn: () => base44.entities.Notification.filter({ user_id: currentUser.id }, '-created_date', 20),
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
  };

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
      icon: LayoutDashboard,
      items: [
        { name: 'לוח בקרה', href: 'Dashboard', icon: LayoutDashboard },
        { name: 'ניטור תורים', href: 'QueueMonitor', icon: ListChecks },
        { name: 'יומן', href: 'Calendar', icon: CalendarIcon },
        { name: 'מפת ספקים', href: 'AllVendorsMap', icon: Map },
        { name: 'אזורי כיסוי', href: 'CoverageAreas', icon: MapPin },
      ]
    },
    {
      title: 'ניהול ונתונים',
      icon: BarChart3,
      items: [
        { name: 'דוחות', href: 'Reports', icon: BarChart3 },
        { name: 'לקוחות', href: 'Customers', icon: Users },
        { name: 'נותני שירות', href: 'ServiceProviders', icon: Truck },
        { name: 'פורטל ספקים', href: 'VendorPortal', icon: Truck },
        { name: 'הפרופיל שלי', href: 'MyVendorProfile', icon: UserCog },
      ]
    },
    {
      title: 'כלים',
      icon: Bot,
      items: [
        { name: 'סוכנים', href: 'Agents', icon: Bot },
      ]
    },
    {
      title: 'מערכת',
      icon: Settings,
      items: [
        { name: 'ניהול משתמשים', href: 'UserManagement', icon: UserCog },
        { name: 'אוטומציה', href: 'AutomationSettings', icon: Zap },
        { name: 'אינטגרציות CRM', href: 'IntegrationSettings', icon: Link2 },
        { name: 'הגדרות התראות', href: 'NotificationSettings', icon: BellRing },
        { name: 'הגדרות מערכת', href: 'Settings', icon: Settings },
      ]
    }
  ];

  const handleLogout = async () => {
    await base44.auth.logout('/AuthLogin');
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#F4F5F7]">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 right-0 h-full w-64 bg-white border-l border-[#DFE1E6] z-50 transition-transform duration-300 ease-in-out flex flex-col",
        "lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#DFE1E6] shrink-0">
          <div className="flex items-center gap-3">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6955a04a2de0845ff4cb8a71/36b225264_NatiLogoRGB.png" 
              alt="נתי" 
              className="h-10 w-auto object-contain"
            />
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5 text-[#6B778C]" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navigationGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="mb-1">
              <button
                onClick={() => toggleGroup(group.title)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-[#6B778C] uppercase tracking-wider hover:bg-[#F4F5F7] rounded-md transition-colors"
              >
                <span>{group.title}</span>
                {expandedGroups[group.title] ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </button>
              
              {expandedGroups[group.title] && (
                <div className="space-y-0.5 mt-1">
                  {group.items.map((item) => {
                    const isActive = currentPageName === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        to={createPageUrl(item.href)}
                        onClick={() => setSidebarOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200",
                          isActive 
                            ? "bg-red-50 text-red-700 border-r-2 border-red-600" 
                            : "text-[#172B4D] hover:bg-[#F4F5F7]"
                        )}
                      >
                        <Icon className={cn("w-4 h-4", isActive ? "text-red-600" : "text-[#6B778C]")} />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Quick Action */}
        <div className="p-3 border-t border-[#DFE1E6]">
          <Link to={createPageUrl('NewCase')}>
            <Button className="w-full bg-[#FF0000] hover:bg-[#CC0000] text-white gap-2 rounded-md font-semibold">
              <Plus className="w-5 h-5" />
              קריאה חדשה
            </Button>
          </Link>
        </div>

        {/* User Section */}
        <div className="p-3 border-t border-[#DFE1E6] shrink-0">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-9 h-9 rounded-full bg-[#F4F5F7] border border-[#DFE1E6] flex items-center justify-center overflow-hidden">
              {currentUser?.profile_image ? (
                <img src={currentUser.profile_image} alt={currentUser.full_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[#6B778C] text-sm font-medium">{getInitials(currentUser?.full_name)}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#172B4D] truncate">{currentUser?.full_name || 'משתמש'}</p>
              <p className="text-xs text-[#6B778C] truncate">{currentUser?.email}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2 text-[#6B778C] hover:text-red-600 hover:bg-red-50 text-sm"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            התנתק
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:mr-64 min-h-screen flex flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 h-16 bg-white border-b border-[#DFE1E6] z-30 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6 text-[#6B778C]" />
            </Button>
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6955a04a2de0845ff4cb8a71/36b225264_NatiLogoRGB.png" 
              alt="נתי" 
              className="h-8 w-auto object-contain lg:hidden"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5 text-[#6B778C]" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start">
                <div className="p-3 border-b border-[#DFE1E6] flex justify-between items-center">
                  <h4 className="font-semibold text-sm text-[#172B4D]">התראות</h4>
                  <span className="text-xs text-[#6B778C]">{unreadCount} חדשות</span>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-[#6B778C] text-sm">אין התראות חדשות</div>
                  ) : (
                    notifications.slice(0, 5).map(notification => (
                      <Link 
                        key={notification.id} 
                        to={notification.link ? createPageUrl(notification.link.replace(/^\//, '')) : '#'}
                        onClick={() => handleNotificationClick(notification)}
                        className={cn(
                          "block p-3 border-b border-[#F4F5F7] hover:bg-[#F4F5F7] transition-colors",
                          !notification.is_read && "bg-blue-50"
                        )}
                      >
                        <h5 className="text-sm font-medium text-[#172B4D] mb-0.5">{notification.title}</h5>
                        <p className="text-xs text-[#6B778C] line-clamp-2">{notification.message}</p>
                      </Link>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* User - Desktop */}
            <div className="hidden md:flex items-center gap-2">
              <div className="text-right">
                <p className="text-sm font-medium text-[#172B4D]">{currentUser?.full_name || 'משתמש'}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#F4F5F7] border border-[#DFE1E6] flex items-center justify-center">
                {currentUser?.profile_image ? (
                  <img src={currentUser.profile_image} alt="" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <span className="text-[#6B778C] text-xs font-medium">{getInitials(currentUser?.full_name)}</span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>

      <Toaster position="top-center" richColors />
    </div>
  );
}