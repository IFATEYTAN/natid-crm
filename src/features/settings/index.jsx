import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export default function Settings() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1>הגדרות מערכת</h1>
        <p className="text-[var(--color-text-secondary)]">ניהול הגדרות המערכת, התראות ופרטי חברה</p>
      </div>

      {/* Company Settings */}
      <Card className="card-base border-none shadow-none p-0">
        <CardHeader>
          <CardTitle className="text-base text-[var(--color-text-primary)]">פרטי חברה</CardTitle>
          <CardDescription>הגדרות בסיסיות של העסק</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>שם החברה</Label>
              <Input defaultValue="נתי שירותי דרך" />
            </div>
            <div>
              <Label>טלפון ראשי</Label>
              <Input defaultValue="*6283" dir="ltr" className="text-end" />
            </div>
            <div>
              <Label>דוא"ל</Label>
              <Input type="email" defaultValue="info@natid.co.il" />
            </div>
            <div>
              <Label>כתובת</Label>
              <Input defaultValue="" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SLA Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">הגדרות SLA ברירת מחדל</CardTitle>
          <CardDescription>זמני תגובה והגעה ברירת מחדל ללקוחות חדשים</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>זמן תגובה (דקות)</Label>
              <Input type="number" defaultValue="30" />
            </div>
            <div>
              <Label>זמן הגעה (דקות)</Label>
              <Input type="number" defaultValue="60" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">התראות</CardTitle>
          <CardDescription>הגדרות התראות והודעות</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">התראת קריאה חדשה</p>
              <p className="text-sm text-[#616161]">קבל התראה על כל קריאה חדשה</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">התראת SLA</p>
              <p className="text-sm text-[#616161]">התראה כאשר קריאה מתקרבת לחריגה מה-SLA</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">סיכום יומי</p>
              <p className="text-sm text-[#616161]">קבל סיכום יומי בדוא"ל</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* Service Types */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">סוגי שירות</CardTitle>
          <CardDescription>ניהול סוגי השירות הזמינים</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {['גרירה', "פנצ'ר", 'מצבר', 'פתיחת רכב', 'דלק', 'תאונה', 'תקלה מכנית'].map(
              (service, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 bg-[#FAFAFA] rounded-lg"
                >
                  <span>{service}</span>
                  <Switch defaultChecked />
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button className="btn-primary flex items-center gap-2">שמור שינויים</Button>
      </div>
    </div>
  );
}
