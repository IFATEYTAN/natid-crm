import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export default function ImportHistoricalDataPage() {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [selectedSheet, setSelectedSheet] = useState(0);
  const [columnMapping, setColumnMapping] = useState({});

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const fileName = selectedFile.name.toLowerCase();
      const isValidExtension =
        fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv');

      if (isValidExtension) {
        setFile(selectedFile);
        setImportResult(null);
        setFilePreview(null);
        setColumnMapping({});
        previewFile(selectedFile);
      } else {
        toast.error('נא להעלות קובץ אקסל (.xlsx, .xls) או CSV בלבד');
      }
    }
  };

  const previewFile = async (selectedFile) => {
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
      const fileName = selectedFile.name.toLowerCase();

      if (fileName.endsWith('.csv')) {
        const response = await fetch(file_url);
        const csvText = await response.text();
        const lines = csvText.split('\n').filter((line) => line.trim());
        const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
        const dataRows = lines.slice(1, 4).map((line) => {
          const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
          const row = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx] || '';
          });
          return row;
        });
        setFilePreview({ sheets: [{ name: 'Sheet1', headers, rows: dataRows }], url: file_url });
      } else {
        const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: {
            type: 'object',
            properties: {
              sheets: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    headers: { type: 'array', items: { type: 'string' } },
                    rows: { type: 'array', items: { type: 'object' } },
                  },
                },
              },
            },
          },
        });

        if (extractResult.status === 'success' && extractResult.output) {
          setFilePreview({ sheets: extractResult.output.sheets || [], url: file_url });
        }
      }
    } catch (error) {
      console.error('Preview error:', error);
    }
  };

  const handleImport = async () => {
    if (!file || !filePreview) {
      toast.error('נא לבחור קובץ להעלאה');
      return;
    }

    const currentSheet = filePreview.sheets[selectedSheet];
    if (!currentSheet || currentSheet.rows.length === 0) {
      toast.error('הגיליון הנבחר ריק');
      return;
    }

    setIsUploading(true);

    try {
      // Transform rows according to column mapping
      const recordsToInsert = currentSheet.rows.map((row) => {
        const record = {};
        Object.entries(columnMapping).forEach(([dbField, sourceField]) => {
          if (sourceField && row[sourceField] !== undefined) {
            const value = row[sourceField];
            // Handle boolean conversions
            if (dbField === 'bot_match' || dbField === 'nayedet_fixed') {
              record[dbField] =
                value === true ||
                value === 'true' ||
                value === 'כן' ||
                value === 'yes' ||
                value === '1' ||
                value === 1;
            } else if (dbField === 'car_year') {
              record[dbField] = value ? Number(value) : null;
            } else {
              record[dbField] = value?.toString() || '';
            }
          }
        });
        return record;
      });

      if (recordsToInsert.length === 0) {
        throw new Error('לא נמצאו רשומות לייבוא');
      }

      // Bulk create records
      await base44.entities.Call.bulkCreate(recordsToInsert);

      setImportResult({
        success: true,
        count: recordsToInsert.length,
        sheet: currentSheet.name,
      });

      toast.success(`יובאו ${recordsToInsert.length} רשומות מגיליון "${currentSheet.name}" בהצלחה`);
      setFile(null);
      setFilePreview(null);
    } catch (error) {
      console.error('Import error:', error);
      setImportResult({
        success: false,
        error: error.message || 'שגיאה בייבוא הנתונים',
      });
      toast.error(error.message || 'שגיאה בייבוא הנתונים');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-[#172B4D] mb-6">ייבוא נתוני קריאות היסטוריים</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            העלאת קובץ אקסל
          </CardTitle>
          <CardDescription>
            העלה קובץ אקסל עם נתוני הקריאות. הקובץ צריך לכלול את העמודות: id, serve_type, car_type,
            car_name, car_year, description, bot_recommendation, bot_match, nayedet_fixed, diagnose
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400'
            }`}
          >
            <input
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
              disabled={isUploading}
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle className="w-12 h-12 text-green-500" />
                  <span className="text-green-700 font-medium">{file.name}</span>
                  <span className="text-sm text-gray-500">לחץ לבחירת קובץ אחר</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-12 h-12 text-gray-400" />
                  <span className="text-gray-600">גרור קובץ לכאן או לחץ לבחירה</span>
                  <span className="text-sm text-gray-400">תומך ב-Excel (.xlsx, .xls) ו-CSV</span>
                </div>
              )}
            </label>
          </div>

          <Button
            onClick={handleImport}
            disabled={!file || isUploading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                מייבא נתונים...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 ml-2" />
                ייבא נתונים
              </>
            )}
          </Button>

          {importResult && (
            <div
              className={`p-4 rounded-lg ${importResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}
            >
              {importResult.success ? (
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <span>יובאו {importResult.count} רשומות בהצלחה!</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-5 h-5" />
                  <span>{importResult.error}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}