/**
 * Custom Hook for Authentication
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// --- Custom Hooks ---

export const useCurrentUser = () => {
  return useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: () => base44.auth.me(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false, // Don't retry on auth errors
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
      toast.success('הפרופיל עודכן בהצלחה');
    },
    onError: (error) => {
      toast.error(`שגיאה בעדכון פרופיל: ${error.message}`);
    },
  });
};

export const useLogout = () => {
  return useMutation({
    mutationFn: (redirectUrl = '/AuthLogin') => base44.auth.logout(redirectUrl),
    onSuccess: () => {
      toast.success('התנתקת בהצלחה');
    },
  });
};
