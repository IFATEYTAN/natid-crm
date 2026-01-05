import React, { useState } from 'react';
import AgentCard from '@/components/AgentCard';
import AvatarStack from '@/components/ui/AvatarStack';

// Mock agents data - replace with actual API integration
const MOCK_AGENTS = [
  {
    id: 'scheduling-agent',
    name: 'סוכן תזמון',
    description: 'מתזמן אוטומטית פגישות ומשימות לפי זמינות הצוות והלקוחות',
    status: 'inactive',
    stats: { completedTasks: 156, lastRun: '12:45' }
  },
  {
    id: 'notification-agent',
    name: 'סוכן התראות',
    description: 'שולח התראות אוטומטיות ללקוחות ולספקים על עדכוני סטטוס',
    status: 'active',
    stats: { completedTasks: 2341, lastRun: '14:32' }
  },
  {
    id: 'assignment-agent',
    name: 'סוכן הקצאה',
    description: 'מקצה אוטומטית קריאות לספקים הזמינים בהתאם לאזור ומומחיות',
    status: 'inactive',
    stats: { completedTasks: 89, lastRun: '09:15' }
  },
  {
    id: 'followup-agent',
    name: 'סוכן מעקב',
    description: 'מבצע מעקב אוטומטי אחרי קריאות פתוחות ומזכיר על טיפולים נדרשים',
    status: 'active',
    stats: { completedTasks: 432, lastRun: '14:28' }
  },
  {
    id: 'report-agent',
    name: 'סוכן דוחות',
    description: 'מייצר דוחות תקופתיים ושולח אותם אוטומטית למנהלים',
    status: 'inactive',
    stats: { completedTasks: 24, lastRun: 'אתמול' }
  },
  {
    id: 'data-sync-agent',
    name: 'סוכן סנכרון נתונים',
    description: 'מסנכרן נתונים בין מערכות חיצוניות ומעדכן את ה-CRM בזמן אמת',
    status: 'inactive',
    stats: { completedTasks: 1205, lastRun: '13:00' }
  }
];

export default function Agents() {
  const [agents, setAgents] = useState(MOCK_AGENTS);
  const [loadingAgentId, setLoadingAgentId] = useState(null);
  const [logs, setLogs] = useState([
    { id: 1, timestamp: '14:32:15', agent: 'סוכן התראות', action: 'נשלחה התראה ללקוח - עדכון סטטוס קריאה #1234', type: 'info' },
    { id: 2, timestamp: '14:28:03', agent: 'סוכן מעקב', action: 'נוצרה תזכורת לקריאה #1189 - ממתין לתגובת ספק', type: 'info' },
    { id: 3, timestamp: '14:15:22', agent: 'סוכן התראות', action: 'נשלחה התראה לספק - משימה חדשה', type: 'info' },
    { id: 4, timestamp: '13:45:00', agent: 'סוכן מעקב', action: 'קריאה #1156 סומנה כדורשת טיפול דחוף', type: 'warning' },
  ]);

  const handleToggleAgent = async (agentId) => {
    setLoadingAgentId(agentId);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));

    setAgents(prev => prev.map(agent => {
      if (agent.id === agentId) {
        const newStatus = agent.status === 'active' ? 'inactive' : 'active';

        // Add log entry
        const now = new Date();
        const timeStr = now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const newLog = {
          id: Date.now(),
          timestamp: timeStr,
          agent: agent.name,
          action: newStatus === 'active' ? 'הסוכן הופעל' : 'הסוכן הופסק',
          type: newStatus === 'active' ? 'success' : 'info'
        };
        setLogs(prevLogs => [newLog, ...prevLogs].slice(0, 50));

        return { ...agent, status: newStatus };
      }
      return agent;
    }));

    setLoadingAgentId(null);
  };

  const activeAgentsCount = agents.filter(a => a.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-[#212121]">סוכנים</h1>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-[14px] text-[#616161]">
              ניהול והפעלת סוכנים אוטומטיים במערכת
            </p>
            <AvatarStack users={agents.filter(a => a.status === 'active')} size="sm" max={6} />
          </div>
        </div>
        <div className="text-left">
          <div className="text-[24px] font-bold text-[#3B82F6]">{activeAgentsCount}</div>
          <div className="text-[13px] text-[#6B7280]">סוכנים פעילים</div>
        </div>
      </div>

      {/* Agents Grid */}
      <div>
        <h2 className="text-[18px] font-semibold text-[#212121] mb-4">כל הסוכנים</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map(agent => (
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
      <div className="bg-white border border-[#E5E7EB] rounded-lg">
        <div className="px-5 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-[18px] font-semibold text-[#212121]">יומן פעילות</h2>
        </div>
        <div className="divide-y divide-[#F3F4F6] max-h-[320px] overflow-y-auto">
          {logs.length === 0 ? (
            <div className="px-5 py-8 text-center text-[#9CA3AF] text-[14px]">
              אין פעילות להצגה
            </div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="px-5 py-3 flex items-start gap-4 hover:bg-[#FAFAFA] transition-colors">
                <div className="text-[13px] text-[#9CA3AF] font-mono whitespace-nowrap">
                  {log.timestamp}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[13px] font-medium text-[#3B82F6]">{log.agent}</span>
                  <span className="text-[13px] text-[#6B7280] mx-2">—</span>
                  <span className="text-[13px] text-[#374151]">{log.action}</span>
                </div>
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  log.type === 'warning' ? 'bg-[#F59E0B]' :
                  log.type === 'success' ? 'bg-[#3B82F6]' :
                  'bg-[#9CA3AF]'
                }`} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}