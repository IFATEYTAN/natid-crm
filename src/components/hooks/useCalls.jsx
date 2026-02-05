import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export const useCalls = () => {
  return useQuery({
    queryKey: ['calls'],
    queryFn: () => base44.entities.Call.list('-created_date', 100),
    refetchInterval: 30000,
  });
};