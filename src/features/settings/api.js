import { base44 } from '@/lib/api';

/**
 * Settings API functions
 * Centralized API calls for settings feature
 */

// Notification Settings
export const getNotificationSettings = () => {
  return base44.entities.NotificationSetting.list();
};

export const getNotificationSettingsByUser = (userId) => {
  return base44.entities.NotificationSetting.filter({ user_id: userId });
};

export const createNotificationSetting = (data) => {
  return base44.entities.NotificationSetting.create(data);
};

export const updateNotificationSetting = (id, data) => {
  return base44.entities.NotificationSetting.update(id, data);
};

export const deleteNotificationSetting = (id) => {
  return base44.entities.NotificationSetting.delete(id);
};

// Notifications
export const getNotifications = (userId, sort = '-created_at', limit = 20) => {
  return base44.entities.Notification.filter({ user_id: userId }, sort, limit);
};

export const createNotification = (data) => {
  return base44.entities.Notification.create(data);
};

export const markNotificationAsRead = (id) => {
  return base44.entities.Notification.update(id, { is_read: true });
};

export const deleteNotification = (id) => {
  return base44.entities.Notification.delete(id);
};
