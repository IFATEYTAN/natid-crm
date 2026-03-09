import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useVendors(options = {}) {
  return useQuery({
    queryKey: ['vendors', 'all'],
    queryFn: () => base44.entities.Vendor.list('-updated_date', 500),
    ...options,
  });
}
