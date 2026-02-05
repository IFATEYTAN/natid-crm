import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export const useVendors = () => {
  return useQuery({
    queryKey: ['vendors'],
    queryFn: () => base44.entities.Vendor.list(),
    refetchInterval: 60000,
  });
};