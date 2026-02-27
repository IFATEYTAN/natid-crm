import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { queryKeys } from '@/lib/queryKeys';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import ContractDetailsDialog from './ContractDetailsDialog';
import ContractFormDialog from './ContractFormDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const statusLabels = {
  draft: 'טיוטה',
  pending_approval: 'ממתין לאישור',
  active: 'פעיל',
  expired: 'פג תוקף',
  suspended: 'מושהה',
  terminated: 'בוטל',
};

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  pending_approval: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  expired: 'bg-red-100 text-red-800',
  suspended: 'bg-orange-100 text-orange-800',
  terminated: 'bg-gray-200 text-gray-600',
};

export default function GeneralContractsTab() {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: queryKeys.vendorContracts.all(),
    queryFn: () => base44.entities.VendorContract.list('-created_date'),
  });

  const { data: vendors = [] } = useQuery({
    queryKey: queryKeys.vendors.all(),
    queryFn: () => base44.entities.Vendor.list(),
  });

  const filteredContracts = contracts.filter((c) => {
    const matchesSearch =
      c.vendor_name?.includes(searchTerm) || c.contract_number?.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4 text-end" dir="rtl">
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-center mb-6">
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute start-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="חיפוש לפי שם ספק או חוזה..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pe-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter} dir="rtl">
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="סטטוס" />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="all">כל הסטטוסים</SelectItem>
              {Object.entries(statusLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          חוזה חדש
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredContracts.map((contract) => (
          <Card
            key={contract.id}
            className="cursor-pointer hover:border-[#3b82f6] transition-colors"
            onClick={() => setSelectedContract(contract)}
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start gap-2">
                <CardTitle className="text-lg font-bold truncate">{contract.vendor_name}</CardTitle>
                <Badge className={statusColors[contract.status] || 'bg-gray-100 shrink-0'}>
                  {statusLabels[contract.status] || contract.status}
                </Badge>
              </div>
              <div className="text-sm text-gray-500">
                {contract.contract_number || `#${contract.id.slice(-6)}`}
              </div>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">תוקף:</span>
                <span>
                  {contract.start_date ? format(new Date(contract.start_date), 'dd/MM/yyyy') : '-'}{' '}
                  עד {contract.end_date ? format(new Date(contract.end_date), 'dd/MM/yyyy') : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">סוג חוזה:</span>
                <span>
                  {contract.contract_type === 'per_call'
                    ? 'לפי קריאה'
                    : contract.contract_type === 'monthly'
                      ? 'חודשי'
                      : contract.contract_type === 'yearly'
                        ? 'שנתי'
                        : 'שעתי'}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredContracts.length === 0 && !isLoading && (
          <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-lg border border-dashed">
            לא נמצאו חוזים התואמים את החיפוש
          </div>
        )}
      </div>

      {showCreate && (
        <ContractFormDialog
          open={showCreate}
          onOpenChange={setShowCreate}
          vendors={vendors}
          contract={null}
          onSuccess={() => {
            setShowCreate(false);
          }}
        />
      )}

      {selectedContract && (
        <ContractDetailsDialog
          open={!!selectedContract}
          onOpenChange={(open) => !open && setSelectedContract(null)}
          contract={selectedContract}
          onUpdate={() => setSelectedContract(null)}
        />
      )}
    </div>
  );
}
