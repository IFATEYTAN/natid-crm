import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { QueryStateWrapper } from '@/components/layout/QueryStateWrapper';
import RoleGuard from '@/components/auth/RoleGuard';
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
import DataTable from '@/components/ui/DataTable';
import {
  Search,
  Shield,
  User,
  Clock,
  FileText,
  Download
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { formatDateTime } from '@/components/utils';

const actionLabels = {
  create: 'יצירה',
  update: 'עדכון',
  delete: 'מחיקה',
  view: 'צפייה',
  login: 'התחברות',
  logout: 'התנתקות',
  assign: 'שיבוץ',
  status_change: 'שינוי סטטוס',
  export: 'ייצוא',
  permission_change: 'שינוי הרשאות',
  role_change: 'שינוי תפקיד',
  access_denied: 'גישה נדחתה',
  sensitive_data_access: 'גישה למידע רגיש'
};

const actionColors = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
  view: 'bg-gray-100 text-gray-800',
  login: 'bg-purple-100 text-purple-800',
  logout: 'bg-gray-100 text-gray-800',
  assign: 'bg-orange-100 text-orange-800',
  status_change: 'bg-yellow-100 text-yellow-800',
  export: 'bg-indigo-100 text-indigo-800',
  permission_change: 'bg-red-100 text-red-800',
  role_change: 'bg-red-100 text-red-800',
  access_denied: 'bg-red-200 text-red-900',
  sensitive_data_access: 'bg-yellow-200 text-yellow-900'
};

const severityColors = {
  info: 'border-l-blue-400',
  warning: 'border-l-yellow-400',
  critical: 'border-l-red-500'
};

export default function AuditLogPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');

  const auditQuery = useQuery({
    queryKey: ['auditLog'],
    queryFn: () => base44.entities.AuditLog.list('-created_date', 500),
  });

  const logs = auditQuery.data || [];

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = !searchQuery || 
        log.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.entity_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAction = actionFilter === 'all' || log.action === actionFilter;
      const matchesEntity = entityFilter === 'all' || log.entity_type === entityFilter;
      return matchesSearch && matchesAction && matchesEntity;
    });
  }, [logs, searchQuery, actionFilter, entityFilter]);

  // Get unique entity types
  const entityTypes = [...new Set(logs.map(l => l.entity_type).filter(Boolean))];

  const columns = [
    {
      header: 'תאריך',
      accessor: 'created_date',
      cell: (log) => (
        <div className="text-sm">
          <div className="flex items-center gap-1 text-[#172B4D]">
            <Clock className="w-3 h-3" />
            {formatDateTime(log.created_date)}
          </div>
        </div>
      )
    },
    {
      header: 'משתמש',
      accessor: 'user_email',
      cell: (log) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#F4F5F7] flex items-center justify-center">
            <User className="w-4 h-4 text-[#6B778C]" />
          </div>
          <div>
            <div className="text-sm font-medium">{log.user_email}</div>
            <div className="text-xs text-[#6B778C]">{log.user_role}</div>
          </div>
        </div>
      )
    },
    {
      header: 'פעולה',
      accessor: 'action',
      cell: (log) => (
        <Badge className={cn("text-xs", actionColors[log.action])}>
          {actionLabels[log.action] || log.action}
        </Badge>
      )
    },
    {
      header: 'ישות',
      accessor: 'entity_type',
      cell: (log) => (
        <div className="text-sm">
          <div className="font-medium">{log.entity_type}</div>
          {log.entity_name && (
            <div className="text-xs text-[#6B778C]">{log.entity_name}</div>
          )}
        </div>
      )
    },
    {
      header: 'פרטים',
      accessor: 'details',
      cell: (log) => (
        <div className="text-sm text-[#6B778C] max-w-[300px] truncate">
          {log.details || '-'}
        </div>
      )
    },
    {
      header: 'חומרה',
      accessor: 'severity',
      cell: (log) => (
        <Badge className={cn("text-xs", 
          log.severity === 'critical' ? 'bg-red-100 text-red-800' :
          log.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        )}>
          {log.severity === 'critical' ? 'קריטי' :
           log.severity === 'warning' ? 'אזהרה' : 'מידע'}
        </Badge>
      )
    }
  ];

  const exportLogs = () => {
    const csv = [
      ['תאריך', 'משתמש', 'תפקיד', 'פעולה', 'ישות', 'מזהה', 'פרטים'].join(','),
      ...filteredLogs.map(log => [
        log.created_date,
        log.user_email,
        log.user_role,
        actionLabels[log.action] || log.action,
        log.entity_type,
        log.entity_id,
        `"${(log.details || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit_log_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#172B4D] flex items-center gap-2">
              <Shield className="w-6 h-6 text-red-600" />
              יומן פעולות
            </h1>
            <p className="text-[#6B778C] text-sm">תיעוד כל הפעולות במערכת</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={exportLogs}>
            <Download className="w-4 h-4" />
            ייצוא CSV
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-[#172B4D]">{logs.length}</div>
              <div className="text-sm text-[#6B778C]">סה"כ פעולות</div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {logs.filter(l => l.action === 'create').length}
              </div>
              <div className="text-sm text-[#6B778C]">יצירות</div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {logs.filter(l => l.action === 'update').length}
              </div>
              <div className="text-sm text-[#6B778C]">עדכונים</div>
            </CardContent>
          </Card>
          <Card className="bg-white border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">
                {logs.filter(l => l.severity === 'critical' || l.action === 'access_denied').length}
              </div>
              <div className="text-sm text-[#6B778C]">אירועי אבטחה</div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">
                {[...new Set(logs.map(l => l.user_email))].length}
              </div>
              <div className="text-sm text-[#6B778C]">משתמשים פעילים</div>
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
                  placeholder="חיפוש לפי משתמש, ישות או פרטים..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="פעולה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הפעולות</SelectItem>
                  {Object.entries(actionLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="ישות" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הישויות</SelectItem>
                  {entityTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <QueryStateWrapper query={auditQuery}>
              <DataTable
                columns={columns}
                data={filteredLogs}
                emptyMessage="לא נמצאו פעולות ביומן"
              />
            </QueryStateWrapper>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}