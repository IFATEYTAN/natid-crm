import { PageLoader, CardSkeleton, TableSkeleton } from "@/components/ui/LoadingSpinner";
import { ErrorMessage, EmptyState } from "@/components/ui/ErrorMessage";

export function QueryStateWrapper({ 
  query, 
  children, 
  loadingType = "spinner", // "spinner" | "card" | "table"
  loadingText,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  emptyAction,
  onRetry,
  skeletonCount = 3,
  tableRows = 5,
  tableCols = 4
}) {
  if (query.isLoading) {
    switch (loadingType) {
      case "card":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        );
      case "table":
        return <TableSkeleton rows={tableRows} cols={tableCols} />;
      default:
        return <PageLoader text={loadingText} />;
    }
  }

  if (query.isError) {
    return (
      <ErrorMessage 
        error={query.error} 
        onRetry={onRetry || query.refetch}
      />
    );
  }

  // Handle empty data state
  if (!query.data || (Array.isArray(query.data) && query.data.length === 0)) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return children;
}

export default QueryStateWrapper;