import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { queryKeys } from '@/lib/queryKeys';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

const statusLabels = {
  active: 'פעיל',
  expired: 'פג תוקף',
  draft: 'טיוטה',
  pending_approval: 'ממתין לאישור',
  suspended: 'מושעה',
  terminated: 'בוטל',
};

const statusColors = {
  active: 'bg-green-100 text-green-800',
  expired: 'bg-red-100 text-red-800',
  draft: 'bg-gray-100 text-gray-800',
  pending_approval: 'bg-yellow-100 text-yellow-800',
  suspended: 'bg-orange-100 text-orange-800',
  terminated: 'bg-red-100 text-red-800',
};

const typeLabels = {
  per_call: 'לפי קריאה',
  monthly: 'חודשי',
  yearly: 'שנתי',
  hourly: 'שעתי',
};

export default function VendorContractsView({ vendorId, isVendorUser }) {
  const { data: contracts = [], isLoading } = useQuery({
    queryKey: [...queryKeys.vendors.contracts(vendorId), 'all'],
    queryFn: async () => {
      if (isVendorUser) {
        const result = await base44.functions.invoke('getVendorScopedData', {
          entity_type: 'contracts',
          sort: '-created_date',
          limit: 50,
        });
        return result.data?.data || [];
      }
      return base44.entities.VendorContract.filter({ vendor_id: vendorId }, '-created_date', 50);
    },
    enabled: !!vendorId,
  });

  if (isLoading) {
    return <div className="text-center py-4 text-gray-400 text-sm">טוען חוזים...</div>;
  }

  if (contracts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm">אין חוזים להצגה</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {contracts.map((contract) => (
        <Card key={contract.id} className={contract.status === 'active' ? 'border-green-200' : ''}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-gray-900">
                  {contract.contract_number || 'חוזה'}
                </span>
              </div>
              <Badge className={statusColors[contract.status] || 'bg-gray-100 text-gray-800'}>
                {statusLabels[contract.status] || contract.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-3 h-3 text-gray-400" />
                <span className="text-gray-500">סוג:</span>
                <span className="text-gray-900">
                  {typeLabels[contract.contract_type] || contract.contract_type}
                </span>
              </div>

              {contract.start_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-500">מ:</span>
                  <span className="text-gray-900">
                    {format(new Date(contract.start_date), 'dd/MM/yyyy')}
                  </span>
                </div>
              )}

              {contract.end_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-500">עד:</span>
                  <span className="text-gray-900">
                    {format(new Date(contract.end_date), 'dd/MM/yyyy')}
                  </span>
                </div>
              )}

              {contract.rate_per_call > 0 && (
                <div className="flex items-center gap-2">
                  <DollarSign className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-500">תעריף/קריאה:</span>
                  <span className="text-gray-900">₪{contract.rate_per_call}</span>
                </div>
              )}

              {contract.sla_arrival_minutes > 0 && (
                <div className="text-gray-600">SLA הגעה: {contract.sla_arrival_minutes} דק'</div>
              )}
            </div>

            {contract.special_terms && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">{contract.special_terms}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
