import React, { Suspense } from 'react';
import { Camera, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const FileUploader = React.lazy(() => import('@/components/files/FileUploader'));

export default function CallFilesTab({ callId, photos, onFilesUploaded }) {
  return (
    <Card className="bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Camera className="w-4 h-4 text-[#6B778C]" />
          קבצים ותמונות
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Uploader */}
        <Suspense fallback={<div className="h-24 w-full bg-gray-50" />}>
          <FileUploader callId={callId} onUploadComplete={onFilesUploaded} />
        </Suspense>

        {/* Existing Files */}
        {photos.length > 0 && (
          <div>
            <h4 className="font-medium mb-3">קבצים קיימים ({photos.length})</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <a href={photo.file_url} target="_blank" rel="noopener noreferrer">
                    <div className="aspect-square rounded-lg overflow-hidden bg-[#F4F5F7] border border-[#DFE1E6]">
                      {photo.file_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <img
                          src={photo.file_url}
                          alt={photo.file_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileText className="w-8 h-8 text-[#6B778C]" />
                        </div>
                      )}
                    </div>
                  </a>
                  <p className="text-xs text-[#6B778C] mt-1 truncate">
                    {photo.file_name || photo.category}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
