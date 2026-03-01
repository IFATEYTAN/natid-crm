import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, File } from 'lucide-react';
import { exportToExcel, exportToHTML, exportToPDF } from './ExportUtils';

export default function ExportMenu({ data, filename, title }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Download className="w-4 h-4" />
          ייצוא
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuItem onClick={() => exportToExcel(data, filename, title)}>
          <FileSpreadsheet className="w-4 h-4 me-2 text-green-600" />
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportToHTML(data, filename, title)}>
          <FileText className="w-4 h-4 me-2 text-blue-600" />
          HTML מעוצב
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportToPDF(data, filename, title)}>
          <File className="w-4 h-4 me-2 text-red-600" />
          PDF / הדפסה
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}