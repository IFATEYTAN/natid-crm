import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';

export default function PricingAgreementsTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          הסכמי תמחור
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-[#6b7280] text-center py-8">טרם הוגדרו הסכמי תמחור במערכת</p>
      </CardContent>
    </Card>
  );
}
