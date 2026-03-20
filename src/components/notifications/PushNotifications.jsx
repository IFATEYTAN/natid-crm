import React, { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeUserToPush,
  createAppNotification,
  NotificationTypes,
} from './pushNotificationUtils';

// VAPID public key - fetched from backend or env
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

// Re-export utilities for backward compatibility
export { isPushSupported, getNotificationPermission, requestNotificationPermission, createAppNotification, NotificationTypes } from './pushNotificationUtils';

// Hook for managing push notifications
export function usePushNotifications() {
  const [permission, setPermission] = useState(getNotificationPermission());
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    setPermission(getNotificationPermission());

    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'notifications' }).then((permissionStatus) => {
        permissionStatus.onchange = () => {
          setPermission(Notification.permission);
        };
      });
    }
  }, []);

  const requestPermission = useCallback(async () => {
    const result = await requestNotificationPermission();
    setPermission(getNotificationPermission());
    return result;
  }, []);

  const subscribe = useCallback(async () => {
    if (permission !== 'granted') {
      const result = await requestPermission();
      if (!result.success) return false;
    }
    setIsSubscribed(true);
    return true;
  }, [permission, requestPermission]);

  const unsubscribe = useCallback(() => {
    setIsSubscribed(false);
    return true;
  }, []);

  return {
    permission,
    isSubscribed,
    isSupported: isPushSupported(),
    requestPermission,
    subscribe,
    unsubscribe,
    showNotification: createAppNotification,
  };
}

export function NotificationPermissionBanner() {
  const { permission, isSupported, requestPermission } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const dismissedAt = localStorage.getItem('notification-banner-dismissed');
    if (dismissedAt) {
      const hoursSince = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60);
      if (hoursSince > 24) {
        localStorage.removeItem('notification-banner-dismissed');
      } else {
        setDismissed(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('notification-banner-dismissed', Date.now().toString());
  };

  const handleEnable = async () => {
    const result = await requestPermission();
    if (result.success) {
      toast.success('התראות הופעלו בהצלחה!');
      handleDismiss();
    } else if (result.permission === 'denied') {
      toast.error('ההתראות נחסמו. ניתן לשנות בהגדרות הדפדפן.');
    }
  };

  if (!isSupported || permission === 'granted' || permission === 'denied' || dismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 shadow-lg"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="font-medium">הפעל התראות</div>
              <div className="text-sm text-blue-100">קבל התראות על קריאות חדשות ועדכוני סטטוס</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-white hover:bg-white/20"
            >
              לא עכשיו
            </Button>
            <Button
              size="sm"
              onClick={handleEnable}
              className="bg-white text-blue-600 hover:bg-blue-50"
            >
              <Bell className="w-4 h-4 me-2" />
              הפעל
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export function NotificationSettings() {
  const { permission, isSupported, isSubscribed, subscribe, unsubscribe, requestPermission } =
    usePushNotifications();
  const [settings, setSettings] = useState({
    newCalls: true,
    statusChanges: true,
    slaWarnings: true,
    vendorUpdates: true,
    systemAlerts: true,
  });

  const handleToggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleEnableNotifications = async () => {
    if (permission === 'default') {
      const result = await requestPermission();
      if (result.success) {
        await subscribe();
        toast.success('התראות הופעלו!');
      }
    } else if (permission === 'granted' && !isSubscribed) {
      await subscribe();
      toast.success('התראות הופעלו!');
    }
  };

  const handleDisableNotifications = () => {
    unsubscribe();
    toast.success('התראות כובו');
  };

  if (!isSupported) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <div className="font-medium text-amber-800">התראות לא נתמכות</div>
          <div className="text-sm text-amber-600">הדפדפן שלך לא תומך בהתראות Push. נסה דפדפן אחר.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {permission === 'granted' && isSubscribed ? (
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5 text-green-600" />
              </div>
            ) : (
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                <BellOff className="w-5 h-5 text-gray-500" />
              </div>
            )}
            <div>
              <div className="font-medium">
                {permission === 'granted' && isSubscribed ? 'התראות פעילות' : 'התראות כבויות'}
              </div>
              <div className="text-sm text-gray-500">
                {permission === 'denied'
                  ? 'ההתראות נחסמו בהגדרות הדפדפן'
                  : permission === 'granted' && isSubscribed
                    ? 'תקבל התראות על קריאות ועדכונים'
                    : 'הפעל התראות כדי לקבל עדכונים'}
              </div>
            </div>
          </div>
          {permission !== 'denied' && (
            <Button
              variant={isSubscribed ? 'outline' : 'default'}
              onClick={isSubscribed ? handleDisableNotifications : handleEnableNotifications}
            >
              {isSubscribed ? 'כבה' : 'הפעל'}
            </Button>
          )}
        </div>
      </div>

      {isSubscribed && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">סוגי התראות</h4>
          {[
            { key: 'newCalls', label: 'קריאות חדשות', desc: 'התראה כאשר נכנסת קריאה חדשה' },
            { key: 'statusChanges', label: 'שינויי סטטוס', desc: 'עדכונים על שינוי סטטוס קריאות' },
            { key: 'slaWarnings', label: 'אזהרות SLA', desc: 'התראה כאשר קריאה עומדת לחרוג מ-SLA' },
            { key: 'vendorUpdates', label: 'עדכוני ספקים', desc: 'הגעה ליעד, השלמת קריאה' },
            { key: 'systemAlerts', label: 'התראות מערכת', desc: 'הודעות מערכת חשובות' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">{item.label}</div>
                <div className="text-sm text-gray-500">{item.desc}</div>
              </div>
              <button
                onClick={() => handleToggle(item.key)}
                className={`relative w-11 h-6 rounded-full transition-colors ${settings[item.key] ? 'bg-blue-600' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings[item.key] ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          ))}
        </div>
      )}

      {isSubscribed && (
        <Button
          variant="outline"
          onClick={() => {
            createAppNotification(NotificationTypes.SYSTEM_ALERT, {
              message: 'זוהי התראת בדיקה - ההתראות עובדות!',
              important: false,
            });
            toast.success('התראת בדיקה נשלחה');
          }}
          className="w-full"
        >
          שלח התראת בדיקה
        </Button>
      )}
    </div>
  );
}

export default NotificationPermissionBanner;