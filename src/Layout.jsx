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
    { name: 'לקוחות', href: 'Customers', icon: Users },
    { name: 'נותני שירות', href: 'ServiceProviders', icon: Truck },
    { name: 'הגדרות', href: 'Settings', icon: Settings },
  ];

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#FAFAFA]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700&display=swap');
        * {
          font-family: 'Heebo', sans-serif;
        }
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
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#0D47A1] rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-[#0D47A1]">נתי שירותי דרך</span>
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
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "bg-[#0D47A1] text-white" 
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
            <Button className="w-full bg-[#0D47A1] hover:bg-[#1565C0] text-white gap-2">
              <Plus className="w-4 h-4" />
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
        <header className="sticky top-0 h-16 bg-white border-b border-[#E0E0E0] z-30 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5 text-[#616161]" />
            </Button>
            <h1 className="text-lg font-semibold text-[#212121]">
              {navigation.find(n => n.href === currentPageName)?.name || 'נתי שירותי דרך'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Emergency Phone */}
            <div className="hidden md:flex items-center gap-2 text-[#0D47A1] font-medium">
              <Phone className="w-4 h-4" />
              <span>*6283</span>
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