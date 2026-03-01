import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { MONTHS_HE, fmtNum, exportToExcel, getMonth } from './ReportUtils';

export default function DepartmentMonthMatrix({ cases }) {
  const depts = [...new Set(cases.map(c => c.department || 'לא ידוע'))];

  const matrix = {};
  cases.forEach(c => {
    const dept = c.department || 'לא ידוע';
    const mo = getMonth(c.created_date);
    if (mo == null) return;
    if (!matrix[dept]) matrix[dept] = Array(12).fill(0);
    matrix[dept][mo]++;
  });

  const total = cases.length;
  const rows = depts
    .map(dept => ({ dept, months: matrix[dept] || Array(12).fill(0), total: (matrix[dept] || []).reduce((a,b)=>a+b,0) }))
    .sort((a,b) => b.total - a.total);

  const exportData = rows.map(r => {
    const obj = { 'מחלקה': r.dept };
    MONTHS_HE.forEach((m, i) => { obj[m] = r.months[i]; });
    obj['סה"כ'] = r.total;
    obj['%'] = total > 0 ? (r.total/total*100).toFixed(1) : 0;
    return obj;
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-right">מחלקה × חודש</CardTitle>
        <Button variant="outline" size="sm" onClick={() => exportToExcel(exportData, 'department-month-matrix')}>
          <Download className="w-4 h-4 ms-1" /> Excel
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-2 font-semibold text-gray-600 border-b sticky right-0 bg-gray-50 min-w-[120px]">מחלקה</th>
                {MONTHS_HE.map(m => <th key={m} className="px-2 py-2 font-semibold text-gray-600 border-b whitespace-nowrap">{m}</th>)}
                <th className="px-2 py-2 font-semibold text-gray-600 border-b">סה"כ</th>
                <th className="px-2 py-2 font-semibold text-gray-600 border-b">%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.dept} className="border-b hover:bg-gray-50">
                  <td className="px-2 py-1.5 font-medium sticky right-0 bg-white">{r.dept}</td>
                  {r.months.map((v, i) => (
                    <td key={i} className={`px-2 py-1.5 text-center ${v > 0 ? 'text-blue-700 font-medium' : 'text-gray-300'}`}>{v || '—'}</td>
                  ))}
                  <td className="px-2 py-1.5 font-bold text-blue-700">{fmtNum(r.total)}</td>
                  <td className="px-2 py-1.5 text-gray-500">{total > 0 ? (r.total/total*100).toFixed(1) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}