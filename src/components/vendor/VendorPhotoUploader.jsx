import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { showToast } from '@/components/ui/FeedbackToast';
import {
  Camera,
  Upload,
  Loader2,
  X,
  CheckCircle,
  Image,
  Trash2,
  ZoomIn,
  Car,
  FileText,
  Shield,
  Gauge,
} from 'lucide-react';

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_PREFIXES = ['image/', 'application/pdf'];

const PHOTO_CATEGORIES = [
  {
    key: 'before_treatment',
    label: 'לפני טיפול',
    icon: Camera,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  {
    key: 'after_treatment',
    label: 'אחרי טיפול',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-700 border-green-200',
  },
  { key: 'damage', label: 'נזק', icon: Shield, color: 'bg-red-100 text-red-700 border-red-200' },
  {
    key: 'license_plate',
    label: 'לוחית רישוי',
    icon: Car,
    color: 'bg-purple-100 text-purple-700 border-purple-200',
  },
  {
    key: 'odometer',
    label: 'מד אוץ',
    icon: Gauge,
    color: 'bg-orange-100 text-orange-700 border-orange-200',
  },
  {
    key: 'insurance_card',
    label: 'תעודת ביטוח',
    icon: FileText,
    color: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  },
  {
    key: 'customer_document',
    label: 'מסמך לקוח',
    icon: FileText,
    color: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  { key: 'other', label: 'אחר', icon: Image, color: 'bg-gray-100 text-gray-700 border-gray-200' },
];

export default function VendorPhotoUploader({
  callId,
  vendorName,
  photos,
  onPhotoAdded,
  onPhotoDeleted,
  disabled,
}) {
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('before_treatment');
  const [note, setNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFiles = async (files) => {
    if (!files?.length) return;

    // Validate files BEFORE starting upload — keeps oversized videos and
    // unsupported file types from silently failing at the storage layer.
    const valid = [];
    const rejections = [];
    for (const file of Array.from(files)) {
      const isAllowedType = ALLOWED_MIME_PREFIXES.some((p) => file.type?.startsWith(p));
      if (!isAllowedType) {
        rejections.push(`${file.name}: סוג קובץ לא נתמך (${file.type || 'לא ידוע'})`);
      } else if (file.size > MAX_FILE_BYTES) {
        rejections.push(`${file.name}: גודל הקובץ חורג מ-10MB`);
      } else {
        valid.push(file);
      }
    }
    if (rejections.length) {
      showToast.error(rejections.join('\n'));
    }
    if (!valid.length) return;

    setUploading(true);

    const newPhotos = [];
    for (const file of valid) {
      const preview = URL.createObjectURL(file);
      newPhotos.push({ file, preview, status: 'uploading' });
    }
    setUploadQueue(newPhotos);

    for (let i = 0; i < newPhotos.length; i++) {
      const item = newPhotos[i];
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: item.file });
        const photoData = {
          call_id: callId,
          uploaded_by: vendorName || 'ספק',
          file_url,
          file_name: item.file.name,
          file_size: Math.round(item.file.size / 1024),
          category: selectedCategory,
          note: note || '',
          is_deleted: false,
          ai_extraction_status: 'pending',
        };
        const created = await base44.entities.CallPhoto.create(photoData);
        newPhotos[i].status = 'done';
        newPhotos[i].id = created.id;
        setUploadQueue([...newPhotos]);
        onPhotoAdded?.({ ...photoData, id: created.id, file_url });
      } catch (err) {
        newPhotos[i].status = 'error';
        newPhotos[i].errorMessage = err?.message || 'שגיאה בהעלאה';
        setUploadQueue([...newPhotos]);
      }
    }

    setUploading(false);
    setNote('');
    const succeeded = newPhotos.filter((p) => p.status === 'done').length;
    const failed = newPhotos.length - succeeded;
    if (succeeded > 0) showToast.success(`${succeeded} תמונות הועלו בהצלחה`);
    if (failed > 0) showToast.error(`${failed} תמונות נכשלו - נסי שוב`);
    setTimeout(() => {
      setUploadQueue([]);
      if (failed === 0) setShowUploadDialog(false);
    }, 1000);
  };

  const handleDelete = async (photoId) => {
    try {
      await base44.entities.CallPhoto.update(photoId, { is_deleted: true });
      onPhotoDeleted?.(photoId);
      showToast.success('התמונה נמחקה');
    } catch (error) {
      showToast.error(`מחיקת התמונה נכשלה: ${error?.message || 'שגיאת רשת'}`);
    }
  };

  const getCategoryInfo = (key) =>
    PHOTO_CATEGORIES.find((c) => c.key === key) || PHOTO_CATEGORIES[PHOTO_CATEGORIES.length - 1];

  const groupedPhotos = PHOTO_CATEGORIES.reduce((acc, cat) => {
    const catPhotos = (photos || []).filter((p) => p.category === cat.key && !p.is_deleted);
    if (catPhotos.length > 0) acc.push({ ...cat, photos: catPhotos });
    return acc;
  }, []);

  return (
    <div className="space-y-4">
      {/* Upload button */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <Camera className="w-5 h-5" />
          תמונות ומסמכים ({(photos || []).filter((p) => !p.is_deleted).length})
        </h3>
        <Button
          size="sm"
          onClick={() => setShowUploadDialog(true)}
          disabled={disabled}
          className="gap-1"
        >
          <Upload className="w-4 h-4" />
          העלה תמונות
        </Button>
      </div>

      {/* Photos grouped by category */}
      {groupedPhotos.length === 0 ? (
        <Card className="bg-gray-50 border-dashed">
          <CardContent className="p-8 text-center">
            <Camera className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">אין תמונות עדיין</p>
            <p className="text-gray-300 text-xs mt-1">העלה תמונות של הרכב, נזק, מסמכים</p>
          </CardContent>
        </Card>
      ) : (
        groupedPhotos.map((group) => (
          <div key={group.key}>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className={`text-xs ${group.color}`}>
                {group.label} ({group.photos.length})
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {group.photos.map((photo) => (
                <div key={photo.id} className="relative group rounded-lg overflow-hidden border">
                  <img
                    src={photo.file_url}
                    alt={photo.file_name}
                    className="w-full h-24 object-cover cursor-pointer"
                    onClick={() => setShowPreview(photo)}
                  />
                  {/* AI status indicator */}
                  {photo.ai_extraction_status === 'completed' && (
                    <div className="absolute top-1 start-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {photo.ai_extraction_status === 'processing' && (
                    <div className="absolute top-1 start-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <Loader2 className="w-3 h-3 text-white animate-spin" />
                    </div>
                  )}
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setShowPreview(photo)}
                        className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center"
                      >
                        <ZoomIn className="w-4 h-4 text-gray-700" />
                      </button>
                      {!disabled && (
                        <button
                          onClick={() => handleDelete(photo.id)}
                          className="w-8 h-8 bg-red-500/90 rounded-full flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4 text-white" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>העלאת תמונות</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Category selector */}
            <div>
              <Label className="mb-2 block">קטגוריה</Label>
              <div className="grid grid-cols-2 gap-2">
                {PHOTO_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.key}
                      onClick={() => setSelectedCategory(cat.key)}
                      className={`p-2.5 rounded-lg border text-sm flex items-center gap-2 transition-colors ${
                        selectedCategory === cat.key
                          ? cat.color + ' font-medium border-2'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Note */}
            <div>
              <Label>הערה (אופציונלי)</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="תיאור קצר..."
                rows={2}
              />
            </div>

            {/* Upload buttons */}
            <div className="grid grid-cols-2 gap-3">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleFiles(e.target.files)}
                ref={cameraInputRef}
                className="hidden"
              />
              <Button
                variant="outline"
                className="h-20 flex-col gap-2 border-2 border-dashed"
                onClick={() => cameraInputRef.current?.click()}
                disabled={uploading}
              >
                <Camera className="w-6 h-6 text-blue-500" />
                <span className="text-xs">צלם תמונה</span>
              </Button>

              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFiles(e.target.files)}
                ref={fileInputRef}
                className="hidden"
              />
              <Button
                variant="outline"
                className="h-20 flex-col gap-2 border-2 border-dashed"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="w-6 h-6 text-green-500" />
                <span className="text-xs">בחר מהגלריה</span>
              </Button>
            </div>

            {/* Upload queue */}
            {uploadQueue.length > 0 && (
              <div className="space-y-2">
                {uploadQueue.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <img src={item.preview} alt="" className="w-10 h-10 object-cover rounded" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs truncate text-gray-600">{item.file.name}</div>
                    </div>
                    {item.status === 'uploading' && (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    )}
                    {item.status === 'done' && <CheckCircle className="w-4 h-4 text-green-500" />}
                    {item.status === 'error' && <X className="w-4 h-4 text-red-500" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!showPreview} onOpenChange={() => setShowPreview(null)}>
        <DialogContent className="max-w-2xl p-2" dir="rtl">
          {showPreview && (
            <div>
              <img
                src={showPreview.file_url}
                alt={showPreview.file_name}
                className="w-full rounded-lg"
              />
              <div className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={getCategoryInfo(showPreview.category).color}>
                    {getCategoryInfo(showPreview.category).label}
                  </Badge>
                  {showPreview.ai_extraction_status === 'completed' && (
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                      AI מנותח ✓
                    </Badge>
                  )}
                </div>
                {showPreview.note && <p className="text-sm text-gray-600">{showPreview.note}</p>}
                {showPreview.ai_extraction_summary && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-xs font-medium text-blue-800 mb-1">ניתוח AI:</div>
                    <div className="text-sm text-blue-700">{showPreview.ai_extraction_summary}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
