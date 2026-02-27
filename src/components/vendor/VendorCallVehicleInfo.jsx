import React from 'react';
import { Car } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { issueTypeLabels } from '@/config/labels';

export default function VendorCallVehicleInfo({ call }) {
  return (
    <Card className="bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Car className="w-4 h-4" />
          פרטי רכב
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-[#6B778C]">מספר רכב:</span>
            <div className="font-medium" dir="ltr">
              {call.vehicle_plate || '-'}
            </div>
          </div>
          <div>
            <span className="text-[#6B778C]">דגם:</span>
            <div className="font-medium">{call.vehicle_model || '-'}</div>
          </div>
          <div>
            <span className="text-[#6B778C]">סוג תקלה:</span>
            <div className="font-medium">{issueTypeLabels[call.issue_type] || call.issue_type}</div>
          </div>
          <div>
            <span className="text-[#6B778C]">דלק:</span>
            <div className="font-medium">{call.fuel_type || '-'}</div>
          </div>
        </div>
        {call.issue_description && (
          <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="text-sm font-medium text-yellow-800 mb-1">תיאור התקלה:</div>
            <div className="text-sm text-yellow-700">{call.issue_description}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
