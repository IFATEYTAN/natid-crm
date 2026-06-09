import { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/ui/StatusBadge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { issueTypeLabels } from '@/config/labels';
import { Phone, MapPin, Navigation, RefreshCw } from 'lucide-react';

export default function VendorMobileCalls({
  calls,
  activeCalls,
  completedCalls,
  onUpdateCallStatus,
  isRefreshing,
  onRefresh,
}) {
  const [segment, setSegment] = useState('active');

  const getStatusAction = (call) => {
    switch (call.call_status) {
      case 'assigned':
      case 'assigning':
        return {
          label: 'יצא לדרך',
          status: 'vendor_enroute',
          color: 'bg-blue-600 hover:bg-blue-700',
        };
      case 'vendor_enroute':
        return { label: 'הגעתי', status: 'in_progress', color: 'bg-green-600 hover:bg-green-700' };
      case 'in_progress':
        return { label: 'סיים', status: 'completed', color: 'bg-orange-500 hover:bg-orange-600' };
      default:
        return null;
    }
  };

  const displayCalls = segment === 'active' ? activeCalls : completedCalls;

  return (
    <div className="px-4 pt-6 space-y-4 pb-4">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">קריאות</h2>
        <button
          onClick={onRefresh}
          className="w-11 h-11 rounded-full bg-white shadow flex items-center justify-center"
          aria-label="רענן"
        >
          <RefreshCw className={cn('w-5 h-5 text-gray-600', isRefreshing && 'animate-spin')} />
        </button>
      </div>

      {/* Segmented control */}
      <div className="bg-gray-200 rounded-xl p-1 flex">
        <button
          onClick={() => setSegment('active')}
          className={cn(
            'flex-1 py-2.5 rounded-lg text-sm font-medium transition-all',
            segment === 'active' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
          )}
        >
          פעילות ({activeCalls.length})
        </button>
        <button
          onClick={() => setSegment('history')}
          className={cn(
            'flex-1 py-2.5 rounded-lg text-sm font-medium transition-all',
            segment === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
          )}
        >
          היסטוריה ({completedCalls.length})
        </button>
      </div>

      {/* Call cards */}
      <div className="space-y-3">
        {displayCalls.length === 0 ? (
          <div className="text-center py-12">
            <Phone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">
              {segment === 'active' ? 'אין קריאות פעילות' : 'אין היסטוריה'}
            </p>
          </div>
        ) : (
          displayCalls.map((call) => {
            const action = getStatusAction(call);
            return (
              <Card key={call.id} className="rounded-xl shadow-sm overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  {/* Top row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 tabular-nums" dir="ltr">
                        {call.vehicle_plate || 'ללא מספר רכב'}
                      </span>
                      <StatusBadge status={call.call_status} />
                    </div>
                    <span className="text-xs text-gray-400">
                      {call.created_date ? format(new Date(call.created_date), 'dd/MM HH:mm') : '-'}
                    </span>
                  </div>

                  {/* Customer & issue */}
                  <div>
                    <div className="font-medium text-gray-800">{call.customer_name}</div>
                    <div className="text-sm text-gray-500">
                      {issueTypeLabels[call.issue_type] || call.issue_type}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">קריאה {call.call_number}</div>
                  </div>

                  {/* Address */}
                  {call.pickup_location_address && (
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{call.pickup_location_address}</span>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    {call.pickup_location_lat && call.pickup_location_lon && (
                      <a
                        href={`https://waze.com/ul?ll=${call.pickup_location_lat},${call.pickup_location_lon}&navigate=yes`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1"
                      >
                        <Button
                          variant="outline"
                          className="w-full h-11 rounded-xl gap-2 text-sm font-medium"
                        >
                          <Navigation className="w-4 h-4 text-blue-600" />
                          נווט
                        </Button>
                      </a>
                    )}

                    {call.customer_phone && (
                      <a href={`tel:${call.customer_phone}`} className="flex-1">
                        <Button
                          variant="outline"
                          className="w-full h-11 rounded-xl gap-2 text-sm font-medium"
                        >
                          <Phone className="w-4 h-4 text-green-600" />
                          חייג
                        </Button>
                      </a>
                    )}

                    {action && (
                      <Button
                        className={cn(
                          'flex-1 h-11 rounded-xl text-sm font-bold text-white',
                          action.color
                        )}
                        onClick={() => onUpdateCallStatus(call.id, action.status)}
                      >
                        {action.label}
                      </Button>
                    )}

                    {call.call_status === 'in_progress' && (
                      <Link
                        to={createPageUrl(`VendorCallManagement?id=${call.id}`)}
                        className="flex-1"
                      >
                        <Button className="w-full h-11 rounded-xl text-sm font-bold bg-orange-500 hover:bg-orange-600 text-white">
                          סיים וחתם
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
