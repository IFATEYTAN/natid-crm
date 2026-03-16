import React from 'react';
import { AlertTriangle, RefreshCw, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Shared error state component for React Query errors.
 * Shows a friendly message and distinguishes 404 (entity not found)
 * from other errors.
 */
export default function QueryErrorState({ error, onRetry, entityName }) {
  const is404 = error?.status === 404;

  if (is404) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Database className="w-12 h-12 text-[#9ca3af] mb-3" />
        <p className="text-[#374151] text-lg font-medium mb-2">
          {entityName ? `טבלת ${entityName} טרם הוגדרה` : 'הנתונים טרם הוגדרו'}
        </p>
        <p className="text-[#6b7280] text-sm max-w-md">
          יש להגדיר את טבלת הנתונים בפלטפורמת Base44 כדי להשתמש בתכונה זו.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <AlertTriangle className="w-12 h-12 text-[#f59e0b] mb-3" />
      <p className="text-[#374151] text-lg font-medium mb-2">שגיאה בטעינת נתונים</p>
      <p className="text-[#6b7280] text-sm mb-4">{error?.message || 'נסה לרענן את הדף'}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          נסה שוב
        </Button>
      )}
    </div>
  );
}
