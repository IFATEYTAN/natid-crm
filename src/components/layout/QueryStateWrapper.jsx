import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";

export function QueryStateWrapper({ query, children }) {
  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner className="w-8 h-8" />
      </div>
    );
  }

  if (query.isError) {
    return <ErrorMessage error={query.error} />;
  }

  // Also handle empty data state
  if (!query.data || (Array.isArray(query.data) && query.data.length === 0)) {
    return (
      <div className="text-center py-16">
        <h3 className="text-lg font-medium">לא נמצאו נתונים</h3>
        <p className="text-sm text-muted-foreground">נסה לשנות את תנאי החיפוש או לחזור מאוחר יותר.</p>
      </div>
    );
  }

  return children;
}

export default QueryStateWrapper;