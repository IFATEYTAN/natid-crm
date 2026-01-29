import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ImportHistoricalDataPage() {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ];
      if (validTypes.includes(selectedFile.type) || selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls') || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        setImportResult(null);
      } else {
        toast.error('נא להעלות קובץ אקסל או CSV בלבד');
      }
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('נא לבחור קובץ להעלאה');
      return;
    }

    setIsUploading(true);
    setImportResult(null);

    try {
      // Upload file first
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Extract data from the uploaded file
      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              serve_type: { type: "string" },
              car_type: { type: "string" },
              car_name: { type: "string" },
              car_year: { type: "number" },
              description: { type: "string" },
              bot_recommendation: { type: "string" },
              bot_match: { type: "boolean" },
              nayedet_fixed: { type: "boolean" },
              diagnose: { type: "string" }
            }
          }
        }
      });

      if (extractResult.status === 'error') {
        throw new Error(extractResult.details || 'שגיאה בחילוץ הנתונים מהקובץ');
      }

      const data = extractResult.output;
      
      if (!data || data.length === 0) {
        throw new Error('לא נמצאו נתונים בקובץ');
      }

      // Transform and insert data
      const recordsToInsert = data.map(row => ({
        external_id: row.id?.toString() || '',
        serve_type: row.serve_type || '',
        car_type: row.car_type || '',
        car_name: row.car_name || '',
        car_year: row.car_year ? Number(row.car_year) : null,
        description: row.description || '',
        bot_recommendation: row.bot_recommendation || '',
        bot_match: row.bot_match === true || row.bot_match === 'true' || row.bot_match === 'כן' || row.bot_match === 1,
        nayedet_fixed: row.nayedet_fixed === true || row.nayedet_fixed === 'true' || row.nayedet_fixed === 'כן' || row.nayedet_fixed === 1,
        diagnose: row.diagnose || ''
      }));

      // Bulk create records
      await base44.entities.HistoricalCallData.bulkCreate(recordsToInsert);

      setImportResult({
        success: true,
        count: recordsToInsert.length
      });

      toast.success(`יובאו ${recordsToInsert.length} רשומות בהצלחה`);
      setFile(null);

    } catch (error) {
      console.error('Import error:', error);
      setImportResult({
        success: false,
        error: error.message || 'שגיאה בייבוא הנתונים'
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
            העלה קובץ אקסל עם נתוני הקריאות. הקובץ צריך לכלול את העמודות:
            id, serve_type, car_type, car_name, car_year, description, bot_recommendation, bot_match, nayedet_fixed, diagnose
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
              accept=".xlsx,.xls,.csv"
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
            <div className={`p-4 rounded-lg ${importResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
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