import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Download, 
  FileText, 
  Users, 
  Clock, 
  TrendingUp,
  Star
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { he } from 'date-fns/locale';

const COLORS = ['#0078D4', '#2E7D32', '#ED6C02', '#D32F2F', '#9C27B0'];

export default function Reports() {
  const [dateRange, setDateRange] = useState('7');
  const [selectedAgent, setSelectedAgent] = useState('all');

  // Fetch data
  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.role === 'user');
    }
  });

  const { data: queueItems = [] } = useQuery({
    queryKey: ['queueItemsReport'],
    queryFn: () => base44.entities.WorkQueue.list()
  });

  const { data: calls = [] } = useQuery({
    queryKey: ['callsReport'],
    queryFn: () => base44.entities.Call.list('-created_date', 500)
  });

  const { data: callHistory = [] } = useQuery({
    queryKey: ['callHistoryReport'],
    queryFn: () => base44.entities.CallHistory.list('-created_date', 1000)
  });

  // Calculate date range
  const startDate = startOfDay(subDays(new Date(), parseInt(dateRange)));
  const endDate = endOfDay(new Date());

  // Filter by date
  const filteredQueue = queueItems.filter(q => {
    if (!q.added_to_queue_at) return false;
    const date = new Date(q.added_to_queue_at);
    return date >= startDate && date <= endDate;
  });

  const filteredCalls = calls.filter(c => {
    if (!c.created_date) return false;
    const date = new Date(c.created_date);
    return date >= startDate && date <= endDate;
  });

  // Agent Performance Report
  const agentPerformance = agents.map(agent => {
    const agentQueue = filteredQueue.filter(q => q.assigned_to_agent === agent.email);
    const completed = agentQueue.filter(q => q.queue_status === 'completed' && q.time_to_complete);
    const agentCalls = filteredCalls.filter(c => 
      callHistory.some(h => h.call_id === c.id && h.notes?.includes(agent.full_name))
    );
    
    const avgTime = completed.length > 0
      ? Math.round(completed.reduce((sum, q) => sum + q.time_to_complete, 0) / completed.length)
      : 0;
    
    const avgRating = agentCalls.filter(c => c.customer_rating).length > 0
      ? (agentCalls.reduce((sum, c) => sum + (c.customer_rating || 0), 0) / agentCalls.filter(c => c.customer_rating).length).toFixed(1)
      : 0;

    return {
      name: agent.full_name,
      email: agent.email,
      completedCalls: completed.length,
      avgTime,
      avgRating: parseFloat(avgRating),
      totalAssigned: agentQueue.length
    };
  }).sort((a, b) => b.completedCalls - a.completedCalls);

  // Queue Load Report
  const queueLoadByDay = Array.from({ length: parseInt(dateRange) }, (_, i) => {
    const date = subDays(new Date(), parseInt(dateRange) - 1 - i);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    
    const dayQueue = filteredQueue.filter(q => {
      const qDate = new Date(q.added_to_queue_at);
      return qDate >= dayStart && qDate <= dayEnd;
    });
    
    const waiting = dayQueue.filter(q => q.queue_status === 'waiting_in_queue');
    const avgWaitTime = waiting.length > 0 && waiting.some(q => q.time_in_queue)
      ? Math.round(waiting.reduce((sum, q) => sum + (q.time_in_queue || 0), 0) / waiting.filter(q => q.time_in_queue).length)
      : 0;

    return {
      date: format(date, 'dd/MM', { locale: he }),
      waiting: waiting.length,
      completed: dayQueue.filter(q => q.queue_status === 'completed').length,
      avgWaitTime
    };
  });

  // Overall Efficiency
  const totalCompleted = filteredQueue.filter(q => q.queue_status === 'completed').length;
  const totalAssigned = filteredQueue.length;
  const completionRate = totalAssigned > 0 ? ((totalCompleted / totalAssigned) * 100).toFixed(1) : 0;
  
  const avgTimeToComplete = filteredQueue.filter(q => q.time_to_complete).length > 0
    ? Math.round(filteredQueue.reduce((sum, q) => sum + (q.time_to_complete || 0), 0) / filteredQueue.filter(q => q.time_to_complete).length)
    : 0;

  const avgCustomerRating = filteredCalls.filter(c => c.customer_rating).length > 0
    ? (filteredCalls.reduce((sum, c) => sum + (c.customer_rating || 0), 0) / filteredCalls.filter(c => c.customer_rating).length).toFixed(1)
    : 0;

  // Status Distribution
  const statusDistribution = [
    { name: 'הושלם', value: filteredQueue.filter(q => q.queue_status === 'completed').length },
    { name: 'בטיפול', value: filteredQueue.filter(q => q.queue_status === 'in_progress').length },
    { name: 'משובץ', value: filteredQueue.filter(q => q.queue_status === 'assigned_to_agent').length },
    { name: 'ממתין', value: filteredQueue.filter(q => q.queue_status === 'waiting_in_queue').length }
  ].filter(item => item.value > 0);

  // Export Functions
  const exportToExcel = (data, filename) => {
    const csvContent = convertToCSV(data);
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${format(new Date(), 'dd-MM-yyyy')}.csv`;
    link.click();
  };

  const convertToCSV = (data) => {
    if (!data || data.length === 0) return '';
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    return [headers, ...rows].join('\n');
  };

  const exportAgentPerformance = () => {
    const data = agentPerformance.map(a => ({
      'נציג': a.name,
      'קריאות_הושלמו': a.completedCalls,
      'זמן_ממוצע_דקות': a.avgTime,
      'דירוג_ממוצע': a.avgRating,
      'סה_כ_שובצו': a.totalAssigned
    }));
    exportToExcel(data, 'ביצועי_נציגים');
  };

  const exportQueueLoad = () => {
    const data = queueLoadByDay.map(d => ({
      'תאריך': d.date,
      'ממתינים': d.waiting,
      'הושלם': d.completed,
      'זמן_המתנה_ממוצע': d.avgWaitTime
    }));
    exportToExcel(data, 'עומסי_תור');
  };

  const exportToHTML = () => {
    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>דוח ביצועים - נתי שירותי דרך</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700&display=swap');
    
    * {
      font-family: 'Heebo', sans-serif;
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      background: #FAFAFA;
      padding: 40px 20px;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      padding: 40px;
    }
    
    .header {
      text-align: center;
      border-bottom: 3px solid #0078D4;
      padding-bottom: 20px;
      margin-bottom: 40px;
    }
    
    .header h1 {
      color: #0078D4;
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 10px;
    }
    
    .header p {
      color: #616161;
      font-size: 16px;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    
    .stat-card {
      background: linear-gradient(135deg, #0078D4 0%, #1976D2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    
    .stat-card h3 {
      font-size: 14px;
      opacity: 0.9;
      margin-bottom: 10px;
    }
    
    .stat-card .value {
      font-size: 36px;
      font-weight: 700;
    }
    
    .section {
      margin-bottom: 40px;
    }
    
    .section h2 {
      color: #212121;
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #E0E0E0;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    
    th, td {
      padding: 12px;
      text-align: right;
      border-bottom: 1px solid #E0E0E0;
    }
    
    th {
      background: #FAFAFA;
      color: #212121;
      font-weight: 600;
    }
    
    tr:hover {
      background: #F5F5F5;
    }
    
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 2px solid #E0E0E0;
      text-align: center;
      color: #9E9E9E;
      font-size: 14px;
    }
    
    @media print {
      body {
        padding: 0;
      }
      .container {
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>דוח ביצועים מוקד</h1>
      <p>נתי שירותי דרך | ${format(startDate, 'dd/MM/yyyy', { locale: he })} - ${format(endDate, 'dd/MM/yyyy', { locale: he })}</p>
    </div>
    
    <div class="stats-grid">
      <div class="stat-card">
        <h3>אחוז השלמה</h3>
        <div class="value">${completionRate}%</div>
      </div>
      <div class="stat-card">
        <h3>זמן טיפול ממוצע</h3>
        <div class="value">${avgTimeToComplete}'</div>
      </div>
      <div class="stat-card">
        <h3>דירוג לקוחות</h3>
        <div class="value">${avgCustomerRating} ⭐</div>
      </div>
      <div class="stat-card">
        <h3>סה"כ קריאות</h3>
        <div class="value">${totalAssigned}</div>
      </div>
    </div>
    
    <div class="section">
      <h2>ביצועי נציגים</h2>
      <table>
        <thead>
          <tr>
            <th>נציג</th>
            <th>קריאות הושלמו</th>
            <th>זמן ממוצע</th>
            <th>דירוג</th>
          </tr>
        </thead>
        <tbody>
          ${agentPerformance.map(agent => `
            <tr>
              <td>${agent.name}</td>
              <td>${agent.completedCalls}</td>
              <td>${agent.avgTime} דקות</td>
              <td>${agent.avgRating || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <div class="footer">
      <p>נוצר על ידי מערכת CRM של נתי שירותי דרך</p>
      <p>תאריך הפקה: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: he })}</p>
    </div>
  </div>
</body>
</html>
    `;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `דוח_ביצועים_${format(new Date(), 'dd-MM-yyyy')}.html`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bold text-[#0078D4]">דוחות וניתוח ביצועים</h1>
          <p className="text-[#616161] text-sm">ניתוח מקיף של ביצועי המוקד</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 ימים</SelectItem>
              <SelectItem value="14">14 ימים</SelectItem>
              <SelectItem value="30">30 ימים</SelectItem>
              <SelectItem value="90">90 ימים</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportToHTML}>
            <FileText className="w-4 h-4 ml-2" />
            ייצוא HTML
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#616161]">אחוז השלמה</p>
                <p className="text-3xl font-bold text-[#0078D4]">{completionRate}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-[#2E7D32]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#616161]">זמן טיפול ממוצע</p>
                <p className="text-3xl font-bold text-[#0078D4]">{avgTimeToComplete}'</p>
              </div>
              <Clock className="w-8 h-8 text-[#ED6C02]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#616161]">דירוג לקוחות</p>
                <p className="text-3xl font-bold text-[#0078D4]">{avgCustomerRating}</p>
              </div>
              <Star className="w-8 h-8 text-[#ED6C02]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#616161]">סה"כ קריאות</p>
                <p className="text-3xl font-bold text-[#0078D4]">{totalAssigned}</p>
              </div>
              <Users className="w-8 h-8 text-[#0078D4]" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="agents" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="agents">ביצועי נציגים</TabsTrigger>
          <TabsTrigger value="queue">עומסי תור</TabsTrigger>
          <TabsTrigger value="efficiency">יעילות כללי</TabsTrigger>
        </TabsList>

        {/* Agent Performance */}
        <TabsContent value="agents">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">ביצועי נציגים</CardTitle>
                <Button variant="outline" size="sm" onClick={exportAgentPerformance}>
                  <Download className="w-4 h-4 ml-2" />
                  ייצוא
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={agentPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="completedCalls" fill="#0078D4" name="קריאות הושלמו" />
                  <Bar dataKey="avgTime" fill="#2E7D32" name="זמן ממוצע (דק')" />
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#FAFAFA]">
                    <tr>
                      <th className="text-right p-3 text-sm font-medium">נציג</th>
                      <th className="text-right p-3 text-sm font-medium">קריאות הושלמו</th>
                      <th className="text-right p-3 text-sm font-medium">זמן ממוצע</th>
                      <th className="text-right p-3 text-sm font-medium">דירוג</th>
                      <th className="text-right p-3 text-sm font-medium">סה"כ שובצו</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agentPerformance.map((agent, idx) => (
                      <tr key={idx} className="border-b hover:bg-[#FAFAFA]">
                        <td className="p-3">{agent.name}</td>
                        <td className="p-3">{agent.completedCalls}</td>
                        <td className="p-3">{agent.avgTime} דקות</td>
                        <td className="p-3">{agent.avgRating || '-'}</td>
                        <td className="p-3">{agent.totalAssigned}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Queue Load */}
        <TabsContent value="queue">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">עומסי תור</CardTitle>
                <Button variant="outline" size="sm" onClick={exportQueueLoad}>
                  <Download className="w-4 h-4 ml-2" />
                  ייצוא
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={queueLoadByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="waiting" stroke="#ED6C02" name="ממתינים" strokeWidth={2} />
                  <Line type="monotone" dataKey="completed" stroke="#2E7D32" name="הושלם" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-[#FFF4E5] rounded-lg">
                  <p className="text-sm text-[#616161]">ממוצע המתנה</p>
                  <p className="text-2xl font-bold text-[#ED6C02]">
                    {Math.round(queueLoadByDay.reduce((sum, d) => sum + d.avgWaitTime, 0) / queueLoadByDay.length)} דקות
                  </p>
                </div>
                <div className="p-4 bg-[#E8F5E9] rounded-lg">
                  <p className="text-sm text-[#616161]">הושלמו</p>
                  <p className="text-2xl font-bold text-[#2E7D32]">
                    {queueLoadByDay.reduce((sum, d) => sum + d.completed, 0)}
                  </p>
                </div>
                <div className="p-4 bg-[#E3F2FD] rounded-lg">
                  <p className="text-sm text-[#616161]">ממוצע ממתינים ביום</p>
                  <p className="text-2xl font-bold text-[#0078D4]">
                    {Math.round(queueLoadByDay.reduce((sum, d) => sum + d.waiting, 0) / queueLoadByDay.length)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overall Efficiency */}
        <TabsContent value="efficiency">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">התפלגות סטטוסים</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">מדדים עיקריים</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-[#FAFAFA] rounded-lg">
                  <span className="text-sm text-[#616161]">אחוז השלמה</span>
                  <span className="text-lg font-bold text-[#2E7D32]">{completionRate}%</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-[#FAFAFA] rounded-lg">
                  <span className="text-sm text-[#616161]">זמן טיפול ממוצע</span>
                  <span className="text-lg font-bold text-[#0078D4]">{avgTimeToComplete} דקות</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-[#FAFAFA] rounded-lg">
                  <span className="text-sm text-[#616161]">דירוג שביעות רצון</span>
                  <span className="text-lg font-bold text-[#ED6C02]">{avgCustomerRating} ⭐</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-[#FAFAFA] rounded-lg">
                  <span className="text-sm text-[#616161]">סה"כ קריאות</span>
                  <span className="text-lg font-bold text-[#0078D4]">{totalAssigned}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-[#FAFAFA] rounded-lg">
                  <span className="text-sm text-[#616161]">נציגים פעילים</span>
                  <span className="text-lg font-bold text-[#0078D4]">{agents.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}