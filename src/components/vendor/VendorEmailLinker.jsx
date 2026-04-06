import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { queryKeys } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Link2, Check, AlertCircle, Mail } from 'lucide-react';
import { showToast } from '@/components/ui/FeedbackToast';

export default function VendorEmailLinker({ vendors = [] }) {
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [email, setEmail] = useState('');
  const queryClient = useQueryClient();

  const selectedVendor = vendors.find(v => v.id === selectedVendorId);

  const linkMutation = useMutation({
    mutationFn: async () => {
      return base44.functions.invoke('linkVendorEmail', {
        vendor_id: selectedVendorId,
        email: email.trim(),
      });
    },
    onSuccess: () => {
      showToast.success(`האימייל ${email} קושר בהצלחה לספק ${selectedVendor?.vendor_name}`);
      setEmail('');
      setSelectedVendorId('');
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.all() });
    },
    onError: (err) => {
      showToast.error(err?.response?.data?.error || 'שגיאה בקישור האימייל');
    },
  });

  const vendorsWithEmail = vendors.filter(v => v.email);
  const vendorsWithoutEmail = vendors.filter(v => !v.email);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Link2 className="w-5 h-5" />
          קישור ספקים לחשבון משתמש
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          כדי שספק יוכל להיכנס לפורטל, יש לקשר את כתובת האימייל שלו לפרופיל הספק
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status summary */}
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-green-600" />
            <span>{vendorsWithEmail.length} ספקים מקושרים</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <span>{vendorsWithoutEmail.length} ספקים לא מקושרים</span>
          </div>
        </div>

        {/* Link form */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Select value={selectedVendorId} onValueChange={(val) => {
              setSelectedVendorId(val);
              const v = vendors.find(x => x.id === val);
              if (v?.email) setEmail(v.email);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="בחר ספק..." />
              </SelectTrigger>
              <SelectContent>
                {vendorsWithoutEmail.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-amber-600">ללא אימייל</div>
                    {vendorsWithoutEmail.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        ⚠️ {v.vendor_name}
                      </SelectItem>
                    ))}
                  </>
                )}
                {vendorsWithEmail.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-green-600">מקושרים</div>
                    {vendorsWithEmail.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        ✅ {v.vendor_name} ({v.email})
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Input
              type="email"
              dir="ltr"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button
            onClick={() => linkMutation.mutate()}
            disabled={!selectedVendorId || !email.trim() || linkMutation.isPending}
            isLoading={linkMutation.isPending}
            className="shrink-0"
          >
            <Mail className="w-4 h-4" />
            קשר אימייל
          </Button>
        </div>

        {/* Current linked vendors list */}
        {vendorsWithEmail.length > 0 && (
          <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
            {vendorsWithEmail.map((v) => (
              <div key={v.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="font-medium">{v.vendor_name}</span>
                <span className="text-muted-foreground" dir="ltr">{v.email}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}