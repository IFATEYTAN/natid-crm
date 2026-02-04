import React, { useState } from 'react';
import AgentCard from '@/components/AgentCard';
import AvatarStack from '@/components/ui/AvatarStack';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Zap, Activity } from 'lucide-react';

// Mock agents data - replace with actual API integration
const MOCK_AGENTS = [
  {
    id: 'scheduling-agent',
    name: 'סוכן תזמון',
    description: 'מתזמן אוטומטית פגישות ומשימות לפי זמינות הצוות והלקוחות',
    status: 'inactive',
    stats: { completedTasks: 156, lastRun: '12:45' },
  },
  {
    id: 'notification-agent',
    name: 'סוכן התראות',
    description: 'שולח התראות אוטומטיות ללקוחות ולספקים על עדכוני סטטוס',
    status: 'active',
    stats: { completedTasks: 2341, lastRun: '14:32' },
  },
  {
    id: 'assignment-agent',
    name: 'סוכן הקצאה',
    description: 'מקצה אוטומטית קריאות לספקים הזמינים בהתאם לאזור ומומחיות',
    status: 'inactive',
    stats: { completedTasks: 89, lastRun: '09:15' },
  },
  {
    id: 'followup-agent',
    name: 'סוכן מעקב',
    description: 'מבצע מעקב אוטומטי אחרי קריאות פתוחות ומזכיר על טיפולים נדרשים',
    status: 'active',
    stats: { completedTasks: 432, lastRun: '14:28' },
  },
  {
    id: 'report-agent',
    name: 'סוכן דוחות',
    description: 'מייצר דוחות תקופתיים ושולח אותם אוטומטית למנהלים',
    status: 'inactive',
    stats: { completedTasks: 24, lastRun: 'אתמול' },
  },
  {
    id: 'data-sync-agent',
    name: 'סוכן סנכרון נתונים',
    description: 'מסנכרן נתונים בין מערכות חיצוניות ומעדכן את ה-CRM בזמן אמת',
    status: 'inactive',
    stats: { completedTasks: 1205, lastRun: '13:00' },
  },
];

export default function Agents() {
  const [agents, setAgents] = useState(MOCK_AGENTS);
  const [loadingAgentId, setLoadingAgentId] = useState(null);
  const [logs, setLogs] = useState([
    {
      id: 1,
      timestamp: '14:32:15',
      agent: 'סוכן התראות',
      action: 'נשלחה התראה ללקוח - עדכון סטטוס קריאה #1234',
      type: 'info',
    },
    {
      id: 2,
      timestamp: '14:28:03',
      agent: 'סוכן מעקב',
      action: 'נוצרה תזכורת לקריאה #1189 - ממתין לתגובת ספק',
      type: 'info',
    },
    {
      id: 3,
      timestamp: '14:15:22',
      agent: 'סוכן התראות',
      action: 'נשלחה התראה לספק - משימה חדשה',
      type: 'info',
    },
    {
      id: 4,
      timestamp: '13:45:00',
      agent: 'סוכן מעקב',
      action: 'קריאה #1156 סומנה כדורשת טיפול דחוף',
      type: 'warning',
    },
  ]);

  const handleToggleAgent = async (agentId) => {
    setLoadingAgentId(agentId);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));

    setAgents((prev) =>
      prev.map((agent) => {
        if (agent.id === agentId) {
          const newStatus = agent.status === 'active' ? 'inactive' : 'active';

          // Add log entry
          const now = new Date();
          const timeStr = now.toLocaleTimeString('he-IL', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
          const newLog = {
            id: Date.now(),
            timestamp: timeStr,
            agent: agent.name,
            action: newStatus === 'active' ? 'הסוכן הופעל' : 'הסוכן הופסק',
            type: newStatus === 'active' ? 'success' : 'info',
          };
          setLogs((prevLogs) => [newLog, ...prevLogs].slice(0, 50));

          return { ...agent, status: newStatus };
        }
        return agent;
      })
    );

    setLoadingAgentId(null);
  };

  const activeAgentsCount = agents.filter((a) => a.status === 'active').length;
  const totalTasks = agents.reduce((acc, curr) => acc + (curr.stats?.completedTasks || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold text-gray-900">סוכנים</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-gray-500">ניהול והפעלת סוכנים אוטומטיים במערכת</p>
            <span className="text-gray-300">|</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">פעילים:</span>
              <AvatarStack users={agents.filter((a) => a.status === 'active')} size="sm" max={4} />
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="bg-white px-4 py-2 rounded-lg border shadow-sm text-center min-w-[100px]">
            <div className="text-2xl font-bold text-primary">{activeAgentsCount}</div>
            <div className="text-xs text-gray-500 font-medium">סוכנים פעילים</div>
          </div>
          <div className="bg-white px-4 py-2 rounded-lg border shadow-sm text-center min-w-[100px]">
            <div className="text-2xl font-bold text-gray-900">{totalTasks.toLocaleString()}</div>
            <div className="text-xs text-gray-500 font-medium">פעולות שבוצעו</div>
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-gray-900">כל הסוכנים</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onToggle={handleToggleAgent}
              isLoading={loadingAgentId === agent.id}
            />
          ))}
        </div>
      </div>

      {/* Activity Log */}
      <Card>
        <CardHeader className="border-b bg-gray-50/50 py-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5 text-gray-500" />
            יומן פעילות
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y max-h-[400px] overflow-y-auto">
            {logs.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">אין פעילות להצגה</div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex flex-col items-center gap-1 mt-0.5">
                    <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                      {log.timestamp}
                    </span>
                  </div>

                  <div
                    className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
                    style={{
                      backgroundColor:
                        log.type === 'warning'
                          ? '#F59E0B'
                          : log.type === 'success'
                            ? '#10B981'
                            : '#3B82F6',
                    }}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{log.agent}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">{log.action}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
