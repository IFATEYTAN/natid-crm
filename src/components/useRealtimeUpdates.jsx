import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * Hook to handle realtime updates (placeholder for now)
 */
export const useRealtimeUpdates = () => {
  return {};
};

/**
 * Component to display connection status
 */
export const ConnectionStatusIndicator = () => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Set initial state
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-red-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium animate-pulse">
      <WifiOff className="w-4 h-4" />
      <span>אין חיבור לאינטרנט</span>
    </div>
  );
};

export default useRealtimeUpdates;
