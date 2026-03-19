import { lazyRetry } from '@/lib/lazyRetry';
import React, { Suspense, useState } from 'react';
import { Camera, FileText, Trash2, Pencil, Image as ImageIcon, FolderOpen, Send, Mail, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

const FileUploader = lazyRetry(() => import('@/components/files/FileUploader'));

const categoryLabels = {
  before_treatment: 'לפני טיפול',
  after_treatment: 'אחרי טיפול',
  damage: 'נזק',
  customer_document: 'מסמך לקוח',
  customer_signature: 'חתימת לקוח',
  other: 'אחר',
};

function PhotoCard({ photo, onEdit, onDelete, onSend }) {
  const isImage = photo.file_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  return (
    <div className="relative group border rounded-lg overflow-hidden bg-white">
      <a href={photo.file_url} target="_blank" rel="noopener noreferrer">
        <div className="aspect-square bg-[#F4F5F7]">
          {isImage ? (
            <img
              src={photo.file_url}
              alt={photo.file_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FileText className="w-10 h-10 text-[#6B778C]" />
            </div>
          )}
        </div>
      </a>
      {/* Overlay actions */}
      <div className="absolute top-1 start-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon"
          variant="secondary"
          className="h-7 w-7"
          onClick={() => onEdit(photo)}
          aria-label="עריכה"
        >
          <Pencil className="w-3 h-3" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="h-7 w-7 bg-green-50 hover:bg-green-100"
          onClick={() => onSend && onSend(photo)}
          aria-label="שלח"
        >
          <Send className="w-3 h-3 text-green-600" />
        </Button>
        <Button
          size="icon"
          variant="destructive"
          className="h-7 w-7"
          onClick={() => onDelete(photo)}
          aria-label="מחיקה"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
      <div className="p-2">
        <Badge variant="outline" className="text-[10px] mb-1">
          {categoryLabels[photo.category] || photo.category || 'אחר'}
        </Badge>
        <p className="text-xs text-[#6B778C] truncate">{photo.file_name || '-'}</p>
        {photo.note && <p className="text-[10px] text-gray-400 truncate">{photo.note}</p>}
        <p className="text-[10px] text-gray-300 mt-0.5">
          {photo.created_date
            ? format(new Date(photo.created_date), 'dd/MM/yy HH:mm', { locale: he })
            : ''}
          {photo.uploaded_by ? ` • ${photo.uploaded_by}` : ''}
        </p>
      </div>
    </div>
  );
}

export default function CallFilesTab({ callId, photos, onFilesUploaded, call }) {
  const queryClient = useQueryClient();
  const [editPhoto, setEditPhoto] = useState(null);
  const [editForm, setEditForm] = useState({ file_name: '', category: '', note: '' });
  const [saving, setSaving] = useState(false);
  const [sendingDoc, setSendingDoc] = useState(null);
  const [sendDocDialog, setSendDocDialog] = useState(null); // photo to send
  const [sendMethod, setSendMethod] = useState('whatsapp'); // 'whatsapp' | 'email'
  const [sendRecipient, setSendRecipient] = useState('');

  const handleSendDocument = async () => {
    if (!sendDocDialog || !sendRecipient) return;
    setSendingDoc(sendDocDialog.id);
    try {
      await base44.functions.invoke('sendWhatsApp', {
        type: sendMethod === 'whatsapp' ? 'document' : 'email_document',
        phone: sendMethod === 'whatsapp' ? sendRecipient : undefined,
        email: sendMethod === 'email' ? sendRecipient : undefined,
        document_url: sendDocDialog.file_url,
        document_name: sendDocDialog.file_name || 'מסמך',
        call_number: call?.call_number,
        customer_name: call?.customer_name,
      });
      toast.success(`המסמך נשלח בהצלחה ב-${sendMethod === 'whatsapp' ? 'WhatsApp' : 'מייל'}`);
      setSendDocDialog(null);
      setSendRecipient('');
    } catch (e) {
      toast.error('שגיאה בשליחת המסמך');
    } finally {
      setSendingDoc(null);
    }
  };

  const images = photos.filter((p) => p.file_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i));
  const documents = photos.filter((p) => !p.file_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i));

  const handleEdit = (photo) => {
    setEditPhoto(photo);
    setEditForm({
      file_name: photo.file_name || '',
      category: photo.category || 'other',
      note: photo.note || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editPhoto) return;
    setSaving(true);
    await base44.entities.CallPhoto.update(editPhoto.id, editForm);
    queryClient.invalidateQueries({ queryKey: queryKeys.callPhotos.byCall(callId) });
    toast.success('הקובץ עודכן');
    setSaving(false);
    setEditPhoto(null);
  };

  const handleDelete = async (photo) => {
    if (!confirm(`למחוק את ${photo.file_name || 'הקובץ'}?`)) return;
    await base44.entities.CallPhoto.update(photo.id, { is_deleted: true });
    queryClient.invalidateQueries({ queryKey: queryKeys.callPhotos.byCall(callId) });
    toast.success('הקובץ נמחק');
  };

  const handleSend = (photo) => {
    setSendDocDialog(photo);
    setSendMethod('whatsapp');
    setSendRecipient(call?.customer_phone || '');
  };

  const activePhotos = photos.filter((p) => !p.is_deleted);
  const activeImages = activePhotos.filter((p) => p.file_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i));
  const activeDocuments = activePhotos.filter(
    (p) => !p.file_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
  );

  return (
    <Card className="bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Camera className="w-4 h-4 text-[#6B778C]" />
          קבצים ותמונות
          {activePhotos.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {activePhotos.length} קבצים
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Uploader */}
        <Suspense fallback={<div className="h-24 w-full bg-gray-50" />}>
          <FileUploader callId={callId} onUploadComplete={onFilesUploaded} />
        </Suspense>

        {/* Files display with tabs */}
        {activePhotos.length > 0 && (
          <Tabs defaultValue="all" dir="rtl">
            <TabsList>
              <TabsTrigger value="all" className="gap-1">
                <FolderOpen className="w-3 h-3" />
                הכל ({activePhotos.length})
              </TabsTrigger>
              <TabsTrigger value="images" className="gap-1">
                <ImageIcon className="w-3 h-3" />
                תמונות ({activeImages.length})
              </TabsTrigger>
              <TabsTrigger value="docs" className="gap-1">
                <FileText className="w-3 h-3" />
                מסמכים ({activeDocuments.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                {activePhotos.map((photo) => (
                    <PhotoCard
                      key={photo.id}
                      photo={photo}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onSend={handleSend}
                    />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="images">
              {activeImages.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                  {activeImages.map((photo) => (
                    <PhotoCard
                      key={photo.id}
                      photo={photo}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onSend={handleSend}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-400 text-sm py-6">אין תמונות</p>
              )}
            </TabsContent>

            <TabsContent value="docs">
              {activeDocuments.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                  {activeDocuments.map((photo) => (
                    <PhotoCard
                      key={photo.id}
                      photo={photo}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onSend={handleSend}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-400 text-sm py-6">אין מסמכים</p>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Send Document Dialog */}
        <Dialog open={!!sendDocDialog} onOpenChange={() => setSendDocDialog(null)}>
          <DialogContent dir="rtl" className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                שליחת מסמך
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-gray-600 truncate">{sendDocDialog?.file_name || 'מסמך'}</p>
              {/* Method selector */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={sendMethod === 'whatsapp' ? 'default' : 'outline'}
                  className={sendMethod === 'whatsapp' ? 'bg-green-600 hover:bg-green-700' : ''}
                  onClick={() => { setSendMethod('whatsapp'); setSendRecipient(call?.customer_phone || ''); }}
                >
                  <MessageSquare className="w-3 h-3 ml-1" />
                  WhatsApp
                </Button>
                <Button
                  size="sm"
                  variant={sendMethod === 'email' ? 'default' : 'outline'}
                  className={sendMethod === 'email' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                  onClick={() => { setSendMethod('email'); setSendRecipient(call?.customer_email || ''); }}
                >
                  <Mail className="w-3 h-3 ml-1" />
                  מייל
                </Button>
              </div>
              <div>
                <Label>{sendMethod === 'whatsapp' ? 'מספר טלפון' : 'כתובת מייל'}</Label>
                <Input
                  value={sendRecipient}
                  onChange={(e) => setSendRecipient(e.target.value)}
                  placeholder={sendMethod === 'whatsapp' ? '05XXXXXXXX' : 'email@example.com'}
                  dir="ltr"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSendDocDialog(null)}>ביטול</Button>
              <Button
                onClick={handleSendDocument}
                disabled={!sendRecipient || !!sendingDoc}
                className="bg-green-600 hover:bg-green-700"
              >
                {sendingDoc ? 'שולח...' : 'שלח'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editPhoto} onOpenChange={() => setEditPhoto(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>עריכת קובץ</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>שם קובץ</Label>
                <Input
                  value={editForm.file_name}
                  onChange={(e) => setEditForm({ ...editForm, file_name: e.target.value })}
                />
              </div>
              <div>
                <Label>קטגוריה</Label>
                <Select
                  value={editForm.category}
                  onValueChange={(v) => setEditForm({ ...editForm, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>הערה</Label>
                <Input
                  value={editForm.note}
                  onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditPhoto(null)}>
                ביטול
              </Button>
              <Button onClick={handleSaveEdit} isLoading={saving}>
                שמור
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
