// Pure utility functions for push notifications (no React)

export const isPushSupported = () => {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
};

export const getNotificationPermission = () => {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
};

export const requestNotificationPermission = async () => {
  if (!isPushSupported()) {
    return { success: false, error: 'Push notifications not supported' };
  }
  try {
    const permission = await Notification.requestPermission();
    return { success: permission === 'granted', permission };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const showNotification = (title, options = {}) => {
  if (getNotificationPermission() !== 'granted') return null;

  const defaultOptions = {
    icon: '/icons/icon.svg',
    badge: '/icons/icon.svg',
    dir: 'rtl',
    lang: 'he',
    vibrate: [200, 100, 200],
    requireInteraction: false,
    ...options,
  };

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(title, defaultOptions);
    });
  } else {
    return new Notification(title, defaultOptions);
  }
};

export const NotificationTypes = {
  NEW_CALL: 'new_call',
  CALL_ASSIGNED: 'call_assigned',
  CALL_STATUS_CHANGE: 'call_status_change',
  VENDOR_ARRIVED: 'vendor_arrived',
  CALL_COMPLETED: 'call_completed',
  SLA_WARNING: 'sla_warning',
  SYSTEM_ALERT: 'system_alert',
};

export const createAppNotification = (type, data) => {
  const notifications = {
    [NotificationTypes.NEW_CALL]: {
      title: 'קריאה חדשה!',
      body: `קריאה חדשה מ-${data.customerName || 'לקוח'} ב-${data.location || 'מיקום לא ידוע'}`,
      tag: `call-${data.callId}`,
      data: { url: `/CaseDetails/${data.callId}` },
      requireInteraction: true,
    },
    [NotificationTypes.CALL_ASSIGNED]: {
      title: 'קריאה שובצה אליך',
      body: `קריאה #${data.callNumber} שובצה אליך. יעד: ${data.location}`,
      tag: `assigned-${data.callId}`,
      data: { url: `/CallDetailsVendor/${data.callId}` },
      requireInteraction: true,
    },
    [NotificationTypes.CALL_STATUS_CHANGE]: {
      title: 'עדכון סטטוס קריאה',
      body: `קריאה #${data.callNumber} עודכנה ל: ${data.newStatus}`,
      tag: `status-${data.callId}`,
      data: { url: `/CaseDetails/${data.callId}` },
    },
    [NotificationTypes.VENDOR_ARRIVED]: {
      title: 'ספק הגיע ליעד',
      body: `${data.vendorName} הגיע לקריאה #${data.callNumber}`,
      tag: `arrived-${data.callId}`,
      data: { url: `/CaseDetails/${data.callId}` },
    },
    [NotificationTypes.CALL_COMPLETED]: {
      title: 'קריאה הושלמה',
      body: `קריאה #${data.callNumber} הושלמה בהצלחה`,
      tag: `completed-${data.callId}`,
      data: { url: `/CaseDetails/${data.callId}` },
    },
    [NotificationTypes.SLA_WARNING]: {
      title: '⚠️ אזהרת SLA',
      body: `קריאה #${data.callNumber} עומדת לחרוג מ-SLA! נותרו ${data.minutesLeft} דקות`,
      tag: `sla-${data.callId}`,
      data: { url: `/CaseDetails/${data.callId}` },
      requireInteraction: true,
    },
    [NotificationTypes.SYSTEM_ALERT]: {
      title: 'התראת מערכת',
      body: data.message,
      tag: `system-${Date.now()}`,
      requireInteraction: data.important,
    },
  };

  const config = notifications[type];
  if (!config) return null;

  return showNotification(config.title, {
    body: config.body,
    tag: config.tag,
    data: config.data,
    requireInteraction: config.requireInteraction,
  });
};