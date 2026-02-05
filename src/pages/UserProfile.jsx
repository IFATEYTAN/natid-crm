import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Shield, Save, Loader2 } from 'lucide-react';
import { showToast, feedbackMessages } from '@/components/ui/FeedbackToast';
import { SlideUp } from '@/components/animations/AnimatedComponents';
import { PageLoader } from '@/components/ui/LoadingSpinner';

export default function UserProfilePage() {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: '',
  });
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        setFormData({
          full_name: user.full_name || '',
          email: user.email || '',
          role: user.role || 'user',
        });
      } catch (e) {
        console.error('Failed to fetch user:', e);
      }
    };
    fetchUser();
  }, []);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: (data) => {
      showToast.success('הפרופיל עודכן בהצלחה');
      setCurrentUser(prev => ({ ...prev, ...data }));
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
    onError: () => {
      showToast.error('שגיאה בעדכון הפרופיל');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate({ full_name: formData.full_name });
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label>שם מלא</Label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
                    <Input
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="pr-10"
                    />
                  </div>
                </div>

                <div>
                  <Label>אימייל</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
                    <Input
                      value={formData.email}
                      disabled
                      className="pr-10 bg-gray-50"
                      dir="ltr"
                    />
                  </div>
                  <p className="text-xs text-[#6b7280] mt-1">לא ניתן לשנות כתובת אימייל</p>
                </div>

                <div>
                  <Label>תפקיד במערכת</Label>
                  <div className="relative">
                    <Shield className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
                    <Input
                      value={formData.role === 'admin' ? 'מנהל מערכת' : 'משתמש'}
                      disabled
                      className="pr-10 bg-gray-50"
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
                      <Loader2 className="w-4 h-4 animate-spin ml-2" />
                      מעדכן...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 ml-2" />
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