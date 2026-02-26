import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import * as settingsApi from '../api';

/**
 * Hook for fetching all notification settings
 */
export const useNotificationSettings = () => {
  return useQuery({
    queryKey: queryKeys.notifications.settings(),
    queryFn: settingsApi.getNotificationSettings,
  });
};

/**
 * Hook for fetching notification settings by user
 */
export const useUserNotificationSettings = (userId) => {
  return useQuery({
    queryKey: queryKeys.notifications.userSettings(userId),
    queryFn: () => settingsApi.getNotificationSettingsByUser(userId),
    enabled: !!userId,
  });
};

/**
 * Hook for creating notification setting
 */
export const useCreateNotificationSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsApi.createNotificationSetting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.settings() });
    },
  });
};

/**
 * Hook for updating notification setting
 */
export const useUpdateNotificationSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => settingsApi.updateNotificationSetting(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.settings() });
    },
  });
};

/**
 * Hook for deleting notification setting
 */
export const useDeleteNotificationSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsApi.deleteNotificationSetting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.settings() });
    },
  });
};

/**
 * Hook for fetching user notifications
 */
export const useNotifications = (userId, sort = '-created_at', limit = 20) => {
  return useQuery({
    queryKey: queryKeys.notifications.byUser(userId),
    queryFn: () => settingsApi.getNotifications(userId, sort, limit),
    enabled: !!userId,
    refetchInterval: 30000,
  });
};

/**
 * Hook for marking notification as read
 */
export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsApi.markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    },
  });
};

/**
 * Hook for creating notification
 */
export const useCreateNotification = () => {
  return useMutation({
    mutationFn: settingsApi.createNotification,
  });
};
