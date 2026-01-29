import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle, 
  XCircle,
  Car,
  Wrench,
  Bot,
  Users
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function HistoricalDataAnalysisPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [carTypeFilter, setCarTypeFilter] = useState('all');
  const [serveTypeFilter, setServeTypeFilter] = useState('all');

  const { data: historicalData = [], isLoading } = useQuery({
    queryKey: ['historicalCallData'],
    queryFn: async () => {
      // Fetch all records in batches
      const allRecords = [];
      let skip = 0;
      const batchSize = 1000;
      
      while (true) {
        const batch = await base44.entities.HistoricalCallData.filter({}, '-created_date', batchSize, skip);
        allRecords.push(...batch);
        
        if (batch.length < batchSize) break;
        skip += batchSize;
      }
      
      return allRecords;
    }
  });

  // Get unique values for filters
  const carTypes = useMemo(() => {
    const types = [...new Set(historicalData.map(d => d.car_type).filter(Boolean))];
    return types.sort();
  }, [historicalData]);

  const serveTypes = useMemo(() => {
    const types = [...new Set(historicalData.map(d => d.serve_type).filter(Boolean))];
    return types.sort();
  }, [historicalData]);

  // Filter data
  const filteredData = useMemo(() => {
    return historicalData.filter(item => {
      const matchesSearch = !searchQuery || 
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.car_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.diagnose?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCarType = carTypeFilter === 'all' || item.car_type === carTypeFilter;
      const matchesServeType = serveTypeFilter === 'all' || item.serve_type === serveTypeFilter;
      return matchesSearch && matchesCarType && matchesServeType;
    });
  }, [historicalData, searchQuery, carTypeFilter, serveTypeFilter]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = filteredData.length;
    const botMatches = filteredData.filter(d => d.bot_match).length;
    const nayedetFixed = filteredData.filter(d => d.nayedet_fixed).length;
    
    return {
      total,
      botMatchRate: total > 0 ? ((botMatches / total) * 100).toFixed(1) : 0,
      nayedetFixedRate: total > 0 ? ((nayedetFixed / total) * 100).toFixed(1) : 0,
      botMatches,
      nayedetFixed
    };
  }, [filteredData]);

  // Serve type distribution
  const serveTypeDistribution = useMemo(() => {
    const counts = {};
    filteredData.forEach(d => {
      const type = d.serve_type || 'לא ידוע';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredData]);

  // Car type distribution
  const carTypeDistribution = useMemo(() => {
    const counts = {};
    filteredData.forEach(d => {
      const type = d.car_type || 'לא ידוע';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [filteredData]);

  // Bot accuracy by serve type
  const botAccuracyByServeType = useMemo(() => {
    const byType = {};
    filteredData.forEach(d => {
      const type = d.serve_type || 'לא ידוע';
      if (!byType[type]) {
        byType[type] = { total: 0, matches: 0 };
      }
      byType[type].total++;
      if (d.bot_match) byType[type].matches++;
    });
    
    return Object.entries(byType)
      .map(([name, data]) => ({
        name,
        accuracy: data.total > 0 ? Math.round((data.matches / data.total) * 100) : 0,
        total: data.total
      }))
      .filter(d => d.total >= 5)
      .sort((a, b) => b.accuracy - a.accuracy);
  }, [filteredData]);

  if (isLoading) {
    return <PageLoader />;
  }

  if (historicalData.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">אין נתונים היסטוריים</h2>
          <p className="text-gray-500 mb-4">יש לייבא נתונים תחילה</p>
          <Link to={createPageUrl('ImportHistoricalData')}>
            <Button className="bg-blue-600 hover:bg-blue-700">ייבא נתונים</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-[#172B4D]">ניתוח נתונים היסטוריים</h1>
        <Link to={createPageUrl('ImportHistoricalData')}>
          <Button variant="outline">ייבא נתונים נוספים</Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setServeTypeFilter('all')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">סה"כ קריאות</p>
                <p className="text-2xl font-bold text-[#172B4D]">{stats.total.toLocaleString()}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            setServeTypeFilter('all');
            setSearchQuery('');
            // Scroll to bot accuracy chart
            document.getElementById('bot-accuracy-chart')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">דיוק הבוט</p>
                <p className="text-2xl font-bold text-green-600">{stats.botMatchRate}%</p>
                <p className="text-xs text-gray-400">{stats.botMatches.toLocaleString()} מתוך {stats.total.toLocaleString()}</p>
              </div>
              <Bot className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            setServeTypeFilter('all');
            setSearchQuery('');
            // Scroll to data table showing nayedet fixed
            document.getElementById('data-table')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">תיקוני תפעול</p>
                <p className="text-2xl font-bold text-orange-600">{stats.nayedetFixedRate}%</p>
                <p className="text-xs text-gray-400">{stats.nayedetFixed.toLocaleString()} מקרים</p>
              </div>
              <Users className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            // Scroll to serve type chart
            document.getElementById('serve-type-chart')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">סוגי שירות</p>
                <p className="text-2xl font-bold text-purple-600">{serveTypes.length}</p>
              </div>
              <Wrench className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="חיפוש לפי תיאור, רכב או אבחון..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            <Select value={carTypeFilter} onValueChange={setCarTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="סוג רכב" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל סוגי הרכב</SelectItem>
                {carTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={serveTypeFilter} onValueChange={setServeTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="סוג שירות" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל סוגי השירות</SelectItem>
                {serveTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Serve Type Distribution */}
        <Card id="serve-type-chart">
          <CardHeader>
            <CardTitle className="text-lg">התפלגות סוגי שירות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] flex flex-col md:flex-row items-center gap-4">
              <div className="w-full md:w-1/2 h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={serveTypeDistribution.slice(0, 6)}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={false}
                    >
                      {serveTypeDistribution.slice(0, 6).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value} קריאות`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full md:w-1/2 space-y-2">
                {serveTypeDistribution.slice(0, 6).map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="truncate max-w-[150px]">{item.name}</span>
                    </div>
                    <span className="font-medium">{item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Car Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">התפלגות סוגי רכב (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={carTypeDistribution} layout="vertical" margin={{ right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => v.toLocaleString()} />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => [value.toLocaleString(), 'קריאות']} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Bot Accuracy by Serve Type */}
        <Card id="bot-accuracy-chart" className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">דיוק הבוט לפי סוג שירות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={botAccuracyByServeType} margin={{ bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11, angle: -45, textAnchor: 'end' }}
                    height={70}
                    interval={0}
                  />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip 
                    formatter={(value, name, props) => [`${value}%`, 'דיוק']}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Bar dataKey="accuracy" fill="#10b981" radius={[4, 4, 0, 0]} name="דיוק (%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card id="data-table">
        <CardHeader>
          <CardTitle className="text-lg">נתונים מפורטים ({filteredData.length.toLocaleString()})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="p-3 text-right font-medium">סוג שירות</th>
                  <th className="p-3 text-right font-medium">רכב</th>
                  <th className="p-3 text-right font-medium">שנה</th>
                  <th className="p-3 text-right font-medium">תיאור</th>
                  <th className="p-3 text-right font-medium">המלצת בוט</th>
                  <th className="p-3 text-center font-medium">התאמה</th>
                  <th className="p-3 text-center font-medium">תיקון תפעול</th>
                  <th className="p-3 text-right font-medium">אבחון</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.slice(0, 50).map((item, index) => (
                  <tr key={item.id || index} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <Badge variant="outline">{item.serve_type || '-'}</Badge>
                    </td>
                    <td className="p-3">{item.car_name || item.car_type || '-'}</td>
                    <td className="p-3">{item.car_year || '-'}</td>
                    <td className="p-3 max-w-[200px] truncate" title={item.description}>
                      {item.description || '-'}
                    </td>
                    <td className="p-3">{item.bot_recommendation || '-'}</td>
                    <td className="p-3 text-center">
                      {item.bot_match ? (
                        <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 mx-auto" />
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {item.nayedet_fixed ? (
                        <Badge className="bg-orange-100 text-orange-700">כן</Badge>
                      ) : (
                        <Badge variant="outline">לא</Badge>
                      )}
                    </td>
                    <td className="p-3 max-w-[200px] truncate" title={item.diagnose}>
                      {item.diagnose || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredData.length > 50 && (
              <p className="text-center text-gray-500 text-sm mt-4">
                מציג 50 מתוך {filteredData.length} רשומות
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}