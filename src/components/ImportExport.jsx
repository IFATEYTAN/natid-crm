import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function ImportExport({ entityName, data, columns }) {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const exportToExcel = () => {
    if (!data || data.length === 0) {
      toast.error('אין נתונים לייצוא');
      return;
    }

    const csvContent = convertToCSV(data, columns);
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${entityName}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast.success('הקובץ יוצא בהצלחה');
  };

  const convertToCSV = (data, columns) => {
    if (!columns || columns.length === 0) {
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(row => Object.values(row).map(v => `"${v || ''}"`).join(','));
      return [headers, ...rows].join('\n');
    }

    const headers = columns.map(col => col.header).join(',');
    const rows = data.map(row => 
      columns.map(col => {
        const value = row[col.accessor] || '';
        return `"${value}"`;
      }).join(',')
    );
    return [headers, ...rows].join('\n');
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.xlsx')) {
        toast.error('נא להעלות קובץ CSV או Excel');
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
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('הקובץ ריק או לא תקין');
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const records = [];
      const errors = [];

      for (let i = 1; i < lines.length; i++) {
        try {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
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
        errors: errors.slice(0, 10)
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
        errors: [error.message]
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" onClick={exportToExcel}>
          <Download className="w-4 h-4 ml-2" />
          ייצוא Excel
        </Button>
        <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
          <Upload className="w-4 h-4 ml-2" />
          ייבוא Excel
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
              <Input
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileChange}
                disabled={importing}
              />
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
                          <div key={idx} className="py-1">{err}</div>
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