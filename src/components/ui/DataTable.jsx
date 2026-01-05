import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Inbox, ChevronLeft } from 'lucide-react';
import EmptyState from './EmptyState';

export default function DataTable({
  columns,
  data,
  isLoading,
  onRowClick,
  emptyMessage = 'לא נמצאו רשומות',
  emptyPreset,
  onEmptyAction,
  // Mobile card configuration
  mobileCardConfig = {
    titleAccessor: null, // Which field to show as card title
    subtitleAccessor: null, // Which field to show as subtitle
    badgeAccessor: null, // Which field to show as badge (usually status)
    showFields: [], // Which columns to show in card body (by accessor)
  },
}) {
  // Loading state - Desktop skeleton
  const LoadingSkeleton = () => (
    <>
      {/* Desktop skeleton */}
      <div className="hidden md:block card-base p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB] border-b border-[var(--color-border)]">
                {columns.map((col, idx) => (
                  <TableHead key={idx} className="text-right text-[var(--color-text-secondary)] font-medium text-sm h-12">
                    {col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, idx) => (
                <TableRow key={idx} className="border-b border-[var(--color-border)]">
                  {columns.map((col, colIdx) => (
                    <TableCell key={colIdx} className="h-14">
                      <Skeleton className="h-4 w-full bg-gray-100" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      {/* Mobile skeleton */}
      <div className="md:hidden space-y-3">
        {[...Array(5)].map((_, idx) => (
          <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <Skeleton className="h-5 w-32 bg-gray-100" />
              <Skeleton className="h-6 w-20 bg-gray-100 rounded-full" />
            </div>
            <Skeleton className="h-4 w-48 bg-gray-100 mb-3" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-full bg-gray-100" />
              <Skeleton className="h-3 w-2/3 bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    </>
  );

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!data || data.length === 0) {
    if (emptyPreset) {
      return (
        <EmptyState
          preset={emptyPreset}
          description={emptyMessage}
          onAction={onEmptyAction}
        />
      );
    }
    return (
      <div className="card-base flex flex-col items-center justify-center p-16 text-center">
        <Inbox className="w-12 h-12 text-[var(--color-text-disabled)] mb-4" strokeWidth={1} />
        <p className="text-[var(--color-text-secondary)] font-medium text-base mb-1">{emptyMessage}</p>
      </div>
    );
  }

  // Get display columns for mobile (either specified or first 3)
  const mobileColumns = mobileCardConfig.showFields.length > 0
    ? columns.filter(col => mobileCardConfig.showFields.includes(col.accessor))
    : columns.slice(0, 3);

  // Find title, subtitle, and badge columns
  const titleColumn = columns.find(col => col.accessor === mobileCardConfig.titleAccessor);
  const subtitleColumn = columns.find(col => col.accessor === mobileCardConfig.subtitleAccessor);
  const badgeColumn = columns.find(col => col.accessor === mobileCardConfig.badgeAccessor);

  return (
    <>
      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {data.map((row, rowIdx) => (
          <div
            key={row.id || rowIdx}
            onClick={() => onRowClick?.(row)}
            className={cn(
              "bg-white border border-gray-200 rounded-lg p-4 transition-all",
              onRowClick && "cursor-pointer hover:border-gray-300 hover:shadow-sm active:bg-gray-50"
            )}
          >
            {/* Card Header - Title & Badge */}
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1 min-w-0">
                {titleColumn ? (
                  <div className="font-semibold text-gray-900 truncate">
                    {titleColumn.cell ? titleColumn.cell(row) : row[titleColumn.accessor]}
                  </div>
                ) : (
                  <div className="font-semibold text-gray-900 truncate">
                    {columns[0]?.cell ? columns[0].cell(row) : row[columns[0]?.accessor]}
                  </div>
                )}
                {subtitleColumn && (
                  <div className="text-sm text-gray-500 truncate mt-0.5">
                    {subtitleColumn.cell ? subtitleColumn.cell(row) : row[subtitleColumn.accessor]}
                  </div>
                )}
              </div>
              {badgeColumn && (
                <div className="mr-3 flex-shrink-0">
                  {badgeColumn.cell ? badgeColumn.cell(row) : row[badgeColumn.accessor]}
                </div>
              )}
            </div>

            {/* Card Body - Additional Fields */}
            <div className="space-y-1.5 mt-3 pt-3 border-t border-gray-100">
              {mobileColumns
                .filter(col =>
                  col.accessor !== mobileCardConfig.titleAccessor &&
                  col.accessor !== mobileCardConfig.subtitleAccessor &&
                  col.accessor !== mobileCardConfig.badgeAccessor
                )
                .map((col, colIdx) => (
                  <div key={colIdx} className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">{col.header}</span>
                    <span className="text-gray-900 font-medium">
                      {col.cell ? col.cell(row) : row[col.accessor]}
                    </span>
                  </div>
                ))}
            </div>

            {/* Arrow indicator for clickable cards */}
            {onRowClick && (
              <div className="flex justify-end mt-3 pt-2 border-t border-gray-100">
                <ChevronLeft className="w-5 h-5 text-gray-400" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block card-base p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB] border-b border-[var(--color-border)]">
                {columns.map((col, idx) => (
                  <TableHead
                    key={idx}
                    className={cn(
                      "text-right text-[var(--color-text-secondary)] font-medium text-sm h-12 px-4 whitespace-nowrap",
                      col.className
                    )}
                  >
                    {col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, rowIdx) => (
                <TableRow
                  key={row.id || rowIdx}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "border-b border-[var(--color-border)] last:border-0 hover:bg-[#F9FAFB] transition-colors",
                    onRowClick && "cursor-pointer"
                  )}
                >
                  {columns.map((col, colIdx) => (
                    <TableCell
                      key={colIdx}
                      className={cn(
                        "h-14 px-4 text-sm text-[var(--color-text-primary)] whitespace-nowrap",
                        col.cellClassName
                      )}
                    >
                      {col.cell ? col.cell(row) : row[col.accessor]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}