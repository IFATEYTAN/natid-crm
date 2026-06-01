import { QueryClient } from '@tanstack/react-query';

const onMutationError = (error) => {
  // Import dynamically to avoid circular dependencies
  const message = error?.message || 'שגיאה לא ידועה';
  console.error('Mutation error:', message);
  // Toast will be shown by individual mutation onError handlers
  // This is a safety net for mutations without explicit error handling
};

const onQueryError = (error) => {
  console.error('Query error:', error?.message || error);
};

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchIntervalInBackground: false,
      retry: (failureCount, error) => {
        // Never retry on 404 (entity doesn't exist) or 403 (no access)
        if (error?.status === 404 || error?.status === 403) return false;
        return failureCount < 1;
      },
      staleTime: 2 * 60 * 1000, // 2 minutes default - prevents unnecessary refetches on mount
      onError: onQueryError,
    },
    mutations: {
      onError: onMutationError,
    },
  },
});
