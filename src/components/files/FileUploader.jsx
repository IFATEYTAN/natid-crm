import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Upload,
  X,
  FileImage,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  Camera,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const categoryLabels = {
  before_treatment: 'לפני טיפול',
  after_treatment: 'אחרי טיפול',
  damage: 'נזק',
  customer_document: 'מסמך לקוח',
  customer_signature: 'חתימת לקוח',
  other: 'אחר',
};

export default function FileUploader({
  callId,
  onUploadComplete,
  maxFiles = 10,
  acceptedTypes = 'image/*,application/pdf',
  showCategory = true,
}) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState('other');
  const [note, setNote] = useState('');
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (files.length + selectedFiles.length > maxFiles) {
      toast.error(`ניתן להעלות עד ${maxFiles} קבצים`);
      return;
    }

    const newFiles = selectedFiles.map((file) => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      status: 'pending', // pending | uploading | success | error
      progress: 0,
      url: null,
    }));

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (fileId) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === fileId);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== fileId);
    });
  };

  const uploadFiles = async () => {
    if (files.length === 0) {
      toast.error('נא לבחור קבצים להעלאה');
      return;
    }

    setUploading(true);
    const uploadedFiles = [];

    for (let i = 0; i < files.length; i++) {
      const fileItem = files[i];
      if (fileItem.status === 'success') continue;

      try {
        // Update status to uploading
        setFiles((prev) =>
          prev.map((f) => (f.id === fileItem.id ? { ...f, status: 'uploading', progress: 30 } : f))
        );

        // Upload file using Base44 integration
        const { file_url } = await base44.integrations.Core.UploadFile({
          file: fileItem.file,
        });

        // Update status to success
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id ? { ...f, status: 'success', progress: 100, url: file_url } : f
          )
        );

        // Save to CallPhoto entity if callId provided
        if (callId) {
          const photoRecord = await base44.entities.CallPhoto.create({
            call_id: callId,
            file_url: file_url,
            file_name: fileItem.name,
            file_size: fileItem.size,
            category: category,
            note: note,
            uploaded_by: 'operator', // Will be replaced with actual user
          });
          uploadedFiles.push(photoRecord);
        } else {
          uploadedFiles.push({ file_url, file_name: fileItem.name, category });
        }
      } catch (error) {
        console.error('Upload error:', error);
        setFiles((prev) =>
          prev.map((f) => (f.id === fileItem.id ? { ...f, status: 'error', progress: 0 } : f))
        );
        toast.error(`שגיאה בהעלאת ${fileItem.name}`);
      }
    }

    setUploading(false);

    if (uploadedFiles.length > 0) {
      toast.success(`${uploadedFiles.length} קבצים הועלו בהצלחה`);
      if (onUploadComplete) {
        onUploadComplete(uploadedFiles);
      }
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return FileImage;
    return FileText;
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          'border-[#DFE1E6] hover:border-red-400 hover:bg-red-50/50'
        )}
      >
        <Upload className="w-10 h-10 mx-auto mb-3 text-[#6B778C]" />
        <p className="text-sm font-medium text-[#172B4D] mb-1">גרור קבצים לכאן או לחץ לבחירה</p>
        <p className="text-xs text-[#6B778C]">תמונות (JPG, PNG) ומסמכים (PDF) עד 10MB</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Camera Button (Mobile) */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1 gap-2"
          onClick={() => cameraInputRef.current?.click()}
        >
          <Camera className="w-4 h-4" />
          צלם תמונה
        </Button>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          className="flex-1 gap-2"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-4 h-4" />
          בחר קובץ
        </Button>
      </div>

      {/* Category & Note */}
      {showCategory && files.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm">קטגוריה</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">הערה (אופציונלי)</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="הערה לקובץ..."
            />
          </div>
        </div>
      )}

      {/* Files List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((fileItem) => {
            const FileIcon = getFileIcon(fileItem.type);

            return (
              <Card key={fileItem.id} className="bg-white">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    {/* Preview/Icon */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#F4F5F7] flex items-center justify-center shrink-0">
                      {fileItem.preview ? (
                        <img
                          src={fileItem.preview}
                          alt={fileItem.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FileIcon className="w-6 h-6 text-[#6B778C]" />
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#172B4D] truncate">{fileItem.name}</p>
                      <p className="text-xs text-[#6B778C]">{formatFileSize(fileItem.size)}</p>
                      {fileItem.status === 'uploading' && (
                        <Progress value={fileItem.progress} className="h-1 mt-1" />
                      )}
                    </div>

                    {/* Status/Actions */}
                    <div className="flex items-center gap-2">
                      {fileItem.status === 'pending' && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFile(fileItem.id)}
                        >
                          <X className="w-4 h-4 text-[#6B778C]" />
                        </Button>
                      )}
                      {fileItem.status === 'uploading' && (
                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                      )}
                      {fileItem.status === 'success' && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                      {fileItem.status === 'error' && (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload Button */}
      {files.length > 0 && (
        <Button
          onClick={uploadFiles}
          disabled={uploading || files.every((f) => f.status === 'success')}
          className="w-full bg-[#FF0000] hover:bg-[#CC0000] gap-2"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              מעלה קבצים...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              העלה {files.filter((f) => f.status === 'pending').length} קבצים
            </>
          )}
        </Button>
      )}
    </div>
  );
}
