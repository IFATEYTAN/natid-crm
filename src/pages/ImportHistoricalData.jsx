import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const IMPORT_TARGETS = {
  HistoricalCallData: {
    label: 'קריאות היסטוריות',
    entity: 'HistoricalCallData',
    requiredFields: [
      { key: 'serve_type', fallback: 'לא ידוע' },
      { key: 'description', fallback: '-' },
    ],
    info: 'שדות חובה: serve_type, description',
  },
  Vendor: {
    label: 'ספקים',
    entity: 'Vendor',
    requiredFields: [
      { key: 'vendor_name', fallback: null },
      { key: 'phone', fallback: null },
    ],
    info: 'שדות חובה: vendor_name, phone',
  },
  Customer: {
    label: 'לקוחות',
    entity: 'Customer',
    requiredFields: [
      { key: 'name', fallback: null },
      { key: 'customer_type', fallback: 'other' },
      { key: 'phone', fallback: null },
    ],
    info: 'שדות חובה: name, phone, customer_type',
  },
};

export default function ImportHistoricalDataPage() {
  const [importTarget, setImportTarget] = useState('HistoricalCallData');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [selectedSheet, setSelectedSheet] = useState(0);

  const target = IMPORT_TARGETS[importTarget];

  const handleTargetChange = (value) => {
    setImportTarget(value);
    setFile(null);
    setFilePreview(null);
    setImportResult(null);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const fileName = selectedFile.name.toLowerCase();
      if (fileName.endsWith('.csv') || fileName.endsWith('.xlsx')) {
        setFile(selectedFile);
        setImportResult(null);
        setFilePreview(null);
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
        const parseCSV = (text) => {
          const lines = [];
          let currentLine = '';
          let inQuotes = false;
          for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char === '"') {
              if (inQuotes && text[i + 1] === '"') { currentLine += '"'; i++; }
              else inQuotes = !inQuotes;
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
            if (char === '"') {
              if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
              else inQuotes = !inQuotes;
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
          headers.forEach((header, idx) => { row[header] = values[idx] || ''; });
          return row;
        });
        setFilePreview({ sheets: [{ name: 'Sheet1', headers, rows: dataRows }] });
        toast.success('הקובץ טופל בהצלחה');
      } else {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheets = workbook.SheetNames.map((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          if (jsonData.length === 0) return { name: sheetName, headers: [], rows: [] };
          const headers = jsonData[0].map(h => String(h || '').trim());
          const rows = jsonData.slice(1).map((row) => {
            const rowObj = {};
            headers.forEach((header, idx) => { rowObj[header] = String(row[idx] || '').trim(); });
            return rowObj;
          });
          return { name: sheetName, headers, rows };
        });
        setFilePreview({ sheets });
        toast.success(`הקובץ טופל בהצלחה (${sheets.length} גליונות)`);
      }
    } catch (error) {
      toast.error(error.message || 'שגיאה בעיבוד הקובץ');
      setFile(null);
    }
  };

  const handleImport = async () => {
    if (!file || !filePreview) return toast.error('נא לבחור קובץ להעלאה');
    const currentSheet = filePreview.sheets[selectedSheet];
    if (!currentSheet || currentSheet.rows.length === 0) return toast.error('הגיליון הנבחר ריק');

    setIsUploading(true);
    try {
      const recordsToInsert = currentSheet.rows.map((row) => {
        const record = {};
        currentSheet.headers.forEach((header) => {
          const value = row[header];
          if (value !== null && value !== undefined && value !== '') {
            record[header] = value;
          }
        });
        // Apply fallbacks for required fields
        target.requiredFields.forEach(({ key, fallback }) => {
          if (!record[key] && fallback !== null) record[key] = fallback;
        });
        return record;
      }).filter((record) => {
        // Filter out rows missing required fields with no fallback
        return target.requiredFields.every(({ key, fallback }) => {
          return record[key] || fallback !== null;
        });
      });

      if (recordsToInsert.length === 0) {
        throw new Error('לא נמצאו רשומות תקינות לייבוא (בדוק שיש ערכים בשדות החובה)');
      }

      await base44.entities[target.entity].bulkCreate(recordsToInsert);

      setImportResult({ success: true, count: recordsToInsert.length, sheet: currentSheet.name });
      toast.success(`יובאו ${recordsToInsert.length} רשומות ל-${target.label} בהצלחה`);
      setFile(null);
      setFilePreview(null);
    } catch (error) {
      setImportResult({ success: false, error: error.message || 'שגיאה בייבוא הנתונים' });
      toast.error(error.message || 'שגיאה בייבוא הנתונים');
    } finally {
      setIsUploading(false);
    }
  };

  const currentSheet = filePreview?.sheets[selectedSheet];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-[#172B4D] mb-6">ייבוא נתונים</h1>

      {/* Step 1: Select Target */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            שלב 1: בחר סוג ייבוא
          </CardTitle>
          <CardDescription>לאיזה אנטיטי לייבא את הנתונים?</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={importTarget} onValueChange={handleTargetChange}>
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue placeholder="בחר סוג ייבוא" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(IMPORT_TARGETS).map(([key, val]) => (
                <SelectItem key={key} value={key}>{val.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-gray-500 mt-2">{target.info}</p>
        </CardContent>
      </Card>

      {/* Step 2: Upload File */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>שלב 2: בחר קובץ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400'}`}>
            <input
              type="file"
              accept=".csv,.xlsx"
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
                  <span className="text-sm text-gray-400">CSV או XLSX</span>
                </div>
              )}
            </label>
          </div>
        </CardContent>
      </Card>

      {filePreview && (
        <>
          {/* Step 3: Select Sheet */}
          {filePreview.sheets.length > 1 && (
            <Card className="mb-6">
              <CardHeader><CardTitle>שלב 3: בחר גיליון</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  {filePreview.sheets.map((sheet, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedSheet(idx)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedSheet === idx ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                    >
                      {sheet.name} ({sheet.rows?.length || 0} רשומות)
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preview */}
          {currentSheet && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>תצוגה מקדימה - {target.label}</CardTitle>
                <CardDescription>{currentSheet.rows.length} רשומות | {currentSheet.headers.length} עמודות</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        {currentSheet.headers.map((h) => {
                          const isRequired = target.requiredFields.some(f => f.key === h);
                          return (
                            <th key={h} className={`px-2 py-1 text-end text-xs font-semibold ${isRequired ? 'bg-blue-100 text-blue-900' : ''}`}>
                              {h}{isRequired && <span className="text-red-500"> *</span>}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {currentSheet.rows.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="border-t">
                          {currentSheet.headers.map((h, hIdx) => (
                            <td key={hIdx} className="px-2 py-1 text-end text-xs text-gray-600">
                              {row[h]?.toString().substring(0, 30) || <span className="text-gray-400">-</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {currentSheet.rows.length > 5 && (
                    <p className="text-xs text-gray-400 mt-2 text-center">מוצגות 5 שורות ראשונות מתוך {currentSheet.rows.length}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Import Button */}
          <Card>
            <CardContent className="pt-6">
              <Button onClick={handleImport} disabled={!currentSheet || isUploading} className="w-full bg-blue-600 hover:bg-blue-700">
                {isUploading ? (
                  <><Loader2 className="w-4 h-4 ms-2 animate-spin" />מייבא נתונים...</>
                ) : (
                  <><Upload className="w-4 h-4 ms-2" />ייבא {currentSheet?.rows.length || 0} רשומות ל{target.label}</>
                )}
              </Button>
            </CardContent>
          </Card>

          {importResult && (
            <div className={`p-4 rounded-lg mt-4 ${importResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              {importResult.success ? (
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <span>יובאו {importResult.count} רשומות ל{target.label} בהצלחה ✅</span>
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