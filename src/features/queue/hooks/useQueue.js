import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import * as queueApi from '../api';

/**
 * Hook for fetching all work queue items
 */
export const useWorkQueue = (sort = '-priority_score', refetchInterval = 15000) => {
  return useQuery({
    queryKey: queryKeys.queue.all(),
    queryFn: () => queueApi.getWorkQueue(sort),
    refetchInterval,
  });
};

/**
 * Hook for fetching a single queue item by ID
 */
export const useQueueItem = (itemId) => {
  return useQuery({
    queryKey: queryKeys.queue.detail(itemId),
    queryFn: () => queueApi.getQueueItemById(itemId),
    enabled: !!itemId,
  });
};

/**
 * Hook for fetching queue items with filters
 */
export const useFilteredQueue = (filters, sort = '-priority_score', limit) => {
  return useQuery({
    queryKey: queryKeys.queue.list(filters),
    queryFn: () => queueApi.filterWorkQueue(filters, sort, limit),
    enabled: !!filters,
  });
};

/**
 * Hook for updating a queue item
 */
export const useUpdateQueueItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => queueApi.updateQueueItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.queue.all() });
    },
  });
};

/**
 * Hook for assigning queue item to agent
 */
export const useAssignToAgent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ queueId, agentEmail }) => queueApi.assignToAgent(queueId, agentEmail),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.queue.all() });
    },
  });
};

/**
 * Hook for starting work on queue item
 */
export const useStartQueueItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: queueApi.startQueueItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.queue.all() });
    },
  });
};

/**
 * Hook for completing a queue item
 */
export const useCompleteQueueItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ queueId, timeToComplete }) => queueApi.completeQueueItem(queueId, timeToComplete),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.queue.all() });
    },
  });
};

/**
 * Hook for creating a queue item
 */
export const useCreateQueueItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: queueApi.createQueueItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.queue.all() });
    },
  });
};

/**
 * Hook for deleting a queue item
 */
export const useDeleteQueueItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: queueApi.deleteQueueItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.queue.all() });
    },
  });
};
