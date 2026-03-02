import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportToExcel, exportToHTML, exportToPDF } from '@/components/reports/ExportUtils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FileSpreadsheet, FileText, File, Download } from 'lucide-react';

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
  const [selectedYear, setSelectedYear] = useState(String(CURRENT_YEAR - 1));

  const { data: allCases = [], isLoading, refetch } = useQuery({
    queryKey: ['reports-cases'],
    queryFn: () => base44.entities.Case.list('-created_date', 50000),
    staleTime: 5 * 60 * 1000,
  });

  // Determine the "effective date" of each case:
  // prefer completed_at or arrived_at (actual service date) over created_date (import date)
  const getEffectiveYear = (c) => {
    const dateFields = [c.completed_at, c.arrived_at, c.assigned_at, c.created_date];
    for (const d of dateFields) {
      if (d) return new Date(d).getFullYear();
    }
    return null;
  };

  const cases = useMemo(() => {
    if (selectedYear === 'all') return allCases;
    const yr = parseInt(selectedYear);
    return allCases.filter(c => getEffectiveYear(c) === yr);
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

  // Build full-report export data (all sections combined)
  const buildFullExport = () => {
    const MONTHS_HE = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
    return cases.map(c => ({
      'מספר קריאה': c.case_number || '',
      'שם לקוח': c.customer_name || '',
      'סוג שירות': c.service_type || '',
      'מחלקה': c.department || '',
      'חברת ביטוח': c.insurance_company || '',
      'אזור גרירה': c.towing_area || '',
      'ספק': c.assigned_provider_name || '',
      'סטטוס': c.status || '',
      'מחיר': c.price || 0,
      'עלות': c.cost || 0,
      'ק"מ': c.distance_km || 0,
      'חודש': c.created_date ? MONTHS_HE[new Date(c.created_date).getMonth()] : '',
      'שנה': c.created_date ? new Date(c.created_date).getFullYear() : '',
      'תאריך': c.created_date ? new Date(c.created_date).toLocaleDateString('he-IL') : '',
    }));
  };

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1">
                <Download className="w-4 h-4" />
                ייצוא מלא
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => exportToExcel(buildFullExport(), `annual-report-${selectedYear}`, `דוח שנתי ${selectedYear}`)}>
                <FileSpreadsheet className="w-4 h-4 me-2 text-green-600" />
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportToHTML(buildFullExport(), `annual-report-${selectedYear}`, `דוח שנתי ${selectedYear}`)}>
                <FileText className="w-4 h-4 me-2 text-blue-600" />
                HTML מעוצב
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportToPDF(buildFullExport(), `annual-report-${selectedYear}`, `דוח שנתי ${selectedYear}`)}>
                <File className="w-4 h-4 me-2 text-red-600" />
                PDF / הדפסה
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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