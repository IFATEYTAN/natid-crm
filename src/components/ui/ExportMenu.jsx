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
  AlignRight,
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

const LOGO_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6955a04a2de0845ff4cb8a71/36b225264_NatiLogoRGB.png';

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
          // Handle React elements (like badges) by extracting text content if possible, or using raw data
          const rawValue = col.accessor ? row[col.accessor] : '';
          const value = typeof rawValue === 'object' ? JSON.stringify(rawValue) : String(rawValue || '');
          
          // Escape quotes and wrap in quotes if contains comma
          const escaped = value.replace(/"/g, '""');
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

// Export to Plain Text
export const exportToText = (data, columns, filename = 'export', options = {}) => {
  const { title } = options;
  let content = `${title || 'ייצוא נתונים'}\n`;
  content += `תאריך: ${new Date().toLocaleDateString('he-IL')}\n`;
  content += `סה"כ רשומות: ${data.length}\n`;
  content += '----------------------------------------\n\n';

  data.forEach((row, index) => {
    content += `רשומה #${index + 1}:\n`;
    columns.forEach(col => {
      const rawValue = col.accessor ? row[col.accessor] : '';
      const value = typeof rawValue === 'object' && rawValue !== null 
        ? (rawValue.name || rawValue.label || JSON.stringify(rawValue)) 
        : String(rawValue || '-');
      content += `${col.header}: ${value}\n`;
    });
    content += '\n';
  });

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.txt`;
  link.click();
  URL.revokeObjectURL(link.href);
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
      padding: 40px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      border-radius: 8px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid ${BRAND_COLORS.primary};
    }
    .logo {
      height: 60px;
    }
    .title-section h1 {
      font-size: 28px;
      color: ${BRAND_COLORS.text};
      margin-bottom: 5px;
    }
    .title-section p {
      color: ${BRAND_COLORS.textSecondary};
    }
    .meta {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
      color: ${BRAND_COLORS.textSecondary};
      font-size: 14px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th {
      background: #f8f9fa;
      color: ${BRAND_COLORS.text};
      padding: 12px 16px;
      text-align: right;
      font-weight: 700;
      font-size: 14px;
      border-bottom: 2px solid ${BRAND_COLORS.border};
    }
    td {
      padding: 12px 16px;
      border-bottom: 1px solid ${BRAND_COLORS.border};
      font-size: 14px;
      color: ${BRAND_COLORS.text};
    }
    tr:nth-child(even) { background: #fafafa; }
    tr:hover { background: #f0f0f0; }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid ${BRAND_COLORS.border};
      display: flex;
      justify-content: space-between;
      color: ${BRAND_COLORS.textSecondary};
      font-size: 12px;
    }
    @media print {
      body { padding: 0; background: white; }
      .container { box-shadow: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title-section">
        <h1>${title || filename}</h1>
        ${subtitle ? `<p>${subtitle}</p>` : ''}
      </div>
      <img src="${LOGO_URL}" alt="NatID 360" class="logo" />
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
            ${columns.map((col) => {
              const rawValue = col.accessor ? row[col.accessor] : '';
              const value = typeof rawValue === 'object' && rawValue !== null 
                ? (rawValue.name || rawValue.label || '-') 
                : String(rawValue || '');
              return `<td>${value}</td>`;
            }).join('')}
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>

    <div class="footer">
      <span>NatID 360 Control</span>
      <span>הופק ע"י המערכת</span>
    </div>
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

// Print/PDF preview (uses browser print to PDF for best Hebrew support)
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
    .header { 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      border-bottom: 3px solid ${BRAND_COLORS.primary}; 
      padding-bottom: 15px; 
      margin-bottom: 20px; 
    }
    .header-text h1 { color: ${BRAND_COLORS.text}; font-size: 24px; margin-bottom: 5px; }
    .header-text p { color: ${BRAND_COLORS.textSecondary}; font-size: 14px; }
    .logo { height: 50px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #f5f5f5; padding: 10px 12px; text-align: right; font-weight: 600; border: 1px solid #ddd; }
    td { padding: 8px 12px; border: 1px solid #ddd; }
    tr:nth-child(even) { background: #fafafa; }
    .footer { margin-top: 30px; font-size: 10px; color: #999; display: flex; justify-content: space-between; }
    @media print {
      @page { margin: 1cm; size: landscape; }
      body { -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-text">
      <h1>${title || 'דוח'}</h1>
      ${subtitle ? `<p>${subtitle}</p>` : ''}
      <p>תאריך: ${new Date().toLocaleDateString('he-IL')}</p>
    </div>
    <img src="${LOGO_URL}" alt="Logo" class="logo" />
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
          ${columns.map((col) => {
            const rawValue = col.accessor ? row[col.accessor] : '';
            const value = typeof rawValue === 'object' && rawValue !== null 
              ? (rawValue.name || rawValue.label || '-') 
              : String(rawValue || '');
            return `<td>${value}</td>`;
          }).join('')}
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>

  <div class="footer">
    <span>NatID 360 Control</span>
    <span>סה"כ ${data.length} רשומות</span>
  </div>

  <script>
    window.onload = function() { 
      setTimeout(() => {
        window.print();
      }, 500);
    }
  </script>
</body>
</html>
  `);

  printWindow.document.close();
};

// Email dialog component
function EmailDialog({ open, onOpenChange, onSend, title }) {
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState(title ? `דוח: ${title}` : 'דוח מ-NatID 360');
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
      <DialogContent className="sm:max-w-[425px]" dir="rtl">
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
      const options = { title: title || 'NatID 360 Control', subtitle };

      switch (type) {
        case 'csv':
          exportToCSV(data, columns, filename);
          toast.success('קובץ CSV הורד בהצלחה');
          break;
        case 'text':
          exportToText(data, columns, filename, options);
          toast.success('קובץ טקסט הורד בהצלחה');
          break;
        case 'excel':
          // Reusing CSV logic for Excel compatibility
          exportToCSV(data, columns, filename); 
          toast.success('קובץ Excel הורד בהצלחה');
          break;
        case 'pdf':
          // Use print-to-pdf flow for best Hebrew support
          printData(data, columns, { ...options, title: title || 'דוח PDF' });
          break;
        case 'html':
          exportToHTML(data, columns, filename, options);
          toast.success('קובץ HTML הורד בהצלחה');
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
    { type: 'html', label: 'HTML', icon: FileCode, description: 'דף אינטרנט מעוצב', color: 'bg-purple-100 text-purple-600' },
    { type: 'pdf', label: 'PDF', icon: FileText, description: 'שמירה כ-PDF', color: 'bg-red-100 text-red-600' },
    { type: 'text', label: 'Text', icon: AlignRight, description: 'קובץ טקסט רגיל', color: 'bg-gray-100 text-gray-600' },
    { type: 'csv', label: 'CSV/Excel', icon: FileSpreadsheet, description: 'גיליון נתונים', color: 'bg-green-100 text-green-600' },
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

        <DropdownMenuContent align="end" className="w-64" dir="rtl">
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
                  className="cursor-pointer py-3"
                >
                  <div className="flex items-center gap-3 w-full">
                    <div
                      className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                        option.color
                      )}
                    >
                      {isExporting && exportType === option.type ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <option.icon className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 text-right">
                      <div className="font-medium text-sm">{option.label}</div>
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
            <DropdownMenuItem onClick={() => handleExport('print')} className="cursor-pointer py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <Printer className="w-4 h-4 text-slate-600" />
                </div>
                <div className="text-right">
                  <div className="font-medium text-sm">הדפסה</div>
                  <div className="text-xs text-gray-500">תצוגה מקדימה</div>
                </div>
              </div>
            </DropdownMenuItem>
          )}

          {showEmail && onEmailSend && (
            <DropdownMenuItem onClick={() => setEmailDialogOpen(true)} className="cursor-pointer py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-orange-600" />
                </div>
                <div className="text-right">
                  <div className="font-medium text-sm">שליחה במייל</div>
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