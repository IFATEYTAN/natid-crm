import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Hook for fetching vendor-scoped data via the secure backend function.
 * Use this instead of direct entity queries when the current user is a vendor,
 * to ensure they only see their own data (server-side filtering).
 *
 * @param {string} entityType - One of: 'calls', 'ratings', 'payments', 'contracts', 'attempts', 'profile'
 * @param {object} options - { enabled, sort, limit, refetchInterval }
 */
export function useVendorScopedData(entityType, options = {}) {
  const { enabled = true, sort = '-created_date', limit = 100, refetchInterval } = options;

  return useQuery({
    queryKey: queryKeys.vendors.scoped(entityType),
    queryFn: async () => {
      const result = await base44.functions.invoke('getVendorScopedData', {
        entity_type: entityType,
        sort,
        limit,
      });
      return result.data?.data || [];
    },
    enabled,
    refetchInterval,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export default useVendorScopedData;
