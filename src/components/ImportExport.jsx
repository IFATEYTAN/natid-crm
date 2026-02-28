import React, { useState, useRef } from 'react';
import { base44 } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  FileType,
} from 'lucide-react';
import { toast } from 'sonner';
// html2canvas and jsPDF are loaded dynamically to reduce bundle size
import { format } from 'date-fns';

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default function ImportExport({ entityName, data, columns, title }) {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const printRef = useRef(null);

  const getFilename = (ext) =>
    `${entityName || 'export'}_${format(new Date(), 'dd-MM-yyyy')}.${ext}`;

  const exportToCSV = () => {
    if (!data || data.length === 0) {
      toast.error('אין נתונים לייצוא');
      return;
    }

    const csvContent = convertToCSV(data, columns);
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = getFilename('csv');
    link.click();

    toast.success('קובץ CSV יוצא בהצלחה');
  };

  const exportToHTML = () => {
    if (!data || data.length === 0) {
      toast.error('אין נתונים לייצוא');
      return;
    }

    const htmlContent = generateHTML(data, columns, title || entityName);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = getFilename('html');
    link.click();

    toast.success('קובץ HTML יוצא בהצלחה');
  };

  const exportToPDF = async () => {
    if (!data || data.length === 0) {
      toast.error('אין נתונים לייצוא');
      return;
    }

    const toastId = toast.loading('מכין קובץ PDF...');

    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      // Create a temporary container for rendering
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '1000px'; // Fixed width for consistent PDF
      container.style.backgroundColor = 'white';
      container.innerHTML = generateHTMLTableOnly(data, columns, title || entityName);
      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 2, // Higher resolution
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(getFilename('pdf'));
      document.body.removeChild(container);
      toast.dismiss(toastId);
      toast.success('קובץ PDF יוצא בהצלחה');
    } catch (error) {
      console.error('PDF Export Error:', error);
      toast.dismiss(toastId);
      toast.error('שגיאה בייצוא PDF');
    }
  };

  const generateHTML = (data, columns, pageTitle) => {
    const tableContent = generateHTMLTableOnly(data, columns, pageTitle);
    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <title>${escapeHtml(pageTitle)}</title>
        <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Heebo', sans-serif; margin: 0; padding: 20px; background-color: #f9fafb; direction: rtl; }
          .report-container { max-width: 1000px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          ${getReportStyles()}
        </style>
      </head>
      <body>
        <div class="report-container">
          ${tableContent}
        </div>
      </body>
      </html>
    `;
  };

  const getReportStyles = () => `
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #FF0000; padding-bottom: 20px; }
    .brand-logo { color: #FF0000; font-size: 24px; font-weight: bold; margin-bottom: 10px; }
    .report-title { font-size: 28px; color: #111827; margin: 0; font-weight: 700; }
    .report-date { color: #6B7280; font-size: 14px; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background-color: #F3F4F6; color: #374151; font-weight: 600; text-align: right; padding: 12px 16px; border-bottom: 2px solid #E5E7EB; font-size: 14px; }
    td { padding: 12px 16px; border-bottom: 1px solid #E5E7EB; color: #111827; font-size: 14px; vertical-align: top; }
    tr:nth-child(even) { background-color: #F9FAFB; }
    .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #9CA3AF; border-top: 1px solid #E5E7EB; padding-top: 20px; }
  `;

  const generateHTMLTableOnly = (data, columns, pageTitle) => {
    const today = format(new Date(), 'dd/MM/yyyy HH:mm');

    // Process headers and rows
    const effectiveColumns =
      columns && columns.length > 0
        ? columns
        : Object.keys(data[0] || {}).map((key) => ({ header: key, accessor: key }));

    const headers = effectiveColumns.map((col) => `<th>${escapeHtml(col.header)}</th>`).join('');

    const rows = data
      .map((row) => {
        const cells = effectiveColumns
          .map((col) => {
            // Handle custom cell renderers if they return strings/numbers, otherwise use accessor
            let value = row[col.accessor];
            if (value === undefined || value === null) value = '';
            // Note: Complex React components in 'cell' prop won't render here. We rely on accessor or simple values.
            // For formatted exports, columns should ideally map to string values or we fallback to accessor.
            return `<td>${escapeHtml(value)}</td>`;
          })
          .join('');
        return `<tr>${cells}</tr>`;
      })
      .join('');

    return `
      <div class="header">
        <div class="brand-logo">נתי - שירותי דרך</div>
        <h1 class="report-title">${escapeHtml(pageTitle)}</h1>
        <div class="report-date">הופק בתאריך: ${today}</div>
      </div>
      <table>
        <thead>
          <tr>${headers}</tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <div class="footer">
        מסמך זה הופק באופן אוטומטי ע"י מערכת נתי שירותי דרך
      </div>
    `;
  };

  const sanitizeCsvValue = (val) => {
    const str = String(val ?? '').replace(/"/g, '""');
    // Prevent CSV formula injection
    if (/^[=+\-@\t\r]/.test(str)) return `'${str}`;
    return str;
  };

  const convertToCSV = (data, columns) => {
    if (!columns || columns.length === 0) {
      const headers = Object.keys(data[0] || {}).join(',');
      const rows = data.map((row) =>
        Object.values(row)
          .map((v) => `"${sanitizeCsvValue(v)}"`)
          .join(',')
      );
      return [headers, ...rows].join('\n');
    }

    const headers = columns.map((col) => col.header).join(',');
    const rows = data.map((row) =>
      columns
        .map((col) => {
          const value = row[col.accessor] || '';
          return `"${sanitizeCsvValue(value)}"`;
        })
        .join(',')
    );
    return [headers, ...rows].join('\n');
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast.error('נא להעלות קובץ CSV');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('נא לבחור קובץ');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter((line) => line.trim());

      if (lines.length < 2) {
        throw new Error('הקובץ ריק או לא תקין');
      }

      const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
      const records = [];
      const errors = [];

      for (let i = 1; i < lines.length; i++) {
        try {
          const values = lines[i].split(',').map((v) => v.trim().replace(/"/g, ''));
          const record = {};

          headers.forEach((header, idx) => {
            if (values[idx]) {
              record[header] = values[idx];
            }
          });

          records.push(record);
        } catch (err) {
          errors.push(`שורה ${i + 1}: ${err.message}`);
        }
      }

      if (records.length === 0) {
        throw new Error('לא נמצאו רשומות תקינות בקובץ');
      }

      // Import to database
      let successCount = 0;
      let failCount = 0;

      for (const record of records) {
        try {
          await base44.entities[entityName].create(record);
          successCount++;
        } catch (err) {
          failCount++;
          errors.push(`שגיאה ביצירת רשומה: ${err.message}`);
        }
      }

      setImportResult({
        success: successCount,
        failed: failCount,
        errors: errors.slice(0, 10),
      });

      if (successCount > 0) {
        toast.success(`${successCount} רשומות יובאו בהצלחה`);
      }

      if (failCount > 0) {
        toast.error(`${failCount} רשומות נכשלו`);
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error(`שגיאה בייבוא: ${error.message}`);
      setImportResult({
        success: 0,
        failed: 0,
        errors: [error.message],
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              ייצוא נתונים
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportToPDF} className="gap-2 cursor-pointer">
              <FileType className="w-4 h-4" />
              ייצוא ל-PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportToHTML} className="gap-2 cursor-pointer">
              <FileCode className="w-4 h-4" />
              ייצוא ל-HTML
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportToCSV} className="gap-2 cursor-pointer">
              <FileSpreadsheet className="w-4 h-4" />
              ייצוא ל-Excel/CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
          <Upload className="w-4 h-4 ms-2" />
          ייבוא נתונים
        </Button>
      </div>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>ייבוא נתונים מ-Excel</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>בחר קובץ CSV/Excel</Label>
              <Input type="file" accept=".csv" onChange={handleFileChange} disabled={importing} />
              {file && (
                <div className="flex items-center gap-2 text-sm text-[#616161]">
                  <FileSpreadsheet className="w-4 h-4" />
                  {file.name}
                </div>
              )}
            </div>

            <div className="bg-[#E3F2FD] p-4 rounded-lg text-sm">
              <p className="font-medium mb-2">הנחיות:</p>
              <ul className="list-disc list-inside space-y-1 text-[#616161]">
                <li>השורה הראשונה צריכה להכיל כותרות עמודות</li>
                <li>שדות חובה: name, phone</li>
                <li>פורמט תאריכים: YYYY-MM-DD</li>
                <li>קידוד: UTF-8</li>
              </ul>
            </div>

            {importResult && (
              <div className="space-y-2">
                {importResult.success > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-[#E8F5E9] rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-[#2E7D32]" />
                    <span className="text-sm font-medium">
                      {importResult.success} רשומות יובאו בהצלחה
                    </span>
                  </div>
                )}

                {importResult.failed > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-3 bg-[#FFEBEE] rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-[#D32F2F]" />
                      <span className="text-sm font-medium">
                        {importResult.failed} רשומות נכשלו
                      </span>
                    </div>
                    {importResult.errors.length > 0 && (
                      <div className="text-xs text-[#616161] max-h-32 overflow-y-auto">
                        {importResult.errors.map((err, idx) => (
                          <div key={idx} className="py-1">
                            {err}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setImportDialogOpen(false);
                setFile(null);
                setImportResult(null);
              }}
            >
              סגור
            </Button>
            <Button
              onClick={handleImport}
              disabled={!file || importing}
              className="bg-[#0078D4] hover:bg-[#1976D2]"
            >
              {importing ? 'מייבא...' : 'ייבא נתונים'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
