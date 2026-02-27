import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { queryKeys } from '@/lib/queryKeys';
import { usePermissions } from '@/components/permissions/PermissionsContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Shield, Save, Loader2, Camera, Upload } from 'lucide-react';
import { showToast, feedbackMessages } from '@/components/ui/FeedbackToast';
import { SlideUp } from '@/components/animations/AnimatedComponents';
import { PageLoader } from '@/components/ui/LoadingSpinner';

export default function UserProfilePage() {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: '',
    profile_image: '',
  });
  const [uploading, setUploading] = useState(false);
  const { currentUser } = usePermissions();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (currentUser) {
      setFormData({
        full_name: currentUser.full_name || '',
        email: currentUser.email || '',
        role: currentUser.role || 'user',
        profile_image: currentUser.profile_image || '',
      });
    }
  }, [currentUser]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      showToast.success('הפרופיל עודכן בהצלחה');
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
    },
    onError: () => {
      showToast.error('שגיאה בעדכון הפרופיל');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      full_name: formData.full_name,
      profile_image: formData.profile_image,
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast.error('הקובץ גדול מדי (מקסימום 5MB)');
      return;
    }

    try {
      setUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData((prev) => ({ ...prev, profile_image: file_url }));
      showToast.success('התמונה הועלתה בהצלחה');
    } catch (error) {
      console.error('Upload error:', error);
      showToast.error('שגיאה בהעלאת התמונה');
    } finally {
      setUploading(false);
    }
  };

  if (!currentUser) {
    return <PageLoader text="טוען פרופיל..." />;
  }

  return (
    <SlideUp>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">הפרופיל שלי</h1>
          <p className="text-[#6b7280] text-sm">צפייה ועדכון פרטים אישיים</p>
        </div>

        <Card className="bg-white border border-[#e5e7eb]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-[#6b7280]" />
              פרטים אישיים
            </CardTitle>
            <CardDescription>פרטי החשבון שלך במערכת</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Profile Image Section */}
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-50 flex items-center justify-center">
                    {formData.profile_image ? (
                      <img
                        src={formData.profile_image}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-gray-400">
                        {formData.full_name?.charAt(0) || '?'}
                      </span>
                    )}
                    {uploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <label
                    htmlFor="profile-upload"
                    className="absolute bottom-0 end-0 p-2 bg-blue-600 rounded-full text-white cursor-pointer hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <Camera className="w-4 h-4" />
                    <input
                      id="profile-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploading}
                    />
                  </label>
                </div>
                <p className="text-sm text-gray-500">לחץ על המצלמה להחלפת תמונה</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label>שם מלא</Label>
                  <div className="relative">
                    <User className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
                    <Input
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="pe-10"
                    />
                  </div>
                </div>

                <div>
                  <Label>אימייל</Label>
                  <div className="relative">
                    <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
                    <Input value={formData.email} disabled className="pe-10 bg-gray-50" dir="ltr" />
                  </div>
                  <p className="text-xs text-[#6b7280] mt-1">לא ניתן לשנות כתובת אימייל</p>
                </div>

                <div>
                  <Label>תפקיד במערכת</Label>
                  <div className="relative">
                    <Shield className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
                    <Input
                      value={formData.role === 'admin' ? 'מנהל מערכת' : 'משתמש'}
                      disabled
                      className="pe-10 bg-gray-50"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full bg-[#3b82f6] hover:bg-[#2563eb]"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin me-2" />
                      מעדכן...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 me-2" />
                      עדכן פרטים
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </SlideUp>
  );
}
