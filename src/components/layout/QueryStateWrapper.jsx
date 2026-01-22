import React from 'react';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';

/**
 * QueryStateWrapper
 * 
 * A smart wrapper component that handles loading, error, and empty states
 * for React Query results.
 * 
 * Usage:
 * ```jsx
 * const query = useQuery(...);
 * 
 * return (
 *   <QueryStateWrapper query={query} emptyMessage="אין נתונים להצגה">
 *     <YourComponent data={query.data} />
 *   </QueryStateWrapper>
 * );
 * ```
 */
export function QueryStateWrapper({ 
  query, 
  children, 
  loadingText = 'טוען נתונים...',
  errorTitle = 'שגיאה בטעינת הנתונים',
  emptyMessage,
  showEmptyState = true,
  LoadingComponent,
  ErrorComponent,
  EmptyComponent,
}) {
  // Loading state
  if (query.isLoading) {
    if (LoadingComponent) {
      return <LoadingComponent />;
    }
    return <PageLoader text={loadingText} />;
  }

  // Error state
  if (query.isError) {
    if (ErrorComponent) {
      return <ErrorComponent error={query.error} onRetry={query.refetch} />;
    }
    return (
      <ErrorMessage 
        error={query.error} 
        title={errorTitle}
        onRetry={query.refetch}
      />
    );
  }

  // Empty state
  const isEmpty = !query.data || 
    (Array.isArray(query.data) && query.data.length === 0);

  if (isEmpty && showEmptyState && emptyMessage) {
    if (EmptyComponent) {
      return <EmptyComponent />;
    }
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <svg 
            className="w-8 h-8 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" 
            />
          </svg>
        </div>
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  // Success state - render children
  return children;
}

export default QueryStateWrapper;