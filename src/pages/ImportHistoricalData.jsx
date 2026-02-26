import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

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
      const isValidExtension = fileName.endsWith('.csv') || fileName.endsWith('.xlsx');

      if (isValidExtension) {
        setFile(selectedFile);
        setImportResult(null);
        setFilePreview(null);
        setColumnMapping({});
        previewFile(selectedFile);
      } else {
        toast.error('נא לבחור קובץ CSV או XLSX');
      }
    }
  };

  const previewFile = async (selectedFile) => {
    try {
      toast.loading('עיבוד הקובץ...');
      const fileName = selectedFile.name.toLowerCase();

      if (fileName.endsWith('.csv')) {
        const csvText = await selectedFile.text();
        
        // Parse CSV properly, handling quoted values
        const parseCSV = (text) => {
          const lines = [];
          let currentLine = '';
          let inQuotes = false;
          
          for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const nextChar = text[i + 1];
            
            if (char === '"') {
              if (inQuotes && nextChar === '"') {
                currentLine += '"';
                i++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === '\n' && !inQuotes) {
              if (currentLine.trim()) lines.push(currentLine);
              currentLine = '';
            } else {
              currentLine += char;
            }
          }
          if (currentLine.trim()) lines.push(currentLine);
          return lines;
        };
        
        const parseRow = (line) => {
          const values = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
              if (inQuotes && nextChar === '"') {
                current += '"';
                i++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              values.push(current.trim().replace(/^"|"$/g, ''));
              current = '';
            } else {
              current += char;
            }
          }
          values.push(current.trim().replace(/^"|"$/g, ''));
          return values;
        };
        
        const lines = parseCSV(csvText);
        const headers = parseRow(lines[0]);
        const dataRows = lines.slice(1).map((line) => {
          const values = parseRow(line);
          const row = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx] || '';
          });
          return row;
        });
        
        setFilePreview({ sheets: [{ name: 'Sheet1', headers, rows: dataRows }], url: null });
        toast.success('הקובץ טופל בהצלחה');
      } else if (fileName.endsWith('.xlsx')) {
        // Parse Excel file using XLSX library
        const arrayBuffer = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        const sheets = workbook.SheetNames.map((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: ''
          });
          
          if (jsonData.length === 0) {
            return { name: sheetName, headers: [], rows: [] };
          }
          
          const headers = jsonData[0].map(h => String(h || '').trim());
          const rows = jsonData.slice(1).map((row) => {
            const rowObj = {};
            headers.forEach((header, idx) => {
              rowObj[header] = String(row[idx] || '').trim();
            });
            return rowObj;
          });
          
          return { name: sheetName, headers, rows };
        });
        
        setFilePreview({ sheets, url: null });
        toast.success(`הקובץ טופל בהצלחה (${sheets.length} גליונות)`);
      } else {
        throw new Error('נא לבחור קובץ CSV או XLSX');
      }
    } catch (error) {
      console.error('Preview error:', error);
      toast.error(error.message || 'שגיאה בעיבוד הקובץ');
      setFile(null);
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
      // Import all rows as-is from the sheet, removing null values
      const recordsToInsert = currentSheet.rows
        .map((row) => {
          const record = {};
          currentSheet.headers.forEach((header) => {
            const value = row[header];
            // Only include non-null/non-empty values
            if (value !== null && value !== undefined && value !== '') {
              record[header] = value;
            }
          });
          return record;
        })
        .filter((record) => Object.keys(record).length > 0); // Filter out empty records

      if (recordsToInsert.length === 0) {
        throw new Error('לא נמצאו רשומות עם נתונים לייבוא');
      }

      // Bulk create records directly to HistoricalCallData
      await base44.entities.HistoricalCallData.bulkCreate(recordsToInsert);

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

  const currentSheet = filePreview?.sheets[selectedSheet];
  // Get all available column headers from the current sheet
  const availableColumns = currentSheet?.headers || [];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-[#172B4D] mb-6">ייבוא נתוני קריאות היסטוריים</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            שלב 1: בחר קובץ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400'
            }`}
          >
            <input
              type="file"
              accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
                  <span className="text-sm text-gray-400">CSV בלבד</span>
                </div>
              )}
            </label>
          </div>
        </CardContent>
      </Card>

      {filePreview && (
        <>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>שלב 2: בחר גיליון</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {filePreview.sheets.map((sheet, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedSheet(idx)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedSheet === idx
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    }`}
                  >
                    {sheet.name} ({sheet.rows?.length || 0} רשומות)
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {currentSheet && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>שלב 3: מיפוי עמודות</CardTitle>
                <CardDescription>
                  בחר איזו עמודה מהקובץ מתאימה לכל שדה בדאטאבייס
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-900">
                    ✅ <strong>כל העמודות</strong> מהקובץ יועלו בדיוק כמו שהן. אין צורך במיפוי.
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">עמודות שיעלו:</h4>
                  <div className="flex flex-wrap gap-2">
                    {availableColumns.map((col) => (
                      <span
                        key={col}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">תצוגה מקדימה:</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-blue-100">
                        <tr>
                          {currentSheet.headers.slice(0, 5).map((h) => (
                            <th key={h} className="px-2 py-1 text-right">{h}</th>
                          ))}
                          {currentSheet.headers.length > 5 && (
                            <th className="px-2 py-1 text-right">...</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {currentSheet.rows.slice(0, 3).map((row, idx) => (
                          <tr key={idx} className="border-t">
                            {currentSheet.headers.slice(0, 5).map((h) => (
                              <td key={h} className="px-2 py-1 text-right text-gray-600">
                                {row[h]?.toString().substring(0, 30)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="mt-6">
            <CardContent className="pt-6">
              <Button
                onClick={handleImport}
                disabled={!currentSheet || isUploading}
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
                    ייבא {currentSheet?.rows.length || 0} רשומות
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {importResult && (
            <div
              className={`p-4 rounded-lg mt-6 ${importResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}
            >
              {importResult.success ? (
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <span>יובאו {importResult.count} רשומות מ-"{importResult.sheet}" בהצלחה! ✅</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-5 h-5" />
                  <span>{importResult.error}</span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}