import React from 'react';
import { Phone, MapPin, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from 'lucide-react';

export default function VendorCallCustomerInfo({ call }) {
  return (
    <Card className="bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <User className="w-4 h-4" />
          פרטי לקוח ומיקום
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">{call.customer_name}</div>
            <div className="text-sm text-[#6B778C]" dir="ltr">
              {call.customer_phone}
            </div>
          </div>
          <a href={`tel:${call.customer_phone}`}>
            <Button size="sm" variant="outline" className="gap-1">
              <Phone className="w-4 h-4" />
              התקשר
            </Button>
          </a>
        </div>

        <div className="border-t pt-3">
          <div className="flex items-start gap-2 mb-2">
            <MapPin className="w-4 h-4 text-red-500 mt-0.5" />
            <div>
              <div className="text-sm font-medium">כתובת איסוף</div>
              <div className="text-sm text-[#6B778C]">{call.pickup_location_address}</div>
              {call.pickup_location_city && (
                <div className="text-sm text-[#6B778C]">{call.pickup_location_city}</div>
              )}
            </div>
          </div>
          <a
            href={`https://waze.com/ul?ll=${call.pickup_location_lat},${call.pickup_location_lon}&navigate=yes`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button className="w-full bg-[#33ccff] hover:bg-[#00b8f0] text-black gap-2">
              <Navigation className="w-4 h-4" />
              נווט עם Waze
            </Button>
          </a>
        </div>

        {call.dropoff_location_address && (
          <div className="border-t pt-3">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-green-500 mt-0.5" />
              <div>
                <div className="text-sm font-medium">כתובת יעד</div>
                <div className="text-sm text-[#6B778C]">{call.dropoff_location_address}</div>
                {call.dropoff_garage_name && (
                  <div className="text-sm text-[#6B778C]">מוסך: {call.dropoff_garage_name}</div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
