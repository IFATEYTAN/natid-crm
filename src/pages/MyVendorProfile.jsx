import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from 'sonner';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Save,
  Truck,
  Star,
  Shield
} from 'lucide-react';

export default function MyVendorProfilePage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    vendor_name: '',
    contact_person: '',
    phone: '',
    phone_2: '',
    email: '',
    coverage_cities: '',
    notes: ''
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (e) {
        console.error('Failed to fetch user:', e);
      }
    };
    fetchUser();
  }, []);

  const vendorQuery = useQuery({
    queryKey: ['myVendorProfile', currentUser?.email],
    queryFn: async () => {
      const vendors = await base44.entities.Vendor.filter({ email: currentUser.email });
      if (vendors.length > 0) {
        const vendor = vendors[0];
        setFormData({
          vendor_name: vendor.vendor_name || '',
          contact_person: vendor.contact_person || '',
          phone: vendor.phone || '',
          phone_2: vendor.phone_2 || '',
          email: vendor.email || '',
          coverage_cities: vendor.coverage_cities || '',
          notes: vendor.notes || ''
        });
        return vendor;
      }
      return null;
    },
    enabled: !!currentUser?.email,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Vendor.update(vendorQuery.data.id, data),
    onSuccess: () => {
      toast.success('הפרופיל עודכן בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['myVendorProfile'] });
    },
    onError: () => {
      toast.error('שגיאה בעדכון הפרופיל');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const vendor = vendorQuery.data;

  if (!vendor) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Truck className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-[#172B4D] mb-2">פרופיל ספק לא נמצא</h2>
          <p className="text-[#6B778C]">אנא פנה למנהל המערכת</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#172B4D]">הפרופיל שלי</h1>
        <p className="text-[#6B778C] text-sm">עדכון פרטים אישיים</p>
      </div>

      {/* Stats Card */}
      <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-100">
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-[#172B4D]">
                {vendor.total_calls_completed || 0}
              </div>
              <div className="text-xs text-[#6B778C]">קריאות הושלמו</div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                <span className="text-2xl font-bold text-[#172B4D]">
                  {vendor.average_rating?.toFixed(1) || '-'}
                </span>
              </div>
              <div className="text-xs text-[#6B778C]">דירוג ממוצע</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#172B4D]">
                {vendor.completion_rate || 0}%
              </div>
              <div className="text-xs text-[#6B778C]">אחוז השלמה</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Form */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-[#6B778C]" />
            פרטי הספק
          </CardTitle>
          <CardDescription>עדכן את פרטי הקשר שלך</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>שם הספק/חברה</Label>
                <Input
                  value={formData.vendor_name}
                  onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-[#6B778C] mt-1">לשינוי שם פנה למנהל</p>
              </div>
              <div>
                <Label>איש קשר</Label>
                <Input
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>טלפון ראשי</Label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B778C]" />
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="pr-10"
                    dir="ltr"
                  />
                </div>
              </div>
              <div>
                <Label>טלפון משני</Label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B778C]" />
                  <Input
                    value={formData.phone_2}
                    onChange={(e) => setFormData({ ...formData, phone_2: e.target.value })}
                    className="pr-10"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label>אימייל</Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B778C]" />
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pr-10"
                  dir="ltr"
                  disabled
                />
              </div>
              <p className="text-xs text-[#6B778C] mt-1">האימייל משמש להתחברות ולא ניתן לשינוי</p>
            </div>

            <div>
              <Label>אזורי כיסוי</Label>
              <div className="relative">
                <MapPin className="absolute right-3 top-3 w-4 h-4 text-[#6B778C]" />
                <Textarea
                  value={formData.coverage_cities}
                  onChange={(e) => setFormData({ ...formData, coverage_cities: e.target.value })}
                  className="pr-10 min-h-[80px]"
                  placeholder="רשום את הערים והאזורים בהם אתה מספק שירות"
                />
              </div>
            </div>

            <div>
              <Label>הערות</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="מידע נוסף שחשוב שנדע..."
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-red-600 hover:bg-red-700 gap-2"
              disabled={updateMutation.isPending}
            >
              <Save className="w-4 h-4" />
              {updateMutation.isPending ? 'שומר...' : 'שמור שינויים'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#6B778C]" />
            אבטחה
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[#6B778C] mb-4">
            לשינוי סיסמה או בעיות התחברות, אנא פנה למנהל המערכת.
          </p>
          <div className="text-xs text-[#6B778C]">
            מחובר כ: <span className="font-medium">{currentUser?.email}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}