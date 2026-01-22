/**
 * Custom Hook for Notifications
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// --- API Functions ---

const getNotifications = async (userId, limit = 20) => {
  if (!userId) return [];
  return base44.entities.Notification.filter({ user_id: userId }, '-created_date', limit);
};

const markAsRead = async (id) => {
  return base44.entities.Notification.update(id, { is_read: true });
};

const markAllAsRead = async (userId) => {
  const notifications = await base44.entities.Notification.filter({ user_id: userId, is_read: false });
  await Promise.all(notifications.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
  return notifications;
};

// --- Custom Hooks ---

export const useNotifications = (userId, limit = 20) => {
  return useQuery({
    queryKey: queryKeys.notifications.all(),
    queryFn: () => getNotifications(userId, limit),
    enabled: !!userId,
    staleTime: 1000 * 30,
    refetchInterval: 30000,
  });
};

export const useUnreadNotifications = (userId) => {
  const { data: notifications = [] } = useNotifications(userId);
  return notifications.filter(n => !n.is_read);
};

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    },
  });
};

export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
      toast.success('כל ההתראות סומנו כנקראו');
    },
    onError: (error) => {
      toast.error(`שגיאה: ${error.message}`);
    },
  });
};