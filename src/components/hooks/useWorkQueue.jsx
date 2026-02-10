import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { queryKeys } from '@/lib/queryKeys';

export const useWorkQueue = () => {
  return useQuery({
    queryKey: queryKeys.queue.all(),
    queryFn: () => base44.entities.WorkQueue.list('-priority_score', 100),
    refetchInterval: 30000,
  });
};
