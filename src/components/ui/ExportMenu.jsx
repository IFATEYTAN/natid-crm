import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileCode,
  Mail,
  ChevronDown,
  Check,
  Loader2,
  Printer,
} from 'lucide-react';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './dialog';
import { Input } from './input';
import { Textarea } from './textarea';
import { Label } from './label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Brand colors for exports
const BRAND_COLORS = {
  primary: '#FF0000',
  primaryDark: '#CC0000',
  secondary: '#212121',
  background: '#FAFAFA',
  border: '#E0E0E0',
  text: '#212121',
  textSecondary: '#616161',
};

// Export to CSV with Hebrew support
export const exportToCSV = (data, columns, filename = 'export') => {
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel Hebrew support

  // Headers
  const headers = columns.map((col) => col.header).join(',');

  // Rows
  const rows = data
    .map((row) =>
      columns
        .map((col) => {
          const value = col.accessor ? row[col.accessor] : '';
          // Escape quotes and wrap in quotes if contains comma
          const escaped = String(value || '').replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(',')
    )
    .join('\n');

  const csv = BOM + headers + '\n' + rows;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
};

// Export to styled Excel (XLSX format using CSV with styling markers)
export const exportToExcel = async (data, columns, filename = 'export', options = {}) => {
  const { title, subtitle } = options;

  // For now, export as CSV with Excel-friendly format
  // Can be enhanced with xlsx library for full styling
  const BOM = '\uFEFF';

  let content = BOM;

  // Add title if provided
  if (title) {
    content += `"${title}"\n`;
    if (subtitle) {
      content += `"${subtitle}"\n`;
    }
    content += '\n';
  }

  // Headers
  content += columns.map((col) => `"${col.header}"`).join(',') + '\n';

  // Rows
  data.forEach((row) => {
    content +=
      columns
        .map((col) => {
          const value = col.accessor ? row[col.accessor] : '';
          const escaped = String(value || '').replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(',') + '\n';
  });

  const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.xls`;
  link.click();
  URL.revokeObjectURL(link.href);
};

// Export to styled PDF
export const exportToPDF = async (data, columns, filename = 'export', options = {}) => {
  const { title, subtitle, logoUrl } = options;

  // Dynamic import for code splitting
  const { default: jsPDF } = await import('jspdf');

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  // Header with brand styling
  doc.setFillColor(BRAND_COLORS.primary);
  doc.rect(0, 0, pageWidth, 25, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text(title || filename, pageWidth - margin, 15, { align: 'right' });

  // Subtitle
  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(subtitle, pageWidth - margin, 21, { align: 'right' });
  }

  // Date
  doc.setFontSize(9);
  doc.text(new Date().toLocaleDateString('he-IL'), margin, 15);

  yPos = 35;

  // Table headers
  const colWidth = (pageWidth - 2 * margin) / columns.length;

  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 10, 'F');

  doc.setTextColor(BRAND_COLORS.secondary);
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');

  columns.forEach((col, idx) => {
    const x = pageWidth - margin - (idx + 1) * colWidth + colWidth / 2;
    doc.text(col.header, x, yPos + 7, { align: 'center' });
  });

  yPos += 12;

  // Table rows
  doc.setFont(undefined, 'normal');
  doc.setTextColor(BRAND_COLORS.text);

  data.forEach((row, rowIdx) => {
    // Check if need new page
    if (yPos > pageHeight - 20) {
      doc.addPage();
      yPos = margin;
    }

    // Alternating row colors
    if (rowIdx % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, yPos - 2, pageWidth - 2 * margin, 8, 'F');
    }

    columns.forEach((col, idx) => {
      const value = col.accessor ? String(row[col.accessor] || '') : '';
      const x = pageWidth - margin - (idx + 1) * colWidth + colWidth / 2;
      doc.text(value.substring(0, 20), x, yPos + 4, { align: 'center' });
    });

    yPos += 8;
  });

  // Footer
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`עמוד ${i} מתוך ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text('נתי שירותי דרך', margin, pageHeight - 10);
  }

  doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
};

// Export to HTML
export const exportToHTML = (data, columns, filename = 'export', options = {}) => {
  const { title, subtitle } = options;

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || filename}</title>
  <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Heebo', sans-serif;
      background: ${BRAND_COLORS.background};
      color: ${BRAND_COLORS.text};
      padding: 20px;
    }
    .header {
      background: ${BRAND_COLORS.primary};
      color: white;
      padding: 20px 30px;
      margin: -20px -20px 20px -20px;
    }
    .header h1 { font-size: 24px; margin-bottom: 5px; }
    .header p { font-size: 14px; opacity: 0.9; }
    .meta {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      color: ${BRAND_COLORS.textSecondary};
      font-size: 14px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    th {
      background: #f5f5f5;
      padding: 12px 16px;
      text-align: right;
      font-weight: 600;
      font-size: 14px;
      border-bottom: 2px solid ${BRAND_COLORS.border};
    }
    td {
      padding: 12px 16px;
      border-bottom: 1px solid ${BRAND_COLORS.border};
      font-size: 14px;
    }
    tr:nth-child(even) { background: #fafafa; }
    tr:hover { background: #f0f0f0; }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid ${BRAND_COLORS.border};
      display: flex;
      justify-content: space-between;
      color: ${BRAND_COLORS.textSecondary};
      font-size: 12px;
    }
    @media print {
      .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title || filename}</h1>
    ${subtitle ? `<p>${subtitle}</p>` : ''}
  </div>

  <div class="meta">
    <span>סה"כ רשומות: ${data.length}</span>
    <span>תאריך הפקה: ${new Date().toLocaleDateString('he-IL')}</span>
  </div>

  <table>
    <thead>
      <tr>
        ${columns.map((col) => `<th>${col.header}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${data
        .map(
          (row) => `
        <tr>
          ${columns.map((col) => `<td>${row[col.accessor] || ''}</td>`).join('')}
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>

  <div class="footer">
    <span>נתי שירותי דרך</span>
    <span>הופק מ-NATID CRM</span>
  </div>
</body>
</html>
  `.trim();

  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.html`;
  link.click();
  URL.revokeObjectURL(link.href);
};

// Print preview
export const printData = (data, columns, options = {}) => {
  const { title, subtitle } = options;

  const printWindow = window.open('', '_blank');

  printWindow.document.write(`
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <title>${title || 'הדפסה'}</title>
  <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Heebo', sans-serif; padding: 20px; }
    .header { border-bottom: 3px solid ${BRAND_COLORS.primary}; padding-bottom: 15px; margin-bottom: 20px; }
    .header h1 { color: ${BRAND_COLORS.primary}; font-size: 22px; }
    .header p { color: ${BRAND_COLORS.textSecondary}; font-size: 14px; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #f5f5f5; padding: 10px 12px; text-align: right; font-weight: 600; border: 1px solid #ddd; }
    td { padding: 8px 12px; border: 1px solid #ddd; }
    tr:nth-child(even) { background: #fafafa; }
    .footer { margin-top: 30px; font-size: 10px; color: #999; display: flex; justify-content: space-between; }
    @page { margin: 1cm; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title || 'דוח'}</h1>
    ${subtitle ? `<p>${subtitle}</p>` : ''}
    <p>תאריך: ${new Date().toLocaleDateString('he-IL')}</p>
  </div>

  <table>
    <thead>
      <tr>
        ${columns.map((col) => `<th>${col.header}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${data
        .map(
          (row) => `
        <tr>
          ${columns.map((col) => `<td>${row[col.accessor] || ''}</td>`).join('')}
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>

  <div class="footer">
    <span>נתי שירותי דרך</span>
    <span>סה"כ ${data.length} רשומות</span>
  </div>

  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>
  `);

  printWindow.document.close();
};

// Email dialog component
function EmailDialog({ open, onOpenChange, onSend, title }) {
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState(title ? `דוח: ${title}` : 'דוח מ-NATID CRM');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!email) {
      toast.error('יש להזין כתובת מייל');
      return;
    }

    setIsSending(true);
    try {
      await onSend({ email, subject, message });
      toast.success('הדוח נשלח בהצלחה');
      onOpenChange(false);
      setEmail('');
      setMessage('');
    } catch (error) {
      toast.error('שגיאה בשליחת המייל');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-[#FF0000]" />
            שליחת דוח במייל
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">כתובת מייל *</Label>
            <Input
              id="email"
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-left"
              dir="ltr"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">נושא</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">הודעה (אופציונלי)</Label>
            <Textarea
              id="message"
              placeholder="הוסף הודעה אישית..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
          <Button
            onClick={handleSend}
            isLoading={isSending}
            loadingText="שולח..."
            className="bg-[#FF0000] hover:bg-[#CC0000] text-white"
          >
            <Mail className="w-4 h-4 ml-2" />
            שלח
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Main Export Menu Component
export default function ExportMenu({
  data,
  columns,
  filename = 'export',
  title,
  subtitle,
  onEmailSend,
  showPrint = true,
  showEmail = true,
  className,
}) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  const handleExport = async (type) => {
    setIsExporting(true);
    setExportType(type);

    try {
      const options = { title, subtitle };

      switch (type) {
        case 'csv':
          exportToCSV(data, columns, filename);
          toast.success('הקובץ הורד בהצלחה');
          break;
        case 'excel':
          await exportToExcel(data, columns, filename, options);
          toast.success('הקובץ הורד בהצלחה');
          break;
        case 'pdf':
          await exportToPDF(data, columns, filename, options);
          toast.success('הקובץ הורד בהצלחה');
          break;
        case 'html':
          exportToHTML(data, columns, filename, options);
          toast.success('הקובץ הורד בהצלחה');
          break;
        case 'print':
          printData(data, columns, options);
          break;
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('שגיאה בייצוא הקובץ');
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  const exportOptions = [
    { type: 'pdf', label: 'PDF', icon: FileText, description: 'מסמך מעוצב' },
    { type: 'excel', label: 'Excel', icon: FileSpreadsheet, description: 'גיליון אלקטרוני' },
    { type: 'csv', label: 'CSV', icon: FileSpreadsheet, description: 'נתונים גולמיים' },
    { type: 'html', label: 'HTML', icon: FileCode, description: 'דף אינטרנט' },
  ];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={cn('gap-2 transition-all', isExporting && 'opacity-70', className)}
            disabled={!data?.length}
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            ייצוא
            <ChevronDown className="w-4 h-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <AnimatePresence>
            {exportOptions.map((option, idx) => (
              <motion.div
                key={option.type}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <DropdownMenuItem
                  onClick={() => handleExport(option.type)}
                  disabled={isExporting}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-3 w-full">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        option.type === 'pdf' && 'bg-red-100 text-red-600',
                        option.type === 'excel' && 'bg-green-100 text-green-600',
                        option.type === 'csv' && 'bg-blue-100 text-blue-600',
                        option.type === 'html' && 'bg-purple-100 text-purple-600'
                      )}
                    >
                      {isExporting && exportType === option.type ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <option.icon className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-gray-500">{option.description}</div>
                    </div>
                    {isExporting && exportType === option.type && (
                      <Check className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                </DropdownMenuItem>
              </motion.div>
            ))}
          </AnimatePresence>

          {(showPrint || showEmail) && <DropdownMenuSeparator />}

          {showPrint && (
            <DropdownMenuItem onClick={() => handleExport('print')} className="cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Printer className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <div className="font-medium">הדפסה</div>
                  <div className="text-xs text-gray-500">תצוגה מקדימה</div>
                </div>
              </div>
            </DropdownMenuItem>
          )}

          {showEmail && onEmailSend && (
            <DropdownMenuItem onClick={() => setEmailDialogOpen(true)} className="cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <div className="font-medium">שליחה במייל</div>
                  <div className="text-xs text-gray-500">שלח לכתובת מייל</div>
                </div>
              </div>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {showEmail && onEmailSend && (
        <EmailDialog
          open={emailDialogOpen}
          onOpenChange={setEmailDialogOpen}
          onSend={onEmailSend}
          title={title}
        />
      )}
    </>
  );
}
