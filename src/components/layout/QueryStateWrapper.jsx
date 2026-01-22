import React from 'react';
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { cn } from "@/components/utils";

export function QueryStateWrapper({ query, children, loadingComponent, errorComponent }) {
  if (query.isLoading) {
    return loadingComponent || <LoadingSpinner />;
  }

  if (query.isError) {
    return errorComponent || <ErrorMessage error={query.error} />;
  }

  return children;
}