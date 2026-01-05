import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

import { Button } from "@/components/ui/button";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  AlertTriangle, 
  ArrowRight,
  Phone,
  MapPin
} from 'lucide-react';
import { createPageUrl } from '../utils';
import { Link } from 'react-router-dom';
import StatCard from '../components/ui/StatCard';

const issueTypeLabels = {
  mechanical: 'תקלה מכנית',
  stopped_driving: 'כבה בנסיעה',
  flat_tire: 'פנצ׳ר',
  stuck_wheel: 'גלגל תקוע',
  accident: 'תאונה',
  no_fuel: 'אין דלק',
  dead_battery: 'סוללה ריקה',
  locked_keys: 'מפתחות ננעלו',
  other: 'אחר'
};

export default function QueueMonitor() {
  const [selectedCall, setSelectedCall] = useState(null);
  const [targetAgent, setTargetAgent] = useState('');
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch agents
  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.role === 'user');
    },
    refetchInterval: 10000
  });

  // Fetch queue
  const { data: queueItems = [], isLoading } = useQuery({
    queryKey: ['queueMonitor'],
    queryFn: () => base44.entities.WorkQueue.list(),
    refetchInterval: 5000
  });

  // Fetch calls
  const { data: calls = [] } = useQuery({
    queryKey: ['calls'],
    queryFn: () => base44.entities.Call.list('-created_date', 100),
    refetchInterval: 10000
  });

  // Transfer mutation
  const transferMutation = useMutation({
    mutationFn: async ({ queueId, newAgent }) => {
      const now = new Date().toISOString();
      await base44.entities.WorkQueue.update(queueId, {
        assigned_to_agent: newAgent,
        queue_status: 'assigned_to_agent',
        assigned_at: now
      });
      
      const queueItem = queueItems.find(q => q.id === queueId);
      if (queueItem) {
        await base44.entities.CallHistory.create({
          call_id: queueItem.call_id,
          change_type: 'other',
          new_value: `הועבר ל-${agents.find(a => a.email === newAgent)?.full_name}`,
          notes: `קריאה הועברה על ידי מנהל משמרת`,
          changed_by: 'מנהל משמרת'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['queueMonitor']);
      setTransferDialogOpen(false);
      setSelectedCall(null);
      setTargetAgent('');
    }
  });

  // Calculate stats
  const waitingInQueue = queueItems.filter(q => q.queue_status === 'waiting_in_queue');
  const assignedToAgents = queueItems.filter(q => q.queue_status === 'assigned_to_agent');
  const inProgress = queueItems.filter(q => q.queue_status === 'in_progress');
  const completed = queueItems.filter(q => q.queue_status === 'completed' && q.time_to_complete);
  
  const avgTime = completed.length > 0
    ? Math.round(completed.reduce((sum, q) => sum + q.time_to_complete, 0) / completed.length)
    : 0;

  // Agent breakdown
  const agentStats = agents.map(agent => {
    const agentQueue = queueItems.filter(q => 
      q.assigned_to_agent === agent.email &&
      ['assigned_to_agent', 'in_progress'].includes(q.queue_status)
    );
    
    const agentCompleted = queueItems.filter(q => 
      q.assigned_to_agent === agent.email &&
      q.queue_status === 'completed' &&
      q.time_to_complete
    );
    
    const avgTimeAgent = agentCompleted.length > 0
      ? Math.round(agentCompleted.reduce((sum, q) => sum + q.time_to_complete, 0) / agentCompleted.length)
      : 0;

    return {
      agent,
      activeCount: agentQueue.length,
      completedToday: agentCompleted.length,
      avgTime: avgTimeAgent,
      calls: agentQueue.map(q => {
        const call = calls.find(c => c.id === q.call_id);
        return { ...q, call };
      })
    };
  });

  const handleTransferClick = (queueItem) => {
    setSelectedCall(queueItem);
    setTransferDialogOpen(true);
  };

  const handleTransfer = () => {
    if (selectedCall && targetAgent) {
      transferMutation.mutate({
        queueId: selectedCall.id,
        newAgent: targetAgent
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1>ניטור תורי עבודה</h1>
        <p className="text-[var(--color-text-secondary)]">מסך מנהל משמרת - תצוגת נציגים ותורים</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="בתור כללי"
          value={waitingInQueue.length}
        />
        <StatCard
          title="משובץ לנציגים"
          value={assignedToAgents.length}
        />
        <StatCard
          title="בטיפול"
          value={inProgress.length}
        />
        <StatCard
          title="זמן ממוצע"
          value={`${avgTime}'`}
        />
      </div>

      {/* Agents Table */}
      <div className="card-base">
        <h3 className="mb-4">סטטוס נציגים</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50 border-b border-gray-200/60">
                <TableHead className="text-right text-gray-500 font-medium text-sm">נציג</TableHead>
                <TableHead className="text-right text-gray-500 font-medium text-sm">קריאות פעילות</TableHead>
                <TableHead className="text-right text-gray-500 font-medium text-sm">הושלמו היום</TableHead>
                <TableHead className="text-right text-gray-500 font-medium text-sm">זמן ממוצע</TableHead>
                <TableHead className="text-right text-gray-500 font-medium text-sm">עומס</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agentStats.map(({ agent, activeCount, completedToday, avgTime }) => (
                <TableRow key={agent.id} className="border-b border-gray-100/50 hover:bg-white/50 transition-colors">
                  <TableCell className="font-medium text-[#212121]">{agent.full_name}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${activeCount >= 5 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                      {activeCount}
                    </span>
                  </TableCell>
                  <TableCell className="text-[#212121]">{completedToday}</TableCell>
                  <TableCell className="text-[#212121]">{avgTime > 0 ? `${avgTime}'` : '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-[#E5E7EB] rounded-full h-2 w-24">
                        <div 
                          className={`h-full rounded-full ${
                            activeCount >= 5 ? 'bg-[#D32F2F]' : 
                            activeCount >= 3 ? 'bg-[#ED6C02]' : 
                            'bg-[#2E7D32]'
                          }`}
                          style={{ width: `${Math.min(100, (activeCount / 5) * 100)}%` }}
                        />
                      </div>
                      {activeCount >= 5 && <AlertTriangle className="w-4 h-4 text-[#D32F2F]" />}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* General Queue */}
      {waitingInQueue.length > 0 && (
        <div className="card-base">
          <h3 className="mb-4">תור כללי - קריאות ללא שיבוץ ({waitingInQueue.length})</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50 border-b border-gray-200/60">
                  <TableHead className="text-right text-gray-500 font-medium text-sm">זמן בתור</TableHead>
                  <TableHead className="text-right text-gray-500 font-medium text-sm">קריאה</TableHead>
                  <TableHead className="text-right text-gray-500 font-medium text-sm">לקוח</TableHead>
                  <TableHead className="text-right text-gray-500 font-medium text-sm">תקלה</TableHead>
                  <TableHead className="text-right text-gray-500 font-medium text-sm">מיקום</TableHead>
                  <TableHead className="text-right text-gray-500 font-medium text-sm">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waitingInQueue.map(queueItem => {
                  const call = calls.find(c => c.id === queueItem.call_id);
                  if (!call) return null;
                  
                  const waitTime = Math.floor(
                    (new Date() - new Date(queueItem.added_to_queue_at)) / 60000
                  );
                  
                  return (
                    <TableRow key={queueItem.id} className="border-b border-gray-100/50 hover:bg-white/50 transition-colors">
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${waitTime > 10 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                          {waitTime} דקות
                        </span>
                      </TableCell>
                      <TableCell>
                        <Link 
                          to={createPageUrl(`CallDetails?id=${call.id}`)}
                          className="text-[#FF0000] hover:underline font-medium"
                        >
                          {call.call_number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-[#212121]">{call.customer_name}</p>
                          <p className="text-xs text-[#616161]">{call.customer_phone}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-[#212121]">{issueTypeLabels[call.issue_type]}</TableCell>
                      <TableCell className="text-[#212121]">{call.pickup_location_city}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTransferClick(queueItem)}
                        >
                          שבץ
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Agent Queues */}
      {agentStats.filter(s => s.activeCount > 0).map(({ agent, calls: agentCalls }) => (
        <div key={agent.id} className="card-base">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <h3>{agent.full_name} - {agentCalls.length} קריאות פעילות</h3>
            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${agentCalls.length >= 5 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
              {agentCalls.length >= 5 ? 'עומס גבוה' : 'פעיל'}
            </span>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50 border-b border-gray-200/60">
                  <TableHead className="text-right text-gray-500 font-medium text-sm">סטטוס</TableHead>
                  <TableHead className="text-right text-gray-500 font-medium text-sm">קריאה</TableHead>
                  <TableHead className="text-right text-gray-500 font-medium text-sm">לקוח</TableHead>
                  <TableHead className="text-right text-gray-500 font-medium text-sm">תקלה</TableHead>
                  <TableHead className="text-right text-gray-500 font-medium text-sm">מיקום</TableHead>
                  <TableHead className="text-right text-gray-500 font-medium text-sm">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agentCalls.map(({ id, queue_status, call }) => {
                  if (!call) return null;
                  
                  return (
                    <TableRow key={id} className="border-b border-gray-100/50 hover:bg-white/50 transition-colors">
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${queue_status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                          {queue_status === 'in_progress' ? 'בטיפול' : 'משובץ'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Link 
                          to={createPageUrl(`CallDetails?id=${call.id}`)}
                          className="text-[#FF0000] hover:underline font-medium"
                        >
                          {call.call_number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-[#212121]">{call.customer_name}</p>
                          <p className="text-xs text-[#616161]">{call.customer_phone}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-[#212121]">{issueTypeLabels[call.issue_type]}</TableCell>
                      <TableCell className="text-[#212121]">{call.pickup_location_city}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleTransferClick(queueItems.find(q => q.id === id))}
                        >
                          העבר
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}

      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>העבר קריאה לנציג</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedCall && (
              <div className="text-sm text-[#616161]">
                <p>קריאה: {calls.find(c => c.id === selectedCall.call_id)?.call_number}</p>
                <p>לקוח: {calls.find(c => c.id === selectedCall.call_id)?.customer_name}</p>
              </div>
            )}
            <Select value={targetAgent} onValueChange={setTargetAgent}>
              <SelectTrigger>
                <SelectValue placeholder="בחר נציג" />
              </SelectTrigger>
              <SelectContent>
                {agents
                  .filter(a => a.email !== selectedCall?.assigned_to_agent)
                  .map(agent => {
                    const load = agentStats.find(s => s.agent.id === agent.id)?.activeCount || 0;
                    return (
                      <SelectItem key={agent.id} value={agent.email}>
                        {agent.full_name} ({load} קריאות)
                      </SelectItem>
                    );
                  })}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
              ביטול
            </Button>
            <Button 
              onClick={handleTransfer}
              disabled={!targetAgent || transferMutation.isPending}
            >
              {transferMutation.isPending ? 'מעביר...' : 'העבר'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}