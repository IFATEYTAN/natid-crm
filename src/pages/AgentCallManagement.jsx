import React, { useMemo, useState } from 'react';
import { usePermissions } from '@/components/permissions/PermissionsContext';
import { useAgentCalls } from '@/hooks/useAgentCalls';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AgentCallCard from '@/components/agent/AgentCallCard';
import { openStatuses } from '@/config/labels';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AgentCallManagementPage() {
  const { currentUser } = usePermissions();
  const { calls, isLoading, isFetching, isError, error, refetch } = useAgentCalls(
    currentUser?.email
  );
  const [activeTab, setActiveTab] = useState('active');

  const activeCalls = useMemo(
    () => calls.filter((c) => openStatuses.includes(c.call_status)),
    [calls]
  );
  const completedCalls = useMemo(
    () => calls.filter((c) => ['completed', 'cancelled'].includes(c.call_status)),
    [calls]
  );

  const visibleCalls =
    activeTab === 'active' ? activeCalls : activeTab === 'completed' ? completedCalls : calls;

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#172B4D]">הקריאות שלי</h1>
          <p className="text-[#6B778C] text-sm">קריאות שהוקצו לך לטיפול בשטח</p>
        </div>
        <Button variant="outline" size="sm" onClick={refetch} className="gap-2 w-fit">
          <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
          רענן
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">פעילות ({activeCalls.length})</TabsTrigger>
          <TabsTrigger value="completed">נסגרו ({completedCalls.length})</TabsTrigger>
          <TabsTrigger value="all">הכל ({calls.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-4 border-slate-200 border-t-red-500 rounded-full animate-spin" />
        </div>
      ) : visibleCalls.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="p-8 text-center text-[#6B778C]">אין קריאות להצגה</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleCalls.map((call) => (
            <AgentCallCard key={call.id} call={call} />
          ))}
        </div>
      )}
    </div>
  );
}
