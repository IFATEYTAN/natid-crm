import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Coffee, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function VendorBreakHistory({ vendorId }) {
  const { data: breaks = [], isLoading } = useQuery({
    queryKey: ['vendorBreaks', vendorId],
    queryFn: () => base44.entities.VendorBreak.filter({ vendor_id: vendorId }, '-break_start', 50),
    enabled: !!vendorId,
  });

  if (isLoading) {
    return <div className="text-center py-4 text-gray-400 text-sm">טוען היסטוריה...</div>;
  }

  if (breaks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <Coffee className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm">אין היסטוריית הפסקות</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Coffee className="w-4 h-4" />
          היסטוריית הפסקות
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
          {breaks.map((b) => {
            const start = b.break_start ? new Date(b.break_start) : null;
            const end = b.break_end ? new Date(b.break_end) : null;
            return (
              <div key={b.id} className="px-4 py-3 flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Coffee className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {start ? format(start, 'dd/MM/yyyy') : '-'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {start ? format(start, 'HH:mm') : '-'}
                      {end ? ` - ${format(end, 'HH:mm')}` : ' (פעיל)'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <Clock className="w-3 h-3" />
                  <span className="text-xs">
                    {b.duration_minutes ? `${b.duration_minutes} דק'` : '-'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}