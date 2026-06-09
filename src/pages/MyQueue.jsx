import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { useCalls } from '@/features/calls/hooks/useCalls';
import { usePermissions } from '@/components/permissions/PermissionsContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { buildCallColumns } from '@/components/calls/callTableColumns';
import { Phone, MapPin, Clock, AlertTriangle, RefreshCw, User, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

import { issueTypeLabels } from '@/config/labels';

const priorityColors = {
  normal: 'bg-gray-100 text-gray-800',
  urgent: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

export default function MyQueuePage() {
  const { currentUser } = usePermissions();
  const [activeTab, setActiveTab] = useState('active');

  const { data: allCalls = [], isLoading, isError, error, refetch, isFetching } = useCalls();

  // Filter calls assigned to current user (by created_by or assigned operator)
  const myCalls = useMemo(() => {
    if (!currentUser?.email) return [];
    return allCalls.filter((call) => call.created_by === currentUser.email);
  }, [allCalls, currentUser?.email]);

  const activeCalls = myCalls.filter((c) =>
    [
      'waiting_treatment',
      'awaiting_assignment',
      'assigning',
      'vendor_enroute',
      'in_progress',
    ].includes(c.call_status)
  );
  const completedCalls = myCalls.filter((c) => ['completed', 'cancelled'].includes(c.call_status));

  const stats = useMemo(
    () => ({
      total: myCalls.length,
      active: activeCalls.length,
      completed: completedCalls.length,
      urgent: myCalls.filter((c) => c.call_priority === 'urgent' || c.call_priority === 'critical')
        .length,
    }),
    [myCalls, activeCalls, completedCalls]
  );

  const columns = buildCallColumns({
    getCall: (call) => call,
    getCallId: (call) => call.id,
  });

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-red-500 text-lg font-medium mb-2">שגיאה בטעינת נתונים</p>
        <p className="text-gray-500 text-sm">{error?.message || 'נסה לרענן את הדף'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#172B4D]">התור שלי</h1>
          <p className="text-[#6B778C] text-sm">קריאות שנפתחו על ידך</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 w-fit">
          <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
          רענן
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#172B4D]">{stats.total}</div>
                <div className="text-sm text-[#6B778C]">סה"כ קריאות</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#172B4D]">{stats.active}</div>
                <div className="text-sm text-[#6B778C]">פעילות</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#172B4D]">{stats.completed}</div>
                <div className="text-sm text-[#6B778C]">נסגרו</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#172B4D]">{stats.urgent}</div>
                <div className="text-sm text-[#6B778C]">דחופות</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calls Table */}
      <Card className="bg-white">
        <CardHeader className="pb-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="active">פעילות ({activeCalls.length})</TabsTrigger>
              <TabsTrigger value="completed">נסגרו ({completedCalls.length})</TabsTrigger>
              <TabsTrigger value="all">הכל ({myCalls.length})</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="pt-4">
          {activeTab === 'active' && (
            <DataTable
              columns={columns}
              data={activeCalls}
              isLoading={isLoading}
              emptyMessage="אין קריאות פעילות בתור שלך"
            />
          )}
          {activeTab === 'completed' && (
            <DataTable
              columns={columns}
              data={completedCalls}
              isLoading={isLoading}
              emptyMessage="אין קריאות שנסגרו"
            />
          )}
          {activeTab === 'all' && (
            <DataTable
              columns={columns}
              data={myCalls}
              isLoading={isLoading}
              emptyMessage="אין קריאות בתור שלך"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}