import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl, formatDate } from '@/components/utils';
import { useCustomers, useDeleteCustomer } from '@/components/hooks/useCustomers';
import { QueryStateWrapper } from '@/components/layout/QueryStateWrapper';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DataTable from '@/components/ui/DataTable';
import {
  Plus,
  Search,
  Building2,
  User,
  Phone,
  Mail,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  FileText
} from 'lucide-react';
import { cn } from "@/lib/utils";

const customerTypeLabels = {
  insurance_company: 'חברת ביטוח',
  fleet: 'ציי רכב',
  individual: 'פרטי',
  garage: 'מוסך',
  other: 'אחר'
};

const statusLabels = {
  active: 'פעיל',
  inactive: 'לא פעיל',
  suspended: 'מושהה'
};

const statusColors = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  suspended: 'bg-red-100 text-red-800'
};

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const customersQuery = useCustomers();
  const deleteCustomer = useDeleteCustomer();

  const customers = customersQuery.data || [];

  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      const matchesSearch = !searchQuery || 
        customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone?.includes(searchQuery) ||
        customer.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || customer.customer_type === typeFilter;
      const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [customers, searchQuery, typeFilter, statusFilter]);

  const stats = useMemo(() => ({
    total: customers.length,
    active: customers.filter(c => c.status === 'active').length,
    insuranceCompanies: customers.filter(c => c.customer_type === 'insurance_company').length,
    fleets: customers.filter(c => c.customer_type === 'fleet').length,
  }), [customers]);

  const columns = [
    {
      header: 'לקוח',
      accessor: 'name',
      cell: (customer) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#F4F5F7] flex items-center justify-center">
            <Building2 className="w-5 h-5 text-[#6B778C]" />
          </div>
          <div>
            <Link 
              to={createPageUrl(`CustomerDetails?id=${customer.id}`)}
              className="font-medium text-[#172B4D] hover:text-red-600"
            >
              {customer.name}
            </Link>
            <div className="text-xs text-[#6B778C]">
              {customerTypeLabels[customer.customer_type]}
            </div>
          </div>
        </div>
      )
    },
    {
      header: 'איש קשר',
      accessor: 'contact_person',
      cell: (customer) => (
        <div className="text-sm">
          <div className="flex items-center gap-1 text-[#172B4D]">
            <User className="w-3 h-3" />
            {customer.contact_person || '-'}
          </div>
          <div className="flex items-center gap-1 text-[#6B778C] mt-0.5">
            <Phone className="w-3 h-3" />
            {customer.phone}
          </div>
        </div>
      )
    },
    {
      header: 'עיר',
      accessor: 'city',
      cell: (customer) => customer.city || '-'
    },
    {
      header: 'סה"כ קריאות',
      accessor: 'total_cases',
      cell: (customer) => (
        <span className="font-medium">{customer.total_cases || 0}</span>
      )
    },
    {
      header: 'סטטוס',
      accessor: 'status',
      cell: (customer) => (
        <Badge className={cn("text-xs", statusColors[customer.status])}>
          {statusLabels[customer.status]}
        </Badge>
      )
    },
    {
      header: '',
      cell: (customer) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to={createPageUrl(`CustomerDetails?id=${customer.id}`)}>
                <Eye className="w-4 h-4 ml-2" />
                צפייה בפרטים
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={createPageUrl(`EditCustomer?id=${customer.id}`)}>
                <Pencil className="w-4 h-4 ml-2" />
                עריכה
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-red-600"
              onClick={() => {
                if (confirm('האם אתה בטוח שברצונך למחוק לקוח זה?')) {
                  deleteCustomer.mutate(customer.id);
                }
              }}
            >
              <Trash2 className="w-4 h-4 ml-2" />
              מחיקה
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#172B4D]">לקוחות</h1>
          <p className="text-[#6B778C] text-sm">ניהול לקוחות וחברות ביטוח</p>
        </div>
        <Link to={createPageUrl('NewCustomer')}>
          <Button className="bg-[#FF0000] hover:bg-[#CC0000] gap-2">
            <Plus className="w-4 h-4" />
            לקוח חדש
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-[#172B4D]">{stats.total}</div>
            <div className="text-sm text-[#6B778C]">סה"כ לקוחות</div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <div className="text-sm text-[#6B778C]">לקוחות פעילים</div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.insuranceCompanies}</div>
            <div className="text-sm text-[#6B778C]">חברות ביטוח</div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.fleets}</div>
            <div className="text-sm text-[#6B778C]">ציי רכב</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card className="bg-white">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B778C]" />
              <Input
                placeholder="חיפוש לפי שם, טלפון או אימייל..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="סוג לקוח" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסוגים</SelectItem>
                {Object.entries(customerTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <QueryStateWrapper query={customersQuery}>
            <DataTable
              columns={columns}
              data={filteredCustomers}
              emptyMessage="לא נמצאו לקוחות"
            />
          </QueryStateWrapper>
        </CardContent>
      </Card>
    </div>
  );
}