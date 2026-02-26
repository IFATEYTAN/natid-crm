import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export default function GeneralContractsTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          חוזי ספקים
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-[#6b7280] text-center py-8">טרם הוגדרו חוזים במערכת</p>
      </CardContent>
    </Card>
  );
}
