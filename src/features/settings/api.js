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

// ========== Nati Sync ==========
// Invokes the syncNatiData backend function. See base44/functions/syncNatiData/entry.ts.
// Filter params (all optional) match the documented Nati API:
//   dep:        Department code (-1=all, 3=towing, 4=rent, 5=windshields, 10=radiodisc, 11=combined)
//   callStatus: -1=all open, or one of the documented status codes
//   from_date / to_date: 'YYYY-MM-DD'
//   sync_calls / sync_cases / sync_vendors / sync_customers: which entities to write
const buildNatiSyncPayload = ({
  dep = -1,
  callStatus = -1,
  from_date,
  to_date,
  sync_calls = true,
  sync_cases = true,
  sync_vendors = true,
  sync_customers = true,
} = {}) => {
  const payload = { dep, callStatus, sync_calls, sync_cases, sync_vendors, sync_customers };
  if (from_date) payload.from_date = from_date;
  if (to_date) payload.to_date = to_date;
  return payload;
};

export const runNatiSyncDryRun = (filters = {}) => {
  return base44.functions.invoke('syncNatiData', {
    ...buildNatiSyncPayload(filters),
    dry_run: true,
  });
};

export const runNatiSync = (filters = {}) => {
  return base44.functions.invoke('syncNatiData', {
    ...buildNatiSyncPayload(filters),
    dry_run: false,
  });
};

// ========== Demo Data Seed ==========
// Invokes the seedDemoData backend function (admin only).
// See base44/functions/seedDemoData/entry.ts. Generates ~250 realistic
// Israeli calls plus vendors, customers, fleet vehicles, and queue items.
export const seedDemoData = (options = {}) => {
  const {
    seed_users = true,
    seed_customers = true,
    seed_vendors = true,
    seed_calls = true,
    seed_history = true,
    seed_ratings = true,
    seed_notifications = true,
    seed_queue = true,
  } = options;
  return base44.functions.invoke('seedDemoData', {
    seed_users,
    seed_customers,
    seed_vendors,
    seed_calls,
    seed_history,
    seed_ratings,
    seed_notifications,
    seed_queue,
  });
};
