/**
 * Custom Hook for Work Queue
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// --- API Functions ---

const getWorkQueue = async (options = {}) => {
  const { sortBy = '-created_date', limit = 500 } = options;
  return base44.entities.WorkQueue.list(sortBy, limit);
};

const updateWorkQueueItem = async ({ id, data }) => {
  return base44.entities.WorkQueue.update(id, data);
};

// --- Custom Hooks ---

export const useWorkQueue = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.queue.list(options),
    queryFn: () => getWorkQueue(options),
    staleTime: 1000 * 30, // 30 seconds - more frequent for queue
    refetchInterval: 15000, // Auto-refresh every 15 seconds
  });
};

export const useUpdateWorkQueueItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateWorkQueueItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.queue.all() });
      toast.success('פריט בתור עודכן');
    },
    onError: (error) => {
      toast.error(`שגיאה בעדכון: ${error.message}`);
    },
  });
};

export const useAssignToAgent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ queueItemId, agentEmail }) =>
      base44.entities.WorkQueue.update(queueItemId, {
        assigned_to_agent: agentEmail,
        queue_status: 'assigned_to_agent',
        assigned_at: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.queue.all() });
      toast.success('קריאה שובצה לנציג');
    },
    onError: (error) => {
      toast.error(`שגיאה בשיבוץ: ${error.message}`);
    },
  });
};
