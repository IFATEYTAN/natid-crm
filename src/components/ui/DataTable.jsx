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
import { FileX } from 'lucide-react';

export default function DataTable({ 
  columns, 
  data, 
  isLoading, 
  onRowClick,
  emptyMessage = 'לא נמצאו רשומות'
}) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-[8px] border border-[#E0E0E0] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#FAFAFA] border-b border-[#E0E0E0]">
              {columns.map((col, idx) => (
                <TableHead key={idx} className="text-right text-[#616161] font-medium text-sm h-12">
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, idx) => (
              <TableRow key={idx}>
                {columns.map((col, colIdx) => (
                  <TableCell key={colIdx}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-[8px] border border-[#E0E0E0] p-12 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <FileX className="w-12 h-12 text-[#9E9E9E] mx-auto mb-3" strokeWidth={1.5} />
        <p className="text-[#616161] font-normal body-2">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[8px] border border-[#E0E0E0] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#FAFAFA] border-b border-[#E0E0E0]">
              {columns.map((col, idx) => (
                <TableHead 
                  key={idx} 
                  className={cn(
                    "text-right text-[#616161] font-medium text-sm whitespace-nowrap h-12",
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
                  "transition-colors",
                  onRowClick && "cursor-pointer hover:bg-[#FAFAFA]"
                )}
              >
                {columns.map((col, colIdx) => (
                  <TableCell 
                    key={colIdx}
                    className={cn("whitespace-nowrap body-2 h-14", col.cellClassName)}
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