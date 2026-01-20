import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Settings,
  Users,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

export default function QueueSettings() {
  const [assignmentMethod, setAssignmentMethod] = useState('load_balancing');
  const [maxCallsPerAgent, setMaxCallsPerAgent] = useState(5);
  const [maxQueueTime, setMaxQueueTime] = useState(30);
  const [warningTime, setWarningTime] = useState(10);
  
  const [priorityRules, setPriorityRules] = useState({
    vip: { enabled: true, points: 30 },
    urgent: { enabled: true, points: 25 },
    long_wait: { enabled: true, points: 15 },
    center_area: { enabled: true, points: 5 },
    returning: { enabled: true, points: 10 }
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.role === 'user'); // Operators
    },
  });

  const { data: queueItems = [] } = useQuery({
    queryKey: ['allQueues'],
    queryFn: () => base44.entities.WorkQueue.list(),
  });

  // Count active calls per agent
  const getAgentStats = (agentEmail) => {
    const active = queueItems.filter(q => 
      q.assigned_to_agent === agentEmail &&
      ['assigned_to_agent', 'in_progress'].includes(q.queue_status)
    ).length;
    
    return {
      active,
      available: active < maxCallsPerAgent,
      overloaded: active >= maxCallsPerAgent
    };
  };

  const handleSaveSettings = () => {
    // TODO: Save to backend or local storage
    alert('הגדרות נשמרו בהצלחה');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-[32px] font-bold text-[#0078D4]">הגדרות תור עבודה</h1>
        <p className="text-[#616161] text-sm">ניהול חלוקת קריאות ועדיפויות</p>
      </div>

      {/* Assignment Method */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#0078D4]" />
            שיטת חלוקת קריאות
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-[#FAFAFA]">
              <input
                type="radio"
                name="assignment"
                value="round_robin"
                checked={assignmentMethod === 'round_robin'}
                onChange={(e) => setAssignmentMethod(e.target.value)}
              />
              <div>
                <p className="font-medium">Round Robin (סיבוב עגול)</p>
                <p className="text-sm text-[#616161]">כל נציג מקבל קריאה בתורו</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-[#FAFAFA]">
              <input
                type="radio"
                name="assignment"
                value="skill_based"
                checked={assignmentMethod === 'skill_based'}
                onChange={(e) => setAssignmentMethod(e.target.value)}
              />
              <div>
                <p className="font-medium">Skill-Based (לפי מיומנות)</p>
                <p className="text-sm text-[#616161]">חלוקה לפי אזורים ומומחיות</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-[#FAFAFA]">
              <input
                type="radio"
                name="assignment"
                value="priority_queue"
                checked={assignmentMethod === 'priority_queue'}
                onChange={(e) => setAssignmentMethod(e.target.value)}
              />
              <div>
                <p className="font-medium">Priority Queue (לפי עדיפות)</p>
                <p className="text-sm text-[#616161]">קריאות בעלות עדיפות גבוהה קודם</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border-2 border-[#0078D4] bg-[#E3F2FD] rounded-lg cursor-pointer">
              <input
                type="radio"
                name="assignment"
                value="load_balancing"
                checked={assignmentMethod === 'load_balancing'}
                onChange={(e) => setAssignmentMethod(e.target.value)}
              />
              <div>
                <p className="font-medium text-[#0078D4]">Load Balancing (איזון עומס) ⭐ מומלץ</p>
                <p className="text-sm text-[#616161]">חלוקה חכמה לפי עומס ועדיפות</p>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Agent Capacity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-[#0078D4]" />
            קיבולת נציגים
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>מקסימום קריאות פעילות לנציג</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={maxCallsPerAgent}
                onChange={(e) => setMaxCallsPerAgent(parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label>זמן מקסימום בתור (דקות)</Label>
              <Input
                type="number"
                min="5"
                max="120"
                value={maxQueueTime}
                onChange={(e) => setMaxQueueTime(parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label>התראה לנציג אחרי (דקות)</Label>
              <Input
                type="number"
                min="1"
                max="60"
                value={warningTime}
                onChange={(e) => setWarningTime(parseInt(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Priority Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#0078D4]" />
            כללי עדיפות
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries({
            vip: 'לקוח VIP',
            urgent: 'דחיפות גבוהה',
            long_wait: 'זמן המתנה ארוך',
            center_area: 'אזור מרכז',
            returning: 'לקוח חוזר'
          }).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Switch
                  checked={priorityRules[key].enabled}
                  onCheckedChange={(checked) => 
                    setPriorityRules({
                      ...priorityRules,
                      [key]: { ...priorityRules[key], enabled: checked }
                    })
                  }
                />
                <span className="font-medium">{label}</span>
              </div>
              <span className="text-[#0078D4] font-bold">
                +{priorityRules[key].points} נקודות
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Agent Availability */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-[#0078D4]" />
            זמינות נציגים
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {agents.map(agent => {
              const stats = getAgentStats(agent.email);
              return (
                <div 
                  key={agent.email}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{agent.full_name}</p>
                    <p className="text-sm text-[#616161]">{agent.email}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm">
                      {stats.active}/{maxCallsPerAgent} קריאות
                    </span>
                    {stats.overloaded ? (
                      <span className="text-[#ED6C02] font-medium">⚠️ בעומס</span>
                    ) : stats.available ? (
                      <span className="text-[#2E7D32] font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        זמין
                      </span>
                    ) : (
                      <span className="text-[#616161]">פנוי</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          size="lg"
          className="bg-[#0078D4] hover:bg-[#1976D2]"
          onClick={handleSaveSettings}
        >
          שמור הגדרות
        </Button>
      </div>
    </div>
  );
}