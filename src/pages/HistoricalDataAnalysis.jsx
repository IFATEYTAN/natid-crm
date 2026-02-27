import React, { useState, useMemo, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { queryKeys } from '@/lib/queryKeys';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  BarChart3,
  CheckCircle,
  XCircle,
  Wrench,
  Bot,
  Users,
  Ban,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
const ServeTypePie = lazy(() => import('../components/analysis/ServeTypePie'));
const CarTypeBar = lazy(() => import('../components/analysis/CarTypeBar'));
const BotAccuracyBar = lazy(() => import('../components/analysis/BotAccuracyBar'));
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { toast } from 'sonner';
import { usePermissions } from '@/components/permissions/PermissionsContext';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function HistoricalDataAnalysisPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [carTypeFilter, setCarTypeFilter] = useState('all');
  const [serveTypeFilter, setServeTypeFilter] = useState('all');

  const {
    data: historicalData = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.historicalData.all(),
    queryFn: async () => {
      // Fetch all records in batches
      const allRecords = [];
      let skip = 0;
      const batchSize = 1000;

      while (true) {
        const batch = await base44.entities.HistoricalCallData.filter(
          {},
          '-created_date',
          batchSize,
          skip
        );
        allRecords.push(...batch);

        if (batch.length < batchSize) break;
        skip += batchSize;
      }

      return allRecords;
    },
  });

  // Get unique values for filters
  const carTypes = useMemo(() => {
    const types = [...new Set(historicalData.map((d) => d.car_type).filter(Boolean))];
    return types.sort();
  }, [historicalData]);

  const serveTypes = useMemo(() => {
    const types = [...new Set(historicalData.map((d) => d.serve_type).filter(Boolean))];
    return types.sort();
  }, [historicalData]);

  // Filter data
  const filteredData = useMemo(() => {
    return historicalData.filter((item) => {
      const matchesSearch =
        !searchQuery ||
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
    const botMatches = filteredData.filter((d) => d.bot_match).length;
    const nayedetFixed = filteredData.filter((d) => d.nayedet_fixed).length;

    // KPI: calls not from bot (bot_recommendation empty)
    const nonBot = filteredData.filter(
      (d) => !d?.bot_recommendation || String(d.bot_recommendation).trim() === ''
    ).length;

    // Mutually exclusive breakdown (sums to 100%)
    const onlyBot = filteredData.filter((d) => d.bot_match && !d.nayedet_fixed).length;
    const onlyManual = filteredData.filter((d) => d.nayedet_fixed && !d.bot_match).length;
    const both = filteredData.filter((d) => d.bot_match && d.nayedet_fixed).length;
    const none = Math.max(0, total - (onlyBot + onlyManual + both));

    return {
      total,
      botMatchRate: total > 0 ? ((botMatches / total) * 100).toFixed(1) : 0,
      nayedetFixedRate: total > 0 ? ((nayedetFixed / total) * 100).toFixed(1) : 0,
      botMatches,
      nayedetFixed,
      nonBot,
      nonBotRate: total > 0 ? ((nonBot / total) * 100).toFixed(1) : 0,
      // 100% breakdown
      onlyBot,
      onlyManual,
      both,
      none,
      onlyBotRate: total > 0 ? ((onlyBot / total) * 100).toFixed(1) : 0,
      onlyManualRate: total > 0 ? ((onlyManual / total) * 100).toFixed(1) : 0,
      bothRate: total > 0 ? ((both / total) * 100).toFixed(1) : 0,
      noneRate: total > 0 ? ((none / total) * 100).toFixed(1) : 0,
    };
  }, [filteredData]);

  // Map abbreviations to full names
  const serveTypeLabels = {
    ג: 'גרירה',
    נ: 'ניידת',
    א: 'אבחון',
    'א+ג': 'אבחון + גרירה',
    'ג+נ': 'גרירה + ניידת',
    'לא ידוע': 'לא ידוע',
  };

  // Get full label for serve type
  const getServeTypeLabel = (type) => {
    return serveTypeLabels[type] || type || 'לא ידוע';
  };

  // User display preferences
  const { currentUser } = usePermissions();

  const { data: displayPref } = useQuery({
    queryKey: queryKeys.settings.display(currentUser?.id, 'HistoricalDataAnalysis'),
    enabled: !!currentUser,
    queryFn: async () => {
      const list = await base44.entities.UserDisplayPreference.filter({
        user_id: currentUser.id,
        page_name: 'HistoricalDataAnalysis',
      });
      return list?.[0] || null;
    },
    initialData: null,
  });

  const displayCards = useMemo(() => {
    const base = [
      {
        card_key: 'onlyBot',
        label: 'בוט בלבד',
        color: 'text-green-600',
        value: stats.onlyBotRate,
        count: stats.onlyBot,
        order: 0,
        visible: true,
      },
      {
        card_key: 'onlyManual',
        label: 'ידני בלבד',
        color: 'text-blue-600',
        value: stats.onlyManualRate,
        count: stats.onlyManual,
        order: 1,
        visible: true,
      },
      {
        card_key: 'both',
        label: 'גם וגם',
        color: 'text-purple-600',
        value: stats.bothRate,
        count: stats.both,
        order: 2,
        visible: true,
      },
      {
        card_key: 'none',
        label: 'לא טופל',
        color: 'text-gray-700',
        value: stats.noneRate,
        count: stats.none,
        order: 3,
        visible: true,
      },
      {
        card_key: 'kpi_nonBot',
        label: 'לא מהבוט',
        color: 'text-amber-600',
        value: stats.nonBotRate,
        count: stats.nonBot,
        order: 4,
        visible: true,
      },
    ];
    const prefCards = displayPref?.cards || [];
    if (!prefCards.length) return base;
    const prefMap = Object.fromEntries(prefCards.map((c) => [c.card_key, c]));
    const merged = base.map((b, idx) => {
      const p = prefMap[b.card_key];
      return {
        ...b,
        label: p?.label?.trim?.() || b.label,
        visible: typeof p?.visible === 'boolean' ? p.visible : b.visible,
        order: typeof p?.order === 'number' ? p.order : idx,
      };
    });
    const extras = prefCards
      .filter((c) => !merged.find((m) => m.card_key === c.card_key))
      .map((c) => ({
        card_key: c.card_key,
        label: c.label || c.card_key,
        color: 'text-gray-700',
        value: 0,
        count: 0,
        visible: !!c.visible,
        order: c.order ?? 99,
      }));
    return [...merged, ...extras]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .filter((c) => c.visible);
  }, [displayPref, stats]);

  // Export data to CSV
  const exportToCSV = () => {
    const headers = [
      'סוג שירות',
      'סוג רכב',
      'שם רכב',
      'שנת ייצור',
      'תיאור',
      'המלצת בוט',
      'התאמת בוט',
      'תיקון תפעול',
      'אבחון',
    ];
    const rows = filteredData.map((item) => [
      getServeTypeLabel(item.serve_type),
      item.car_type || '',
      item.car_name || '',
      item.car_year || '',
      item.description || '',
      item.bot_recommendation || '',
      item.bot_match ? 'כן' : 'לא',
      item.nayedet_fixed ? 'כן' : 'לא',
      item.diagnose || '',
    ]);

    const csvContent =
      '\uFEFF' +
      [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `historical_data_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`יוצאו ${filteredData.length.toLocaleString()} רשומות`);
  };

  // Serve type distribution with full names
  const serveTypeDistribution = useMemo(() => {
    const counts = {};
    filteredData.forEach((d) => {
      const label = getServeTypeLabel(d.serve_type);
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  // Car type distribution
  const carTypeDistribution = useMemo(() => {
    const counts = {};
    filteredData.forEach((d) => {
      const type = d.car_type || 'לא ידוע';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredData]);

  // Bot accuracy by serve type with full names
  const botAccuracyByServeType = useMemo(() => {
    const byType = {};
    filteredData.forEach((d) => {
      const label = getServeTypeLabel(d.serve_type);
      if (!byType[label]) {
        byType[label] = { total: 0, matches: 0 };
      }
      byType[label].total++;
      if (d.bot_match) byType[label].matches++;
    });

    return Object.entries(byType)
      .map(([name, data]) => ({
        name,
        accuracy: data.total > 0 ? Math.round((data.matches / data.total) * 100) : 0,
        total: data.total,
      }))
      .filter((d) => d.total >= 5)
      .sort((a, b) => b.accuracy - a.accuracy);
  }, [filteredData]);

  if (isLoading) {
    return <PageLoader />;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-red-500 text-lg font-medium mb-2">שגיאה בטעינת נתונים</p>
        <p className="text-gray-500 text-sm">{error?.message || 'נסה לרענן את הדף'}</p>
      </div>
    );
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
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportToCSV} className="gap-2">
            <Download className="w-4 h-4" />
            ייצוא CSV
          </Button>
          <Link to={createPageUrl('ImportHistoricalData')}>
            <Button variant="outline" className="gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              ייבא נתונים נוספים
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards - Clickable */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card
          className="cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all border-2 border-transparent"
          onClick={() => {
            setServeTypeFilter('all');
            setCarTypeFilter('all');
            setSearchQuery('');
            document.getElementById('data-table')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">סה"כ קריאות</p>
                <p className="text-2xl font-bold text-[#172B4D]">{stats.total.toLocaleString()}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-xs text-blue-500 mt-2">לחץ לצפייה בטבלה ←</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg hover:border-green-300 transition-all border-2 border-transparent"
          onClick={() => {
            setServeTypeFilter('all');
            setSearchQuery('');
            document.getElementById('bot-accuracy-chart')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">דיוק הבוט</p>
                <p className="text-2xl font-bold text-green-600">{stats.botMatchRate}%</p>
                <p className="text-xs text-gray-400">
                  {stats.botMatches.toLocaleString()} מתוך {stats.total.toLocaleString()}
                </p>
              </div>
              <Bot className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-xs text-green-500 mt-2">לחץ לצפייה בתרשים ←</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg hover:border-orange-300 transition-all border-2 border-transparent"
          onClick={() => {
            setServeTypeFilter('all');
            setSearchQuery('');
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
            <p className="text-xs text-orange-500 mt-2">לחץ לצפייה בנתונים ←</p>
          </CardContent>
        </Card>

        {/* KPI: Not from bot */}
        <Card
          className="cursor-pointer hover:shadow-lg hover:border-amber-300 transition-all border-2 border-transparent"
          onClick={() => {
            setServeTypeFilter('all');
            setSearchQuery('');
            document.getElementById('data-table')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">לא מהבוט</p>
                <p className="text-2xl font-bold text-amber-600">{stats.nonBot.toLocaleString()}</p>
                <p className="text-xs text-gray-400">{stats.nonBotRate}% מכלל המסוננות</p>
              </div>
              <Ban className="w-8 h-8 text-amber-500" />
            </div>
            <p className="text-xs text-amber-500 mt-2">לחץ לצפייה בנתונים ←</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg hover:border-purple-300 transition-all border-2 border-transparent"
          onClick={() => {
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
            <p className="text-xs text-purple-500 mt-2">לחץ לצפייה בתרשים ←</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border border-[#e5e7eb]">
        <CardContent className="p-4">
          <div className="text-xs text-gray-500 mb-3">
            הבהרה: "דיוק הבוט" ו"תיקוני תפעול" הם מדדים חופפים ולכן אינם מסתכמים ל-100%. להלן חלוקה
            מלאה + KPI נוסף.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {displayCards.map((c) => (
              <div key={c.card_key} className="p-3 bg-gray-50 rounded-lg text-center">
                <div className={`text-xl font-bold ${c.color}`}>{c.value}%</div>
                <div className="text-xs text-gray-600">
                  {c.label} ({c.count.toLocaleString()})
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="חיפוש לפי תיאור, רכב או אבחון..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pe-10"
                />
              </div>
            </div>
            <Select value={carTypeFilter} onValueChange={setCarTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="סוג רכב" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל סוגי הרכב</SelectItem>
                {carTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={serveTypeFilter} onValueChange={setServeTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="סוג שירות" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל סוגי השירות</SelectItem>
                {serveTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {getServeTypeLabel(type)}
                  </SelectItem>
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
            <div className="h-[380px] flex flex-col md:flex-row items-center gap-6">
              <div className="w-full md:w-1/2 h-[280px]">
                <Suspense
                  fallback={
                    <div className="h-full flex items-center justify-center text-gray-400">
                      טוען…
                    </div>
                  }
                >
                  <ServeTypePie data={serveTypeDistribution.slice(0, 6)} colors={COLORS} />
                </Suspense>
              </div>
              <div className="w-full md:w-1/2 space-y-3">
                {(() => {
                  const total = serveTypeDistribution
                    .slice(0, 6)
                    .reduce((sum, i) => sum + i.value, 0);
                  return serveTypeDistribution.slice(0, 6).map((item, index) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between text-sm bg-gray-50 rounded-lg p-2"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <span className="font-bold text-gray-700">
                        {item.value.toLocaleString()} (
                        {total ? Math.round((item.value / total) * 100) : 0}%)
                      </span>
                    </div>
                  ));
                })()}
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
            <div className="h-[400px]">
              <Suspense
                fallback={
                  <div className="h-full flex items-center justify-center text-gray-400">טוען…</div>
                }
              >
                <CarTypeBar data={carTypeDistribution} />
              </Suspense>
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
              <Suspense
                fallback={
                  <div className="h-full flex items-center justify-center text-gray-400">טוען…</div>
                }
              >
                <BotAccuracyBar data={botAccuracyByServeType} />
              </Suspense>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card id="data-table">
        <CardHeader>
          <CardTitle className="text-lg">
            נתונים מפורטים ({filteredData.length.toLocaleString()})
          </CardTitle>
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
                      <Badge variant="outline">{getServeTypeLabel(item.serve_type)}</Badge>
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
