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
      retry: 1,
      staleTime: 2 * 60 * 1000, // 2 minutes default - prevents unnecessary refetches on mount
      onError: onQueryError,
    },
    mutations: {
      onError: onMutationError,
    },
  },
});
