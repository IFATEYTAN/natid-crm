import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DAYS_HE, COLORS, fmtNum, getDay, getHour, getEffectiveDate } from './ReportUtils';

export default function DayHourSection({ cases }) {
  const dayData = Array.from({ length: 7 }, (_, i) => {
    const dayCases = cases.filter(c => getDay(getEffectiveDate(c)) === i);
    const avgCost = dayCases.length > 0 ? dayCases.reduce((s,c) => s+(c.cost||0),0)/dayCases.length : 0;
    return { day: DAYS_HE[i], total: dayCases.length, avgCost: parseFloat(avgCost.toFixed(0)) };
  });

  const hourData = Array.from({ length: 24 }, (_, i) => {
    const hCases = cases.filter(c => getHour(getEffectiveDate(c)) === i);
    return { hour: `${String(i).padStart(2,'0')}:00`, total: hCases.length };
  });

  const maxHour = Math.max(...hourData.map(h => h.total), 1);

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader><CardTitle className="text-right">התפלגות לפי יום בשבוע</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dayData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="total" name='קריאות' radius={[4,4,0,0]}>
                {dayData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-gray-50"><tr>
                {['יום','קריאות','עלות ממוצעת'].map(h => <th key={h} className="px-2 py-1.5 font-semibold text-gray-600 border-b">{h}</th>)}
              </tr></thead>
              <tbody>
                {dayData.map(d => (
                  <tr key={d.day} className="border-b hover:bg-gray-50">
                    <td className="px-2 py-1.5 font-medium">{d.day}</td>
                    <td className="px-2 py-1.5">{fmtNum(d.total)}</td>
                    <td className="px-2 py-1.5">₪{d.avgCost.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-right">התפלגות לפי שעה (00–23)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={hourData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" tick={{ fontSize: 9 }} interval={2} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="total" name='קריאות' radius={[2,2,0,0]}>
                {hourData.map((h, i) => (
                  <Cell key={i} fill={`rgba(59,130,246,${0.3 + (h.total/maxHour)*0.7})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}