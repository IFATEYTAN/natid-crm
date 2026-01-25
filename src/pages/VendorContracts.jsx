import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DataTable from '@/components/ui/DataTable';
import ContractFormDialog from '@/components/contracts/ContractFormDialog';
import ContractDetailsDialog from '@/components/contracts/ContractDetailsDialog';
import {
  FileText,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  DollarSign,
  Truck,
  RefreshCw,
  Bell
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { format, differenceInDays, addDays, isPast, isFuture } from 'date-fns';
import { he } from 'date-fns/locale';
import { showToast } from '@/components/ui/FeedbackToast';

const statusConfig = {
  draft: { label: 'טיוטה', color: 'bg-gray-100 text-gray-700', icon: FileText },
  pending_approval: { label: 'ממתין לאישור', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  active: { label: 'פעיל', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  expired: { label: 'פג תוקף', color: 'bg-red-100 text-red-700', icon: XCircle },
  suspended: { label: 'מושהה', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
  terminated: { label: 'בוטל', color: 'bg-gray-100 text-gray-700', icon: XCircle }
};

const contractTypeLabels = {
  per_call: 'לפי קריאה',
  monthly: 'חודשי',
  yearly: 'שנתי',
  hourly: 'שעתי'
};

export default function VendorContractsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const queryClient = useQueryClient();

  const contractsQuery = useQuery({
    queryKey: ['vendorContracts'],
    queryFn: () => base44.entities.VendorContract.list('-created_date')
  });

  const vendorsQuery = useQuery({
    queryKey: ['vendors'],
    queryFn: () => base44.entities.Vendor.list()
  });

  const contracts = contractsQuery.data || [];
  const vendors = vendorsQuery.data || [];

  // Stats
  const stats = useMemo(() => {
    const active = contracts.filter(c => c.status === 'active');
    const expiringSoon = contracts.filter(c => {
      if (c.status !== 'active') return false;
      const daysToExpiry = differenceInDays(new Date(c.end_date), new Date());
      return daysToExpiry <= 30 && daysToExpiry > 0;
    });
    const expired = contracts.filter(c => c.status === 'expired');
    const pending = contracts.filter(c => c.status === 'pending_approval');

    return { active, expiringSoon, expired, pending };
  }, [contracts]);

  // Filtered contracts
  const filteredContracts = useMemo(() => {
    return contracts.filter(contract => {
      const matchesSearch = !searchTerm || 
        contract.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.contract_number?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [contracts, searchTerm, statusFilter]);

  const handleContractCreated = () => {
    setShowCreateDialog(false);
    queryClient.invalidateQueries({ queryKey: ['vendorContracts'] });
    showToast.success('החוזה נוצר בהצלחה');
  };

  const handleViewContract = (contract) => {
    setSelectedContract(contract);
    setShowDetailsDialog(true);
  };

  const columns = [
    {
      header: 'מספר חוזה',
      accessor: 'contract_number',
      cell: (contract) => (
        <button 
          onClick={() => handleViewContract(contract)}
          className="font-medium text-blue-600 hover:underline"
        >
          {contract.contract_number || `#${contract.id?.slice(-6)}`}
        </button>
      )
    },
    {
      header: 'ספק',
      accessor: 'vendor_name',
      cell: (contract) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <Truck className="w-4 h-4 text-gray-600" />
          </div>
          <span className="font-medium">{contract.vendor_name}</span>
        </div>
      )
    },
    {
      header: 'סוג',
      accessor: 'contract_type',
      cell: (contract) => contractTypeLabels[contract.contract_type] || contract.contract_type
    },
    {
      header: 'תקופה',
      accessor: 'start_date',
      cell: (contract) => (
        <div className="text-sm">
          <div>{format(new Date(contract.start_date), 'dd/MM/yyyy')}</div>
          <div className="text-gray-500">עד {format(new Date(contract.end_date), 'dd/MM/yyyy')}</div>
        </div>
      )
    },
    {
      header: 'סטטוס',
      accessor: 'status',
      cell: (contract) => {
        const config = statusConfig[contract.status];
        const Icon = config?.icon || FileText;
        const daysToExpiry = differenceInDays(new Date(contract.end_date), new Date());
        
        return (
          <div className="space-y-1">
            <Badge className={cn("gap-1", config?.color)}>
              <Icon className="w-3 h-3" />
              {config?.label}
            </Badge>
            {contract.status === 'active' && daysToExpiry <= 30 && daysToExpiry > 0 && (
              <div className="text-xs text-orange-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                פג תוקף בעוד {daysToExpiry} ימים
              </div>
            )}
          </div>
        );
      }
    },
    {
      header: 'תעריף',
      accessor: 'rate_per_call',
      cell: (contract) => {
        if (contract.contract_type === 'monthly') {
          return `₪${contract.monthly_fee?.toLocaleString() || 0}/חודש`;
        }
        if (contract.contract_type === 'hourly') {
          return `₪${contract.hourly_rate?.toLocaleString() || 0}/שעה`;
        }
        return `₪${contract.rate_per_call?.toLocaleString() || 0}/קריאה`;
      }
    },
    {
      header: 'פעולות',
      cell: (contract) => (
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => handleViewContract(contract)}
          >
            פרטים
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">ניהול חוזים</h1>
          <p className="text-[#6b7280] text-sm">ניהול חוזים והסכמים עם ספקים</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => contractsQuery.refetch()}
          >
            <RefreshCw className={cn("w-4 h-4", contractsQuery.isFetching && "animate-spin")} />
          </Button>
          <Button 
            onClick={() => setShowCreateDialog(true)}
            className="bg-[#3b82f6] hover:bg-[#2563eb] gap-2"
          >
            <Plus className="w-4 h-4" />
            חוזה חדש
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#111827]">{stats.active.length}</div>
                <div className="text-xs text-[#6b7280]">חוזים פעילים</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#111827]">{stats.expiringSoon.length}</div>
                <div className="text-xs text-[#6b7280]">פג תוקף בקרוב</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#111827]">{stats.pending.length}</div>
                <div className="text-xs text-[#6b7280]">ממתינים לאישור</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#111827]">{stats.expired.length}</div>
                <div className="text-xs text-[#6b7280]">פגי תוקף</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expiring Soon Alert */}
      {stats.expiringSoon.length > 0 && (
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-orange-800">חוזים שפג תוקפם בקרוב</h3>
                <div className="mt-2 space-y-1">
                  {stats.expiringSoon.slice(0, 3).map(contract => (
                    <div key={contract.id} className="text-sm text-orange-700">
                      <span className="font-medium">{contract.vendor_name}</span>
                      {' - '}
                      פג תוקף ב-{format(new Date(contract.end_date), 'dd/MM/yyyy')}
                      {' '}
                      ({differenceInDays(new Date(contract.end_date), new Date())} ימים)
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="bg-white">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="חיפוש לפי שם ספק או מספר חוזה..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                <SelectItem value="active">פעיל</SelectItem>
                <SelectItem value="pending_approval">ממתין לאישור</SelectItem>
                <SelectItem value="expired">פג תוקף</SelectItem>
                <SelectItem value="suspended">מושהה</SelectItem>
                <SelectItem value="draft">טיוטה</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Contracts Table */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#6b7280]" />
            רשימת חוזים ({filteredContracts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredContracts}
            emptyMessage="לא נמצאו חוזים"
          />
        </CardContent>
      </Card>

      {/* Create Contract Dialog */}
      <ContractFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        vendors={vendors}
        onSuccess={handleContractCreated}
      />

      {/* Contract Details Dialog */}
      <ContractDetailsDialog
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        contract={selectedContract}
        onUpdate={() => {
          queryClient.invalidateQueries({ queryKey: ['vendorContracts'] });
        }}
      />
    </div>
  );
}