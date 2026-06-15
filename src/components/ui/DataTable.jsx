import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Inbox, ChevronRight } from 'lucide-react';
import EmptyState from './EmptyState';

// Status-based row coloring map
const statusRowColors = {
  future_service: 'bg-violet-50/70 hover:bg-violet-100/70',
  waiting_treatment: 'bg-emerald-50/60 hover:bg-emerald-100/60',
  awaiting_assignment: 'bg-emerald-50/60 hover:bg-emerald-100/60',
  assigning: 'bg-yellow-50/60 hover:bg-yellow-100/60',
  vendor_enroute: 'bg-yellow-50/60 hover:bg-yellow-100/60',
  vendor_arrived: 'bg-amber-50/70 hover:bg-amber-100/70',
  in_progress: 'bg-blue-50/50 hover:bg-blue-100/50',
  in_followup: 'bg-cyan-50/50 hover:bg-cyan-100/50',
  in_storage: 'bg-stone-50/60 hover:bg-stone-100/60',
  continued_treatment: 'bg-teal-50/50 hover:bg-teal-100/50',
  awaiting_payment: 'bg-rose-50/50 hover:bg-rose-100/50',
};

export default function DataTable({
  columns,
  data,
  isLoading,
  onRowClick,
  emptyMessage = 'לא נמצאו רשומות',
  emptyPreset,
  onEmptyAction,
  rowColorField = null,
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
              <TableRow className="table-header">
                {columns.map((col, idx) => (
                  <TableHead key={idx} className="table-header-cell">
                    {col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, idx) => (
                <TableRow key={idx} className="table-row">
                  {columns.map((col, colIdx) => (
                    <TableCell key={colIdx} className="h-14">
                      <Skeleton className="h-4 w-full bg-neutral-soft-200" />
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
          <div key={idx} className="card-base card-body">
            <div className="flex justify-between items-start mb-3">
              <Skeleton className="h-5 w-32 bg-neutral-soft-200" />
              <Skeleton className="h-6 w-20 bg-neutral-soft-200 rounded-full" />
            </div>
            <Skeleton className="h-4 w-48 bg-neutral-soft-200 mb-3" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-full bg-neutral-soft-200" />
              <Skeleton className="h-3 w-2/3 bg-neutral-soft-200" />
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
        <EmptyState preset={emptyPreset} description={emptyMessage} onAction={onEmptyAction} />
      );
    }
    return (
      <div className="card-base flex flex-col items-center justify-center p-16 text-center">
        <Inbox className="w-12 h-12 text-neutral-soft-400 mb-4" strokeWidth={1} />
        <p className="text-secondary font-medium text-base mb-1">{emptyMessage}</p>
      </div>
    );
  }

  // Get display columns for mobile (either specified or first 3)
  const mobileColumns =
    mobileCardConfig.showFields.length > 0
      ? columns.filter((col) => mobileCardConfig.showFields.includes(col.accessor))
      : columns.slice(0, 3);

  // Find title, subtitle, and badge columns
  const titleColumn = columns.find((col) => col.accessor === mobileCardConfig.titleAccessor);
  const subtitleColumn = columns.find((col) => col.accessor === mobileCardConfig.subtitleAccessor);
  const badgeColumn = columns.find((col) => col.accessor === mobileCardConfig.badgeAccessor);

  return (
    <>
      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {data.map((row, rowIdx) => {
          const mobileStatusColor =
            rowColorField && row[rowColorField] ? statusRowColors[row[rowColorField]] : '';
          return (
            <div
              key={row.id || rowIdx}
              onClick={() => onRowClick?.(row)}
              className={cn(
                'card-base card-body transition-all',
                onRowClick &&
                  'cursor-pointer hover:border-neutral-soft-300 hover:shadow-md active:bg-neutral-soft-50',
                mobileStatusColor
              )}
            >
              {/* Card Header - Title & Badge */}
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0">
                  {titleColumn ? (
                    <div className="font-semibold text-neutral-soft-900 truncate">
                      {titleColumn.cell ? titleColumn.cell(row) : row[titleColumn.accessor]}
                    </div>
                  ) : (
                    <div className="font-semibold text-neutral-soft-900 truncate">
                      {columns[0]?.cell ? columns[0].cell(row) : row[columns[0]?.accessor]}
                    </div>
                  )}
                  {subtitleColumn && (
                    <div className="text-sm text-neutral-soft-500 truncate mt-0.5">
                      {subtitleColumn.cell
                        ? subtitleColumn.cell(row)
                        : row[subtitleColumn.accessor]}
                    </div>
                  )}
                </div>
                {badgeColumn && (
                  <div className="me-3 flex-shrink-0">
                    {badgeColumn.cell ? badgeColumn.cell(row) : row[badgeColumn.accessor]}
                  </div>
                )}
              </div>

              {/* Card Body - Additional Fields */}
              <div className="space-y-1.5 mt-3 pt-3 border-t border-neutral-soft-100">
                {mobileColumns
                  .filter(
                    (col) =>
                      col.accessor !== mobileCardConfig.titleAccessor &&
                      col.accessor !== mobileCardConfig.subtitleAccessor &&
                      col.accessor !== mobileCardConfig.badgeAccessor
                  )
                  .map((col, colIdx) => (
                    <div key={colIdx} className="flex justify-between items-center text-sm">
                      <span className="text-neutral-soft-500">{col.header}</span>
                      <span className="text-neutral-soft-900 font-medium">
                        {col.cell ? col.cell(row) : row[col.accessor]}
                      </span>
                    </div>
                  ))}
              </div>

              {/* Arrow indicator for clickable cards - RTL ChevronRight */}
              {onRowClick && (
                <div className="flex justify-end mt-3 pt-2 border-t border-neutral-soft-100">
                  <ChevronRight className="w-5 h-5 text-neutral-soft-400 icon-flip-rtl" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block table-container">
        <Table className="table-base">
          <TableHeader className="table-header">
            <TableRow>
              {columns.map((col, idx) => (
                <TableHead
                  key={idx}
                  className={cn('table-header-cell whitespace-nowrap', col.className)}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, rowIdx) => {
              const rowStatusColor =
                rowColorField && row[rowColorField] ? statusRowColors[row[rowColorField]] : '';
              return (
                <TableRow
                  key={row.id || rowIdx}
                  onClick={() => onRowClick?.(row)}
                  className={cn('table-row', onRowClick && 'cursor-pointer', rowStatusColor)}
                >
                  {columns.map((col, colIdx) => (
                    <TableCell
                      key={colIdx}
                      className={cn('table-cell whitespace-nowrap', col.cellClassName)}
                    >
                      {col.cell ? col.cell(row) : row[col.accessor]}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
