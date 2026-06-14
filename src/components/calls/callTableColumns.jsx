import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl, formatDateTime, formatCurrency } from '@/components/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  statusLabels,
  statusColors,
  issueTypeLabels,
  serviceTypeLabels,
  vehicleTypeLabels,
} from '@/config/labels';

/* ====================================================================
   עמודות אחידות לרשומת קריאה - לשימוש בכל מסכי הקריאות
   (ניהול קריאות / התור שלי / ניטור תורים).

   הסדר נקבע לפי שלוש התמונות המצורפות, משמאל לימין בקבצים
   ובסדר התמונות 18 -> 19 -> 20. בעברית (RTL) העמודה הימנית
   ביותר היא הראשונה. כל השדות מהתמונות מופיעים כאן; שדה שאין לו
   עדיין נתון במערכת יוצג כ-"—" (מקף).
   ==================================================================== */

const priorityLabels = {
  low: 'נמוך',
  normal: 'רגיל',
  high: 'גבוה',
  urgent: 'דחוף',
  critical: 'קריטי',
};
const priorityColors = {
  low: 'bg-gray-100 text-gray-700',
  normal: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
  critical: 'bg-red-100 text-red-800',
};

const EMPTY = '—';

function dash() {
  return <span className="text-gray-400 text-sm">{EMPTY}</span>;
}

/** טקסט פשוט עם fallback ל-"—" */
function Text({ value, className = '', dir }) {
  if (value == null || value === '') return dash();
  return (
    <span className={`text-sm ${className}`} dir={dir}>
      {value}
    </span>
  );
}

function formatMinutes(totalMins) {
  if (totalMins == null || isNaN(totalMins) || totalMins < 0) return null;
  const mins = Math.floor(totalMins);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `${h} שע׳ ${m} דק׳`;
  return `${m} דק׳`;
}

function dateText(value) {
  if (!value || isNaN(new Date(value).getTime())) return dash();
  return <span className="text-xs text-gray-600 whitespace-nowrap">{formatDateTime(value)}</span>;
}

function serviceTypeLabel(call) {
  const key = call?.issue_type || call?.service_category || call?.service_type;
  if (!key) return null;
  return issueTypeLabels[key] || serviceTypeLabels[key] || key;
}

/**
 * מחזיר מערך עמודות אחיד עבור DataTable וטבלאות הקריאות.
 * @param {object} opts
 * @param {(item:any)=>any} opts.getCall - שולף את אובייקט הקריאה מהשורה
 * @param {(item:any)=>string} opts.getCallId - שולף את מזהה הקריאה
 * @param {(item:any)=>React.ReactNode} [opts.renderActions] - תוכן עמודת פעולות
 */
export function buildCallColumns({ getCall, getCallId, renderActions }) {
  const idOf = (item) => (getCallId ? getCallId(item) : getCall(item)?.id);

  return [
    // ---- עמודת פעולות (קבועה, ראשונה) ----
    {
      header: 'פעולות',
      cell: (item) =>
        renderActions ? (
          renderActions(item)
        ) : (
          <Link to={createPageUrl(`CallDetails?id=${idOf(item)}`)}>
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
              צפה
            </Button>
          </Link>
        ),
    },

    /* ===================== תמונה 18 ===================== */
    {
      header: 'זמן המתנה',
      cell: (item) => {
        const call = getCall(item);
        const from = item.added_to_queue_at || call?.added_to_queue_at || call?.created_date;
        let mins;
        let display;
        if (typeof item.time_in_queue === 'number' && item.time_in_queue >= 0) {
          mins = item.time_in_queue;
          display = formatMinutes(mins);
        } else if (from) {
          mins = Math.round((Date.now() - new Date(from).getTime()) / 60000);
          display = formatMinutes(mins);
        }
        if (!display) return dash();
        return (
          <div className={`text-sm font-medium ${mins > 30 ? 'text-red-600' : ''}`}>{display}</div>
        );
      },
    },
    {
      header: 'סטטוס קריאה',
      cell: (item) => {
        const call = getCall(item);
        const s = call?.call_status;
        if (!s) return dash();
        return (
          <Badge className={`text-xs ${statusColors[s] || 'bg-gray-100 text-gray-600'}`}>
            {statusLabels[s] || s}
          </Badge>
        );
      },
    },
    {
      header: 'זמן שירות עתידי',
      cell: (item) => {
        const call = getCall(item);
        if (!call?.future_service_date && !call?.future_service_time_range) return dash();
        return (
          <div className="text-xs text-gray-600 whitespace-nowrap">
            {call?.future_service_date && <div>{formatDateTime(call.future_service_date)}</div>}
            {call?.future_service_time_range && <div>{call.future_service_time_range}</div>}
          </div>
        );
      },
    },
    {
      header: 'VIP',
      cell: (item) => {
        const call = getCall(item);
        return call?.is_vip ? (
          <Badge className="text-xs bg-amber-100 text-amber-800">VIP</Badge>
        ) : (
          dash()
        );
      },
    },
    {
      header: "מס' רכב",
      cell: (item) => {
        const call = getCall(item);
        return (
          <Text
            value={call?.vehicle_plate || call?.vehicle_number}
            className="font-medium tabular-nums"
            dir="ltr"
          />
        );
      },
    },
    {
      header: 'קוד דגם',
      cell: (item) => <Text value={getCall(item)?.vehicle_model} />,
    },
    {
      header: 'ספק שירות',
      cell: (item) => {
        const call = getCall(item);
        return call?.assigned_vendor_name ? (
          <span className="text-sm truncate block max-w-[140px]">{call.assigned_vendor_name}</span>
        ) : (
          dash()
        );
      },
    },
    {
      header: 'יעד העמסה',
      cell: (item) => {
        const call = getCall(item);
        return (
          <Text
            value={call?.pickup_location_address || call?.pickup_location_city}
            className="truncate block max-w-[160px]"
          />
        );
      },
    },
    {
      header: 'יעד פריקה',
      cell: (item) => {
        const call = getCall(item);
        return (
          <Text
            value={
              call?.dropoff_location_address ||
              call?.dropoff_garage_name ||
              call?.dropoff_location_city
            }
            className="truncate block max-w-[160px]"
          />
        );
      },
    },
    {
      header: 'תיאור תקלה',
      cell: (item) => {
        const call = getCall(item);
        return (
          <Text
            value={call?.issue_description || call?.description}
            className="truncate block max-w-[200px]"
          />
        );
      },
    },

    /* ===================== תמונה 19 ===================== */
    {
      header: 'סוג שירות',
      cell: (item) => <Text value={serviceTypeLabel(getCall(item))} />,
    },
    {
      header: 'שינוי אחרון',
      cell: (item) => {
        const call = getCall(item);
        return dateText(call?.updated_date || call?.updated_at);
      },
    },
    {
      header: 'קוד קריאה',
      cell: (item) => {
        const call = getCall(item);
        return (
          <Link
            to={createPageUrl(`CallDetails?id=${idOf(item)}`)}
            className="text-sm font-medium text-blue-600 hover:underline tabular-nums"
            dir="ltr"
          >
            {call?.call_number || EMPTY}
          </Link>
        );
      },
    },
    {
      header: 'שם לקוח',
      cell: (item) => {
        const call = getCall(item);
        return (
          <div>
            <Link
              to={createPageUrl(`CallDetails?id=${idOf(item)}`)}
              className="font-medium text-blue-600 hover:underline"
            >
              {call?.customer_name || EMPTY}
            </Link>
          </div>
        );
      },
    },
    {
      header: "טל' פונה",
      cell: (item) => {
        const call = getCall(item);
        return (
          <Text
            value={call?.caller_phone || call?.customer_phone}
            className="tabular-nums"
            dir="ltr"
          />
        );
      },
    },
    {
      header: 'זמן נותן השירות',
      cell: (item) => {
        const call = getCall(item);
        return dateText(
          call?.vendor_arrival_time_estimated || call?.estimated_arrival_time || call?.assigned_at
        );
      },
    },
    {
      header: 'זמן פתיחה',
      cell: (item) => dateText(getCall(item)?.created_date),
    },
    {
      header: 'סוכן ביטוח',
      cell: (item) => {
        const call = getCall(item);
        return (
          <Text
            value={call?.insurance_agent || call?.insurance_agent_name || call?.insurance_company}
          />
        );
      },
    },
    {
      header: 'שם חבילה',
      cell: (item) => <Text value={getCall(item)?.package_name} />,
    },
    {
      header: 'שם מוקדן',
      cell: (item) => <Text value={getCall(item)?.created_by} dir="ltr" />,
    },
    {
      header: 'קוד פניה',
      cell: (item) => (
        <Text value={getCall(item)?.case_number} className="tabular-nums" dir="ltr" />
      ),
    },

    /* ===================== תמונה 20 ===================== */
    {
      header: 'סוג רכב',
      cell: (item) => {
        const t = getCall(item)?.vehicle_type;
        return <Text value={t ? vehicleTypeLabels[t] || t : null} />;
      },
    },
    {
      header: 'סיבת תשלום',
      cell: (item) => <Text value={getCall(item)?.payment_reason} />,
    },
    {
      header: 'מוצר',
      cell: (item) => {
        const call = getCall(item);
        return <Text value={call?.product_name || call?.product} />;
      },
    },
    {
      header: 'מחיר תשלום',
      cell: (item) => {
        const call = getCall(item);
        const amount = call?.payment_amount_customer ?? call?.price;
        if (amount == null || amount === '' || isNaN(Number(amount))) return dash();
        return <span className="text-sm tabular-nums">{formatCurrency(amount)}</span>;
      },
    },
    {
      header: 'סוג תשלום',
      cell: (item) => <Text value={getCall(item)?.payment_type} />,
    },
    {
      header: 'נציג מוכר',
      cell: (item) => {
        const call = getCall(item);
        return <Text value={call?.sales_rep_name || call?.sales_rep} />;
      },
    },
    {
      header: 'תאריך תשלום',
      cell: (item) => dateText(getCall(item)?.payment_date),
    },
    {
      header: 'מחלקה',
      cell: (item) => <Text value={getCall(item)?.department} />,
    },
    {
      header: 'זמן הגעה',
      cell: (item) => {
        const call = getCall(item);
        return dateText(call?.vendor_arrival_time_actual || call?.arrived_at);
      },
    },
    {
      header: 'בקר',
      cell: (item) => <Text value={getCall(item)?.quality_controller_name} />,
    },
    {
      header: 'לקוח מיוחד',
      cell: (item) => {
        const call = getCall(item);
        return <Text value={call?.special_customer || call?.customer_type} />;
      },
    },

    // ---- עמודה נוספת (לא מהתמונות) - נציג מטפל, שימושית למסכי התורים ----
    {
      header: 'נציג מטפל',
      cell: (item) => {
        const agent = item.assigned_to_agent || getCall(item)?.assigned_to_agent;
        return agent ? (
          <div className="flex items-center gap-1.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
              {agent.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm">{agent}</span>
          </div>
        ) : (
          <span className="text-sm text-gray-400">לא משובץ</span>
        );
      },
    },
  ];
}

export { statusLabels, statusColors, priorityLabels, priorityColors };
