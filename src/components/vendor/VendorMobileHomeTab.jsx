import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Phone, ArrowLeft, CheckCircle, Clock, AlertCircle, PhoneCall, Truck } from 'lucide-react';
import { useMemo } from 'react';

export default function VendorMobileHomeTab({
  vendorProfile,
  isAvailable,
  onToggleAvailability,
  activeCalls,
  completedCalls,
  calls,
  onNavigateTab,
}) {
  const inProgressCalls = useMemo(
    () => (calls || []).filter((c) => ['vendor_enroute', 'in_progress'].includes(c.call_status)),
    [calls]
  );
  const pendingCalls = useMemo(
    () => (calls || []).filter((c) => ['assigned', 'assigning'].includes(c.call_status)),
    [calls]
  );
  const todayCompleted = useMemo(() => {
    const today = new Date();
    return (completedCalls || []).filter((c) => {
      if (!c.closed_at) return false;
      const closed = new Date(c.closed_at);
      return (
        closed.getDate() === today.getDate() &&
        closed.getMonth() === today.getMonth() &&
        closed.getFullYear() === today.getFullYear()
      );
    });
  }, [completedCalls]);

  return (
    <div className="px-4 pt-6 space-y-5 pb-4">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">שלום, {vendorProfile?.vendor_name}</h1>
        <p className="text-gray-500 text-sm mt-1">ניהול קריאות שירות</p>
      </div>

      {/* Availability Toggle */}
      <button
        onClick={onToggleAvailability}
        className={cn(
          'w-full rounded-2xl p-6 flex items-center justify-between transition-all duration-300 shadow-lg',
          isAvailable ? 'bg-green-500 shadow-green-200' : 'bg-red-500 shadow-red-200'
        )}
      >
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'w-14 h-14 rounded-full flex items-center justify-center',
              isAvailable ? 'bg-green-400' : 'bg-red-400'
            )}
          >
            <Truck className="w-7 h-7 text-white" />
          </div>
          <div className="text-start">
            <div className="text-white text-xl font-bold">{isAvailable ? 'זמין' : 'לא זמין'}</div>
            <div className="text-white/80 text-sm">
              {isAvailable ? 'מקבל קריאות חדשות' : 'לחץ להפעלה'}
            </div>
          </div>
        </div>
        <div
          className={cn(
            'w-16 h-9 rounded-full relative transition-all duration-300',
            isAvailable ? 'bg-green-300' : 'bg-red-300'
          )}
        >
          <div
            className={cn(
              'w-7 h-7 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-md',
              isAvailable ? 'start-1' : 'end-1'
            )}
          />
        </div>
      </button>

      {/* Active calls badge */}
      {activeCalls.length > 0 && (
        <button
          onClick={() => onNavigateTab('calls')}
          className="w-full bg-orange-50 border-2 border-orange-200 rounded-xl p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <Phone className="w-6 h-6 text-orange-600" />
              <span className="absolute -top-2 -end-2 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                {activeCalls.length}
              </span>
            </div>
            <span className="font-bold text-orange-800">קריאות פעילות</span>
          </div>
          <ArrowLeft className="w-5 h-5 text-orange-400" />
        </button>
      )}

      {/* Today's stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{todayCompleted.length}</div>
            <div className="text-xs text-gray-500">נסגרו היום</div>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{inProgressCalls.length}</div>
            <div className="text-xs text-gray-500">בטיפול</div>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{pendingCalls.length}</div>
            <div className="text-xs text-gray-500">ממתינות</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <a href="tel:*2874" className="block">
          <Button
            variant="outline"
            className="w-full h-14 rounded-xl text-base font-medium gap-2 border-2"
          >
            <PhoneCall className="w-5 h-5 text-blue-600" />
            התקשר למוקד
          </Button>
        </a>
        <Link to={createPageUrl('MyVendorProfile')}>
          <Button
            variant="outline"
            className="w-full h-14 rounded-xl text-base font-medium gap-2 border-2"
          >
            <AlertCircle className="w-5 h-5 text-orange-500" />
            הפרופיל שלי
          </Button>
        </Link>
      </div>
    </div>
  );
}
