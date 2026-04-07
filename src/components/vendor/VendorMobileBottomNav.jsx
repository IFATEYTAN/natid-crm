import { cn } from '@/lib/utils';
import { Home, Phone, MapPin, User } from 'lucide-react';

const tabs = [
  { id: 'home', label: 'בית', Icon: Home },
  { id: 'calls', label: 'קריאות', Icon: Phone, badge: true },
  { id: 'map', label: 'מפה', Icon: MapPin },
  { id: 'profile', label: 'פרופיל', Icon: User },
];

export default function VendorMobileBottomNav({ activeTab, onTabChange, activeCallsCount }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 h-16 bg-white border-t border-gray-200 z-50 flex items-center justify-around px-2">
      {tabs.map(({ id, label, Icon, badge }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[44px] rounded-lg transition-colors',
            activeTab === id ? 'text-blue-600' : 'text-gray-400'
          )}
        >
          <div className="relative">
            <Icon className="w-6 h-6" />
            {badge && activeCallsCount > 0 && (
              <span className="absolute -top-1.5 -end-2 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center">
                {activeCallsCount}
              </span>
            )}
          </div>
          <span className="text-xs font-medium">{label}</span>
        </button>
      ))}
    </nav>
  );
}