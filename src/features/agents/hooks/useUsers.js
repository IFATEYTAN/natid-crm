import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';
import * as usersApi from '../api';

/**
 * Hook for fetching all users
 */
export const useUsers = (sort = '-created_date') => {
  return useQuery({
    queryKey: queryKeys.users.all(),
    queryFn: () => usersApi.getUsers(sort),
  });
};

/**
 * Hook for fetching agents only
 */
export const useAgents = () => {
  return useQuery({
    queryKey: queryKeys.users.agents(),
    queryFn: usersApi.getAgents,
  });
};

/**
 * Hook for fetching a single user by ID
 */
export const useUser = (userId) => {
  return useQuery({
    queryKey: queryKeys.users.detail(userId),
    queryFn: () => usersApi.getUserById(userId),
    enabled: !!userId,
  });
};

/**
 * Hook for updating a user
 */
export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => usersApi.updateUser(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.agents() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(id) });
      toast.success('משתמש עודכן בהצלחה');
    },
    onError: () => {
      toast.error('שגיאה בעדכון משתמש');
    },
  });
};

/**
 * Hook for creating a user
 */
export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.agents() });
      toast.success('משתמש נוצר בהצלחה');
    },
    onError: () => {
      toast.error('שגיאה ביצירת משתמש');
    },
  });
};

/**
 * Hook for deleting a user
 */
export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.agents() });
      toast.success('משתמש נמחק בהצלחה');
    },
    onError: () => {
      toast.error('שגיאה במחיקת משתמש');
    },
  });
};
