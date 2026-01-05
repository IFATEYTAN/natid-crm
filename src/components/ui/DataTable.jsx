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
import { Inbox } from 'lucide-react';

export default function DataTable({ 
  columns, 
  data, 
  isLoading, 
  onRowClick,
  emptyMessage = 'לא נמצאו רשומות'
}) {
  if (isLoading) {
    return (
      <div className="card-base p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50 border-b border-gray-200/60">
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
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="card-base flex flex-col items-center justify-center p-16 text-center">
        <Inbox className="w-12 h-12 text-[var(--color-text-disabled)] mb-4" strokeWidth={1} />
        <p className="text-[var(--color-text-secondary)] font-medium text-base mb-1">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="card-base p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50 border-b border-gray-200/60">
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
                  "border-b border-gray-100/50 last:border-0 hover:bg-white/50 transition-colors",
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
  );
  }