import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl, formatDateTime } from '@/components/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/* ====================================================================
   עמודות אחידות לרשומת קריאה - לשימוש בכל המסכים
   הסדר (מימין לשמאל בעברית):
   פעולות | מס' רכב | שם מנוי | סטטוס בתור | חברת ביטוח/סוכן |
   עדיפות | נציג מטפל | זמן בתור | שם ספק | זמן פתיחת קריאה
   ==================================================================== */

const queueStatusMap = {
  waiting_in_queue: { label: 'ממתין בתור', color: 'bg-yellow-100 text-yellow-800' },
  assigned_to_agent: { label: 'משובץ לנציג', color: 'bg-blue-100 text-blue-800' },
  in_progress: { label: 'בטיפול', color: 'bg-indigo-100 text-indigo-800' },
  completed: { label: 'סגור', color: 'bg-green-100 text-green-800' },
  transferred: { label: 'הועבר', color: 'bg-purple-100 text-purple-800' },
  rejected: { label: 'נדחה', color: 'bg-red-100 text-red-800' },
};

const callStatusMap = {
  waiting_treatment: { label: 'ממתין לטיפול', color: 'bg-yellow-100 text-yellow-800' },
  awaiting_assignment: { label: 'ממתין לשיוך', color: 'bg-orange-100 text-orange-800' },
  assigning: { label: 'ספק שובץ', color: 'bg-blue-100 text-blue-800' },
  vendor_enroute: { label: 'ספק בדרך', color: 'bg-indigo-100 text-indigo-800' },
  in_progress: { label: 'בטיפול', color: 'bg-purple-100 text-purple-800' },
  vendor_arrived: { label: 'ספק הגיע', color: 'bg-cyan-100 text-cyan-800' },
  future_service: { label: 'שירות עתידי', color: 'bg-teal-100 text-teal-800' },
  in_followup: { label: 'במעקב', color: 'bg-sky-100 text-sky-800' },
  in_storage: { label: 'באחסנה', color: 'bg-gray-100 text-gray-700' },
  continued_treatment: { label: 'המשך טיפול', color: 'bg-violet-100 text-violet-800' },
  awaiting_payment: { label: 'ממתין לתשלום', color: 'bg-amber-100 text-amber-800' },
  completed: { label: 'סגור', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'בוטל', color: 'bg-gray-100 text-gray-600' },
};

const priorityLabels = { normal: 'רגיל', urgent: 'דחוף', critical: 'קריטי' };
const priorityColors = {
  normal: 'bg-gray-100 text-gray-700',
  urgent: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

function getQueueStatus(call) {
  // נגזר מסטטוס הקריאה אם אין סטטוס תור מפורש
  if (call?.queue_status) return queueStatusMap[call.queue_status] || null;
  if (call?.assigned_vendor_name) return queueStatusMap.in_progress;
  if (call?.call_status === 'completed') return queueStatusMap.completed;
  if (call?.call_status === 'cancelled') return queueStatusMap.rejected;
  return queueStatusMap.waiting_in_queue;
}

function timeInQueue(fromDate) {
  if (!fromDate) return null;
  const mins = Math.round((Date.now() - new Date(fromDate).getTime()) / 60000);
  if (isNaN(mins)) return null;
  return mins < 60 ? `${mins} דק׳` : `${Math.floor(mins / 60)} שע׳ ${mins % 60} דק׳`;
}

/**
 * מחזיר מערך עמודות אחיד עבור DataTable.
 * @param {object} opts
 * @param {(item:any)=>any} opts.getCall - שולף את אובייקט הקריאה מהשורה
 * @param {(item:any)=>string} opts.getCallId - שולף את מזהה הקריאה
 * @param {(item:any)=>React.ReactNode} [opts.renderActions] - תוכן עמודת פעולות
 */
export function buildCallColumns({ getCall, getCallId, renderActions }) {
  return [
    {
      header: 'פעולות',
      cell: (item) =>
        renderActions ? (
          renderActions(item)
        ) : (
          <Link to={createPageUrl(`CallDetails?id=${getCallId(item)}`)}>
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
              צפה
            </Button>
          </Link>
        ),
    },
    {
      header: "מס' רכב",
      cell: (item) => {
        const call = getCall(item);
        return (
          <div>
            <div className="font-medium tabular-nums" dir="ltr">
              {call?.vehicle_plate || call?.vehicle_number || '—'}
            </div>
            {call?.vehicle_model && (
              <div className="text-xs text-gray-500">{call.vehicle_model}</div>
            )}
          </div>
        );
      },
    },
    {
      header: 'שם מנוי',
      cell: (item) => {
        const call = getCall(item);
        return (
          <div>
            <Link
              to={createPageUrl(`CallDetails?id=${getCallId(item)}`)}
              className="font-medium text-blue-600 hover:underline"
            >
              {call?.customer_name || '—'}
            </Link>
            <div className="text-xs text-gray-500 tabular-nums" dir="ltr">
              {call?.customer_phone || ''}
            </div>
          </div>
        );
      },
    },
    {
      header: 'סטטוס בתור',
      cell: (item) => {
        const call = getCall(item);
        const conf = getQueueStatus(call);
        if (!conf) return <span className="text-gray-400 text-sm">—</span>;
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${conf.color}`}>
            {conf.label}
          </span>
        );
      },
    },
    {
      header: 'חברת ביטוח / סוכן',
      cell: (item) => {
        const call = getCall(item);
        if (!call?.insurance_company && !call?.insurance_agent)
          return <span className="text-gray-400 text-sm">—</span>;
        return (
          <div className="text-sm">
            <div className="font-medium">{call?.insurance_company || '—'}</div>
            {call?.insurance_agent && (
              <div className="text-xs text-gray-500">{call.insurance_agent}</div>
            )}
          </div>
        );
      },
    },
    {
      header: 'עדיפות',
      cell: (item) => {
        const call = getCall(item);
        const p = call?.call_priority || 'normal';
        return (
          <Badge className={`text-xs ${priorityColors[p] || priorityColors.normal}`}>
            {priorityLabels[p] || p}
          </Badge>
        );
      },
    },
    {
      header: 'נציג מטפל',
      cell: (item) => {
        const agent = item.assigned_to_agent || getCall(item)?.assigned_to_agent;
        return agent ? (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-[10px] font-bold">
              {agent.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm">{agent}</span>
          </div>
        ) : (
          <span className="text-gray-400 text-sm">לא משובץ</span>
        );
      },
    },
    {
      header: 'זמן בתור',
      cell: (item) => {
        const call = getCall(item);
        const from = item.added_to_queue_at || call?.created_date;
        const display = timeInQueue(from);
        if (!display) return '—';
        const mins = Math.round((Date.now() - new Date(from).getTime()) / 60000);
        return (
          <div className={`text-sm font-medium ${mins > 30 ? 'text-red-600' : ''}`}>{display}</div>
        );
      },
    },
    {
      header: 'שם ספק',
      cell: (item) => {
        const call = getCall(item);
        return call?.assigned_vendor_name ? (
          <span className="text-sm truncate block max-w-[140px]">{call.assigned_vendor_name}</span>
        ) : (
          <span className="text-gray-400 text-sm">לא שובץ</span>
        );
      },
    },
    {
      header: 'זמן פתיחת קריאה',
      cell: (item) => {
        const call = getCall(item);
        const d = call?.created_date;
        if (!d) return <span className="text-sm">—</span>;
        return <span className="text-xs text-gray-600">{formatDateTime(d)}</span>;
      },
    },
  ];
}

export { callStatusMap, queueStatusMap, priorityLabels, priorityColors };