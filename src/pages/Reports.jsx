import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

import ReportKPICards from '@/components/reports/ReportKPICards';
import MonthlyTrendSection from '@/components/reports/MonthlyTrendSection';
import InsuranceBreakdownSection from '@/components/reports/InsuranceBreakdownSection';
import InsuranceMonthMatrix from '@/components/reports/InsuranceMonthMatrix';
import VendorParetoSection from '@/components/reports/VendorParetoSection';
import DayHourSection from '@/components/reports/DayHourSection';
import TopVendorsDetailSection from '@/components/reports/TopVendorsDetailSection';
import ServiceTypeSection from '@/components/reports/ServiceTypeSection';
import DepartmentMonthMatrix from '@/components/reports/DepartmentMonthMatrix';
import TowingAreaSection from '@/components/reports/TowingAreaSection';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3];

export default function Reports() {
  const [selectedYear, setSelectedYear] = useState(String(CURRENT_YEAR));

  const { data: allCases = [], isLoading, refetch } = useQuery({
    queryKey: ['reports-cases'],
    queryFn: () => base44.entities.Case.list('-created_date', 50000),
    staleTime: 5 * 60 * 1000,
  });

  const cases = useMemo(() => {
    if (selectedYear === 'all') return allCases;
    return allCases.filter(c => {
      if (!c.created_date) return false;
      return new Date(c.created_date).getFullYear() === parseInt(selectedYear);
    });
  }, [allCases, selectedYear]);

  const sections = [
    { id: 'summary', label: 'סיכום שנתי' },
    { id: 'monthly', label: 'מגמה חודשית' },
    { id: 'insurance', label: 'פילוח ביטוח' },
    { id: 'ins-matrix', label: 'ביטוח × חודש' },
    { id: 'pareto', label: 'פארטו ספקים' },
    { id: 'dayhour', label: 'ימים ושעות' },
    { id: 'top-vendors', label: 'ספקים מובילים' },
    { id: 'service', label: 'סוג שירות' },
    { id: 'dept-matrix', label: 'מחלקה × חודש' },
    { id: 'area', label: 'אזור גרירה' },
  ];

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="space-y-8 pb-16" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">דוח שנתי - גרירה ושירותי דרך</h1>
          <p className="text-gray-500 text-sm mt-1">ניתוח מקיף של פעילות שנתית</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 ms-1" />
            רענן
          </Button>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-36">
              <Calendar className="w-4 h-4 ms-1 text-gray-500" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הזמנים</SelectItem>
              {YEAR_OPTIONS.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick nav */}
      <div className="flex flex-wrap gap-2">
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => scrollTo(s.id)}
            className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-full text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors shadow-sm"
          >
            {s.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-6">
          {Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-lg" />)}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Section 1 */}
          <section id="summary">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-blue-500 rounded-full inline-block" />
              סיכום שנתי {selectedYear !== 'all' ? selectedYear : ''}
              <span className="text-sm font-normal text-gray-400">({cases.length.toLocaleString()} קריאות)</span>
            </h2>
            <ReportKPICards cases={cases} />
          </section>

          {/* Section 2 */}
          <section id="monthly">
            <SectionTitle num={2} title="מגמה חודשית" />
            <MonthlyTrendSection cases={cases} />
          </section>

          {/* Section 3 */}
          <section id="insurance">
            <SectionTitle num={3} title="פילוח לפי חברת ביטוח" />
            <InsuranceBreakdownSection cases={cases} />
          </section>

          {/* Section 4 */}
          <section id="ins-matrix">
            <SectionTitle num={4} title="חברת ביטוח × חודש - מטריצה" />
            <InsuranceMonthMatrix cases={cases} />
          </section>

          {/* Section 5 */}
          <section id="pareto">
            <SectionTitle num={5} title="ספקים מובילים - פארטו (Top 20)" />
            <VendorParetoSection cases={cases} />
          </section>

          {/* Section 6 */}
          <section id="dayhour">
            <SectionTitle num={6} title="התפלגות לפי ימים ושעות" />
            <DayHourSection cases={cases} />
          </section>

          {/* Section 7 */}
          <section id="top-vendors">
            <SectionTitle num={7} title="ספקים מובילים - פירוט (Top 15)" />
            <TopVendorsDetailSection cases={cases} />
          </section>

          {/* Section 8 */}
          <section id="service">
            <SectionTitle num={8} title="פילוח לפי סוג שירות" />
            <ServiceTypeSection cases={cases} />
          </section>

          {/* Section 9 */}
          <section id="dept-matrix">
            <SectionTitle num={9} title="מחלקה × חודש - מטריצה" />
            <DepartmentMonthMatrix cases={cases} />
          </section>

          {/* Section 10 */}
          <section id="area">
            <SectionTitle num={10} title="פילוח לפי אזור גרירה" />
            <TowingAreaSection cases={cases} />
          </section>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ num, title }) {
  return (
    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
      <span className="w-6 h-6 bg-blue-500 text-white rounded-full inline-flex items-center justify-center text-xs font-bold">{num}</span>
      {title}
    </h2>
  );
}